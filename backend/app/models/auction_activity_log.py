
from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class AuctionActivityLog(Base):
    __tablename__ = "auction_activity_logs"

    __table_args__ = (
        CheckConstraint(
            "event_type IN ("
            "'RFQ_CREATED', "
            "'BID_SUBMITTED', "
            "'AUCTION_EXTENDED', "
            "'AUCTION_CLOSED', "
            "'AUCTION_FORCE_CLOSED'"
            ")",
            name="ck_activity_event_type",
        ),
        Index(
            "ix_activity_rfq_created_at",
            "rfq_id",
            "created_at",
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

    bid_id: Mapped[int | None] = mapped_column(
        ForeignKey("bids.id"),
        nullable=True,
    )

    event_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
    )

    description: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    old_close_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    new_close_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
