"use client";

import {
  ClockIcon,
  ShieldCheckIcon,
  TrendingDownIcon,
  InfoIcon,
} from "@/components/ui/Icons";
import { formatDateTimeUTC } from "@/lib/formatters";

/**
 * Auction Timeline component.
 * Displays the event activity log for an RFQ (creation, bids, extensions).
 */
export default function AuctionTimeline({ activities = [] }) {
  if (!activities || activities.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-10 text-center shadow-xs">
        <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
          <ClockIcon className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-900 mb-1">
          No Activity Logged
        </h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Auction milestones, bid placements, and dynamic extension events will
          appear here in real time.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-900">
            Auction Event Timeline
          </h3>
          <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full">
            {activities.length} {activities.length === 1 ? "event" : "events"}
          </span>
        </div>
        <div className="text-xs text-slate-400">Chronological Audit Feed</div>
      </div>

      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
        {activities.map((act) => {
          const isCreation = act.event_type === "RFQ_CREATED";
          const isBid = act.event_type === "BID_SUBMITTED";
          const isExtension = act.event_type === "AUCTION_EXTENDED";

          let nodeColor = "bg-slate-400 ring-slate-100";
          let badgeColor = "bg-slate-100 text-slate-700 border-slate-200";
          let eventTitle = act.event_type;

          if (isCreation) {
            nodeColor = "bg-blue-600 ring-blue-100";
            badgeColor = "bg-blue-50 text-blue-700 border-blue-200";
            eventTitle = "RFQ Created";
          } else if (isBid) {
            nodeColor = "bg-emerald-600 ring-emerald-100";
            badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
            eventTitle = "Bid Submitted";
          } else if (isExtension) {
            nodeColor = "bg-amber-600 ring-amber-100 animate-pulse";
            badgeColor = "bg-amber-50 text-amber-800 border-amber-200";
            eventTitle = "Auction Extended";
          }

          return (
            <div key={act.id} className="relative group">
              {/* Timeline marker icon/dot */}
              <div
                className={`absolute -left-6 top-1 w-5 h-5 rounded-full ${nodeColor} ring-4 flex items-center justify-center text-white shadow-xs`}
              >
                {isExtension ? (
                  <ClockIcon className="w-2.5 h-2.5" />
                ) : isBid ? (
                  <TrendingDownIcon className="w-2.5 h-2.5" />
                ) : (
                  <ShieldCheckIcon className="w-2.5 h-2.5" />
                )}
              </div>

              <div className="bg-slate-50/70 hover:bg-slate-50 border border-slate-200/80 rounded-xl p-4 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badgeColor}`}
                    >
                      {eventTitle}
                    </span>
                    {act.bid_id && (
                      <span className="text-xs font-mono text-slate-500">
                        Bid #{act.bid_id}
                      </span>
                    )}
                  </div>
                  <time className="text-xs text-slate-400 font-mono">
                    {formatDateTimeUTC(act.created_at, true)}
                  </time>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed">
                  {act.description}
                </p>

                {/* If Extension: show old vs new closing comparison */}
                {isExtension && (act.old_close_at || act.new_close_at) && (
                  <div className="mt-3 p-3 bg-amber-50/80 border border-amber-200/80 rounded-lg text-xs grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-400 block text-[10px] font-medium">
                        Previous Closing Time:
                      </span>
                      <span className="font-mono text-slate-700">
                        {formatDateTimeUTC(act.old_close_at, true)}
                      </span>
                    </div>
                    <div>
                      <span className="text-amber-800 block text-[10px] font-bold">
                        New Extended Closing Time:
                      </span>
                      <span className="font-mono font-bold text-amber-900">
                        {formatDateTimeUTC(act.new_close_at, true)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
