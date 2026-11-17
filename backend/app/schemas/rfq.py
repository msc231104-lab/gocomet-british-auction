
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator


class RFQCreate(BaseModel):
    reference_id: str = Field(min_length=1, max_length=100)
    name: str = Field(min_length=1, max_length=255)

    bid_start_at: datetime
    initial_close_at: datetime
    forced_close_at: datetime
    pickup_at: datetime

    trigger_window_minutes: int = Field(gt=0)
    extension_minutes: int = Field(gt=0)

    extension_trigger: Literal[
        "ANY_BID",
        "ANY_RANK_CHANGE",
        "L1_CHANGE",
    ]

    @field_validator("reference_id", "name")
    @classmethod
    def validate_nonempty_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Field cannot be empty")
        return value

    @field_validator(
        "bid_start_at",
        "initial_close_at",
        "forced_close_at",
        "pickup_at",
    )
    @classmethod
    def validate_timezone(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("Timezone information is required")
        return value

    @model_validator(mode="after")
    def validate_dates(self):
        if not (
            self.bid_start_at
            < self.initial_close_at
            < self.forced_close_at
        ):
            raise ValueError(
                "Expected bid_start_at < initial_close_at < forced_close_at"
            )

        if self.pickup_at <= self.bid_start_at:
            raise ValueError(
                "pickup_at must be after bid_start_at"
            )

        return self


class RFQResponse(BaseModel):
    id: int
    reference_id: str
    name: str

    bid_start_at: datetime
    initial_close_at: datetime
    current_close_at: datetime
    forced_close_at: datetime
    pickup_at: datetime

    trigger_window_minutes: int
    extension_minutes: int
    extension_trigger: Literal[
        "ANY_BID",
        "ANY_RANK_CHANGE",
        "L1_CHANGE",
    ]

    closed_at: datetime | None = None
    closure_reason: Literal["NORMAL", "FORCED"] | None = None
    created_at: datetime

    status: Literal["Active", "Closed", "Force Closed"]

    model_config = {"from_attributes": True}
