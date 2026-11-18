from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class BidHistoryResponse(BaseModel):
    """A historical bid submitted by a supplier."""

    id: int
    quotation_id: int
    supplier_id: int
    supplier_name: str

    freight_charges: Decimal
    origin_charges: Decimal
    destination_charges: Decimal
    total_amount: Decimal

    transit_time_hours: int
    quote_valid_until: datetime
    accepted_at: datetime

    model_config = ConfigDict(from_attributes=True)
