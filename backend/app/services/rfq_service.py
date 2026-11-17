
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.auction_activity_log import AuctionActivityLog
from app.models.rfq import RFQ
from app.schemas.rfq import RFQCreate


class DuplicateRFQReferenceError(Exception):
    """Raised when an RFQ reference ID already exists."""


def create_rfq(db: Session, payload: RFQCreate) -> RFQ:
    """Create an RFQ and its activity log atomically."""

    rfq = RFQ(
        **payload.model_dump(),
        current_close_at=payload.initial_close_at,
    )

    try:
        db.add(rfq)

        # Obtain the generated RFQ ID without committing.
        db.flush()

        activity = AuctionActivityLog(
            rfq_id=rfq.id,
            event_type="RFQ_CREATED",
            description=f"RFQ {rfq.reference_id} created",
            new_close_at=rfq.current_close_at,
        )

        db.add(activity)

        # Commit both records in one transaction.
        db.commit()
        db.refresh(rfq)

    except IntegrityError as exc:
        db.rollback()

        # PostgreSQL unique-constraint violation.
        if getattr(exc.orig, "sqlstate", None) == "23505":
            raise DuplicateRFQReferenceError(
                "An RFQ with this reference ID already exists"
            ) from exc

        raise

    except Exception:
        db.rollback()
        raise

    return rfq


from sqlalchemy import select


def list_rfqs(db: Session) -> list[RFQ]:
    """Retrieve RFQs ordered by newest first."""

    statement = (
        select(RFQ)
        .order_by(RFQ.created_at.desc(), RFQ.id.desc())
    )

    return list(db.scalars(statement).all())



def get_rfq_by_id(db: Session, rfq_id: int) -> RFQ | None:
    """Retrieve an RFQ by its database ID."""

    return db.get(RFQ, rfq_id)


from datetime import datetime, timezone


def get_rfq_status(rfq: RFQ) -> str:
    """Derive the current auction status."""

    now = datetime.now(timezone.utc)

    if rfq.closure_reason == "FORCED":
        return "Force Closed"

    if rfq.closure_reason == "NORMAL":
        return "Closed"

    if now >= rfq.forced_close_at:
        return "Force Closed"

    if now >= rfq.current_close_at:
        return "Closed"

    return "Active"
