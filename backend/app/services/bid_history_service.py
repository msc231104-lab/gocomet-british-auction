from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.bid import Bid
from app.models.quotation import Quotation
from app.models.supplier import Supplier
from app.schemas.bid_history import BidHistoryResponse


def get_rfq_bid_history(
    db: Session,
    rfq_id: int,
) -> list[BidHistoryResponse]:
    """Retrieve all historical bids submitted for an RFQ."""

    rows = db.execute(
        select(Bid, Quotation, Supplier)
        .join(
            Quotation,
            Bid.quotation_id == Quotation.id,
        )
        .join(
            Supplier,
            Quotation.supplier_id == Supplier.id,
        )
        .where(Quotation.rfq_id == rfq_id)
        .order_by(
            Bid.accepted_at.asc(),
            Bid.id.asc(),
        )
    ).all()

    return [
        BidHistoryResponse(
            id=bid.id,
            quotation_id=bid.quotation_id,
            supplier_id=supplier.id,
            supplier_name=supplier.name,
            freight_charges=bid.freight_charges,
            origin_charges=bid.origin_charges,
            destination_charges=bid.destination_charges,
            total_amount=bid.total_amount,
            transit_time_hours=bid.transit_time_hours,
            quote_valid_until=bid.quote_valid_until,
            accepted_at=bid.accepted_at,
        )
        for bid, quotation, supplier in rows
    ]
