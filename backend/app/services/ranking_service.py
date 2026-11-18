from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.quotation import Quotation
from app.models.supplier import Supplier
from app.schemas.ranking import RankingResponse


def get_rfq_rankings(
    db: Session,
    rfq_id: int,
) -> list[RankingResponse]:
    """Retrieve ranked supplier quotations for an RFQ."""

    rows = db.execute(
        select(Quotation, Supplier)
        .join(
            Supplier,
            Quotation.supplier_id == Supplier.id,
        )
        .where(Quotation.rfq_id == rfq_id)
        .order_by(
            Quotation.total_amount.asc(),
            Quotation.last_bid_at.asc(),
            Quotation.id.asc(),
        )
    ).all()

    return [
        RankingResponse(
            rank=rank,
            quotation_id=quotation.id,
            supplier_id=supplier.id,
            supplier_name=supplier.name,
            freight_charges=quotation.freight_charges,
            origin_charges=quotation.origin_charges,
            destination_charges=quotation.destination_charges,
            total_amount=quotation.total_amount,
            transit_time_hours=quotation.transit_time_hours,
            quote_valid_until=quotation.quote_valid_until,
            last_bid_at=quotation.last_bid_at,
        )
        for rank, (quotation, supplier) in enumerate(rows, start=1)
    ]
