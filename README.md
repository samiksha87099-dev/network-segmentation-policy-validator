# Network Segmentation Policy Validator

> **Analyze network zones and firewall rules to detect unintended communication paths and policy violations.**

[![Cybersecurity](https://img.shields.io/badge/domain-Cybersecurity-blue)](#)
[![Network Security](https://img.shields.io/badge/topic-Network%20Security-red)](#)
[![Graph Analysis](https://img.shields.io/badge/algorithm-Graph%20Analysis-green)](#)

---

## Problem Statement

Modern enterprise networks are divided into multiple security zones (Internet, DMZ, Application, Database, Admin, Guest). Firewall rules control communication between these zones. However, **misconfigured or overly permissive rules can create unintended communication paths** that violate the organization's segmentation policy.

**Example Problem:**
- Policy says: `Internet → Database = DENY`
- Firewall rules allow: `Internet → DMZ`, `DMZ → Application`, `Application → Database`
- Result: Internet *can indirectly reach* Database — **a critical policy violation** — even though no direct Internet→Database ALLOW rule exists.

This tool detects exactly these kinds of violations using **directed graph analysis**.

---

## Objectives

1. Model network zones as graph nodes and firewall ALLOW rules as directed edges
2. Use BFS/DFS graph traversal to find all reachable paths between zones
3. Compare reachability against defined security policies
4. Detect direct violations, indirect path violations, overly permissive rules, and restricted zone exposures
5. Generate severity ratings, explanations, and actionable recommendations
6. Provide an interactive visualization of the network topology

---

## Features

- **Network Zone Management** — Add, edit, delete, search, filter zones with type and trust level
- **Firewall Rule Management** — Full CRUD, import from JSON/CSV, export, enable/disable rules
- **Security Policy Management** — Define required access controls (ALLOW/DENY) per zone pair
- **Graph-Based Validation Engine** — BFS/DFS reachability analysis using NetworkX
- **Interactive Network Topology** — React Flow visualization with violation path highlighting
- **Violation Detection** — 6 violation types with severity, explanation, recommendation
- **Violation Management** — Acknowledge and resolve violations
- **Reports & Charts** — Recharts analytics for severity, type, and status distributions
- **Import/Export** — JSON and CSV support
- **Sample Data** — Pre-loaded demo data on first startup

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   React Frontend                     │
│  Dashboard │ Topology │ Rules │ Policies │ Validator │
│         React Flow      │      Recharts              │
└────────────────────┬────────────────────────────────┘
                     │  HTTP/REST  (localhost:5173 → :8000)
┌────────────────────▼────────────────────────────────┐
│              FastAPI Backend (Python)                │
│  /api/zones  /api/rules  /api/policies               │
│  /api/validate  /api/violations  /api/graph           │
│  /api/statistics  /api/import  /api/export           │
└────────────────────┬────────────────────────────────┘
                     │
          ┌──────────▼──────────┐
          │   PolicyValidator   │  ← Core engine
          │   NetworkX DiGraph  │
          │   BFS / DFS / Paths │
          └──────────┬──────────┘
                     │
          ┌──────────▼──────────┐
          │   SQLite Database   │
          │  zones / rules /    │
          │  policies / viols   │
          └─────────────────────┘
```

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS |
| Graph UI | React Flow |
| Charts | Recharts |
| Icons | Lucide React |
| State | TanStack Query |
| Backend | Python 3.11+, FastAPI |
| Graph Engine | NetworkX |
| Database | SQLite + SQLAlchemy |
| Validation | Pydantic v2 |

---

## Graph Algorithm Explanation

### Building the Graph

```
Zones → Graph Nodes
ALLOW Firewall Rules → Directed Edges
DENY Rules → Not added as edges (checked separately)
```

Example graph built from sample data:
```
Internet ──ALLOW──→ DMZ ──ALLOW──→ Application ──ALLOW──→ Database
                                        ↑
Admin ──────────────────────────────────┘ (also ALLOW to Database)
Guest ──ALLOW──→ Application   ← MISCONFIGURATION
```

### Policy Validation — How Violations Are Detected

For every DENY policy `(source → destination)`:

1. **Direct check**: Does a direct ALLOW edge exist? → `DIRECT_POLICY_VIOLATION`
2. **BFS reachability**: Is destination reachable from source via any path?
   - `nx.has_path(graph, source, destination)` using BFS
   - `nx.all_simple_paths(graph, source, destination)` to find all paths
   - If reachable with path length > 2 → `INDIRECT_REACHABILITY_VIOLATION`
3. **Overly permissive**: ANY protocol + ANY port to Restricted/Internal zone → `OVERLY_PERMISSIVE_RULE`
4. **Restricted exposure**: Untrusted zone (External/Guest) can reach Restricted/Management → `RESTRICTED_ZONE_EXPOSURE`

**Key insight**: Even though `Internet → Database` has a DENY rule, the validator finds:
```
Internet → DMZ → Application → Database
```
via BFS traversal of ALLOW edges, and reports a **CRITICAL INDIRECT_REACHABILITY_VIOLATION**.

### Severity Scoring

```
Zone Type Matrix:
  External → Restricted  = CRITICAL
  Guest → Restricted     = CRITICAL  
  External → Internal    = HIGH
  Guest → Internal       = HIGH
  DMZ → Restricted       = HIGH

Combined with violation type and policy-defined severity.
Final severity = max(matrix_severity, violation_type_severity, policy_severity)
```

---

## Installation

### Prerequisites

- Python 3.9+ 
- Node.js 18+
- npm or yarn

### Backend Setup

```bash
cd network-segmentation-validator/backend

# Create virtual environment (recommended)
python -m venv venv

# Activate (Windows)
venv\Scripts\activate
# Activate (Linux/Mac)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Frontend Setup

```bash
cd network-segmentation-validator/frontend
npm install
```

---

## How to Run

### Start the Backend

```bash
cd network-segmentation-validator/backend
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend runs at: **http://localhost:8000**  
API docs (Swagger): **http://localhost:8000/api/docs**

### Start the Frontend

```bash
cd network-segmentation-validator/frontend
npm run dev
```

Frontend runs at: **http://localhost:5173**

---

## Docker (Alternative)

```bash
cd network-segmentation-validator
docker-compose up --build
```

- Frontend: http://localhost:5173
- Backend: http://localhost:8000

---

## API Documentation

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/zones` | List all zones |
| POST | `/api/zones` | Create zone |
| PUT | `/api/zones/{id}` | Update zone |
| DELETE | `/api/zones/{id}` | Delete zone |
| GET | `/api/rules` | List all firewall rules |
| POST | `/api/rules` | Create rule |
| PUT | `/api/rules/{id}` | Update rule |
| DELETE | `/api/rules/{id}` | Delete rule |
| GET | `/api/policies` | List all policies |
| POST | `/api/policies` | Create policy |
| PUT | `/api/policies/{id}` | Update policy |
| DELETE | `/api/policies/{id}` | Delete policy |
| POST | `/api/validate` | **Run policy validation** |
| GET | `/api/violations` | List all violations |
| GET | `/api/violations/{id}` | Get violation detail |
| PUT | `/api/violations/{id}/status` | Update violation status |
| GET | `/api/graph` | Get graph data for visualization |
| GET | `/api/statistics` | Get dashboard statistics |
| POST | `/api/import` | Import rules from JSON/CSV |
| GET | `/api/export` | Export all data |
| GET | `/api/reports/summary` | Get report summary |

---

## Sample Input

### Import JSON Format

```json
{
  "rules": [
    {
      "rule_id": "FW-001",
      "source_zone": "Internet",
      "destination_zone": "DMZ",
      "protocol": "TCP",
      "destination_port": 443,
      "action": "ALLOW",
      "priority": 10
    }
  ]
}
```

## Sample Validation Output

```json
{
  "validation_id": "VAL-A1B2C3D4",
  "timestamp": "2024-01-15T10:30:00",
  "summary": {
    "zones": 6,
    "rules": 12,
    "policies": 7,
    "paths_analyzed": 14,
    "violations": 7,
    "critical": 3,
    "high": 3,
    "medium": 1
  },
  "violations": [
    {
      "id": "V-001",
      "severity": "CRITICAL",
      "violation_type": "INDIRECT_REACHABILITY_VIOLATION",
      "source_zone": "Internet",
      "destination_zone": "Database",
      "path": "Internet → DMZ → Application → Database",
      "explanation": "'Internet' can indirectly reach 'Database' through the path: Internet → DMZ → Application → Database.",
      "recommendation": "Break the indirect communication path. Consider blocking the connection at an intermediate zone."
    }
  ]
}
```

---

## Testing

```bash
cd network-segmentation-validator/backend
# Activate venv first, then:
pytest tests/test_validator.py -v
```

Test coverage includes:
- `test_direct_policy_violation` — direct ALLOW contradicts DENY policy
- `test_indirect_reachability` — BFS finds Internet→DB via DMZ→App→DB
- `test_guest_database_block` — Guest→DB via Application chain
- `test_guest_application_violation` — direct ALLOW contradicts DENY policy
- `test_allowed_application_database` — compliant rule generates no violation
- `test_overly_permissive_rule` — ANY/ANY to Restricted zone flagged
- `test_validation_summary` — response structure validation
- `test_violation_path_format` — path string format
- Graph engine: reachability, BFS, shortest path, node/edge creation

---

## Demo Walkthrough

1. **Start both servers** (backend + frontend)
2. Open **http://localhost:5173**
3. **Dashboard** shows 6 zones, 12 rules, 7 policies loaded
4. Navigate to **Network Topology** — see Internet→DMZ→App→DB graph
5. Go to **Validator** — click **Run Validation**
6. See violations: `V-001 CRITICAL — Internet → Database (INDIRECT)`
7. Click a violation — see full path, explanation, recommendation
8. Go to **Network Topology** — click violation path to highlight it in red
9. Go to **Firewall Rules** — disable `FW-003` (DMZ→Application)
10. Return to **Validator** — run again — Internet→Database violation resolves
11. Go to **Violations** — mark remaining violations as Acknowledged/Resolved

---

## Project Structure

```
network-segmentation-validator/
├── backend/
│   ├── main.py              # FastAPI app, startup, CORS
│   ├── database.py          # SQLAlchemy models, SQLite setup
│   ├── schemas.py           # Pydantic request/response schemas
│   ├── graph_engine.py      # NetworkX directed graph, BFS/DFS
│   ├── validator.py         # Core policy validation engine
│   ├── severity.py          # Severity scoring & recommendations
│   ├── sample_data.py       # Pre-loaded demo data
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── routers/
│   │   ├── zones.py
│   │   ├── rules.py
│   │   ├── policies.py
│   │   ├── validation.py    # validate, violations, graph, stats, import, export
│   │   └── reports.py
│   └── tests/
│       └── test_validator.py
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── index.css        # Tailwind + custom dark theme
│   │   ├── components/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── TopBar.tsx
│   │   │   ├── Badges.tsx
│   │   │   ├── StatCard.tsx
│   │   │   └── Modal.tsx
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── NetworkTopology.tsx  # React Flow
│   │   │   ├── FirewallRules.tsx
│   │   │   ├── Policies.tsx
│   │   │   ├── Validator.tsx
│   │   │   ├── Violations.tsx
│   │   │   ├── Reports.tsx
│   │   │   ├── ZonesManagement.tsx
│   │   │   └── Settings.tsx
│   │   ├── services/api.ts  # Axios API client
│   │   ├── types/index.ts   # TypeScript interfaces
│   │   └── utils/formatters.ts
│   ├── package.json
│   ├── vite.config.ts       # Proxy /api → localhost:8000
│   ├── tailwind.config.js
│   └── Dockerfile
│
├── sample_data/
│   ├── zones.json
│   ├── firewall_rules.json
│   └── policies.json
│
├── docker-compose.yml
└── README.md
```

---

## Future Enhancements

- Export PDF report with embedded graph screenshot
- RBAC: user roles (admin, analyst, read-only)
- Timeline: track violation history across validation runs
- Integration with real firewall APIs (Palo Alto, Cisco ASA)
- Automated remediation suggestions with specific rule changes
- Alert notifications (email/Slack) on new CRITICAL violations
- Multi-tenant support for managed security service providers
