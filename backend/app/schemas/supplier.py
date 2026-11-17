
from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class SupplierCreate(BaseModel):
    """Request schema for registering a supplier."""

    name: str = Field(min_length=1, max_length=255)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        value = value.strip()

        if not value:
            raise ValueError("Supplier name cannot be empty")

        return value


class SupplierResponse(BaseModel):
    """Response schema for supplier information."""

    id: int
    name: str
    created_at: datetime

    model_config = {"from_attributes": True}
