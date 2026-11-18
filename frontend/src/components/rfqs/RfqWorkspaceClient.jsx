"use client";

import { useState, useSyncExternalStore, useRef, useCallback, useEffect } from "react";
import RfqDetailHeader from "@/components/rfqs/RfqDetailHeader";
import RfqLeaderboard from "@/components/rfqs/RfqLeaderboard";
import BidSubmissionForm from "@/components/rfqs/BidSubmissionForm";
import BidHistoryTable from "@/components/rfqs/BidHistoryTable";
import AuctionTimeline from "@/components/rfqs/AuctionTimeline";
import {
  TrophyIcon,
  HistoryIcon,
  ClockIcon,
  InfoIcon,
} from "@/components/ui/Icons";
import {
  getAuctionState,
  formatCountdown,
  formatDateTimeUTC,
  formatExtensionTrigger,
  getStatusStyle,
} from "@/lib/formatters";

let currentClockSnapshot = Date.now();
const clockSubscribers = new Set();
let clockInterval = null;

function subscribeToClock(callback) {
  clockSubscribers.add(callback);

  if (clockInterval === null) {
    clockInterval = setInterval(() => {
      currentClockSnapshot = Date.now();
      clockSubscribers.forEach((subscriber) => subscriber());
    }, 1000);
  }

  return () => {
    clockSubscribers.delete(callback);

    if (clockSubscribers.size === 0 && clockInterval !== null) {
      clearInterval(clockInterval);
      clockInterval = null;
    }
  };
}

function getClockSnapshot() {
  return currentClockSnapshot;
}

function getServerClockSnapshot() {
  return null;
}

/**
 * Main interactive client component for the RFQ Details & Live Auction Workspace.
 * Manages live countdowns, reactive tabs, reliable automatic synchronization, and bidding interactions.
 */
export default function RfqWorkspaceClient({
  initialRfq,
  initialRankings = [],
  initialBids = [],
  initialActivity = [],
  initialSuppliers = [],
}) {
  const rfqId = initialRfq?.id;

  const [rfq, setRfq] = useState(initialRfq);
  const [rankings, setRankings] = useState(initialRankings);
  const [bids, setBids] = useState(initialBids);
  const [activities, setActivities] = useState(initialActivity);
  const [suppliers] = useState(initialSuppliers);

  const [activeTab, setActiveTab] = useState("workspace"); // workspace | bids | activity | specs
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [isBackgroundSyncing, setIsBackgroundSyncing] = useState(false);
  const [isStale, setIsStale] = useState(false);
  const [syncError, setSyncError] = useState(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);

  // Synchronization and request concurrency control refs
  const inFlightRef = useRef(false);
  const abortControllerRef = useRef(null);
  const requestIdRef = useRef(0);
  const isUnmountedRef = useRef(false);

  // Synchronize 1s clock tick without synchronous effect setState
  const clockTime = useSyncExternalStore(
    subscribeToClock,
    getClockSnapshot,
    getServerClockSnapshot
  );

  // Compute operational auction state & countdown
  const now = clockTime ? new Date(clockTime) : null;
  const auctionState = clockTime
    ? getAuctionState(rfq, now)
    : {
        state: "INITIALIZING",
        label: "Checking auction status",
        description: "Synchronizing the live auction clock",
        isOpen: false,
        badge: "bg-slate-100 text-slate-600 border-slate-200",
        dot: "bg-slate-400",
      };
  const targetTimestamp =
    auctionState.state === "SCHEDULED" ? rfq?.bid_start_at : rfq?.current_close_at;
  const countdown = clockTime
    ? formatCountdown(targetTimestamp, now)
    : null;

  // Unified synchronization handler with race-condition prevention
  const performSync = useCallback(
    async ({ isManual = false, force = false } = {}) => {
      if (isUnmountedRef.current || !rfqId) return;

      // Concurrency management:
      if (inFlightRef.current) {
        if (force) {
          // Explicit or high-priority requests (manual refresh / post-bid) abort active in-flight poll
          if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
          }
        } else {
          // Skip regular background poll if another request is already in-flight
          return;
        }
      }

      inFlightRef.current = true;
      const currentRequestId = ++requestIdRef.current;
      const controller = new AbortController();
      abortControllerRef.current = controller;

      if (!isUnmountedRef.current) {
        if (isManual) {
          setIsManualRefreshing(true);
        } else {
          setIsBackgroundSyncing(true);
        }
      }

      try {
        const [rfqRes, rankRes, bidsRes, actRes] = await Promise.all([
          fetch(`/api/rfqs/${rfqId}`, {
            signal: controller.signal,
            cache: "no-store",
          }),
          fetch(`/api/rfqs/${rfqId}/rankings`, {
            signal: controller.signal,
            cache: "no-store",
          }),
          fetch(`/api/rfqs/${rfqId}/bids`, {
            signal: controller.signal,
            cache: "no-store",
          }),
          fetch(`/api/rfqs/${rfqId}/activity`, {
            signal: controller.signal,
            cache: "no-store",
          }),
        ]);

        // Guard against out-of-order responses or component unmount
        if (
          currentRequestId !== requestIdRef.current ||
          isUnmountedRef.current
        ) {
          return;
        }

        // Validate HTTP response statuses
        if (!rfqRes.ok || !rankRes.ok || !bidsRes.ok || !actRes.ok) {
          const failedDetails = [
            !rfqRes.ok && `RFQ details (${rfqRes.status})`,
            !rankRes.ok && `Rankings (${rankRes.status})`,
            !bidsRes.ok && `Bids (${bidsRes.status})`,
            !actRes.ok && `Activity (${actRes.status})`,
          ]
            .filter(Boolean)
            .join(", ");

          throw new Error(`Failed to load: ${failedDetails}`);
        }

        const [rfqData, rankData, bidsData, actData] = await Promise.all([
          rfqRes.json().catch(() => null),
          rankRes.json().catch(() => null),
          bidsRes.json().catch(() => null),
          actRes.json().catch(() => null),
        ]);

        if (
          currentRequestId !== requestIdRef.current ||
          isUnmountedRef.current
        ) {
          return;
        }

        // Validate response envelopes and data integrity
        const isRfqValid =
          rfqData?.data &&
          typeof rfqData.data === "object" &&
          rfqData.data.id === rfqId;
        const isRankValid = Array.isArray(rankData?.data);
        const isBidsValid = Array.isArray(bidsData?.data);
        const isActValid = Array.isArray(actData?.data);

        if (!isRfqValid || !isRankValid || !isBidsValid || !isActValid) {
          throw new Error("Received invalid or malformed data payload from backend");
        }

        // All 4 responses verified successfully: update state atomically if still mounted
        if (!isUnmountedRef.current && currentRequestId === requestIdRef.current) {
          setRfq(rfqData.data);
          setRankings(rankData.data);
          setBids(bidsData.data);
          setActivities(actData.data);
          setLastRefreshedAt(new Date());
          setIsStale(false);
          setSyncError(null);
        }
      } catch (err) {
        if (err.name === "AbortError") {
          // Intentional cancellation; do not treat as an error
          return;
        }

        if (
          currentRequestId === requestIdRef.current &&
          !isUnmountedRef.current
        ) {
          // Preserve last successfully loaded data; surface accessible warning
          setIsStale(true);
          setSyncError(
            err.message || "Failed to synchronize auction data with backend"
          );
        }
      } finally {
        // Only the currently active request resets inFlightRef and state
        if (currentRequestId === requestIdRef.current) {
          inFlightRef.current = false;
          abortControllerRef.current = null;
          if (!isUnmountedRef.current) {
            setIsManualRefreshing(false);
            setIsBackgroundSyncing(false);
          }
        }
      }
    },
    [rfqId]
  );

  // Automatic 5-second polling and visibility change synchronization
  useEffect(() => {
    let active = true;
    isUnmountedRef.current = false;
    const reqRef = requestIdRef;
    const inflight = inFlightRef;
    const abortRef = abortControllerRef;

    let pollTimeoutId = null;

    const scheduleNextPoll = () => {
      if (!active) return;
      if (pollTimeoutId) clearTimeout(pollTimeoutId);
      pollTimeoutId = setTimeout(async () => {
        if (!active) return;
        if (
          !isUnmountedRef.current &&
          typeof document !== "undefined" &&
          document.visibilityState === "visible"
        ) {
          await performSync({ isManual: false, force: false });
        }
        if (active && !isUnmountedRef.current) {
          scheduleNextPoll();
        }
      }, 5000);
    };

    const handleVisibilityChange = () => {
      if (!active) return;
      if (document.visibilityState === "visible" && !isUnmountedRef.current) {
        // Immediate sync upon returning to tab
        performSync({ isManual: false, force: true });
        scheduleNextPoll();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    scheduleNextPoll();

    return () => {
      active = false;
      isUnmountedRef.current = true;
      if (pollTimeoutId) clearTimeout(pollTimeoutId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      // Invalidate outstanding request IDs and abort active controller
      reqRef.current += 1;
      inflight.current = false;
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
    };
  }, [rfqId, performSync]);

  // Handle manual refresh button click
  const handleManualRefresh = () => {
    performSync({ isManual: true, force: true });
  };

  // Handle successful bid submission: immediate forced synchronization
  const handleBidSubmitted = async () => {
    await performSync({ isManual: false, force: true });
  };

  const statusStyle = getStatusStyle(rfq?.status);

  return (
    <div className="space-y-6">
      {/* Top Workspace Header */}
      <RfqDetailHeader
        rfq={rfq}
        auctionState={auctionState}
        countdown={countdown}
        isRefreshing={isManualRefreshing}
        isBackgroundSyncing={isBackgroundSyncing}
        isStale={isStale}
        syncError={syncError}
        onRefresh={handleManualRefresh}
        lastRefreshedAt={lastRefreshedAt}
      />

      {/* Navigation Tabs */}
      <div className="border-b border-slate-200/80">
        <nav
          className="-mb-px flex space-x-2 sm:space-x-6 overflow-x-auto pb-1"
          aria-label="Workspace Sections"
        >
          <button
            type="button"
            onClick={() => setActiveTab("workspace")}
            className={`inline-flex items-center gap-2 py-3 px-3 border-b-2 text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === "workspace"
                ? "border-blue-700 text-blue-700"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            }`}
          >
            <TrophyIcon className="w-4 h-4" />
            <span>Live Leaderboard & Bidding</span>
            <span
              className={`ml-1 text-[11px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === "workspace"
                  ? "bg-blue-700 text-white"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {rankings.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("bids")}
            className={`inline-flex items-center gap-2 py-3 px-3 border-b-2 text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === "bids"
                ? "border-blue-700 text-blue-700"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            }`}
          >
            <HistoryIcon className="w-4 h-4" />
            <span>Bid Audit Log</span>
            <span
              className={`ml-1 text-[11px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === "bids"
                  ? "bg-blue-700 text-white"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {bids.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("activity")}
            className={`inline-flex items-center gap-2 py-3 px-3 border-b-2 text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === "activity"
                ? "border-blue-700 text-blue-700"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            }`}
          >
            <ClockIcon className="w-4 h-4" />
            <span>Activity Timeline</span>
            <span
              className={`ml-1 text-[11px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === "activity"
                  ? "bg-blue-700 text-white"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {activities.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("specs")}
            className={`inline-flex items-center gap-2 py-3 px-3 border-b-2 text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === "specs"
                ? "border-blue-700 text-blue-700"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            }`}
          >
            <InfoIcon className="w-4 h-4" />
            <span>Auction Specifications</span>
          </button>
        </nav>
      </div>

      {/* Tab 1: Live Leaderboard & Bidding Workspace */}
      {activeTab === "workspace" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left / Top: Leaderboard Rankings (7 columns on wide screens) */}
            <div className="lg:col-span-7 space-y-4">
              <RfqLeaderboard rankings={rankings} />
            </div>

            {/* Right: Interactive Bid Submission Form (5 columns on wide screens) */}
            <div className="lg:col-span-5 space-y-4">
              <BidSubmissionForm
                rfq={rfq}
                suppliers={suppliers}
                rankings={rankings}
                auctionState={auctionState}
                onBidSubmitted={handleBidSubmitted}
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Bid Audit Trail */}
      {activeTab === "bids" && (
        <div>
          <BidHistoryTable bids={bids} />
        </div>
      )}

      {/* Tab 3: Activity Timeline */}
      {activeTab === "activity" && (
        <div>
          <AuctionTimeline activities={activities} />
        </div>
      )}

      {/* Tab 4: Auction Specifications */}
      {activeTab === "specs" && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-base font-semibold text-slate-900 mb-1">
              Auction Parameters & Specifications
            </h3>
            <p className="text-xs text-slate-500">
              Verified operational criteria and dynamic anti-sniping extension rules.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* General Specs */}
            <div className="border border-slate-200/80 rounded-xl p-4 bg-slate-50/50 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                RFQ Identity & Status
              </h4>
              <dl className="divide-y divide-slate-100 text-xs">
                <div className="py-2 flex justify-between">
                  <dt className="text-slate-500">Database ID</dt>
                  <dd className="font-mono font-medium text-slate-900">
                    #{rfq?.id}
                  </dd>
                </div>
                <div className="py-2 flex justify-between">
                  <dt className="text-slate-500">Reference ID</dt>
                  <dd className="font-mono font-semibold text-slate-900">
                    {rfq?.reference_id}
                  </dd>
                </div>
                <div className="py-2 flex justify-between">
                  <dt className="text-slate-500">Auction Name</dt>
                  <dd className="font-medium text-slate-900 text-right">
                    {rfq?.name}
                  </dd>
                </div>
                <div className="py-2 flex justify-between items-center">
                  <dt className="text-slate-500">Backend Status</dt>
                  <dd>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusStyle.badge}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                      {statusStyle.label}
                    </span>
                  </dd>
                </div>
                <div className="py-2 flex justify-between items-center">
                  <dt className="text-slate-500">Operational State</dt>
                  <dd>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${auctionState.badge}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${auctionState.dot}`} />
                      {auctionState.label}
                    </span>
                  </dd>
                </div>
                <div className="py-2 flex justify-between">
                  <dt className="text-slate-500">Created At</dt>
                  <dd className="font-mono text-slate-700">
                    {formatDateTimeUTC(rfq?.created_at, true)}
                  </dd>
                </div>
                {rfq?.closed_at && (
                  <div className="py-2 flex justify-between">
                    <dt className="text-slate-500">Closed At</dt>
                    <dd className="font-mono text-slate-700">
                      {formatDateTimeUTC(rfq?.closed_at, true)}
                    </dd>
                  </div>
                )}
                {rfq?.closure_reason && (
                  <div className="py-2 flex justify-between">
                    <dt className="text-slate-500">Closure Reason</dt>
                    <dd className="font-medium text-slate-800 text-right">
                      {rfq?.closure_reason}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Schedule & Timing */}
            <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Schedule & Milestones (UTC)
              </h4>
              <dl className="divide-y divide-slate-100 text-xs">
                <div className="py-2 flex justify-between">
                  <dt className="text-slate-500">Bid Start Time</dt>
                  <dd className="font-mono font-medium text-slate-900">
                    {formatDateTimeUTC(rfq?.bid_start_at, true)}
                  </dd>
                </div>
                <div className="py-2 flex justify-between">
                  <dt className="text-slate-500">Initial Close Time</dt>
                  <dd className="font-mono font-medium text-slate-900">
                    {formatDateTimeUTC(rfq?.initial_close_at, true)}
                  </dd>
                </div>
                <div className="py-2 flex justify-between">
                  <dt className="text-slate-500">Current Close Time</dt>
                  <dd className="font-mono font-bold text-slate-900">
                    {formatDateTimeUTC(rfq?.current_close_at, true)}
                  </dd>
                </div>
                <div className="py-2 flex justify-between">
                  <dt className="text-slate-500">Hard Forced Close Limit</dt>
                  <dd className="font-mono font-medium text-slate-900">
                    {formatDateTimeUTC(rfq?.forced_close_at, true)}
                  </dd>
                </div>
                <div className="py-2 flex justify-between">
                  <dt className="text-slate-500">Cargo Target Pickup</dt>
                  <dd className="font-mono font-medium text-slate-900">
                    {formatDateTimeUTC(rfq?.pickup_at, true)}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Extension Rules Card */}
          <div className="border border-slate-200 rounded-xl p-4 bg-white">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
              British Auction Anti-Sniping Extension Protocol
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg">
                <div className="text-slate-400 mb-1">Trigger Condition</div>
                <div className="font-bold text-slate-900">
                  {formatExtensionTrigger(rfq?.extension_trigger)}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {rfq?.extension_trigger === "ANY_BID"
                    ? "Any valid quotation submitted within the trigger window extends the closing time."
                    : rfq?.extension_trigger === "L1_CHANGE"
                    ? "Only quotations that displace the current Rank 1 leader extend the closing time."
                    : "Quotations causing any supplier rank shift extend the closing time."}
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg">
                <div className="text-slate-400 mb-1">Trigger Window</div>
                <div className="font-mono font-bold text-slate-900 text-base">
                  {rfq?.trigger_window_minutes} minutes
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Bids placed within the final {rfq?.trigger_window_minutes} minutes
                  before current close activate extension.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg">
                <div className="text-slate-400 mb-1">Extension Duration</div>
                <div className="font-mono font-bold text-slate-900 text-base">
                  +{rfq?.extension_minutes} minutes
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Adds {rfq?.extension_minutes} minutes from the bid timestamp or
                  current close, capped by forced close limit.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
