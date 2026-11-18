"use client";

import { TrophyIcon } from "@/components/ui/Icons";
import { formatCurrency, formatDateTimeUTC } from "@/lib/formatters";

/**
 * RFQ Leaderboard & Rankings component.
 * Displays current supplier standings ordered by total quote amount.
 * Prominently highlights the L1 leader.
 */
export default function RfqLeaderboard({ rankings = [] }) {
  if (!rankings || rankings.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-8 sm:p-10 text-center shadow-xs">
        <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
          <TrophyIcon className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-slate-900 mb-1">
          No Bids Placed Yet
        </h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
          This auction currently has no registered quotations. Submit the first
          supplier bid to claim the initial L1 ranking.
        </p>
      </div>
    );
  }

  const l1Leader = rankings.find((r) => r.rank === 1) || rankings[0];

  return (
    <div className="space-y-4">
      {/* L1 Spotlight Banner */}
      {l1Leader && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200/90 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs shrink-0">
              <TrophyIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold tracking-wider uppercase text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-200/60">
                  Current L1 Leader
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Quote #{l1Leader.quotation_id}
                </span>
              </div>
              <div className="text-base font-bold text-slate-900 mt-0.5">
                {l1Leader.supplier_name}
              </div>
            </div>
          </div>

          <div className="flex items-baseline sm:items-end flex-col">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Lowest Quote Total</div>
            <div className="text-2xl sm:text-3xl font-mono font-bold text-slate-950 tracking-tight">
              {formatCurrency(l1Leader.total_amount)}
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard Table / Cards */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Supplier Rankings
            </h3>
            <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200/60 font-mono">
              {rankings.length} {rankings.length === 1 ? "quote" : "quotes"}
            </span>
          </div>
          <div className="text-[11px] text-slate-400">
            Sorted by Total Amount (ASC)
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th scope="col" className="py-2.5 px-3.5 w-14 text-center">
                  Rank
                </th>
                <th scope="col" className="py-2.5 px-4">
                  Supplier
                </th>
                <th scope="col" className="py-2.5 px-3 text-right">
                  Freight
                </th>
                <th scope="col" className="py-2.5 px-3 text-right">
                  Origin
                </th>
                <th scope="col" className="py-2.5 px-3 text-right">
                  Destination
                </th>
                <th scope="col" className="py-2.5 px-4 text-right font-bold text-slate-700">
                  Total Quote
                </th>
                <th scope="col" className="py-2.5 px-3 text-center">
                  Transit
                </th>
                <th scope="col" className="py-2.5 px-3.5">
                  Last Bid At
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rankings.map((entry) => {
                const isL1 = entry.rank === 1;
                return (
                  <tr
                    key={entry.quotation_id || `${entry.supplier_id}-${entry.rank}`}
                    className={`transition-colors hover:bg-slate-50/80 ${
                      isL1 ? "bg-amber-50/20 font-medium" : ""
                    }`}
                  >
                    {/* Rank */}
                    <td className="py-3 px-3.5 text-center">
                      {isL1 ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 text-amber-900 font-bold text-xs border border-amber-300 shadow-xs">
                          1
                        </span>
                      ) : entry.rank === 2 ? (
                        <span className="inline-flex items-center justify-center w-6.5 h-6.5 rounded-full bg-slate-100 text-slate-800 font-semibold text-xs border border-slate-300">
                          2
                        </span>
                      ) : entry.rank === 3 ? (
                        <span className="inline-flex items-center justify-center w-6.5 h-6.5 rounded-full bg-orange-50 text-orange-800 font-semibold text-xs border border-orange-200">
                          3
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-50 text-slate-600 font-medium text-[11px]">
                          {entry.rank}
                        </span>
                      )}
                    </td>

                    {/* Supplier */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">
                          {entry.supplier_name}
                        </span>
                        {isL1 && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded-full border border-amber-200">
                            <TrophyIcon className="w-2.5 h-2.5 text-amber-600" />
                            L1 Leader
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Supplier #{entry.supplier_id} • Quote #{entry.quotation_id}
                      </div>
                    </td>

                    {/* Freight */}
                    <td className="py-3 px-3 text-right font-mono text-slate-600">
                      {formatCurrency(entry.freight_charges)}
                    </td>

                    {/* Origin */}
                    <td className="py-3 px-3 text-right font-mono text-slate-500">
                      {formatCurrency(entry.origin_charges)}
                    </td>

                    {/* Destination */}
                    <td className="py-3 px-3 text-right font-mono text-slate-500">
                      {formatCurrency(entry.destination_charges)}
                    </td>

                    {/* Total Quote */}
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 text-sm">
                      {formatCurrency(entry.total_amount)}
                    </td>

                    {/* Transit */}
                    <td className="py-3 px-3 text-center text-slate-600 font-mono text-xs">
                      {entry.transit_time_hours}h
                    </td>

                    {/* Last Bid At */}
                    <td className="py-3 px-3.5 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                      {formatDateTimeUTC(entry.last_bid_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile View: Compact Ranking Cards */}
        <div className="divide-y divide-slate-100 md:hidden">
          {rankings.map((entry) => {
            const isL1 = entry.rank === 1;
            return (
              <div
                key={entry.quotation_id || `${entry.supplier_id}-${entry.rank}`}
                className={`p-4 space-y-2.5 ${isL1 ? "bg-amber-50/30" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                        isL1
                          ? "bg-amber-100 text-amber-900 border border-amber-300"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      #{entry.rank}
                    </span>
                    <span className="font-bold text-slate-900 text-xs">
                      {entry.supplier_name}
                    </span>
                  </div>

                  <span className="text-sm font-mono font-bold text-slate-900">
                    {formatCurrency(entry.total_amount)}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-500 bg-slate-50/80 p-2 rounded-xl font-mono">
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase">Freight</span>
                    {formatCurrency(entry.freight_charges)}
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase">Origin</span>
                    {formatCurrency(entry.origin_charges)}
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase">Dest</span>
                    {formatCurrency(entry.destination_charges)}
                  </div>
                </div>

                <div className="flex justify-between text-[11px] text-slate-400 pt-0.5">
                  <span>Transit: {entry.transit_time_hours}h</span>
                  <span className="font-mono">{formatDateTimeUTC(entry.last_bid_at)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
