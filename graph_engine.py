import networkx as nx
from typing import List, Dict, Tuple, Optional, Set
from collections import defaultdict


class NetworkGraph:
    """
    Represents the network as a directed graph.
    Nodes = zones, Edges = ALLOW firewall rules.
    """

    def __init__(self):
        self.graph = nx.DiGraph()
        self.zones: Dict[str, dict] = {}
        self.allow_rules: List[dict] = []
        self.deny_rules: List[dict] = []

    def build(self, zones: List[dict], rules: List[dict]) -> None:
        """Build the directed graph from zones and firewall rules."""
        self.graph.clear()
        self.zones = {z["name"]: z for z in zones}
        self.allow_rules = []
        self.deny_rules = []

        # Add all zones as nodes
        for zone in zones:
            self.graph.add_node(
                zone["name"],
                trust_level=zone.get("trust_level", 0),
                zone_type=zone.get("zone_type", "Internal"),
                cidr=zone.get("network_cidr", ""),
            )

        # Add edges for ALLOW rules only (enabled rules)
        for rule in rules:
            if not rule.get("enabled", True):
                continue
            src = rule["source_zone"]
            dst = rule["destination_zone"]
            action = rule["action"].upper()

            if action == "ALLOW":
                self.allow_rules.append(rule)
                if src in self.graph and dst in self.graph:
                    # Store multiple rules per edge
                    if self.graph.has_edge(src, dst):
                        self.graph[src][dst]["rules"].append(rule["rule_id"])
                    else:
                        self.graph.add_edge(
                            src,
                            dst,
                            action="ALLOW",
                            rules=[rule["rule_id"]],
                            protocol=rule.get("protocol", "ANY"),
                            dst_port=rule.get("destination_port", "ANY"),
                        )
            elif action == "DENY":
                self.deny_rules.append(rule)

    def is_reachable(self, source: str, destination: str) -> bool:
        """Check if destination is reachable from source via BFS."""
        if source not in self.graph or destination not in self.graph:
            return False
        return nx.has_path(self.graph, source, destination)

    def get_all_paths(self, source: str, destination: str) -> List[List[str]]:
        """Return all simple paths from source to destination."""
        if source not in self.graph or destination not in self.graph:
            return []
        try:
            paths = list(nx.all_simple_paths(self.graph, source, destination, cutoff=10))
            return paths
        except nx.NetworkXNoPath:
            return []

    def get_shortest_path(self, source: str, destination: str) -> Optional[List[str]]:
        """Return shortest path from source to destination."""
        if source not in self.graph or destination not in self.graph:
            return None
        try:
            return nx.shortest_path(self.graph, source, destination)
        except nx.NetworkXNoPath:
            return None

    def get_reachable_zones(self, source: str) -> Set[str]:
        """Return all zones reachable from source using BFS."""
        if source not in self.graph:
            return set()
        return set(nx.descendants(self.graph, source))

    def get_direct_neighbors(self, zone: str) -> List[str]:
        """Return direct successors of a zone."""
        if zone not in self.graph:
            return []
        return list(self.graph.successors(zone))

    def bfs_paths(self, source: str, destination: str) -> List[List[str]]:
        """BFS-based path finding."""
        if source not in self.graph or destination not in self.graph:
            return []
        paths = []
        queue = [[source]]
        visited_paths = set()

        while queue:
            path = queue.pop(0)
            node = path[-1]
            if node == destination:
                path_key = tuple(path)
                if path_key not in visited_paths:
                    visited_paths.add(path_key)
                    paths.append(path)
                continue
            if len(path) > 10:
                continue
            for neighbor in self.graph.successors(node):
                if neighbor not in path:
                    queue.append(path + [neighbor])
        return paths

    def get_edges_for_path(self, path: List[str]) -> List[str]:
        """Return rule IDs that form a given path."""
        rules = []
        for i in range(len(path) - 1):
            src, dst = path[i], path[i + 1]
            if self.graph.has_edge(src, dst):
                rules.extend(self.graph[src][dst].get("rules", []))
        return rules

    def get_zone_connectivity(self) -> List[Dict]:
        """Return connectivity stats per zone."""
        stats = []
        for node in self.graph.nodes():
            in_degree = self.graph.in_degree(node)
            out_degree = self.graph.out_degree(node)
            reachable = len(nx.descendants(self.graph, node))
            stats.append({
                "zone": node,
                "in_connections": in_degree,
                "out_connections": out_degree,
                "reachable_zones": reachable,
            })
        return stats

    def has_direct_allow(self, source: str, destination: str) -> bool:
        """Check if there is a direct ALLOW edge."""
        return self.graph.has_edge(source, destination)

    def is_overly_permissive(self, rule: dict) -> bool:
        """Detect if a rule uses ANY source or is excessively permissive."""
        src = rule.get("source_zone", "")
        dst = rule.get("destination_zone", "")
        protocol = rule.get("protocol", "ANY")
        dst_port = rule.get("destination_port", "ANY")
        action = rule.get("action", "")

        if action != "ALLOW":
            return False

        # ANY protocol + ANY port is permissive
        if protocol == "ANY" and dst_port == "ANY":
            dst_zone = self.zones.get(dst, {})
            if dst_zone.get("zone_type") in ("Restricted", "Management", "Internal"):
                return True

        return False

    def get_graph_data(self) -> Dict:
        """Return graph data for visualization."""
        nodes = []
        for n in self.graph.nodes(data=True):
            nodes.append({
                "id": n[0],
                "label": n[0],
                "zone_type": n[1].get("zone_type", "Internal"),
                "trust_level": n[1].get("trust_level", 0),
                "cidr": n[1].get("cidr", ""),
            })

        edges = []
        for u, v, data in self.graph.edges(data=True):
            edges.append({
                "source": u,
                "target": v,
                "action": data.get("action", "ALLOW"),
                "rules": data.get("rules", []),
                "protocol": data.get("protocol", "ANY"),
                "dst_port": data.get("dst_port", "ANY"),
            })

        # Also add deny edges for visualization
        for rule in self.deny_rules:
            if rule.get("enabled", True):
                edges.append({
                    "source": rule["source_zone"],
                    "target": rule["destination_zone"],
                    "action": "DENY",
                    "rules": [rule["rule_id"]],
                    "protocol": rule.get("protocol", "ANY"),
                    "dst_port": rule.get("destination_port", "ANY"),
                })

        return {"nodes": nodes, "edges": edges}
