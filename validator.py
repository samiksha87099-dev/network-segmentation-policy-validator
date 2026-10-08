from typing import List, Dict, Optional
from datetime import datetime, timezone
import uuid

from graph_engine import NetworkGraph
from severity import compute_severity, generate_recommendation, generate_explanation, SEVERITY_ORDER


class PolicyValidator:
    """
    Core policy validation engine.
    
    Builds a directed graph from ALLOW firewall rules and uses
    BFS/DFS graph traversal + reachability analysis to detect
    unintended communication paths that violate security policies.
    """

    def __init__(self):
        self.network_graph = NetworkGraph()
        self.violations: List[Dict] = []
        self.validation_id = ""

    def validate(
        self,
        zones: List[Dict],
        rules: List[Dict],
        policies: List[Dict],
    ) -> Dict:
        """
        Main entry point. Runs full policy validation.
        
        Steps:
        1. Build directed graph from ALLOW rules
        2. For each policy, check reachability 
        3. Find all paths (direct and indirect)
        4. Detect violation types
        5. Compute severity
        6. Generate explanations and recommendations
        """
        self.validation_id = f"VAL-{uuid.uuid4().hex[:8].upper()}"
        self.violations = []

        # Step 1: Build graph
        self.network_graph.build(zones, rules)

        zone_map = {z["name"]: z for z in zones}
        violation_counter = 1

        # Track already-reported (src, dst, type) to avoid duplicates
        reported = set()

        # Step 2: Process each security policy
        for policy in policies:
            src = policy["source_zone"]
            dst = policy["destination_zone"]
            required_action = policy["required_action"].upper()
            policy_severity = policy.get("severity", "MEDIUM")
            policy_id = policy["policy_id"]

            src_zone = zone_map.get(src, {})
            dst_zone = zone_map.get(dst, {})
            src_type = src_zone.get("zone_type", "Internal")
            dst_type = dst_zone.get("zone_type", "Internal")

            if required_action == "DENY":
                # Check direct connection
                if self.network_graph.has_direct_allow(src, dst):
                    vtype = "DIRECT_POLICY_VIOLATION"
                    key = (src, dst, vtype)
                    if key not in reported:
                        reported.add(key)
                        path = [src, dst]
                        rules_in_path = self.network_graph.get_edges_for_path(path)
                        severity = compute_severity(src_type, dst_type, vtype, policy_severity)
                        self.violations.append(self._make_violation(
                            f"V-{violation_counter:03d}",
                            self.validation_id,
                            severity,
                            vtype,
                            src, dst,
                            path,
                            generate_explanation(vtype, src, dst, path),
                            generate_recommendation(vtype, src, dst, path),
                            rules_in_path,
                            policy_id,
                        ))
                        violation_counter += 1

                # Step 3: Check indirect reachability (BFS)
                if self.network_graph.is_reachable(src, dst):
                    all_paths = self.network_graph.get_all_paths(src, dst)
                    for path in all_paths:
                        if len(path) <= 2:
                            # Direct path already handled above
                            continue
                        vtype = "INDIRECT_REACHABILITY_VIOLATION"
                        key = (src, dst, vtype, tuple(path))
                        if key not in reported:
                            reported.add(key)
                            rules_in_path = self.network_graph.get_edges_for_path(path)
                            severity = compute_severity(src_type, dst_type, vtype, policy_severity)
                            self.violations.append(self._make_violation(
                                f"V-{violation_counter:03d}",
                                self.validation_id,
                                severity,
                                vtype,
                                src, dst,
                                path,
                                generate_explanation(vtype, src, dst, path),
                                generate_recommendation(vtype, src, dst, path),
                                rules_in_path,
                                policy_id,
                            ))
                            violation_counter += 1

            elif required_action == "ALLOW":
                # Policy says this SHOULD be allowed — check if it actually is
                if not self.network_graph.has_direct_allow(src, dst):
                    vtype = "POLICY_MISMATCH"
                    key = (src, dst, vtype)
                    if key not in reported:
                        reported.add(key)
                        # Only flag if it's a significant mismatch (not just missing route)
                        # We flag it as LOW severity
                        severity = "LOW"
                        path = [src, dst]
                        self.violations.append(self._make_violation(
                            f"V-{violation_counter:03d}",
                            self.validation_id,
                            severity,
                            vtype,
                            src, dst,
                            path,
                            f"Policy requires '{src}' → '{dst}' to be ALLOWED, but no direct firewall rule exists.",
                            f"Add a firewall ALLOW rule from '{src}' to '{dst}' to comply with policy.",
                            [],
                            policy_id,
                        ))
                        violation_counter += 1

        # Step 4: Detect OVERLY_PERMISSIVE_RULE violations
        for rule in rules:
            if not rule.get("enabled", True):
                continue
            if self.network_graph.is_overly_permissive(rule):
                src = rule["source_zone"]
                dst = rule["destination_zone"]
                vtype = "OVERLY_PERMISSIVE_RULE"
                key = (src, dst, vtype)
                if key not in reported:
                    reported.add(key)
                    src_zone = zone_map.get(src, {})
                    dst_zone = zone_map.get(dst, {})
                    src_type = src_zone.get("zone_type", "Internal")
                    dst_type = dst_zone.get("zone_type", "Internal")
                    path = [src, dst]
                    severity = compute_severity(src_type, dst_type, vtype)
                    self.violations.append(self._make_violation(
                        f"V-{violation_counter:03d}",
                        self.validation_id,
                        severity,
                        vtype,
                        src, dst,
                        path,
                        generate_explanation(vtype, src, dst, path),
                        generate_recommendation(vtype, src, dst, path),
                        [rule["rule_id"]],
                        "",
                    ))
                    violation_counter += 1

        # Step 5: Detect RESTRICTED_ZONE_EXPOSURE
        untrusted_types = {"External", "Guest"}
        restricted_types = {"Restricted", "Management"}

        for zone in zones:
            if zone.get("zone_type") in restricted_types:
                dst = zone["name"]
                dst_type = zone.get("zone_type")
                for src_zone in zones:
                    if src_zone.get("zone_type") in untrusted_types:
                        src = src_zone["name"]
                        src_type = src_zone.get("zone_type")
                        if self.network_graph.is_reachable(src, dst):
                            paths = self.network_graph.get_all_paths(src, dst)
                            for path in paths:
                                vtype = "RESTRICTED_ZONE_EXPOSURE"
                                key = (src, dst, vtype, tuple(path))
                                if key not in reported:
                                    # Check this isn't already covered by INDIRECT_REACHABILITY
                                    already_covered = any(
                                        v["source_zone"] == src
                                        and v["destination_zone"] == dst
                                        and v["violation_type"] == "INDIRECT_REACHABILITY_VIOLATION"
                                        and v["path"] == " → ".join(path)
                                        for v in self.violations
                                    )
                                    if not already_covered:
                                        reported.add(key)
                                        rules_in_path = self.network_graph.get_edges_for_path(path)
                                        severity = compute_severity(src_type, dst_type, vtype)
                                        self.violations.append(self._make_violation(
                                            f"V-{violation_counter:03d}",
                                            self.validation_id,
                                            severity,
                                            vtype,
                                            src, dst,
                                            path,
                                            generate_explanation(vtype, src, dst, path),
                                            generate_recommendation(vtype, src, dst, path),
                                            rules_in_path,
                                            "",
                                        ))
                                        violation_counter += 1

        # Sort violations by severity
        self.violations.sort(
            key=lambda v: SEVERITY_ORDER.get(v["severity"], 0),
            reverse=True
        )

        # Reassign IDs after sorting
        for i, v in enumerate(self.violations, 1):
            v["id"] = f"V-{i:03d}"

        # Compute summary
        paths_analyzed = self._count_paths_analyzed(zones, policies)
        severity_counts = self._count_severities()

        return {
            "validation_id": self.validation_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "summary": {
                "zones": len(zones),
                "rules": len(rules),
                "policies": len(policies),
                "paths_analyzed": paths_analyzed,
                "violations": len(self.violations),
                "critical": severity_counts.get("CRITICAL", 0),
                "high": severity_counts.get("HIGH", 0),
                "medium": severity_counts.get("MEDIUM", 0),
                "low": severity_counts.get("LOW", 0),
                "info": severity_counts.get("INFO", 0),
            },
            "violations": self.violations,
        }

    def _make_violation(
        self,
        vid: str,
        validation_id: str,
        severity: str,
        vtype: str,
        src: str,
        dst: str,
        path: List[str],
        explanation: str,
        recommendation: str,
        rules: List[str],
        policy_id: str,
    ) -> Dict:
        return {
            "id": vid,
            "validation_id": validation_id,
            "severity": severity,
            "violation_type": vtype,
            "source_zone": src,
            "destination_zone": dst,
            "path": " → ".join(path),
            "explanation": explanation,
            "recommendation": recommendation,
            "related_rules": ", ".join(rules),
            "status": "OPEN",
            "policy_id": policy_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

    def _count_paths_analyzed(self, zones: List[Dict], policies: List[Dict]) -> int:
        """Estimate number of paths analyzed."""
        count = 0
        for policy in policies:
            src = policy["source_zone"]
            dst = policy["destination_zone"]
            paths = self.network_graph.get_all_paths(src, dst)
            count += max(1, len(paths))
        return count

    def _count_severities(self) -> Dict[str, int]:
        counts = {}
        for v in self.violations:
            s = v["severity"]
            counts[s] = counts.get(s, 0) + 1
        return counts
