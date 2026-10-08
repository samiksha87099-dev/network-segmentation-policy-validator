import os
import sys
from contextlib import asynccontextmanager

# Ensure UTF-8 output on Windows so print() never crashes on unicode
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

# Add backend directory to path
sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import create_tables, SessionLocal, ZoneDB, FirewallRuleDB, PolicyDB
from routers import zones, rules, policies, validation, reports
from sample_data import SAMPLE_ZONES, SAMPLE_RULES, SAMPLE_POLICIES
from datetime import datetime, timezone


def load_sample_data():
    """Load sample data if database is empty."""
    db = SessionLocal()
    try:
        if db.query(ZoneDB).count() == 0:
            for z in SAMPLE_ZONES:
                db_zone = ZoneDB(
                    id=z["id"],
                    name=z["name"],
                    description=z["description"],
                    trust_level=z["trust_level"],
                    network_cidr=z["network_cidr"],
                    zone_type=z["zone_type"],
                    created_at=datetime.now(timezone.utc),
                )
                db.add(db_zone)
            db.commit()
            print(f"[OK] Loaded {len(SAMPLE_ZONES)} sample zones.")

        if db.query(FirewallRuleDB).count() == 0:
            for r in SAMPLE_RULES:
                db_rule = FirewallRuleDB(
                    rule_id=r["rule_id"],
                    source_zone=r["source_zone"],
                    destination_zone=r["destination_zone"],
                    protocol=r["protocol"],
                    source_port=r["source_port"],
                    destination_port=r["destination_port"],
                    action=r["action"],
                    direction=r["direction"],
                    priority=r["priority"],
                    description=r["description"],
                    enabled=r["enabled"],
                    created_at=datetime.now(timezone.utc),
                )
                db.add(db_rule)
            db.commit()
            print(f"[OK] Loaded {len(SAMPLE_RULES)} sample firewall rules.")

        if db.query(PolicyDB).count() == 0:
            from database import PolicyDB as PDB
            for p in SAMPLE_POLICIES:
                db_policy = PDB(
                    policy_id=p["policy_id"],
                    source_zone=p["source_zone"],
                    destination_zone=p["destination_zone"],
                    protocol=p["protocol"],
                    port=p["port"],
                    required_action=p["required_action"],
                    severity=p["severity"],
                    description=p["description"],
                    created_at=datetime.now(timezone.utc),
                )
                db.add(db_policy)
            db.commit()
            print(f"[OK] Loaded {len(SAMPLE_POLICIES)} sample policies.")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_tables()
    load_sample_data()
    print("[OK] Network Segmentation Policy Validator API started.")
    print("[OK] API docs available at http://localhost:8000/api/docs")
    yield


app = FastAPI(
    title="Network Segmentation Policy Validator",
    description="Analyze network zones and firewall rules to detect unintended communication paths and policy violations.",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(zones.router)
app.include_router(rules.router)
app.include_router(policies.router)
app.include_router(validation.router)
app.include_router(reports.router)


@app.get("/")
def root():
    return {
        "name": "Network Segmentation Policy Validator",
        "version": "1.0.0",
        "status": "running",
        "docs": "/api/docs",
    }


@app.get("/health")
def health():
    return {"status": "ok"}
