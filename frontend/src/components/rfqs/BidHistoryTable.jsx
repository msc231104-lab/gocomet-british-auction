"use client";

import { useState } from "react";
import { HistoryIcon, SearchIcon } from "@/components/ui/Icons";
import { formatCurrency, formatDateTimeUTC } from "@/lib/formatters";

/**
 * Historical Bids Audit Log table.
 * Shows every quotation submitted to this RFQ chronologically.
 */
export default function BidHistoryTable({ bids = [] }) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredBids = bids.filter((b) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const nameMatch = b.supplier_name?.toLowerCase().includes(term);
    const idMatch = String(b.supplier_id).includes(term);
    const bidIdMatch = String(b.bid_id).includes(term);
    return nameMatch || idMatch || bidIdMatch;
  });

  if (!bids || bids.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-10 text-center shadow-xs">
        <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
          <HistoryIcon className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-900 mb-1">
          No Historical Bids
        </h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Every valid bid submitted will be permanently logged here with a timestamp
          and full charge breakdown.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* Header with Search */}
      <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-900">
            Bid Audit Trail
          </h3>
          <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full">
            {bids.length} {bids.length === 1 ? "entry" : "entries"}
          </span>
        </div>

        {bids.length > 5 && (
          <div className="relative w-full sm:w-64">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <SearchIcon className="w-3.5 h-3.5" />
            </span>
            <input
              type="text"
              placeholder="Search by supplier or bid #..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 placeholder-slate-400 transition-colors"
            />
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/75 border-b border-slate-200/80 text-slate-500 font-medium">
              <th scope="col" className="py-3 px-4 w-20">
                Bid #
              </th>
              <th scope="col" className="py-3 px-4">
                Accepted At (UTC)
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
                Total Amount
              </th>
              <th scope="col" className="py-3 px-3 text-center">
                Transit
              </th>
              <th scope="col" className="py-3 px-4">
                Validity
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredBids.map((bid) => (
              <tr
                key={bid.bid_id}
                className="hover:bg-slate-50/70 transition-colors"
              >
                <td className="py-3 px-4 font-mono font-medium text-slate-500">
                  #{bid.bid_id}
                </td>
                <td className="py-3 px-4 text-slate-700 font-mono text-[11px]">
                  {formatDateTimeUTC(bid.accepted_at, true)}
                </td>
                <td className="py-3 px-4">
                  <div className="font-semibold text-slate-900">
                    {bid.supplier_name}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    ID #{bid.supplier_id}
                  </div>
                </td>
                <td className="py-3 px-3 text-right font-mono text-slate-600">
                  {formatCurrency(bid.freight_charges)}
                </td>
                <td className="py-3 px-3 text-right font-mono text-slate-600">
                  {formatCurrency(bid.origin_charges)}
                </td>
                <td className="py-3 px-3 text-right font-mono text-slate-600">
                  {formatCurrency(bid.destination_charges)}
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="font-mono text-sm font-bold text-slate-900">
                    {formatCurrency(bid.total_amount)}
                  </span>
                </td>
                <td className="py-3 px-3 text-center text-slate-700 font-medium">
                  {bid.transit_time_hours}h
                </td>
                <td className="py-3 px-4 text-slate-500 text-[11px]">
                  {formatDateTimeUTC(bid.quote_valid_until)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards View */}
      <div className="md:hidden divide-y divide-slate-100">
        {filteredBids.map((bid) => (
          <div key={bid.bid_id} className="p-4 bg-white">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-slate-500">
                    Bid #{bid.bid_id}
                  </span>
                  <span className="font-semibold text-slate-900 text-sm">
                    {bid.supplier_name}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {formatDateTimeUTC(bid.accepted_at, true)}
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono font-bold text-base text-slate-900">
                  {formatCurrency(bid.total_amount)}
                </div>
                <div className="text-[10px] text-slate-400">
                  Transit: {bid.transit_time_hours} hrs
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">Freight</span>
                <span className="font-mono text-slate-700">
                  {formatCurrency(bid.freight_charges)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Origin</span>
                <span className="font-mono text-slate-700">
                  {formatCurrency(bid.origin_charges)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Dest.</span>
                <span className="font-mono text-slate-700">
                  {formatCurrency(bid.destination_charges)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
