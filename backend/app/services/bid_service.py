
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

from app.services.auction_extension_service import (
    calculate_extended_close,
    detect_rank_changes,
)

class BidValidationError(Exception):
    """Raised when a bid violates auction rules."""


class RFQNotFoundError(Exception):
    """Raised when the requested RFQ does not exist."""


class SupplierNotFoundError(Exception):
    """Raised when the requested supplier does not exist."""


def get_ranking_snapshot(
    db: Session,
    rfq_id: int,
) -> list[tuple[int, Decimal, datetime, int]]:
    """Return the current supplier ranking data for an RFQ."""

    quotations = db.scalars(
        select(Quotation).where(
            Quotation.rfq_id == rfq_id
        )
    ).all()

    return [
        (
            quotation.supplier_id,
            quotation.total_amount,
            quotation.last_bid_at,
            quotation.id,
        )
        for quotation in quotations
    ]


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
        # Capture rankings before modifying the quotation.
        rankings_before = get_ranking_snapshot(db, rfq_id)

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

        # Flush changes before calculating the new rankings.
        db.flush()

        rankings_after = get_ranking_snapshot(db, rfq_id)

        rank_changed, l1_changed = detect_rank_changes(
            rankings_before,
            rankings_after,
        )

        old_close_at = rfq.current_close_at

        new_close_at = calculate_extended_close(
            now=now,
            current_close_at=old_close_at,
            forced_close_at=rfq.forced_close_at,
            trigger_window_minutes=rfq.trigger_window_minutes,
            extension_minutes=rfq.extension_minutes,
            extension_trigger=rfq.extension_trigger,
            rank_changed=rank_changed,
            l1_changed=l1_changed,
        )

        if new_close_at is not None:
            rfq.current_close_at = new_close_at

            extension_activity = AuctionActivityLog(
                rfq_id=rfq_id,
                bid_id=bid.id,
                event_type="AUCTION_EXTENDED",
                description=(
                    f"Auction extended from {old_close_at.isoformat()} "
                    f"to {new_close_at.isoformat()}"
                ),
                old_close_at=old_close_at,
                new_close_at=new_close_at,
            )

            db.add(extension_activity)

        db.commit()
        db.refresh(bid)

        return bid

    except Exception:
        db.rollback()
        raise
