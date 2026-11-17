
from datetime import datetime, timedelta
from decimal import Decimal


def calculate_extended_close(
    now: datetime,
    current_close_at: datetime,
    forced_close_at: datetime,
    trigger_window_minutes: int,
    extension_minutes: int,
    extension_trigger: str,
    rank_changed: bool,
    l1_changed: bool,
) -> datetime | None:
    """Calculate a new auction close time for a qualifying bid."""

    if not (
        now.tzinfo
        and current_close_at.tzinfo
        and forced_close_at.tzinfo
    ):
        raise ValueError("Timezone-aware datetimes are required")

    # No extensions for closed or force-closed auctions.
    if now >= current_close_at or now >= forced_close_at:
        return None

    # Only bids in the final X minutes can extend the auction.
    window_start = current_close_at - timedelta(
        minutes=trigger_window_minutes
    )

    if now < window_start:
        return None

    if extension_trigger == "ANY_BID":
        qualifies = True
    elif extension_trigger == "ANY_RANK_CHANGE":
        qualifies = rank_changed
    elif extension_trigger == "L1_CHANGE":
        qualifies = l1_changed
    else:
        raise ValueError("Unsupported extension trigger")

    if not qualifies:
        return None

    new_close_at = min(
        current_close_at + timedelta(minutes=extension_minutes),
        forced_close_at,
    )

    if new_close_at <= current_close_at:
        return None

    return new_close_at


def detect_rank_changes(
    before: list[tuple[int, Decimal, datetime, int]],
    after: list[tuple[int, Decimal, datetime, int]],
) -> tuple[bool, bool]:
    """
    Detect ranking changes between two auction states.

    Each tuple contains:
        supplier_id, total_amount, last_bid_at, quotation_id

    Returns:
        (rank_changed, l1_changed)
    """

    def rank_suppliers(
        quotations: list[tuple[int, Decimal, datetime, int]],
    ) -> list[int]:
        ordered = sorted(
            quotations,
            key=lambda item: (
                item[1],
                item[2],
                item[3],
            ),
        )

        return [item[0] for item in ordered]

    before_ranking = rank_suppliers(before)
    after_ranking = rank_suppliers(after)

    rank_changed = before_ranking != after_ranking

    before_l1 = before_ranking[0] if before_ranking else None
    after_l1 = after_ranking[0] if after_ranking else None

    l1_changed = before_l1 != after_l1

    return rank_changed, l1_changed
