
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Bid(Base):
    __tablename__ = "bids"

    __table_args__ = (
        CheckConstraint(
            "freight_charges >= 0",
            name="ck_bid_freight_nonnegative",
        ),
        CheckConstraint(
            "origin_charges >= 0",
            name="ck_bid_origin_nonnegative",
        ),
        CheckConstraint(
            "destination_charges >= 0",
            name="ck_bid_destination_nonnegative",
        ),
        CheckConstraint(
            "total_amount = freight_charges + origin_charges + destination_charges",
            name="ck_bid_total_matches_charges",
        ),
        CheckConstraint(
            "transit_time_hours > 0",
            name="ck_bid_transit_positive",
        ),
Index(
    "ix_bid_quotation_accepted_at",
    "quotation_id",
    "accepted_at",
    postgresql_ops={},
)
    )

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    quotation_id: Mapped[int] = mapped_column(
        ForeignKey("quotations.id"),
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

    accepted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
