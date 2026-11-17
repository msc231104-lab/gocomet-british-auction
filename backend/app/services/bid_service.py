
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.auction_activity_log import AuctionActivityLog
from app.models.bid import Bid
from app.models.quotation import Quotation
from app.models.rfq import RFQ
from app.models.supplier import Supplier
from app.schemas.bid import BidCreate


class BidValidationError(Exception):
    """Raised when a bid violates auction rules."""


class RFQNotFoundError(Exception):
    """Raised when the requested RFQ does not exist."""


class SupplierNotFoundError(Exception):
    """Raised when the requested supplier does not exist."""


def submit_bid(
    db: Session,
    rfq_id: int,
    payload: BidCreate,
) -> Bid:
    """Submit a bid and update the supplier's latest quotation."""

    try:
        # Serialize bid submissions for this RFQ.
        rfq = db.scalar(
            select(RFQ)
            .where(RFQ.id == rfq_id)
            .with_for_update()
        )

        if rfq is None:
            raise RFQNotFoundError("RFQ not found")

        now = datetime.now(timezone.utc)

        if rfq.closed_at is not None:
            raise BidValidationError("Auction is closed")

        if now < rfq.bid_start_at:
            raise BidValidationError("Auction has not started")

        if now >= rfq.current_close_at or now >= rfq.forced_close_at:
            raise BidValidationError("Auction is closed")

        supplier = db.get(Supplier, payload.supplier_id)

        if supplier is None:
            raise SupplierNotFoundError("Supplier not found")

        if payload.quote_valid_until <= now:
            raise BidValidationError(
                "Quotation validity must be in the future"
            )

        total_amount = (
            payload.freight_charges
            + payload.origin_charges
            + payload.destination_charges
        ).quantize(Decimal("0.01"))

        if total_amount > Decimal("9999999999.99"):
            raise BidValidationError(
                "Total amount exceeds the supported limit"
            )

        quotation = db.scalar(
            select(Quotation).where(
                Quotation.rfq_id == rfq_id,
                Quotation.supplier_id == payload.supplier_id,
            )
        )

        if quotation is not None:
            if total_amount >= quotation.total_amount:
                raise BidValidationError(
                    "New bid total must be lower than the previous bid"
                )

            quotation.freight_charges = payload.freight_charges
            quotation.origin_charges = payload.origin_charges
            quotation.destination_charges = payload.destination_charges
            quotation.total_amount = total_amount
            quotation.transit_time_hours = payload.transit_time_hours
            quotation.quote_valid_until = payload.quote_valid_until
            quotation.last_bid_at = now

        else:
            quotation = Quotation(
                rfq_id=rfq_id,
                supplier_id=payload.supplier_id,
                freight_charges=payload.freight_charges,
                origin_charges=payload.origin_charges,
                destination_charges=payload.destination_charges,
                total_amount=total_amount,
                transit_time_hours=payload.transit_time_hours,
                quote_valid_until=payload.quote_valid_until,
                last_bid_at=now,
            )

            db.add(quotation)
            db.flush()

        bid = Bid(
            quotation_id=quotation.id,
            freight_charges=payload.freight_charges,
            origin_charges=payload.origin_charges,
            destination_charges=payload.destination_charges,
            total_amount=total_amount,
            transit_time_hours=payload.transit_time_hours,
            quote_valid_until=payload.quote_valid_until,
            accepted_at=now,
        )

        db.add(bid)
        db.flush()

        activity = AuctionActivityLog(
            rfq_id=rfq_id,
            bid_id=bid.id,
            event_type="BID_SUBMITTED",
            description=(
                f"Supplier {supplier.name} submitted a bid "
                f"of {total_amount}"
            ),
        )

        db.add(activity)

        db.commit()
        db.refresh(bid)

        return bid

    except Exception:
        db.rollback()
        raise
