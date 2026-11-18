"use client";

import { TrophyIcon, TrendingDownIcon } from "@/components/ui/Icons";
import { formatCurrency, formatDateTimeUTC } from "@/lib/formatters";

/**
 * RFQ Leaderboard & Rankings component.
 * Displays current supplier standings ordered by total quote amount.
 * Prominently highlights the L1 leader.
 */
export default function RfqLeaderboard({ rankings = [] }) {
  if (!rankings || rankings.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200/80 p-10 text-center shadow-xs">
        <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
          <TrophyIcon className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-900 mb-1">
          No Bids Placed Yet
        </h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          This auction currently has no registered quotations. Submit the first
          supplier bid below to claim the initial L1 ranking.
        </p>
      </div>
    );
  }

  const l1Leader = rankings.find((r) => r.rank === 1) || rankings[0];

  return (
    <div className="space-y-4">
      {/* L1 Spotlight Banner */}
      {l1Leader && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-xs flex-shrink-0">
              <TrophyIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-wider uppercase text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                  Current L1 Leader
                </span>
                <span className="text-xs text-slate-500">
                  Quote #{l1Leader.quotation_id}
                </span>
              </div>
              <div className="text-base font-bold text-slate-900 mt-0.5">
                {l1Leader.supplier_name}
              </div>
            </div>
          </div>

          <div className="flex items-baseline sm:items-end flex-col">
            <div className="text-xs text-slate-500">Lowest Quote Total</div>
            <div className="text-2xl font-mono font-bold text-slate-900">
              {formatCurrency(l1Leader.total_amount)}
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard Table / Cards */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900">
              Supplier Rankings
            </h3>
            <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
              {rankings.length} {rankings.length === 1 ? "quote" : "quotes"}
            </span>
          </div>
          <div className="text-xs text-slate-400">
            Ordered by Total Quote (Lowest to Highest)
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200/80 text-slate-500 font-medium">
                <th scope="col" className="py-3 px-4 w-16 text-center">
                  Rank
                </th>
                <th scope="col" className="py-3 px-4">
                  Supplier
                </th>
                <th scope="col" className="py-3 px-3 text-right">
                  Freight
                </th>
                <th scope="col" className="py-3 px-3 text-right">
                  Origin
                </th>
                <th scope="col" className="py-3 px-3 text-right">
                  Destination
                </th>
                <th scope="col" className="py-3 px-4 text-right font-semibold text-slate-700">
                  Total Quote
                </th>
                <th scope="col" className="py-3 px-3 text-center">
                  Transit
                </th>
                <th scope="col" className="py-3 px-4">
                  Validity
                </th>
                <th scope="col" className="py-3 px-4">
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
                    className={`transition-colors hover:bg-slate-50/70 ${
                      isL1 ? "bg-amber-50/30 font-medium" : ""
                    }`}
                  >
                    {/* Rank */}
                    <td className="py-3 px-4 text-center">
                      {isL1 ? (
                        <span className="inline-flex items-center justify-center gap-1 w-8 h-8 rounded-full bg-amber-100 text-amber-800 font-bold text-xs border border-amber-300 shadow-xs">
                          1
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200">
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
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200">
                            <TrophyIcon className="w-3 h-3 text-amber-600" />
                            L1
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Supplier #{entry.supplier_id} • Quote #{entry.quotation_id}
                      </div>
                    </td>

                    {/* Freight */}
                    <td className="py-3 px-3 text-right font-mono text-slate-600">
                      {formatCurrency(entry.freight_charges)}
                    </td>

                    {/* Origin */}
                    <td className="py-3 px-3 text-right font-mono text-slate-600">
                      {formatCurrency(entry.origin_charges)}
                    </td>

                    {/* Destination */}
                    <td className="py-3 px-3 text-right font-mono text-slate-600">
                      {formatCurrency(entry.destination_charges)}
                    </td>

                    {/* Total */}
                    <td className="py-3 px-4 text-right">
                      <span
                        className={`font-mono text-sm font-bold ${
                          isL1 ? "text-amber-900" : "text-slate-900"
                        }`}
                      >
                        {formatCurrency(entry.total_amount)}
                      </span>
                    </td>

                    {/* Transit */}
                    <td className="py-3 px-3 text-center text-slate-700 font-medium">
                      {entry.transit_time_hours}h
                    </td>

                    {/* Validity */}
                    <td className="py-3 px-4 text-slate-600">
                      {formatDateTimeUTC(entry.quote_valid_until)}
                    </td>

                    {/* Last Bid At */}
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {formatDateTimeUTC(entry.last_bid_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View */}
        <div className="md:hidden divide-y divide-slate-100">
          {rankings.map((entry) => {
            const isL1 = entry.rank === 1;
            return (
              <div
                key={entry.quotation_id || `${entry.supplier_id}-${entry.rank}`}
                className={`p-4 ${isL1 ? "bg-amber-50/40" : "bg-white"}`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                        isL1
                          ? "bg-amber-100 text-amber-800 border border-amber-300"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {entry.rank}
                    </span>
                    <div>
                      <div className="font-semibold text-slate-900 text-sm">
                        {entry.supplier_name}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Supplier #{entry.supplier_id}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`font-mono font-bold text-base ${
                        isL1 ? "text-amber-900" : "text-slate-900"
                      }`}
                    >
                      {formatCurrency(entry.total_amount)}
                    </div>
                    {isL1 && (
                      <span className="inline-block text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                        L1 Leader
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Freight</span>
                    <span className="font-mono text-slate-700">
                      {formatCurrency(entry.freight_charges)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Origin</span>
                    <span className="font-mono text-slate-700">
                      {formatCurrency(entry.origin_charges)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Dest.</span>
                    <span className="font-mono text-slate-700">
                      {formatCurrency(entry.destination_charges)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100/70">
                  <span>Transit: {entry.transit_time_hours} hrs</span>
                  <span>Bid: {formatDateTimeUTC(entry.last_bid_at)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
