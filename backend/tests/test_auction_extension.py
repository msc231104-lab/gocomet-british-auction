from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest

from app.services.auction_extension_service import (
    calculate_extended_close,
    detect_rank_changes,
)


BASE = datetime(2026, 11, 18, 10, 0, tzinfo=timezone.utc)


def extension(**overrides):
    params = {
        "now": BASE,
        "current_close_at": BASE + timedelta(minutes=10),
        "forced_close_at": BASE + timedelta(minutes=30),
        "trigger_window_minutes": 10,
        "extension_minutes": 5,
        "extension_trigger": "ANY_BID",
        "rank_changed": False,
        "l1_changed": False,
    }
    params.update(overrides)
    return calculate_extended_close(**params)


def test_any_bid_extends_auction():
    assert extension() == BASE + timedelta(minutes=15)


def test_bid_before_trigger_window_does_not_extend():
    assert extension(
        now=BASE - timedelta(seconds=1)
    ) is None


def test_bid_at_trigger_window_start_extends():
    assert extension(now=BASE) == BASE + timedelta(minutes=15)


def test_bid_at_closing_time_does_not_extend():
    assert extension(
        now=BASE + timedelta(minutes=10)
    ) is None


def test_bid_after_closing_time_does_not_extend():
    assert extension(
        now=BASE + timedelta(minutes=11)
    ) is None


def test_extension_capped_at_forced_close():
    assert extension(
        forced_close_at=BASE + timedelta(minutes=12)
    ) == BASE + timedelta(minutes=12)


def test_no_extension_when_forced_close_equals_current_close():
    assert extension(
        forced_close_at=BASE + timedelta(minutes=10)
    ) is None


def test_any_rank_change_requires_rank_change():
    assert extension(
        extension_trigger="ANY_RANK_CHANGE",
        rank_changed=False,
    ) is None

    assert extension(
        extension_trigger="ANY_RANK_CHANGE",
        rank_changed=True,
    ) == BASE + timedelta(minutes=15)


def test_l1_change_requires_l1_change():
    assert extension(
        extension_trigger="L1_CHANGE",
        l1_changed=False,
    ) is None

    assert extension(
        extension_trigger="L1_CHANGE",
        l1_changed=True,
    ) == BASE + timedelta(minutes=15)


def test_invalid_trigger_raises_error():
    with pytest.raises(ValueError, match="Unsupported"):
        extension(extension_trigger="INVALID")


def test_naive_datetime_raises_error():
    with pytest.raises(ValueError, match="Timezone-aware"):
        extension(now=datetime(2026, 11, 18, 10, 0))


def test_rank_change_detected():
    before = [
        (1, Decimal("1000"), BASE, 1),
        (2, Decimal("1200"), BASE, 2),
    ]
    after = [
        (1, Decimal("1000"), BASE, 1),
        (2, Decimal("900"), BASE, 2),
    ]

    assert detect_rank_changes(before, after) == (True, True)


def test_non_l1_rank_change_detected():
    before = [
        (1, Decimal("800"), BASE, 1),
        (2, Decimal("1000"), BASE, 2),
        (3, Decimal("1200"), BASE, 3),
    ]
    after = [
        (1, Decimal("800"), BASE, 1),
        (2, Decimal("1000"), BASE, 2),
        (3, Decimal("900"), BASE, 3),
    ]

    assert detect_rank_changes(before, after) == (True, False)


def test_unchanged_rankings():
    before = [
        (1, Decimal("1000"), BASE, 1),
        (2, Decimal("1200"), BASE, 2),
    ]

    assert detect_rank_changes(before, before) == (False, False)


def test_empty_rankings():
    assert detect_rank_changes([], []) == (False, False)


def test_equal_prices_use_timestamp_tiebreaker():
    before = [
        (1, Decimal("1000"), BASE, 1),
        (2, Decimal("1000"), BASE + timedelta(seconds=1), 2),
    ]
    after = [
        (1, Decimal("1000"), BASE + timedelta(seconds=2), 1),
        (2, Decimal("1000"), BASE + timedelta(seconds=1), 2),
    ]

    assert detect_rank_changes(before, after) == (True, True)
