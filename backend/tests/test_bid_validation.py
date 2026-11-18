from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.schemas.bid import BidCreate


def valid_bid(**overrides):
    payload = {
        "supplier_id": 1,
        "freight_charges": "1000.00",
        "origin_charges": "100.00",
        "destination_charges": "50.00",
        "transit_time_hours": 24,
        "quote_valid_until": (
            datetime.now(timezone.utc) + timedelta(days=7)
        ),
    }
    payload.update(overrides)
    return BidCreate(**payload)


def test_valid_bid():
    bid = valid_bid()
    assert bid.supplier_id == 1
    assert bid.freight_charges == Decimal("1000.00")


def test_zero_charges_allowed():
    bid = valid_bid(
        freight_charges="0",
        origin_charges="0",
        destination_charges="0",
    )
    assert bid.freight_charges == Decimal("0")


@pytest.mark.parametrize(
    "field",
    ["freight_charges", "origin_charges", "destination_charges"],
)
def test_negative_charges_rejected(field):
    with pytest.raises(ValidationError):
        valid_bid(**{field: "-1.00"})


@pytest.mark.parametrize(
    "field",
    ["freight_charges", "origin_charges", "destination_charges"],
)
def test_excess_decimal_places_rejected(field):
    with pytest.raises(ValidationError):
        valid_bid(**{field: "100.123"})


def test_excess_digits_rejected():
    with pytest.raises(ValidationError):
        valid_bid(freight_charges="1234567890123.00")


def test_invalid_supplier_id_rejected():
    with pytest.raises(ValidationError):
        valid_bid(supplier_id=0)


def test_negative_supplier_id_rejected():
    with pytest.raises(ValidationError):
        valid_bid(supplier_id=-1)


def test_zero_transit_time_rejected():
    with pytest.raises(ValidationError):
        valid_bid(transit_time_hours=0)


def test_negative_transit_time_rejected():
    with pytest.raises(ValidationError):
        valid_bid(transit_time_hours=-5)


def test_naive_validity_datetime_rejected():
    with pytest.raises(ValidationError):
        valid_bid(
            quote_valid_until=datetime(2026, 11, 18, 10, 0)
        )


def test_timezone_aware_validity_accepted():
    bid = valid_bid(
        quote_valid_until=datetime(
            2026, 11, 25, 10, 0, tzinfo=timezone.utc
        )
    )
    assert bid.quote_valid_until.tzinfo is not None


def test_missing_required_field_rejected():
    with pytest.raises(ValidationError):
        valid_bid(supplier_id=None)
