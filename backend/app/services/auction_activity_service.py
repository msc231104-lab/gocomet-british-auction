from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.auction_activity_log import AuctionActivityLog
from app.schemas.auction_activity import AuctionActivityResponse


def get_rfq_activity(
    db: Session,
    rfq_id: int,
) -> list[AuctionActivityResponse]:
    """Retrieve the chronological activity timeline for an RFQ."""

    logs = db.scalars(
        select(AuctionActivityLog)
        .where(AuctionActivityLog.rfq_id == rfq_id)
        .order_by(
            AuctionActivityLog.created_at.asc(),
            AuctionActivityLog.id.asc(),
        )
    ).all()

    return [
        AuctionActivityResponse.model_validate(log)
        for log in logs
    ]
