
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Quotation(Base):
    __tablename__ = "quotations"

    __table_args__ = (
        UniqueConstraint(
            "rfq_id",
            "supplier_id",
            name="uq_quotation_rfq_supplier",
        ),
        CheckConstraint(
            "freight_charges >= 0",
            name="ck_quotation_freight_nonnegative",
        ),
        CheckConstraint(
            "origin_charges >= 0",
            name="ck_quotation_origin_nonnegative",
        ),
        CheckConstraint(
            "destination_charges >= 0",
            name="ck_quotation_destination_nonnegative",
        ),
        CheckConstraint(
            "total_amount = freight_charges + origin_charges + destination_charges",
            name="ck_quotation_total_matches_charges",
        ),
        CheckConstraint(
            "transit_time_hours > 0",
            name="ck_quotation_transit_positive",
        ),
        Index(
            "ix_quotation_ranking",
            "rfq_id",
            "total_amount",
            "last_bid_at",
            "id",
        ),
    )

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    rfq_id: Mapped[int] = mapped_column(
        ForeignKey("rfqs.id"),
        nullable=False,
    )

    supplier_id: Mapped[int] = mapped_column(
        ForeignKey("suppliers.id"),
        nullable=False,
    )

    freight_charges: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )

    origin_charges: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )

    destination_charges: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )

    total_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )

    transit_time_hours: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    quote_valid_until: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    last_bid_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
