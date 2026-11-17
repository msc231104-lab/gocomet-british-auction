
from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Integer,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class RFQ(Base):
    __tablename__ = "rfqs"

    __table_args__ = (
        CheckConstraint(
            "bid_start_at < initial_close_at",
            name="ck_rfq_start_before_close",
        ),
        CheckConstraint(
            "initial_close_at <= current_close_at",
            name="ck_rfq_initial_before_current",
        ),
        CheckConstraint(
            "current_close_at <= forced_close_at",
            name="ck_rfq_current_before_forced",
        ),
        CheckConstraint(
            "trigger_window_minutes > 0",
            name="ck_rfq_trigger_window_positive",
        ),
        CheckConstraint(
            "extension_minutes > 0",
            name="ck_rfq_extension_positive",
        ),
        CheckConstraint(
            "extension_trigger IN ('ANY_BID', 'ANY_RANK_CHANGE', 'L1_CHANGE')",
            name="ck_rfq_valid_extension_trigger",
        ),
        CheckConstraint(
            "closure_reason IS NULL OR closure_reason IN ('NORMAL', 'FORCED')",
            name="ck_rfq_valid_closure_reason",
        ),
        CheckConstraint(
            "(closed_at IS NULL AND closure_reason IS NULL) OR "
            "(closed_at IS NOT NULL AND closure_reason IS NOT NULL)",
            name="ck_rfq_closure_fields_together",
        ),
    )

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )

    reference_id: Mapped[str] = mapped_column(
        String(100), unique=True, nullable=False
    )

    name: Mapped[str] = mapped_column(
        String(255), nullable=False
    )

    bid_start_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )

    initial_close_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )

    current_close_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )

    forced_close_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )

    pickup_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )

    trigger_window_minutes: Mapped[int] = mapped_column(
        Integer, nullable=False
    )

    extension_minutes: Mapped[int] = mapped_column(
        Integer, nullable=False
    )

    extension_trigger: Mapped[str] = mapped_column(
        String(30), nullable=False
    )

    closed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    closure_reason: Mapped[str | None] = mapped_column(
        String(20), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
