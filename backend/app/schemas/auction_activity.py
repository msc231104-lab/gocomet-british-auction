from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AuctionActivityResponse(BaseModel):
    """A recorded event in an RFQ auction."""

    id: int
    rfq_id: int
    bid_id: int | None

    event_type: str
    description: str

    old_close_at: datetime | None
    new_close_at: datetime | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
