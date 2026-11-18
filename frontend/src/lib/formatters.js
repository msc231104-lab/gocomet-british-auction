/**
 * Date and data formatting utilities for GoComet British Auction.
 * Formats timestamps in UTC for deterministic rendering across server and client.
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
