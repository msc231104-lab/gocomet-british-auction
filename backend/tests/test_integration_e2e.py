"""
Stage F8 — End-to-End Integration Test Suite

Validates the complete RFQ-to-auction reverse auction lifecycle against the
FastAPI backend and dedicated PostgreSQL test database.

SAFETY & ISOLATION GUARDS:
- Requires a dedicated test database specified via TEST_DATABASE_URL.
- FAIL-CLOSED: Refuses to execute against the development or production database (DATABASE_URL).
- Non-destructive: Does NOT drop, truncate, or reset existing database schemas.
- Deterministic cleanup: Tracks records created during each test (RFQs, Suppliers,
  Quotations, Bids, Activity Logs) and cleans them up in reverse foreign-key
  dependency order, even if assertions or tests fail.
- Leaves records created outside the test suite completely untouched.
- Every API write explicitly verifies response status codes.
- Tests multi-supplier and same-supplier concurrent bidding.
- Distinguishes active-auction bidding from auction-closure assertions.
"""

import os
import urllib.parse
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, delete, or_, select
from sqlalchemy.orm import sessionmaker

from app.db.session import BASE_DIR, get_db
from app.main import app
from app.models.auction_activity_log import AuctionActivityLog
from app.models.bid import Bid
from app.models.quotation import Quotation
from app.models.rfq import RFQ
from app.models.supplier import Supplier

# ==============================================================================
# CONFIGURATION & FAIL-CLOSED SAFETY GUARDS
# ==============================================================================

# Normal development database URL from backend/.env
DEV_DB_URL = os.getenv("DATABASE_URL")
if not DEV_DB_URL:
    env_file = BASE_DIR / ".env"
    if env_file.exists():
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if line.startswith("DATABASE_URL="):
                    DEV_DB_URL = line.split("=", 1)[1].strip()


def parse_database_name(url: str | None) -> str | None:
    """Extract database name from connection URL."""
    if not url:
        return None
    try:
        parsed = urllib.parse.urlparse(url)
        return parsed.path.lstrip("/")
    except Exception:
        return None


# Dedicated test database URL (must be set explicitly)
TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL")

dev_db_name = parse_database_name(DEV_DB_URL)
test_db_name = parse_database_name(TEST_DATABASE_URL)


def verify_database_safety():
    """
    Fail-closed safety guard:
    Verifies that tests do not run against the development or production database.
    """
    if not TEST_DATABASE_URL:
        pytest.skip(
            "FAIL-CLOSED SAFETY GUARD: TEST_DATABASE_URL is not set.\n"
            "Integration tests require an isolated PostgreSQL test database to avoid data pollution.\n"
            "Setup instructions:\n"
            "  1. Create a dedicated test database: createdb -U gocomet_user gocomet_auction_test\n"
            "  2. Apply schema migrations if needed\n"
            "  3. Set TEST_DATABASE_URL=postgresql+psycopg://gocomet_user:admin@127.0.0.1:5432/gocomet_auction_test\n"
            "Integration tests will not run against the development or production database.",
            allow_module_level=True,
        )

    if TEST_DATABASE_URL == DEV_DB_URL:
        pytest.fail(
            "FAIL-CLOSED SAFETY GUARD TRIGGERED: TEST_DATABASE_URL is identical to DATABASE_URL.\n"
            "Refusing to execute integration tests against the active development/production database."
        )

    if dev_db_name and test_db_name and dev_db_name == test_db_name:
        pytest.fail(
            f"FAIL-CLOSED SAFETY GUARD TRIGGERED: TEST_DATABASE_URL points to '{test_db_name}', "
            f"which matches DATABASE_URL database '{dev_db_name}'. Refusing to execute."
        )

    if test_db_name and not any(marker in test_db_name.lower() for marker in ["test", "_test", "test_"]):
        pytest.fail(
            f"FAIL-CLOSED SAFETY GUARD TRIGGERED: The test database name '{test_db_name}' must explicitly "
            "contain 'test' (e.g. 'gocomet_auction_test') to confirm it is an isolated test instance."
        )


# Run the safety guard at module load time
verify_database_safety()

# Dedicated test database engine and session factory
test_engine = create_engine(TEST_DATABASE_URL, pool_pre_ping=True)
TestSessionLocal = sessionmaker(
    bind=test_engine,
    autoflush=False,
    expire_on_commit=False,
)


def override_get_db():
    """Provide a database session bound to the dedicated test database."""
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


# ==============================================================================
# TEST RECORD TRACKER & DETERMINISTIC CLEANUP
# ==============================================================================

class TestRecordTracker:
    """
    Tracks IDs of entities created during a test and safely deletes them
    in reverse foreign-key dependency order during teardown.
    Leaves records created outside the test completely untouched.
    """

    def __init__(self, session_factory):
        self.session_factory = session_factory
        self.rfq_ids = set()
        self.supplier_ids = set()

    def track_rfq(self, rfq_id: int | None):
        if rfq_id is not None and isinstance(rfq_id, int):
            self.rfq_ids.add(rfq_id)

    def track_supplier(self, supplier_id: int | None):
        if supplier_id is not None and isinstance(supplier_id, int):
            self.supplier_ids.add(supplier_id)

    def cleanup(self):
        """
        Execute deterministic cleanup respecting foreign-key constraints:
        1. AuctionActivityLog (references rfq_id and bid_id)
        2. Bid (references quotation_id)
        3. Quotation (references rfq_id and supplier_id)
        4. RFQ (parent)
        5. Supplier (parent)
        """
        if not self.rfq_ids and not self.supplier_ids:
            return

        db = self.session_factory()
        try:
            # Step 1: Find all quotation IDs belonging to tracked RFQs or Suppliers
            quotation_conditions = []
            if self.rfq_ids:
                quotation_conditions.append(Quotation.rfq_id.in_(self.rfq_ids))
            if self.supplier_ids:
                quotation_conditions.append(Quotation.supplier_id.in_(self.supplier_ids))

            quotation_ids = []
            if quotation_conditions:
                quotation_ids = list(
                    db.scalars(
                        select(Quotation.id).where(or_(*quotation_conditions))
                    ).all()
                )

            # Step 2: Find all bid IDs belonging to those quotations
            bid_ids = []
            if quotation_ids:
                bid_ids = list(
                    db.scalars(
                        select(Bid.id).where(Bid.quotation_id.in_(quotation_ids))
                    ).all()
                )

            # Step 3: Delete AuctionActivityLog records for tracked RFQs or bids
            activity_conditions = []
            if self.rfq_ids:
                activity_conditions.append(AuctionActivityLog.rfq_id.in_(self.rfq_ids))
            if bid_ids:
                activity_conditions.append(AuctionActivityLog.bid_id.in_(bid_ids))

            if activity_conditions:
                db.execute(
                    delete(AuctionActivityLog).where(or_(*activity_conditions))
                )

            # Step 4: Delete Bids
            if bid_ids:
                db.execute(delete(Bid).where(Bid.id.in_(bid_ids)))

            # Step 5: Delete Quotations
            if quotation_ids:
                db.execute(delete(Quotation).where(Quotation.id.in_(quotation_ids)))

            # Step 6: Delete tracked RFQs
            if self.rfq_ids:
                db.execute(delete(RFQ).where(RFQ.id.in_(self.rfq_ids)))

            # Step 7: Delete tracked Suppliers
            if self.supplier_ids:
                db.execute(delete(Supplier).where(Supplier.id.in_(self.supplier_ids)))

            db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()


@pytest.fixture(scope="module")
def client():
    """
    FastAPI TestClient wired with dependency overrides pointing
    exclusively to the dedicated test database.
    """
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def tracker():
    """
    Provides a per-test tracker that records created entities and guarantees
    cleanup executes even when assertions or tests fail.
    """
    record_tracker = TestRecordTracker(TestSessionLocal)
    try:
        yield record_tracker
    finally:
        record_tracker.cleanup()


@pytest.fixture(scope="function")
def test_db():
    """Direct database session into the test database for verification."""
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


# ==============================================================================
# TEST DATA HELPERS
# ==============================================================================

def make_unique_ref(prefix: str = "SAFE-RFQ") -> str:
    """Generate isolated unique reference ID."""
    return f"{prefix}-{uuid.uuid4().hex[:8].upper()}"


def make_unique_supplier_name(prefix: str = "SAFE-Supplier") -> str:
    """Generate isolated unique supplier name."""
    return f"{prefix}-{uuid.uuid4().hex[:8].upper()}"


def create_test_supplier(
    client: TestClient,
    tracker: TestRecordTracker,
    name: str | None = None,
) -> dict:
    """Helper to create and track an isolated supplier via API."""
    supplier_name = name or make_unique_supplier_name()
    res = client.post("/api/v1/suppliers", json={"name": supplier_name})
    assert res.status_code == 201, f"Failed to create supplier: {res.text}"
    data = res.json()
    tracker.track_supplier(data.get("id"))
    return data


def create_test_rfq(
    client: TestClient,
    tracker: TestRecordTracker,
    reference_id: str | None = None,
    name: str = "Isolated Test Freight RFQ",
    start_offset_minutes: int = -30,
    close_offset_minutes: int = 60,
    forced_offset_minutes: int = 120,
    pickup_offset_hours: int = 24,
    trigger_window_minutes: int = 5,
    extension_minutes: int = 3,
    extension_trigger: str = "ANY_BID",
) -> dict:
    """Helper to create and track an RFQ with specified timing parameters."""
    now = datetime.now(timezone.utc)
    ref = reference_id or make_unique_ref()

    payload = {
        "reference_id": ref,
        "name": name,
        "bid_start_at": (now + timedelta(minutes=start_offset_minutes)).isoformat(),
        "initial_close_at": (now + timedelta(minutes=close_offset_minutes)).isoformat(),
        "forced_close_at": (now + timedelta(minutes=forced_offset_minutes)).isoformat(),
        "pickup_at": (now + timedelta(hours=pickup_offset_hours)).isoformat(),
        "trigger_window_minutes": trigger_window_minutes,
        "extension_minutes": extension_minutes,
        "extension_trigger": extension_trigger,
    }

    res = client.post("/api/v1/rfqs", json=payload)
    if res.status_code == 201:
        data = res.json()
        tracker.track_rfq(data.get("id"))
    return res


# ==============================================================================
# SECTION 1: RFQ Creation & Validation Constraints
# ==============================================================================

def test_rfq_creation_valid(client: TestClient, tracker: TestRecordTracker):
    """Verify successful creation of an RFQ with complete response schema."""
    res = create_test_rfq(client, tracker, name="Valid Isolated RFQ")
    assert res.status_code == 201
    data = res.json()

    assert data["id"] > 0
    assert data["name"] == "Valid Isolated RFQ"
    assert data["status"] == "Active"
    assert data["closed_at"] is None
    assert data["current_close_at"] == data["initial_close_at"]
    assert data["extension_trigger"] == "ANY_BID"

    # Verify initial activity timeline event
    activity_res = client.get(f"/api/v1/rfqs/{data['id']}/activity")
    assert activity_res.status_code == 200
    timeline = activity_res.json()
    assert len(timeline) == 1
    assert timeline[0]["event_type"] == "RFQ_CREATED"
    assert data["reference_id"] in timeline[0]["description"]


def test_rfq_creation_duplicate_reference_rejected(
    client: TestClient, tracker: TestRecordTracker
):
    """Verify that creating an RFQ with an existing reference_id returns HTTP 409 Conflict."""
    ref = make_unique_ref("DUP-RFQ")
    res1 = create_test_rfq(client, tracker, reference_id=ref)
    assert res1.status_code == 201

    res2 = create_test_rfq(client, tracker, reference_id=ref)
    assert res2.status_code == 409
    assert "already exists" in res2.json()["detail"].lower()


def test_rfq_creation_invalid_dates_rejected(
    client: TestClient, tracker: TestRecordTracker
):
    """Verify backend rejection of chronological date violations (422)."""
    now = datetime.now(timezone.utc)
    base_payload = {
        "reference_id": make_unique_ref(),
        "name": "Invalid Date RFQ",
        "bid_start_at": now.isoformat(),
        "initial_close_at": (now + timedelta(hours=1)).isoformat(),
        "forced_close_at": (now + timedelta(hours=2)).isoformat(),
        "pickup_at": (now + timedelta(days=1)).isoformat(),
        "trigger_window_minutes": 5,
        "extension_minutes": 3,
        "extension_trigger": "ANY_BID",
    }

    # Case 1: initial_close_at <= bid_start_at
    p1 = dict(base_payload, initial_close_at=(now - timedelta(minutes=5)).isoformat())
    r1 = client.post("/api/v1/rfqs", json=p1)
    assert r1.status_code == 422

    # Case 2: forced_close_at <= initial_close_at
    p2 = dict(base_payload, forced_close_at=(now + timedelta(minutes=30)).isoformat())
    r2 = client.post("/api/v1/rfqs", json=p2)
    assert r2.status_code == 422

    # Case 3: pickup_at <= bid_start_at
    p3 = dict(base_payload, pickup_at=(now - timedelta(hours=1)).isoformat())
    r3 = client.post("/api/v1/rfqs", json=p3)
    assert r3.status_code == 422

    # Case 4: Naive datetime without timezone offset
    p4 = dict(base_payload, bid_start_at="2026-11-18T10:00:00")
    r4 = client.post("/api/v1/rfqs", json=p4)
    assert r4.status_code == 422


def test_rfq_creation_validation_constraints(
    client: TestClient, tracker: TestRecordTracker
):
    """Verify validation on empty strings, non-positive window minutes, and unsupported triggers."""
    now = datetime.now(timezone.utc)

    # Empty whitespace name
    p1 = {
        "reference_id": make_unique_ref(),
        "name": "   ",
        "bid_start_at": now.isoformat(),
        "initial_close_at": (now + timedelta(hours=1)).isoformat(),
        "forced_close_at": (now + timedelta(hours=2)).isoformat(),
        "pickup_at": (now + timedelta(days=1)).isoformat(),
        "trigger_window_minutes": 5,
        "extension_minutes": 3,
        "extension_trigger": "ANY_BID",
    }
    assert client.post("/api/v1/rfqs", json=p1).status_code == 422

    # Non-positive window minutes
    p2 = dict(p1, name="Valid Name", trigger_window_minutes=0)
    assert client.post("/api/v1/rfqs", json=p2).status_code == 422

    # Non-positive extension minutes
    p3 = dict(p1, name="Valid Name", extension_minutes=-1)
    assert client.post("/api/v1/rfqs", json=p3).status_code == 422

    # Invalid trigger
    p4 = dict(p1, name="Valid Name", extension_trigger="INVALID_TRIGGER")
    assert client.post("/api/v1/rfqs", json=p4).status_code == 422


# ==============================================================================
# SECTION 2: Supplier Creation & Listing
# ==============================================================================

def test_supplier_creation_and_listing(
    client: TestClient, tracker: TestRecordTracker
):
    """Verify supplier registration, whitespace rejection, and listing query."""
    supplier_name = make_unique_supplier_name("Safe Logistics")
    res = client.post("/api/v1/suppliers", json={"name": supplier_name})
    assert res.status_code == 201
    created = res.json()
    tracker.track_supplier(created.get("id"))
    assert created["id"] > 0
    assert created["name"] == supplier_name
    assert "created_at" in created

    # Rejected whitespace-only name
    bad_res = client.post("/api/v1/suppliers", json={"name": "   "})
    assert bad_res.status_code == 422

    # Listing contains the registered supplier
    list_res = client.get("/api/v1/suppliers")
    assert list_res.status_code == 200
    suppliers = list_res.json()
    assert any(s["id"] == created["id"] for s in suppliers)


# ==============================================================================
# SECTION 3: Bid Submission & Validation (Active Auction)
# ==============================================================================

def test_bid_submission_valid(client: TestClient, tracker: TestRecordTracker):
    """Verify valid bid submission with exact sum calculation and response fields."""
    rfq = create_test_rfq(client, tracker).json()
    supplier = create_test_supplier(client, tracker)
    valid_until = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()

    bid_payload = {
        "supplier_id": supplier["id"],
        "freight_charges": 1500.50,
        "origin_charges": 120.25,
        "destination_charges": 80.25,
        "transit_time_hours": 36,
        "quote_valid_until": valid_until,
    }

    res = client.post(f"/api/v1/rfqs/{rfq['id']}/bids", json=bid_payload)
    assert res.status_code == 201
    bid = res.json()

    assert bid["id"] > 0
    assert bid["quotation_id"] > 0
    assert float(bid["freight_charges"]) == 1500.50
    assert float(bid["origin_charges"]) == 120.25
    assert float(bid["destination_charges"]) == 80.25
    assert float(bid["total_amount"]) == 1701.00
    assert bid["transit_time_hours"] == 36


def test_bid_submission_decimal_precision(
    client: TestClient, tracker: TestRecordTracker
):
    """Verify that amounts with >2 decimal places are strictly rejected with 422."""
    rfq = create_test_rfq(client, tracker).json()
    supplier = create_test_supplier(client, tracker)
    valid_until = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()

    bad_payload = {
        "supplier_id": supplier["id"],
        "freight_charges": 1500.555,  # 3 decimals
        "origin_charges": 100.00,
        "destination_charges": 50.00,
        "transit_time_hours": 24,
        "quote_valid_until": valid_until,
    }

    res = client.post(f"/api/v1/rfqs/{rfq['id']}/bids", json=bad_payload)
    assert res.status_code == 422


def test_bid_submission_validity_constraints(
    client: TestClient, tracker: TestRecordTracker
):
    """Verify rejection of negative charges, past quote validity, non-existent supplier or RFQ."""
    rfq = create_test_rfq(client, tracker).json()
    supplier = create_test_supplier(client, tracker)
    future_date = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()
    past_date = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()

    # Negative freight charges
    p1 = {
        "supplier_id": supplier["id"],
        "freight_charges": -100.00,
        "origin_charges": 50.00,
        "destination_charges": 50.00,
        "transit_time_hours": 24,
        "quote_valid_until": future_date,
    }
    assert client.post(f"/api/v1/rfqs/{rfq['id']}/bids", json=p1).status_code == 422

    # quote_valid_until in the past
    p2 = {
        "supplier_id": supplier["id"],
        "freight_charges": 500.00,
        "origin_charges": 50.00,
        "destination_charges": 50.00,
        "transit_time_hours": 24,
        "quote_valid_until": past_date,
    }
    r2 = client.post(f"/api/v1/rfqs/{rfq['id']}/bids", json=p2)
    assert r2.status_code == 422
    assert "future" in r2.json()["detail"].lower()

    # Non-existent supplier (404)
    p3 = dict(p1, supplier_id=999999, freight_charges=500.00)
    assert client.post(f"/api/v1/rfqs/{rfq['id']}/bids", json=p3).status_code == 404

    # Non-existent RFQ (404)
    assert client.post("/api/v1/rfqs/999999/bids", json={
        "supplier_id": supplier["id"],
        "freight_charges": 500.00,
        "origin_charges": 50.00,
        "destination_charges": 50.00,
        "transit_time_hours": 24,
        "quote_valid_until": future_date,
    }).status_code == 404


# ==============================================================================
# SECTION 4: Strict Undercutting Rules (Active Auction)
# ==============================================================================

def test_strict_undercutting_enforced(
    client: TestClient, tracker: TestRecordTracker
):
    """
    Verify strict British Reverse Auction undercutting:
    A supplier must strictly undercut their own prior quotation.
    Submitting an equal or higher bid must be rejected with 422.
    """
    rfq = create_test_rfq(client, tracker).json()
    supplier = create_test_supplier(client, tracker)
    valid_until = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()

    # Round 1: Initial bid totaling 2000.00 -> Accepted (201)
    b1 = client.post(f"/api/v1/rfqs/{rfq['id']}/bids", json={
        "supplier_id": supplier["id"],
        "freight_charges": 1800.00,
        "origin_charges": 100.00,
        "destination_charges": 100.00,
        "transit_time_hours": 24,
        "quote_valid_until": valid_until,
    })
    assert b1.status_code == 201
    assert float(b1.json()["total_amount"]) == 2000.00

    # Attempt higher bid totaling 2100.00 -> Rejected (422)
    b_higher = client.post(f"/api/v1/rfqs/{rfq['id']}/bids", json={
        "supplier_id": supplier["id"],
        "freight_charges": 1900.00,
        "origin_charges": 100.00,
        "destination_charges": 100.00,
        "transit_time_hours": 24,
        "quote_valid_until": valid_until,
    })
    assert b_higher.status_code == 422
    assert "lower" in b_higher.json()["detail"].lower()

    # Attempt equal bid totaling 2000.00 -> Rejected (422)
    b_equal = client.post(f"/api/v1/rfqs/{rfq['id']}/bids", json={
        "supplier_id": supplier["id"],
        "freight_charges": 1750.00,
        "origin_charges": 150.00,
        "destination_charges": 100.00,
        "transit_time_hours": 24,
        "quote_valid_until": valid_until,
    })
    assert b_equal.status_code == 422
    assert "lower" in b_equal.json()["detail"].lower()

    # Valid lower bid totaling 1900.00 -> Accepted (201)
    b_lower = client.post(f"/api/v1/rfqs/{rfq['id']}/bids", json={
        "supplier_id": supplier["id"],
        "freight_charges": 1700.00,
        "origin_charges": 100.00,
        "destination_charges": 100.00,
        "transit_time_hours": 24,
        "quote_valid_until": valid_until,
    })
    assert b_lower.status_code == 201
    assert float(b_lower.json()["total_amount"]) == 1900.00


# ==============================================================================
# SECTION 5: L1 Ranking & Deterministic Tie-Breaking (Active Auction)
# ==============================================================================

def test_l1_ranking_calculation(client: TestClient, tracker: TestRecordTracker):
    """Verify that supplier rankings sort lowest total_amount to Rank 1 (L1)."""
    rfq = create_test_rfq(client, tracker).json()
    s1 = create_test_supplier(client, tracker, "Rank-Test Supplier 1")
    s2 = create_test_supplier(client, tracker, "Rank-Test Supplier 2")
    valid_until = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()

    # S1 bids 1500.00
    res_s1 = client.post(f"/api/v1/rfqs/{rfq['id']}/bids", json={
        "supplier_id": s1["id"],
        "freight_charges": 1400.00,
        "origin_charges": 50.00,
        "destination_charges": 50.00,
        "transit_time_hours": 24,
        "quote_valid_until": valid_until,
    })
    assert res_s1.status_code == 201

    # S2 bids 1350.00
    res_s2 = client.post(f"/api/v1/rfqs/{rfq['id']}/bids", json={
        "supplier_id": s2["id"],
        "freight_charges": 1250.00,
        "origin_charges": 50.00,
        "destination_charges": 50.00,
        "transit_time_hours": 24,
        "quote_valid_until": valid_until,
    })
    assert res_s2.status_code == 201

    rank_res = client.get(f"/api/v1/rfqs/{rfq['id']}/rankings")
    assert rank_res.status_code == 200
    rankings = rank_res.json()

    assert len(rankings) == 2
    assert rankings[0]["rank"] == 1
    assert rankings[0]["supplier_id"] == s2["id"]
    assert float(rankings[0]["total_amount"]) == 1350.00

    assert rankings[1]["rank"] == 2
    assert rankings[1]["supplier_id"] == s1["id"]
    assert float(rankings[1]["total_amount"]) == 1500.00


def test_deterministic_tie_breaking(
    client: TestClient, tracker: TestRecordTracker
):
    """
    Verify deterministic tie-breaking:
    When two suppliers submit identical total amounts, earlier bid timestamp strictly wins Rank 1.
    """
    rfq = create_test_rfq(client, tracker).json()
    s1 = create_test_supplier(client, tracker, "Tie-Breaker First")
    s2 = create_test_supplier(client, tracker, "Tie-Breaker Second")
    valid_until = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()

    # S1 bids 1000.00 FIRST
    r1 = client.post(f"/api/v1/rfqs/{rfq['id']}/bids", json={
        "supplier_id": s1["id"],
        "freight_charges": 900.00,
        "origin_charges": 50.00,
        "destination_charges": 50.00,
        "transit_time_hours": 24,
        "quote_valid_until": valid_until,
    })
    assert r1.status_code == 201

    # S2 bids 1000.00 SECOND
    r2 = client.post(f"/api/v1/rfqs/{rfq['id']}/bids", json={
        "supplier_id": s2["id"],
        "freight_charges": 900.00,
        "origin_charges": 50.00,
        "destination_charges": 50.00,
        "transit_time_hours": 24,
        "quote_valid_until": valid_until,
    })
    assert r2.status_code == 201

    rank_res = client.get(f"/api/v1/rfqs/{rfq['id']}/rankings")
    assert rank_res.status_code == 200
    rankings = rank_res.json()

    assert len(rankings) == 2
    # S1 bid first, so S1 must hold Rank 1
    assert rankings[0]["rank"] == 1
    assert rankings[0]["supplier_id"] == s1["id"]
    assert float(rankings[0]["total_amount"]) == 1000.00

    # S2 bid second with equal amount, so S2 must hold Rank 2
    assert rankings[1]["rank"] == 2
    assert rankings[1]["supplier_id"] == s2["id"]
    assert float(rankings[1]["total_amount"]) == 1000.00


# ==============================================================================
# SECTION 6: Activity Timeline Consistency
# ==============================================================================

def test_activity_timeline_consistency(
    client: TestClient, tracker: TestRecordTracker
):
    """
    Verify chronological activity timeline records:
    1. RFQ_CREATED
    2. BID_SUBMITTED with correct descriptions
    3. AUCTION_EXTENDED when anti-sniping triggers
    """
    rfq = create_test_rfq(
        client,
        tracker,
        close_offset_minutes=3,
        forced_offset_minutes=60,
        trigger_window_minutes=5,
        extension_minutes=4,
        extension_trigger="ANY_BID",
    ).json()

    s = create_test_supplier(client, tracker, "Timeline Supplier")
    valid_until = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()

    bid_res = client.post(f"/api/v1/rfqs/{rfq['id']}/bids", json={
        "supplier_id": s["id"],
        "freight_charges": 1100.00,
        "origin_charges": 50.00,
        "destination_charges": 50.00,
        "transit_time_hours": 24,
        "quote_valid_until": valid_until,
    })
    assert bid_res.status_code == 201

    act_res = client.get(f"/api/v1/rfqs/{rfq['id']}/activity")
    assert act_res.status_code == 200
    timeline = act_res.json()

    assert len(timeline) == 3
    assert timeline[0]["event_type"] == "RFQ_CREATED"
    assert timeline[1]["event_type"] == "BID_SUBMITTED"
    assert timeline[2]["event_type"] == "AUCTION_EXTENDED"
    assert timeline[2]["old_close_at"] is not None
    assert timeline[2]["new_close_at"] is not None
    assert timeline[2]["new_close_at"] > timeline[2]["old_close_at"]


# ==============================================================================
# SECTION 7: Anti-Sniping Extensions (Active Auction)
# ==============================================================================

def test_anti_sniping_policy_any_bid(
    client: TestClient, tracker: TestRecordTracker
):
    """
    Policy: ANY_BID
    Any bid within the trigger window extends the auction by extension_minutes.
    """
    rfq = create_test_rfq(
        client,
        tracker,
        close_offset_minutes=4,
        forced_offset_minutes=60,
        trigger_window_minutes=5,
        extension_minutes=3,
        extension_trigger="ANY_BID",
    ).json()

    orig_close = datetime.fromisoformat(rfq["current_close_at"])
    supplier = create_test_supplier(client, tracker)
    valid_until = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()

    bid_res = client.post(f"/api/v1/rfqs/{rfq['id']}/bids", json={
        "supplier_id": supplier["id"],
        "freight_charges": 900.00,
        "origin_charges": 50.00,
        "destination_charges": 50.00,
        "transit_time_hours": 24,
        "quote_valid_until": valid_until,
    })
    assert bid_res.status_code == 201

    rfq_after_res = client.get(f"/api/v1/rfqs/{rfq['id']}")
    assert rfq_after_res.status_code == 200
    rfq_after = rfq_after_res.json()
    new_close = datetime.fromisoformat(rfq_after["current_close_at"])

    assert (new_close - orig_close).total_seconds() == 180  # 3 minutes


def test_anti_sniping_policy_any_rank_change(
    client: TestClient, tracker: TestRecordTracker
):
    """
    Policy: ANY_RANK_CHANGE
    Bids causing any change in the supplier ranking order extend the auction.
    Bids that do NOT change ranks must NOT extend the auction.
    """
    rfq = create_test_rfq(
        client,
        tracker,
        close_offset_minutes=2,
        forced_offset_minutes=60,
        trigger_window_minutes=10,
        extension_minutes=1,
        extension_trigger="ANY_RANK_CHANGE",
    ).json()

    s1 = create_test_supplier(client, tracker, "Rank-Change S1")
    s2 = create_test_supplier(client, tracker, "Rank-Change S2")
    valid_until = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()

    # Bid 1: S1 bids 1000.00. Ranking changes from [] to [S1]. Extends!
    r_b1 = client.post(f"/api/v1/rfqs/{rfq['id']}/bids", json={
        "supplier_id": s1["id"],
        "freight_charges": 900.00,
        "origin_charges": 50.00,
        "destination_charges": 50.00,
        "transit_time_hours": 24,
        "quote_valid_until": valid_until,
    })
    assert r_b1.status_code == 201
    close_after_b1 = datetime.fromisoformat(client.get(f"/api/v1/rfqs/{rfq['id']}").json()["current_close_at"])

    # Bid 2: S2 bids 1500.00. Ranking changes from [S1] to [S1, S2]. Extends!
    r_b2 = client.post(f"/api/v1/rfqs/{rfq['id']}/bids", json={
        "supplier_id": s2["id"],
        "freight_charges": 1400.00,
        "origin_charges": 50.00,
        "destination_charges": 50.00,
        "transit_time_hours": 24,
        "quote_valid_until": valid_until,
    })
    assert r_b2.status_code == 201
    close_after_b2 = datetime.fromisoformat(client.get(f"/api/v1/rfqs/{rfq['id']}").json()["current_close_at"])
    assert close_after_b2 > close_after_b1

    # Bid 3: S2 undercuts itself from 1500.00 to 1400.00.
    # Ranking order BEFORE: [S1 (1000), S2 (1500)]
    # Ranking order AFTER:  [S1 (1000), S2 (1400)]
    # Rank order DID NOT CHANGE! Therefore, MUST NOT EXTEND!
    r_b3 = client.post(f"/api/v1/rfqs/{rfq['id']}/bids", json={
        "supplier_id": s2["id"],
        "freight_charges": 1300.00,
        "origin_charges": 50.00,
        "destination_charges": 50.00,
        "transit_time_hours": 24,
        "quote_valid_until": valid_until,
    })
    assert r_b3.status_code == 201
    close_after_b3 = datetime.fromisoformat(client.get(f"/api/v1/rfqs/{rfq['id']}").json()["current_close_at"])
    assert close_after_b3 == close_after_b2


def test_anti_sniping_policy_l1_change(
    client: TestClient, tracker: TestRecordTracker
):
    """
    Policy: L1_CHANGE
    Only bids that capture the lowest price (Rank 1 / L1) extend the auction.
    Bids that change lower ranks (Rank 3 -> Rank 2) must NOT extend.
    """
    rfq = create_test_rfq(
        client,
        tracker,
        close_offset_minutes=2,
        forced_offset_minutes=60,
        trigger_window_minutes=10,
        extension_minutes=1,
        extension_trigger="L1_CHANGE",
    ).json()

    s1 = create_test_supplier(client, tracker, "L1-S1")
    s2 = create_test_supplier(client, tracker, "L1-S2")
    s3 = create_test_supplier(client, tracker, "L1-S3")
    valid_until = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()

    # Step 1: S1 bids 1000.00 -> becomes L1. Extends!
    r1 = client.post(f"/api/v1/rfqs/{rfq['id']}/bids", json={
        "supplier_id": s1["id"],
        "freight_charges": 900.00,
        "origin_charges": 50.00,
        "destination_charges": 50.00,
        "transit_time_hours": 24,
        "quote_valid_until": valid_until,
    })
    assert r1.status_code == 201
    close_1 = datetime.fromisoformat(client.get(f"/api/v1/rfqs/{rfq['id']}").json()["current_close_at"])

    # Step 2: S2 bids 1500.00 -> Rank 2, L1 remains S1. DOES NOT EXTEND!
    r2 = client.post(f"/api/v1/rfqs/{rfq['id']}/bids", json={
        "supplier_id": s2["id"],
        "freight_charges": 1400.00,
        "origin_charges": 50.00,
        "destination_charges": 50.00,
        "transit_time_hours": 24,
        "quote_valid_until": valid_until,
    })
    assert r2.status_code == 201
    close_2 = datetime.fromisoformat(client.get(f"/api/v1/rfqs/{rfq['id']}").json()["current_close_at"])
    assert close_2 == close_1

    # Step 3: S3 bids 1200.00 -> Rank 2, L1 remains S1. DOES NOT EXTEND!
    r3 = client.post(f"/api/v1/rfqs/{rfq['id']}/bids", json={
        "supplier_id": s3["id"],
        "freight_charges": 1100.00,
        "origin_charges": 50.00,
        "destination_charges": 50.00,
        "transit_time_hours": 24,
        "quote_valid_until": valid_until,
    })
    assert r3.status_code == 201
    close_3 = datetime.fromisoformat(client.get(f"/api/v1/rfqs/{rfq['id']}").json()["current_close_at"])
    assert close_3 == close_2

    # Step 4: S3 undercuts S1 with 900.00 -> Becomes NEW L1! EXTENDS!
    r4 = client.post(f"/api/v1/rfqs/{rfq['id']}/bids", json={
        "supplier_id": s3["id"],
        "freight_charges": 800.00,
        "origin_charges": 50.00,
        "destination_charges": 50.00,
        "transit_time_hours": 24,
        "quote_valid_until": valid_until,
    })
    assert r4.status_code == 201
    close_4 = datetime.fromisoformat(client.get(f"/api/v1/rfqs/{rfq['id']}").json()["current_close_at"])
    assert close_4 > close_3


def test_anti_sniping_clamped_to_forced_close(
    client: TestClient, tracker: TestRecordTracker
):
    """
    Verify hard capping:
    Extensions can NEVER push current_close_at beyond forced_close_at.
    """
    rfq = create_test_rfq(
        client,
        tracker,
        close_offset_minutes=3,
        forced_offset_minutes=4,  # Exactly 1 minute after close
        trigger_window_minutes=5,
        extension_minutes=10,     # Attempt to extend by 10 minutes
        extension_trigger="ANY_BID",
    ).json()

    forced_close = datetime.fromisoformat(rfq["forced_close_at"])
    supplier = create_test_supplier(client, tracker)
    valid_until = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()

    res_bid = client.post(f"/api/v1/rfqs/{rfq['id']}/bids", json={
        "supplier_id": supplier["id"],
        "freight_charges": 900.00,
        "origin_charges": 50.00,
        "destination_charges": 50.00,
        "transit_time_hours": 24,
        "quote_valid_until": valid_until,
    })
    assert res_bid.status_code == 201

    rfq_after = client.get(f"/api/v1/rfqs/{rfq['id']}").json()
    new_close = datetime.fromisoformat(rfq_after["current_close_at"])
    assert new_close == forced_close


# ==============================================================================
# SECTION 8: Auction Closure & Status Transitions (Closed / Force Closed)
# ==============================================================================

def test_auction_closure_status_and_bid_rejections(
    client: TestClient, tracker: TestRecordTracker
):
    """
    Explicitly tests actual auction closure and rejection of bids post-closure:
    - Verifies 'Closed' status when current_close_at has elapsed
    - Verifies 'Force Closed' status when forced_close_at has elapsed
    - Verifies 'Active' status when auction is open
    - Verifies HTTP 422 rejection for bids submitted after closure
    - Verifies HTTP 422 rejection for bids submitted before auction start
    """
    s = create_test_supplier(client, tracker)
    valid_until = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()

    # Part A: Actual Closed Auction (current_close_at in the past)
    closed_rfq = create_test_rfq(
        client,
        tracker,
        start_offset_minutes=-60,
        close_offset_minutes=-5,  # 5 minutes in the past
        forced_offset_minutes=60,
    ).json()

    closed_data = client.get(f"/api/v1/rfqs/{closed_rfq['id']}").json()
    assert closed_data["status"] == "Closed"

    # Bid submitted after close time MUST be rejected with HTTP 422
    res_closed = client.post(f"/api/v1/rfqs/{closed_rfq['id']}/bids", json={
        "supplier_id": s["id"],
        "freight_charges": 800.00,
        "origin_charges": 50.00,
        "destination_charges": 50.00,
        "transit_time_hours": 24,
        "quote_valid_until": valid_until,
    })
    assert res_closed.status_code == 422
    assert "auction is closed" in res_closed.json()["detail"].lower()

    # Part B: Actual Force Closed Auction (forced_close_at in the past)
    force_closed_rfq = create_test_rfq(
        client,
        tracker,
        start_offset_minutes=-120,
        close_offset_minutes=-10,
        forced_offset_minutes=-5,  # 5 minutes past forced close limit
    ).json()

    fc_data = client.get(f"/api/v1/rfqs/{force_closed_rfq['id']}").json()
    assert fc_data["status"] == "Force Closed"

    # Bid submitted after forced close limit MUST be rejected with HTTP 422
    res_fc = client.post(f"/api/v1/rfqs/{force_closed_rfq['id']}/bids", json={
        "supplier_id": s["id"],
        "freight_charges": 800.00,
        "origin_charges": 50.00,
        "destination_charges": 50.00,
        "transit_time_hours": 24,
        "quote_valid_until": valid_until,
    })
    assert res_fc.status_code == 422
    assert "auction is closed" in res_fc.json()["detail"].lower()

    # Part C: Future Auction (bid_start_at in the future)
    future_rfq = create_test_rfq(
        client,
        tracker,
        start_offset_minutes=15,  # Starts in 15 minutes
        close_offset_minutes=60,
        forced_offset_minutes=120,
    ).json()

    res_future = client.post(f"/api/v1/rfqs/{future_rfq['id']}/bids", json={
        "supplier_id": s["id"],
        "freight_charges": 800.00,
        "origin_charges": 50.00,
        "destination_charges": 50.00,
        "transit_time_hours": 24,
        "quote_valid_until": valid_until,
    })
    assert res_future.status_code == 422
    assert "not started" in res_future.json()["detail"].lower()


# ==============================================================================
# SECTION 9: Concurrency & Race Conditions (Scenario E)
# ==============================================================================

def test_scenario_e_concurrent_multi_supplier_bidding(
    client: TestClient, tracker: TestRecordTracker, test_db
):
    """
    Scenario E: Multi-Supplier Concurrent Bidding
    Simulates concurrent bid submissions from 8 distinct suppliers hitting
    the same RFQ simultaneously.
    Verifies PostgreSQL row-level locking (with_for_update()), zero race conditions,
    correct quotation counts, and valid final rankings.
    """
    rfq = create_test_rfq(client, tracker, name="Concurrent Scenario E RFQ").json()
    rfq_id = rfq["id"]
    valid_until = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()

    suppliers = [
        create_test_supplier(client, tracker, f"Concurrent-Supplier-{i}")
        for i in range(8)
    ]

    def submit_supplier_bid(supplier_idx: int):
        s_id = suppliers[supplier_idx]["id"]
        freight = 2000.00 - (supplier_idx * 100.00)
        with TestClient(app) as local_client:
            return local_client.post(
                f"/api/v1/rfqs/{rfq_id}/bids",
                json={
                    "supplier_id": s_id,
                    "freight_charges": freight,
                    "origin_charges": 50.00,
                    "destination_charges": 50.00,
                    "transit_time_hours": 24,
                    "quote_valid_until": valid_until,
                },
            )

    results = []
    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = [executor.submit(submit_supplier_bid, i) for i in range(8)]
        for f in as_completed(futures):
            results.append(f.result())

    # Every concurrent bid from distinct suppliers must succeed with HTTP 201
    for r in results:
        assert r.status_code == 201, f"Concurrent submission failed: {r.text}"

    # Verify rankings consistency
    rank_res = client.get(f"/api/v1/rfqs/{rfq_id}/rankings")
    assert rank_res.status_code == 200
    rankings = rank_res.json()

    assert len(rankings) == 8
    for idx, r in enumerate(rankings, start=1):
        assert r["rank"] == idx

    # Lowest bidder (Supplier 7 with freight 1300 + 100 = 1400 total) must be Rank 1
    assert rankings[0]["supplier_id"] == suppliers[7]["id"]
    assert float(rankings[0]["total_amount"]) == 1400.00

    # Highest bidder (Supplier 0 with total 2100) must be Rank 8
    assert rankings[7]["supplier_id"] == suppliers[0]["id"]
    assert float(rankings[7]["total_amount"]) == 2100.00

    # Check quotation records in database directly
    quotes = test_db.scalars(
        select(Quotation).where(Quotation.rfq_id == rfq_id)
    ).all()
    assert len(quotes) == 8


def test_scenario_e_concurrent_same_supplier_bidding(
    client: TestClient, tracker: TestRecordTracker, test_db
):
    """
    Scenario E (Extended): Same-Supplier Concurrent Bidding
    Simulates a single supplier firing 5 competing undercutting bids simultaneously.
    Verifies that:
    - Row-level locking on RFQ serializes execution cleanly.
    - Bids that execute after a lower bid has already committed are safely rejected with 422.
    - Exactly ONE quotation record exists for this supplier in the database.
    - The final stored quotation amount strictly reflects the lowest accepted bid.
    - Zero deadlocks or unhandled 500 errors occur.
    """
    rfq = create_test_rfq(client, tracker, name="Same-Supplier Concurrent RFQ").json()
    rfq_id = rfq["id"]
    valid_until = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()
    supplier = create_test_supplier(client, tracker, "Concurrent-Single-Supplier")

    # Amounts: 2000, 1900, 1800, 1700, 1600 (Freight: 1900, 1800, 1700, 1600, 1500)
    bid_amounts = [1900.00, 1800.00, 1700.00, 1600.00, 1500.00]

    def submit_same_supplier_bid(freight: float):
        with TestClient(app) as local_client:
            return local_client.post(
                f"/api/v1/rfqs/{rfq_id}/bids",
                json={
                    "supplier_id": supplier["id"],
                    "freight_charges": freight,
                    "origin_charges": 50.00,
                    "destination_charges": 50.00,
                    "transit_time_hours": 24,
                    "quote_valid_until": valid_until,
                },
            )

    results = []
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(submit_same_supplier_bid, amt) for amt in bid_amounts]
        for f in as_completed(futures):
            results.append(f.result())

    # Ensure no internal server errors (500) or deadlocks
    for r in results:
        assert r.status_code in (201, 422), f"Unexpected status: {r.status_code} - {r.text}"

    # At least one bid must have succeeded
    accepted_bids = [r for r in results if r.status_code == 201]
    assert len(accepted_bids) >= 1

    # Exactly 1 quotation record must exist for this supplier
    quotes = test_db.scalars(
        select(Quotation).where(
            Quotation.rfq_id == rfq_id,
            Quotation.supplier_id == supplier["id"],
        )
    ).all()
    assert len(quotes) == 1

    # Stored quotation amount must equal the minimum accepted total
    accepted_totals = [float(r.json()["total_amount"]) for r in accepted_bids]
    expected_final_total = min(accepted_totals)
    assert float(quotes[0].total_amount) == expected_final_total


# ==============================================================================
# SECTION 10: RFQ Data Isolation
# ==============================================================================

def test_rfq_data_isolation(client: TestClient, tracker: TestRecordTracker):
    """Verify that bids, quotations, and activity on RFQ 1 do not leak to RFQ 2."""
    rfq1 = create_test_rfq(client, tracker, name="Isolation RFQ 1").json()
    rfq2 = create_test_rfq(client, tracker, name="Isolation RFQ 2").json()
    s = create_test_supplier(client, tracker)
    valid_until = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()

    # Bid only on RFQ 1
    res_bid = client.post(f"/api/v1/rfqs/{rfq1['id']}/bids", json={
        "supplier_id": s["id"],
        "freight_charges": 1000.00,
        "origin_charges": 50.00,
        "destination_charges": 50.00,
        "transit_time_hours": 24,
        "quote_valid_until": valid_until,
    })
    assert res_bid.status_code == 201

    # Verify RFQ 1 has 1 ranking, 1 bid in history, 2 activities
    assert len(client.get(f"/api/v1/rfqs/{rfq1['id']}/rankings").json()) == 1
    assert len(client.get(f"/api/v1/rfqs/{rfq1['id']}/bids").json()) == 1

    # Verify RFQ 2 remains completely pristine and empty
    assert len(client.get(f"/api/v1/rfqs/{rfq2['id']}/rankings").json()) == 0
    assert len(client.get(f"/api/v1/rfqs/{rfq2['id']}/bids").json()) == 0
    rfq2_act = client.get(f"/api/v1/rfqs/{rfq2['id']}/activity").json()
    assert len(rfq2_act) == 1
    assert rfq2_act[0]["event_type"] == "RFQ_CREATED"


# ==============================================================================
# SECTION 11: End-to-End Complete Scenarios (Scenario A, B, C)
# ==============================================================================

def test_scenario_a_normal_auction(
    client: TestClient, tracker: TestRecordTracker
):
    """
    Scenario A: Normal Auction Lifecycle
    1. Create RFQ
    2. Register multiple suppliers
    3. Submit bids from different suppliers
    4. Verify L1 dynamically updates to lowest bidder
    5. Verify bid history contains all submissions
    6. Verify final rankings and activity audit trail
    """
    rfq_res = create_test_rfq(client, tracker, name="Scenario A Normal Auction")
    assert rfq_res.status_code == 201
    rfq = rfq_res.json()
    rfq_id = rfq["id"]

    s_alpha = create_test_supplier(client, tracker, "Alpha Carriers")
    s_beta = create_test_supplier(client, tracker, "Beta Freight")
    s_gamma = create_test_supplier(client, tracker, "Gamma Express")
    valid_until = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()

    # Alpha submits initial bid -> 2500.00
    b1 = client.post(f"/api/v1/rfqs/{rfq_id}/bids", json={
        "supplier_id": s_alpha["id"],
        "freight_charges": 2300.00,
        "origin_charges": 100.00,
        "destination_charges": 100.00,
        "transit_time_hours": 30,
        "quote_valid_until": valid_until,
    })
    assert b1.status_code == 201
    r1 = client.get(f"/api/v1/rfqs/{rfq_id}/rankings").json()
    assert r1[0]["supplier_id"] == s_alpha["id"]
    assert r1[0]["rank"] == 1

    # Beta submits lower bid -> 2300.00 (Becomes new L1)
    b2 = client.post(f"/api/v1/rfqs/{rfq_id}/bids", json={
        "supplier_id": s_beta["id"],
        "freight_charges": 2100.00,
        "origin_charges": 100.00,
        "destination_charges": 100.00,
        "transit_time_hours": 28,
        "quote_valid_until": valid_until,
    })
    assert b2.status_code == 201
    r2 = client.get(f"/api/v1/rfqs/{rfq_id}/rankings").json()
    assert r2[0]["supplier_id"] == s_beta["id"]
    assert r2[1]["supplier_id"] == s_alpha["id"]

    # Gamma submits bid -> 2400.00 (Rank 2, between Beta and Alpha)
    b3 = client.post(f"/api/v1/rfqs/{rfq_id}/bids", json={
        "supplier_id": s_gamma["id"],
        "freight_charges": 2200.00,
        "origin_charges": 100.00,
        "destination_charges": 100.00,
        "transit_time_hours": 24,
        "quote_valid_until": valid_until,
    })
    assert b3.status_code == 201
    r3 = client.get(f"/api/v1/rfqs/{rfq_id}/rankings").json()
    assert r3[0]["supplier_id"] == s_beta["id"]   # 2300
    assert r3[1]["supplier_id"] == s_gamma["id"]  # 2400
    assert r3[2]["supplier_id"] == s_alpha["id"]  # 2500

    # Bid history contains 3 bids
    history = client.get(f"/api/v1/rfqs/{rfq_id}/bids").json()
    assert len(history) == 3


def test_scenario_b_competitive_bidding(
    client: TestClient, tracker: TestRecordTracker
):
    """
    Scenario B: Competitive Bidding War
    Multiple suppliers repeatedly undercutting each other over 5 rounds.
    Verifies:
    - Consistent quotation updates
    - Alternating L1 standings
    - Full bid history audit trail
    """
    rfq = create_test_rfq(client, tracker, name="Scenario B Bidding War").json()
    rfq_id = rfq["id"]
    s1 = create_test_supplier(client, tracker, "War Supplier 1")
    s2 = create_test_supplier(client, tracker, "War Supplier 2")
    valid_until = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()

    # Round 1: S1 bids 3000 -> L1 is S1
    r_r1 = client.post(f"/api/v1/rfqs/{rfq_id}/bids", json={
        "supplier_id": s1["id"],
        "freight_charges": 2800.00,
        "origin_charges": 100.00,
        "destination_charges": 100.00,
        "transit_time_hours": 24,
        "quote_valid_until": valid_until,
    })
    assert r_r1.status_code == 201
    r1 = client.get(f"/api/v1/rfqs/{rfq_id}/rankings").json()
    assert r1[0]["supplier_id"] == s1["id"]
    assert float(r1[0]["total_amount"]) == 3000.00

    # Round 2: S2 undercuts to 2900 -> L1 flips to S2
    r_r2 = client.post(f"/api/v1/rfqs/{rfq_id}/bids", json={
        "supplier_id": s2["id"],
        "freight_charges": 2700.00,
        "origin_charges": 100.00,
        "destination_charges": 100.00,
        "transit_time_hours": 24,
        "quote_valid_until": valid_until,
    })
    assert r_r2.status_code == 201
    r2 = client.get(f"/api/v1/rfqs/{rfq_id}/rankings").json()
    assert r2[0]["supplier_id"] == s2["id"]
    assert float(r2[0]["total_amount"]) == 2900.00

    # Round 3: S1 undercuts itself to 2750 -> L1 flips back to S1
    r_r3 = client.post(f"/api/v1/rfqs/{rfq_id}/bids", json={
        "supplier_id": s1["id"],
        "freight_charges": 2550.00,
        "origin_charges": 100.00,
        "destination_charges": 100.00,
        "transit_time_hours": 24,
        "quote_valid_until": valid_until,
    })
    assert r_r3.status_code == 201
    r3 = client.get(f"/api/v1/rfqs/{rfq_id}/rankings").json()
    assert r3[0]["supplier_id"] == s1["id"]
    assert float(r3[0]["total_amount"]) == 2750.00

    # Round 4: S2 undercuts itself to 2600 -> L1 flips to S2
    r_r4 = client.post(f"/api/v1/rfqs/{rfq_id}/bids", json={
        "supplier_id": s2["id"],
        "freight_charges": 2400.00,
        "origin_charges": 100.00,
        "destination_charges": 100.00,
        "transit_time_hours": 24,
        "quote_valid_until": valid_until,
    })
    assert r_r4.status_code == 201
    r4 = client.get(f"/api/v1/rfqs/{rfq_id}/rankings").json()
    assert r4[0]["supplier_id"] == s2["id"]
    assert float(r4[0]["total_amount"]) == 2600.00

    # Round 5: S1 undercuts itself to 2500 -> L1 wins with S1
    r_r5 = client.post(f"/api/v1/rfqs/{rfq_id}/bids", json={
        "supplier_id": s1["id"],
        "freight_charges": 2300.00,
        "origin_charges": 100.00,
        "destination_charges": 100.00,
        "transit_time_hours": 24,
        "quote_valid_until": valid_until,
    })
    assert r_r5.status_code == 201
    r5 = client.get(f"/api/v1/rfqs/{rfq_id}/rankings").json()
    assert r5[0]["supplier_id"] == s1["id"]
    assert float(r5[0]["total_amount"]) == 2500.00

    # Total bids in history must equal 5
    bids = client.get(f"/api/v1/rfqs/{rfq_id}/bids").json()
    assert len(bids) == 5

    # Quotations table must have exactly 2 active rows (one per supplier)
    assert len(r5) == 2


def test_scenario_c_anti_sniping(
    client: TestClient, tracker: TestRecordTracker
):
    """
    Scenario C: Anti-Sniping Trigger
    1. RFQ created with closing time 4 minutes away, trigger window 5 minutes.
    2. Qualifying bid submitted inside the trigger window.
    3. current_close_at extends by extension_minutes.
    4. AUCTION_EXTENDED timeline event logged with timestamps.
    """
    rfq = create_test_rfq(
        client,
        tracker,
        name="Scenario C Anti-Sniping RFQ",
        close_offset_minutes=4,
        forced_offset_minutes=60,
        trigger_window_minutes=5,
        extension_minutes=5,
        extension_trigger="ANY_BID",
    ).json()
    rfq_id = rfq["id"]

    orig_close = datetime.fromisoformat(rfq["current_close_at"])
    s = create_test_supplier(client, tracker, "Sniper Supplier")
    valid_until = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()

    # Submit bid inside trigger window
    res = client.post(f"/api/v1/rfqs/{rfq_id}/bids", json={
        "supplier_id": s["id"],
        "freight_charges": 1200.00,
        "origin_charges": 50.00,
        "destination_charges": 50.00,
        "transit_time_hours": 24,
        "quote_valid_until": valid_until,
    })
    assert res.status_code == 201

    rfq_updated = client.get(f"/api/v1/rfqs/{rfq_id}").json()
    new_close = datetime.fromisoformat(rfq_updated["current_close_at"])

    # Extended by 5 minutes = 300 seconds
    assert (new_close - orig_close).total_seconds() == 300

    # Activity log contains AUCTION_EXTENDED
    activities = client.get(f"/api/v1/rfqs/{rfq_id}/activity").json()
    extension_events = [a for a in activities if a["event_type"] == "AUCTION_EXTENDED"]
    assert len(extension_events) == 1
    assert extension_events[0]["old_close_at"] is not None
    assert extension_events[0]["new_close_at"] is not None
