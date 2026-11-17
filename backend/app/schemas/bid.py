
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field, field_validator


class BidCreate(BaseModel):
    """Request schema for submitting a supplier bid."""

    supplier_id: int = Field(gt=0)

    freight_charges: Decimal = Field(
        ge=0,
        max_digits=12,
        decimal_places=2,
    )
    origin_charges: Decimal = Field(
        ge=0,
        max_digits=12,
        decimal_places=2,
    )
    destination_charges: Decimal = Field(
        ge=0,
        max_digits=12,
        decimal_places=2,
    )

    transit_time_hours: int = Field(gt=0)
    quote_valid_until: datetime

    @field_validator("quote_valid_until")
    @classmethod
    def validate_timezone(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("Timezone information is required")

        return value


class BidResponse(BaseModel):
    """Response schema for an accepted supplier bid."""

    id: int
    quotation_id: int

    freight_charges: Decimal
    origin_charges: Decimal
    destination_charges: Decimal
    total_amount: Decimal

    transit_time_hours: int
    quote_valid_until: datetime
    accepted_at: datetime

    model_config = {"from_attributes": True}
