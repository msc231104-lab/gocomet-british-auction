/**
 * Date and data formatting utilities for GoComet British Auction.
 * Formats timestamps in UTC for deterministic rendering across server and client,
 * and provides timezone conversion utilities for RFQ creation.
 */

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function pad(num) {
  return num < 10 ? `0${num}` : `${num}`;
}

/**
 * Format an ISO timestamp string into a clean UTC display string:
 * e.g. "Nov 20, 2026, 04:30:00 UTC"
 *
 * @param {string | null | undefined} isoString
 * @param {boolean} includeSeconds
 * @returns {string}
 */
export function formatDateTimeUTC(isoString, includeSeconds = false) {
  if (!isoString) return "—";

  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "—";

  const year = date.getUTCFullYear();
  const month = MONTHS[date.getUTCMonth()];
  const day = pad(date.getUTCDate());
  const hours = pad(date.getUTCHours());
  const minutes = pad(date.getUTCMinutes());
  const seconds = pad(date.getUTCSeconds());

  if (includeSeconds) {
    return `${month} ${day}, ${year} ${hours}:${minutes}:${seconds} UTC`;
  }
  return `${month} ${day}, ${year} ${hours}:${minutes} UTC`;
}

/**
 * Short date format in UTC: "2026-11-20 04:30 UTC"
 *
 * @param {string | null | undefined} isoString
 * @returns {string}
 */
export function formatShortDateUTC(isoString) {
  if (!isoString) return "—";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "—";

  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());
  const hours = pad(date.getUTCHours());
  const minutes = pad(date.getUTCMinutes());

  return `${year}-${month}-${day} ${hours}:${minutes} UTC`;
}

/**
 * Human-friendly extension trigger label
 *
 * @param {string} trigger
 * @returns {string}
 */
export function formatExtensionTrigger(trigger) {
  switch (trigger) {
    case "ANY_BID":
      return "Any Bid";
    case "ANY_RANK_CHANGE":
      return "Any Rank Change";
    case "L1_CHANGE":
      return "L1 Leader Change";
    default:
      return trigger || "—";
  }
}

/**
 * Status badge styling mappings
 *
 * @param {string} status
 * @returns {{ badge: string, dot: string, label: string }}
 */
export function getStatusStyle(status) {
  switch (status) {
    case "Active":
      return {
        badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
        dot: "bg-emerald-500",
        label: "Active",
      };
    case "Closed":
      return {
        badge: "bg-slate-100 text-slate-700 border-slate-200",
        dot: "bg-slate-400",
        label: "Closed",
      };
    case "Force Closed":
      return {
        badge: "bg-amber-50 text-amber-800 border-amber-200",
        dot: "bg-amber-500",
        label: "Force Closed",
      };
    default:
      return {
        badge: "bg-slate-100 text-slate-700 border-slate-200",
        dot: "bg-slate-400",
        label: status || "Unknown",
      };
  }
}

/**
 * Detect user's local timezone name and offset string
 *
 * @returns {{ name: string, offset: string, formatted: string }}
 */
export function getUserTimezone() {
  try {
    const tzName =
      (typeof Intl !== "undefined" && Intl.DateTimeFormat().resolvedOptions().timeZone) ||
      "UTC";
    const d = new Date();
    const offsetMinutes = -d.getTimezoneOffset();
    const sign = offsetMinutes >= 0 ? "+" : "-";
    const absOffset = Math.abs(offsetMinutes);
    const offsetH = String(Math.floor(absOffset / 60)).padStart(2, "0");
    const offsetM = String(absOffset % 60).padStart(2, "0");
    const offsetStr = `${sign}${offsetH}:${offsetM}`;

    return {
      name: tzName,
      offset: offsetStr,
      formatted: `${tzName} (UTC${offsetStr})`,
    };
  } catch {
    return {
      name: "UTC",
      offset: "+00:00",
      formatted: "UTC (+00:00)",
    };
  }
}

/**
 * Convert a local datetime-local input string (e.g. "2026-11-20T09:00")
 * to a valid, timezone-aware ISO 8601 string (e.g. "2026-11-20T09:00:00+05:30").
 * Preserves the user's local timezone offset for backend validation.
 *
 * @param {string | null | undefined} localDateTimeString
 * @returns {string | null}
 */
export function toTimezoneAwareISO(localDateTimeString) {
  if (!localDateTimeString) return null;
  const d = new Date(localDateTimeString);
  if (isNaN(d.getTime())) return null;

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const seconds = String(d.getSeconds()).padStart(2, "0");

  const offsetMinutes = -d.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absOffset = Math.abs(offsetMinutes);
  const offsetH = String(Math.floor(absOffset / 60)).padStart(2, "0");
  const offsetM = String(absOffset % 60).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${sign}${offsetH}:${offsetM}`;
}

/**
 * Format a number or numeric string as currency (USD default)
 * e.g. "1200.00" -> "$1,200.00"
 *
 * @param {number | string | null | undefined} amount
 * @param {string} currency
 * @returns {string}
 */
export function formatCurrency(amount, currency = "$") {
  if (amount === null || amount === undefined || amount === "") return "—";
  const num = typeof amount === "number" ? amount : parseFloat(amount);
  if (isNaN(num)) return "—";
  return `${currency}${num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Determine operational auction state:
 * - SCHEDULED: now < bid_start_at
 * - ACTIVE: now >= bid_start_at && now < current_close_at && !closed_at
 * - EXPIRED: now >= current_close_at && !closed_at
 * - CLOSED / FORCE_CLOSED: closed_at != null || status in ("Closed", "Force Closed")
 *
 * @param {object} rfq
 * @param {Date | string | number} [now]
 * @returns {{ state: string, label: string, isOpen: boolean, badge: string, dot: string, description: string }}
 */
export function getAuctionState(rfq, now = new Date()) {
  if (!rfq) {
    return {
      state: "UNKNOWN",
      label: "Unknown",
      isOpen: false,
      badge: "bg-slate-100 text-slate-700 border-slate-200",
      dot: "bg-slate-400",
      description: "Unknown state",
    };
  }

  const isExplicitlyClosed =
    rfq.status === "Closed" ||
    rfq.status === "Force Closed" ||
    Boolean(rfq.closed_at);

  if (isExplicitlyClosed) {
    const isForced =
      rfq.status === "Force Closed" ||
      (rfq.closure_reason && rfq.closure_reason.toLowerCase().includes("force"));
    return {
      state: isForced ? "FORCE_CLOSED" : "CLOSED",
      label: isForced ? "Force Closed" : "Closed",
      isOpen: false,
      badge: isForced
        ? "bg-amber-50 text-amber-800 border-amber-200"
        : "bg-slate-100 text-slate-700 border-slate-200",
      dot: isForced ? "bg-amber-500" : "bg-slate-400",
      description: rfq.closure_reason
        ? `Closed: ${rfq.closure_reason}`
        : "Auction has concluded",
    };
  }

  const nowDate = now instanceof Date ? now : new Date(now);
  const nowMs = nowDate.getTime();
  const startMs = rfq.bid_start_at ? new Date(rfq.bid_start_at).getTime() : NaN;
  const closeMs = rfq.current_close_at
    ? new Date(rfq.current_close_at).getTime()
    : NaN;

  if (!isNaN(startMs) && nowMs < startMs) {
    return {
      state: "SCHEDULED",
      label: "Scheduled",
      isOpen: false,
      badge: "bg-blue-50 text-blue-700 border-blue-200",
      dot: "bg-blue-500",
      description: "Bidding has not yet started",
    };
  }

  if (!isNaN(closeMs) && nowMs >= closeMs) {
    return {
      state: "EXPIRED",
      label: "Awaiting Closure",
      isOpen: false,
      badge: "bg-amber-50 text-amber-800 border-amber-200",
      dot: "bg-amber-500",
      description: "Closing time elapsed; pending finalization",
    };
  }

  return {
    state: "ACTIVE",
    label: "Live Bidding",
    isOpen: true,
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
    description: "Accepting competitive bids",
  };
}

/**
 * Format countdown from now to target timestamp
 *
 * @param {string | null | undefined} targetIso
 * @param {Date | string | number} [now]
 * @returns {{ formatted: string, isPast: boolean, totalSeconds: number, days: number, hours: number, minutes: number, seconds: number }}
 */
export function formatCountdown(targetIso, now = new Date()) {
  if (!targetIso) {
    return {
      formatted: "—",
      isPast: true,
      totalSeconds: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    };
  }

  const targetDate = new Date(targetIso);
  const targetMs = targetDate.getTime();
  if (isNaN(targetMs)) {
    return {
      formatted: "—",
      isPast: true,
      totalSeconds: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    };
  }

  const nowMs = (now instanceof Date ? now : new Date(now)).getTime();
  const diffMs = targetMs - nowMs;

  if (diffMs <= 0) {
    return {
      formatted: "00h 00m 00s",
      isPast: true,
      totalSeconds: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    };
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad2 = (n) => String(n).padStart(2, "0");
  let formatted = "";
  if (days > 0) {
    formatted = `${days}d ${pad2(hours)}h ${pad2(minutes)}m`;
  } else {
    formatted = `${pad2(hours)}h ${pad2(minutes)}m ${pad2(seconds)}s`;
  }

  return {
    formatted,
    isPast: false,
    totalSeconds,
    days,
    hours,
    minutes,
    seconds,
  };
}
