"use client";

import { useState, useSyncExternalStore } from "react";
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
 * Manages live countdowns, reactive tabs, manual data refreshes, and bidding interactions.
 */
export default function RfqWorkspaceClient({
  initialRfq,
  initialRankings = [],
  initialBids = [],
  initialActivity = [],
  initialSuppliers = [],
}) {
  const [rfq, setRfq] = useState(initialRfq);
  const [rankings, setRankings] = useState(initialRankings);
  const [bids, setBids] = useState(initialBids);
  const [activities, setActivities] = useState(initialActivity);
  const [suppliers] = useState(initialSuppliers);

  const [activeTab, setActiveTab] = useState("workspace"); // workspace | bids | activity | specs
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);

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

  // Unified refresh handler
  const handleRefresh = async () => {
    if (!rfq?.id) return;
    setIsRefreshing(true);

    try {
      const [rfqRes, rankRes, bidsRes, actRes] = await Promise.all([
        fetch(`/api/rfqs/${rfq.id}`, { cache: "no-store" }),
        fetch(`/api/rfqs/${rfq.id}/rankings`, { cache: "no-store" }),
        fetch(`/api/rfqs/${rfq.id}/bids`, { cache: "no-store" }),
        fetch(`/api/rfqs/${rfq.id}/activity`, { cache: "no-store" }),
      ]);

      const [rfqData, rankData, bidsData, actData] = await Promise.all([
        rfqRes.json().catch(() => null),
        rankRes.json().catch(() => null),
        bidsRes.json().catch(() => null),
        actRes.json().catch(() => null),
      ]);

      if (rfqData?.data) {
        setRfq(rfqData.data);
      }
      if (Array.isArray(rankData?.data)) {
        setRankings(rankData.data);
      }
      if (Array.isArray(bidsData?.data)) {
        setBids(bidsData.data);
      }
      if (Array.isArray(actData?.data)) {
        setActivities(actData.data);
      }

      setLastRefreshedAt(new Date());
    } catch {
      // Keep existing data on transient fetch error
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle successful bid submission: refresh state immediately
  const handleBidSubmitted = async () => {
    await handleRefresh();
  };

  const statusStyle = getStatusStyle(rfq?.status);

  return (
    <div className="space-y-6">
      {/* Top Workspace Header */}
      <RfqDetailHeader
        rfq={rfq}
        auctionState={auctionState}
        countdown={countdown}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
        lastRefreshedAt={lastRefreshedAt}
      />

      {/* Navigation Tabs */}
      <div className="border-b border-slate-200">
        <nav
          className="-mb-px flex space-x-2 sm:space-x-6 overflow-x-auto pb-1"
          aria-label="Workspace Sections"
        >
          <button
            type="button"
            onClick={() => setActiveTab("workspace")}
            className={`inline-flex items-center gap-2 py-3 px-3 border-b-2 text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === "workspace"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            <TrophyIcon className="w-4 h-4" />
            <span>Live Leaderboard & Bidding</span>
            <span
              className={`ml-1 text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === "workspace"
                  ? "bg-slate-900 text-white"
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
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            <HistoryIcon className="w-4 h-4" />
            <span>Bid Audit Log</span>
            <span
              className={`ml-1 text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === "bids"
                  ? "bg-slate-900 text-white"
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
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            <ClockIcon className="w-4 h-4" />
            <span>Activity Timeline</span>
            <span
              className={`ml-1 text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === "activity"
                  ? "bg-slate-900 text-white"
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
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
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
        <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs space-y-6">
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
            <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-3">
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
