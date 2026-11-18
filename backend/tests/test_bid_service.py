from datetime import datetime, timedelta, timezone
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from app.schemas.bid import BidCreate
from app.services.bid_service import (
    BidValidationError,
    RFQNotFoundError,
    submit_bid,
)


def make_payload():
    return BidCreate(
        supplier_id=1,
        freight_charges=Decimal("1000.00"),
        origin_charges=Decimal("100.00"),
        destination_charges=Decimal("50.00"),
        transit_time_hours=24,
        quote_valid_until=(
            datetime.now(timezone.utc) + timedelta(days=7)
        ),
    )


def make_rfq(**overrides):
    now = datetime.now(timezone.utc)

    values = {
        "id": 1,
        "bid_start_at": now - timedelta(hours=1),
        "current_close_at": now + timedelta(hours=1),
        "forced_close_at": now + timedelta(hours=2),
        "closed_at": None,
    }

    values.update(overrides)
    return SimpleNamespace(**values)


def test_missing_rfq_rolls_back():
    db = MagicMock()
    db.scalar.return_value = None

    with pytest.raises(RFQNotFoundError, match="RFQ not found"):
        submit_bid(db, 999, make_payload())

    db.rollback.assert_called_once()
    db.commit.assert_not_called()


def test_manually_closed_auction_rejected():
    db = MagicMock()
    db.scalar.return_value = make_rfq(
        closed_at=datetime.now(timezone.utc)
    )

    with pytest.raises(BidValidationError, match="Auction is closed"):
        submit_bid(db, 1, make_payload())

    db.rollback.assert_called_once()
    db.commit.assert_not_called()


def test_auction_not_started_rejected():
    db = MagicMock()
    db.scalar.return_value = make_rfq(
        bid_start_at=datetime.now(timezone.utc) + timedelta(hours=1)
    )

    with pytest.raises(BidValidationError, match="Auction has not started"):
        submit_bid(db, 1, make_payload())

    db.rollback.assert_called_once()
    db.commit.assert_not_called()


def test_auction_close_time_rejected():
    db = MagicMock()
    db.scalar.return_value = make_rfq(
        current_close_at=datetime.now(timezone.utc) - timedelta(minutes=1)
    )

    with pytest.raises(BidValidationError, match="Auction is closed"):
        submit_bid(db, 1, make_payload())

    db.rollback.assert_called_once()
    db.commit.assert_not_called()


def test_forced_close_time_rejected():
    db = MagicMock()
    db.scalar.return_value = make_rfq(
        forced_close_at=datetime.now(timezone.utc) - timedelta(minutes=1)
    )

    with pytest.raises(BidValidationError, match="Auction is closed"):
        submit_bid(db, 1, make_payload())

    db.rollback.assert_called_once()
    db.commit.assert_not_called()


def test_missing_supplier_rolls_back():
    from app.services.bid_service import SupplierNotFoundError

    db = MagicMock()
    db.scalar.return_value = make_rfq()
    db.get.return_value = None

    with pytest.raises(SupplierNotFoundError, match="Supplier not found"):
        submit_bid(db, 1, make_payload())

    db.rollback.assert_called_once()
    db.commit.assert_not_called()


def test_expired_quotation_validity_rejected():
    db = MagicMock()
    db.scalar.return_value = make_rfq()
    db.get.return_value = SimpleNamespace(id=1, name="DHL")

    payload = make_payload().model_copy(
        update={
            "quote_valid_until": (
                datetime.now(timezone.utc) - timedelta(days=1)
            )
        }
    )

    with pytest.raises(
        BidValidationError,
        match="Quotation validity must be in the future",
    ):
        submit_bid(db, 1, payload)

    db.rollback.assert_called_once()
    db.commit.assert_not_called()


@pytest.mark.parametrize(
    "previous_total",
    [Decimal("1150.00"), Decimal("1000.00")],
)
def test_non_decreasing_bid_rejected(mocker, previous_total):
    db = MagicMock()

    existing_quotation = SimpleNamespace(
        id=10,
        supplier_id=1,
        total_amount=previous_total,
    )

    db.scalar.side_effect = [
        make_rfq(),
        existing_quotation,
    ]
    db.get.return_value = SimpleNamespace(id=1, name="DHL")

    mocker.patch(
        "app.services.bid_service.get_ranking_snapshot",
        return_value=[],
    )

    with pytest.raises(
        BidValidationError,
        match="New bid total must be lower",
    ):
        submit_bid(db, 1, make_payload())

    db.rollback.assert_called_once()
    db.commit.assert_not_called()


def test_successful_first_bid_commits(mocker):
    db = MagicMock()
    rfq = make_rfq(
        trigger_window_minutes=10,
        extension_minutes=5,
        extension_trigger="ANY_BID",
    )

    db.scalar.side_effect = [rfq, None]
    db.get.return_value = SimpleNamespace(id=1, name="DHL")

    mocker.patch(
        "app.services.bid_service.get_ranking_snapshot",
        side_effect=[[], []],
    )
    mocker.patch(
        "app.services.bid_service.detect_rank_changes",
        return_value=(True, True),
    )
    mocker.patch(
        "app.services.bid_service.calculate_extended_close",
        return_value=None,
    )

    def assign_ids():
        for call in db.add.call_args_list:
            obj = call.args[0]
            if obj.__class__.__name__ == "Quotation":
                obj.id = 10
            elif obj.__class__.__name__ == "Bid":
                obj.id = 20

    db.flush.side_effect = assign_ids

    result = submit_bid(db, 1, make_payload())

    assert result.total_amount == Decimal("1150.00")
    assert result.quotation_id == 10

    db.commit.assert_called_once()
    db.refresh.assert_called_once_with(result)
    db.rollback.assert_not_called()

    added_types = [
        call.args[0].__class__.__name__
        for call in db.add.call_args_list
    ]

    assert "Quotation" in added_types
    assert "Bid" in added_types
    assert "AuctionActivityLog" in added_types


def test_successful_lower_bid_updates_existing_quotation(mocker):
    db = MagicMock()

    rfq = make_rfq(
        trigger_window_minutes=10,
        extension_minutes=5,
        extension_trigger="ANY_BID",
    )

    existing_quotation = SimpleNamespace(
        id=10,
        rfq_id=1,
        supplier_id=1,
        total_amount=Decimal("1500.00"),
    )

    db.scalar.side_effect = [rfq, existing_quotation]
    db.get.return_value = SimpleNamespace(id=1, name="DHL")

    mocker.patch(
        "app.services.bid_service.get_ranking_snapshot",
        side_effect=[[], []],
    )
    mocker.patch(
        "app.services.bid_service.detect_rank_changes",
        return_value=(False, False),
    )
    mocker.patch(
        "app.services.bid_service.calculate_extended_close",
        return_value=None,
    )

    result = submit_bid(db, 1, make_payload())

    assert existing_quotation.total_amount == Decimal("1150.00")
    assert result.quotation_id == 10

    added_types = [
        call.args[0].__class__.__name__
        for call in db.add.call_args_list
    ]

    assert "Quotation" not in added_types
    assert "Bid" in added_types
    assert "AuctionActivityLog" in added_types

    db.commit.assert_called_once()
    db.rollback.assert_not_called()
