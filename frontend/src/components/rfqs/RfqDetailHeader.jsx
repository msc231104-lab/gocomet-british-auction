"use client";

import Link from "next/link";
import {
  ArrowLeftIcon,
  RefreshIcon,
  ClockIcon,
  ShieldCheckIcon,
  InfoIcon,
} from "@/components/ui/Icons";
import {
  formatDateTimeUTC,
  formatExtensionTrigger,
  getStatusStyle,
} from "@/lib/formatters";

/**
 * Header component for the RFQ Details & Live Auction Workspace.
 * Displays title, reference ID, operational state, countdown timer, schedule summary, and refresh trigger.
 */
export default function RfqDetailHeader({
  rfq,
  auctionState,
  countdown,
  isRefreshing = false,
  isBackgroundSyncing = false,
  isStale = false,
  syncError = null,
  onRefresh,
  lastRefreshedAt,
}) {
  const statusStyle = getStatusStyle(rfq?.status);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 mb-6">
      {/* Top Bar: Breadcrumb & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
        <Link
          href="/rfqs"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors group w-fit"
        >
          <ArrowLeftIcon className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition-transform group-hover:-translate-x-0.5" />
          <span>Back to RFQs</span>
        </Link>

        <div className="flex items-center gap-2.5">
          {/* Live Sync Status Indicator */}
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
              isStale
                ? "bg-amber-50 border-amber-200 text-amber-800"
                : "bg-slate-50 border-slate-200 text-slate-600"
            }`}
            title={
              isStale
                ? "Automatic synchronization interrupted. Displaying cached data."
                : "Live auction automatic background sync active (5s interval)"
            }
          >
            {isStale ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span>Sync Stale</span>
              </>
            ) : isBackgroundSyncing ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-emerald-700 font-bold">Syncing</span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Live (5s)</span>
              </>
            )}
          </div>

          {lastRefreshedAt && (
            <span className="text-[11px] font-mono text-slate-400 hidden sm:inline-block">
              Synced {lastRefreshedAt.toLocaleTimeString()}
            </span>
          )}

          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-full hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 transition-colors shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            title="Manually refresh auction rankings and bids"
          >
            <RefreshIcon
              className={`w-3.5 h-3.5 text-slate-500 ${isRefreshing ? "animate-spin text-blue-700" : ""}`}
            />
            <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* Stale Data Warning Banner */}
      {isStale && syncError && (
        <div
          role="status"
          aria-live="polite"
          className="mt-4 p-3.5 bg-amber-50/90 border border-amber-200/90 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-amber-900"
        >
          <div className="flex items-start sm:items-center gap-2.5">
            <InfoIcon className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <span className="font-semibold">Synchronization Interrupted:</span>{" "}
              {syncError}. Showing cached auction data from{" "}
              <span className="font-mono font-medium">
                {lastRefreshedAt ? lastRefreshedAt.toLocaleTimeString() : "initial load"}
              </span>
              . Retrying automatically...
            </div>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="font-semibold text-amber-900 underline hover:text-amber-950 whitespace-nowrap self-end sm:self-auto text-xs"
          >
            {isRefreshing ? "Retrying..." : "Retry Now"}
          </button>
        </div>
      )}

      {/* Main Title & Countdown Row */}
      <div className="pt-4 pb-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
              {rfq?.reference_id}
            </span>

            {/* Backend Status Badge */}
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusStyle.badge}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
              {statusStyle.label}
            </span>

            {/* Operational State Badge */}
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${auctionState.badge}`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${auctionState.dot} ${auctionState.isOpen ? "animate-ping" : ""}`}
              />
              {auctionState.label}
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {rfq?.name}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {auctionState.description}
          </p>
        </div>

        {/* Live Countdown / State Banner Card */}
        <div className="shrink-0">
          {auctionState.isOpen ? (
            <div className="bg-emerald-50/80 border border-emerald-200/90 rounded-2xl px-5 py-3 shadow-xs flex items-center gap-4">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <ClockIcon className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                  Bidding Window Closes In
                </div>
                <div className="text-2xl sm:text-3xl font-mono font-bold text-emerald-950 tracking-tight leading-none mt-0.5">
                  {countdown?.formatted ?? "—"}
                </div>
                <div className="text-[10px] text-emerald-700 font-medium mt-0.5">
                  Closing at {formatDateTimeUTC(rfq?.current_close_at)}
                </div>
              </div>
            </div>
          ) : auctionState.state === "SCHEDULED" ? (
            <div className="bg-blue-50/80 border border-blue-200/90 rounded-2xl px-5 py-3 shadow-xs flex items-center gap-4">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <ClockIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">
                  Bidding Scheduled
                </div>
                <div className="text-xs font-semibold text-blue-950 mt-0.5">
                  Starts {formatDateTimeUTC(rfq?.bid_start_at)}
                </div>
                <div className="text-[10px] text-blue-700">
                  Opens in {countdown?.formatted ?? "—"}
                </div>
              </div>
            </div>
          ) : auctionState.state === "EXPIRED" ? (
            <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl px-5 py-3 shadow-xs flex items-center gap-4">
              <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <ClockIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                  Bidding Concluded
                </div>
                <div className="text-xs font-semibold text-amber-950 mt-0.5">
                  Awaiting Final Closure
                </div>
                <div className="text-[10px] text-amber-700">
                  Closed at {formatDateTimeUTC(rfq?.current_close_at)}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 shadow-xs flex items-center gap-4">
              <div className="w-9 h-9 rounded-xl bg-slate-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                <ShieldCheckIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                  Auction Finished
                </div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  {rfq?.status}
                </div>
                <div className="text-[10px] text-slate-500">
                  {rfq?.closed_at
                    ? `At ${formatDateTimeUTC(rfq.closed_at)}`
                    : "Closed"}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Schedule & Extension Parameters Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-4 border-t border-slate-100 text-xs">
        <div className="bg-slate-50/60 rounded-xl p-2.5 border border-slate-100">
          <div className="text-slate-400 font-bold text-[10px] uppercase tracking-wider mb-0.5">Bid Start</div>
          <div className="font-semibold text-slate-900 font-mono text-[11px]">
            {formatDateTimeUTC(rfq?.bid_start_at)}
          </div>
        </div>

        <div className="bg-slate-50/60 rounded-xl p-2.5 border border-slate-100">
          <div className="text-slate-400 font-bold text-[10px] uppercase tracking-wider mb-0.5">Current Close</div>
          <div className="font-semibold text-slate-900 font-mono text-[11px]">
            {formatDateTimeUTC(rfq?.current_close_at)}
          </div>
        </div>

        <div className="bg-slate-50/60 rounded-xl p-2.5 border border-slate-100">
          <div className="text-slate-400 font-bold text-[10px] uppercase tracking-wider mb-0.5">Forced Close</div>
          <div className="font-semibold text-slate-900 font-mono text-[11px]">
            {formatDateTimeUTC(rfq?.forced_close_at)}
          </div>
        </div>

        <div className="bg-slate-50/60 rounded-xl p-2.5 border border-slate-100">
          <div className="text-slate-400 font-bold text-[10px] uppercase tracking-wider mb-0.5">Target Pickup</div>
          <div className="font-semibold text-slate-900 font-mono text-[11px]">
            {formatDateTimeUTC(rfq?.pickup_at)}
          </div>
        </div>

        <div className="bg-slate-50/60 rounded-xl p-2.5 border border-slate-100">
          <div className="text-slate-400 font-bold text-[10px] uppercase tracking-wider mb-0.5">Extension Rule</div>
          <div className="font-semibold text-slate-800 text-[11px]">
            {formatExtensionTrigger(rfq?.extension_trigger)}
          </div>
        </div>

        <div className="bg-slate-50/60 rounded-xl p-2.5 border border-slate-100">
          <div className="text-slate-400 font-bold text-[10px] uppercase tracking-wider mb-0.5">Window / Ext</div>
          <div className="font-semibold text-slate-800 text-[11px]">
            {rfq?.trigger_window_minutes}m / +{rfq?.extension_minutes}m
          </div>
        </div>
      </div>

      {/* Closure Reason alert if present */}
      {rfq?.closure_reason && (
        <div className="mt-3.5 p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2.5 text-xs text-slate-700">
          <InfoIcon className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Closure Reason:</span>{" "}
            {rfq.closure_reason}
          </div>
        </div>
      )}
    </div>
  );
}
