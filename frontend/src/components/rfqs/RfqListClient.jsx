"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import EmptyState from "@/components/ui/EmptyState";
import ErrorBanner from "@/components/ui/ErrorBanner";
import {
  formatDateTimeUTC,
  formatShortDateUTC,
  formatExtensionTrigger,
  getStatusStyle,
} from "@/lib/formatters";
import {
  RfqIcon,
  PlusIcon,
  SearchIcon,
  CloseIcon,
  ClockIcon,
} from "@/components/ui/Icons";

const STATUS_OPTIONS = [
  { key: "ALL", label: "All RFQs" },
  { key: "Active", label: "Active" },
  { key: "Closed", label: "Closed" },
  { key: "Force Closed", label: "Force Closed" },
];

const SORT_OPTIONS = [
  { value: "created_desc", label: "Created Date (Newest first)" },
  { value: "created_asc", label: "Created Date (Oldest first)" },
  { value: "close_asc", label: "Current Close (Ending soonest)" },
  { value: "close_desc", label: "Current Close (Ending latest)" },
];

function formatDateTimeLines(isoString) {
  if (!isoString) return { date: "—", time: "" };
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return { date: "—", time: "" };
  const pad = (n) => String(n).padStart(2, "0");
  return {
    date: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`,
    time: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`,
  };
}

export default function RfqListClient({ initialRfqs = [], initialError = null }) {
  const [rfqs, setRfqs] = useState(initialRfqs);
  const [error, setError] = useState(initialError);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter & Sort State
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("created_desc");

  // Client-side refresh via internal Next.js proxy route
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/rfqs", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || json.error) {
        setError(json.error || { message: `HTTP ${res.status}: Failed to refresh RFQs` });
      } else {
        setRfqs(json.data || []);
        setError(null);
      }
    } catch (err) {
      setError({ message: err.message || "Failed to connect to internal RFQ proxy." });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Status Counts
  const counts = useMemo(() => {
    return {
      ALL: rfqs.length,
      Active: rfqs.filter((r) => r.status === "Active").length,
      Closed: rfqs.filter((r) => r.status === "Closed").length,
      "Force Closed": rfqs.filter((r) => r.status === "Force Closed").length,
    };
  }, [rfqs]);

  // Filter and Sort Processing
  const filteredAndSortedRfqs = useMemo(() => {
    let result = [...rfqs];

    // Status Filter
    if (statusFilter !== "ALL") {
      result = result.filter((rfq) => rfq.status === statusFilter);
    }

    // Client-side Search (reference_id or name)
    const query = searchTerm.trim().toLowerCase();
    if (query) {
      result = result.filter(
        (rfq) =>
          (rfq.reference_id && rfq.reference_id.toLowerCase().includes(query)) ||
          (rfq.name && rfq.name.toLowerCase().includes(query))
      );
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === "created_desc") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === "created_asc") {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (sortBy === "close_asc") {
        return new Date(a.current_close_at).getTime() - new Date(b.current_close_at).getTime();
      }
      if (sortBy === "close_desc") {
        return new Date(b.current_close_at).getTime() - new Date(a.current_close_at).getTime();
      }
      return 0;
    });

    return result;
  }, [rfqs, statusFilter, searchTerm, sortBy]);

  const hasActiveFilters = statusFilter !== "ALL" || searchTerm.trim() !== "";

  const handleResetFilters = () => {
    setStatusFilter("ALL");
    setSearchTerm("");
    setSortBy("created_desc");
  };

  return (
    <div className="space-y-5">
      {/* Backend Downtime / Error Notice */}
      {error && (
        <ErrorBanner
          title="Backend Service Notice"
          error={error}
          onRetry={handleRefresh}
        />
      )}

      {/* Control Bar: Status Tabs, Search, Sort & Refresh */}
      <div className="space-y-3.5 rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs">
        {/* Status Filter Tabs & Refresh */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="RFQ status filters">
            {STATUS_OPTIONS.map((tab) => {
              const active = statusFilter === tab.key;
              const count = counts[tab.key] ?? 0;
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setStatusFilter(tab.key)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${
                    active
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100/80 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono font-bold ${
                      active ? "bg-slate-800 text-slate-100" : "bg-white text-slate-700 border border-slate-200/60"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Refresh Action */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/90 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:opacity-50 shadow-xs"
          >
            <ClockIcon className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-blue-700" : "text-slate-500"}`} />
            <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>

        {/* Search Input & Sort Dropdown */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Client-side Search */}
          <div className="relative flex-1 max-w-md">
            <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Reference ID or Name..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-9.5 pr-8 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label="Clear search"
              >
                <CloseIcon className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-2">
            <label htmlFor="rfq-sort" className="text-xs font-medium text-slate-500 whitespace-nowrap">
              Sort by:
            </label>
            <select
              id="rfq-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-8 text-xs font-semibold text-slate-800 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Timezone Notice & Results Summary */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-500">
          <div>
            Showing <span className="font-semibold text-slate-800">{filteredAndSortedRfqs.length}</span> of{" "}
            <span className="font-semibold text-slate-800">{rfqs.length}</span> RFQs
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="ml-2 font-semibold text-blue-700 hover:underline"
              >
                Reset filters
              </button>
            )}
          </div>
          <div className="inline-flex items-center gap-1 text-slate-500 bg-slate-100/70 px-2.5 py-0.5 rounded-full border border-slate-200/60">
            <span className="font-semibold text-slate-700">Timezone:</span> All timestamps formatted in UTC
          </div>
        </div>
      </div>

      {/* Main Content: Table, Mobile Cards, or Empty States */}
      {!error && rfqs.length === 0 && (
        <EmptyState
          icon={RfqIcon}
          title="No Freight RFQs Found"
          description="There are currently no freight RFQs in the database. Create your first RFQ to configure trade lanes, target ceilings, and British reverse-auction rules."
          action={
            <Link
              href="/rfqs/new"
              className="inline-flex items-center gap-1.5 rounded-full bg-blue-700 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              <PlusIcon className="h-4 w-4" />
              <span>Create Your First RFQ</span>
            </Link>
          }
        />
      )}

      {!error && rfqs.length > 0 && filteredAndSortedRfqs.length === 0 && (
        <EmptyState
          icon={SearchIcon}
          title="No Matching RFQs Found"
          description={`No tenders match your search query "${searchTerm}" or the selected status filter.`}
          action={
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-2 rounded-full bg-slate-800 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              <span>Clear Search &amp; Filters</span>
            </button>
          }
        />
      )}

      {!error && filteredAndSortedRfqs.length > 0 && (
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th scope="col" className="py-2.5 px-2.5">Reference ID</th>
                  <th scope="col" className="py-2.5 px-2.5">RFQ Name</th>
                  <th scope="col" className="py-2.5 px-1.5 text-center">Status</th>
                  <th scope="col" className="py-2.5 px-2">Current Close</th>
                  <th scope="col" className="py-2.5 px-2">Extension Rule</th>
                  <th scope="col" className="py-2.5 px-2 hidden xl:table-cell">Bid Start</th>
                  <th scope="col" className="py-2.5 px-2 hidden xl:table-cell">Forced Close</th>
                  <th scope="col" className="py-2.5 px-2 hidden 2xl:table-cell">Created</th>
                  <th scope="col" className="py-2.5 px-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAndSortedRfqs.map((rfq) => {
                  const statusStyle = getStatusStyle(rfq.status);
                  const closeTime = formatDateTimeLines(rfq.current_close_at);
                  const startTime = formatDateTimeLines(rfq.bid_start_at);
                  const forcedTime = formatDateTimeLines(rfq.forced_close_at);
                  const createdTime = formatDateTimeLines(rfq.created_at);

                  return (
                    <tr
                      key={rfq.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {/* Reference ID - Prioritized, truncates long IDs gracefully with tooltip */}
                      <td className="py-2.5 px-2.5 font-mono font-semibold">
                        <div
                          className="max-w-[125px] sm:max-w-[140px] xl:max-w-[150px] 2xl:max-w-[220px] truncate"
                          title={rfq.reference_id}
                        >
                          <Link
                            href={`/rfqs/${rfq.id}`}
                            className="font-mono text-blue-700 hover:text-blue-900 hover:underline"
                          >
                            {rfq.reference_id}
                          </Link>
                        </div>
                      </td>

                      {/* RFQ Name - Prioritized, truncates with full tooltip */}
                      <td className="py-2.5 px-2.5 font-medium text-slate-900">
                        <div
                          className="max-w-[135px] sm:max-w-[150px] xl:max-w-[165px] 2xl:max-w-[300px] truncate"
                          title={rfq.name}
                        >
                          <Link
                            href={`/rfqs/${rfq.id}`}
                            className="hover:text-blue-700 hover:underline"
                          >
                            {rfq.name}
                          </Link>
                        </div>
                      </td>

                      {/* Status - Prioritized */}
                      <td className="py-2.5 px-1.5 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${statusStyle.badge}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`}
                            aria-hidden="true"
                          />
                          {rfq.status}
                        </span>
                      </td>

                      {/* Current Close - Prioritized, displays date/time and secondary Bid Start subline below xl */}
                      <td className="py-2.5 px-2 whitespace-nowrap">
                        <div className="font-mono text-[11px] leading-tight">
                          <div className="font-semibold text-slate-900">{closeTime.date}</div>
                          <div className="text-slate-500 text-[10px]">{closeTime.time}</div>
                          <div
                            className="text-[10px] text-slate-400 font-mono xl:hidden mt-0.5"
                            title={`Bid Start: ${formatDateTimeUTC(rfq.bid_start_at)}`}
                          >
                            Start: {startTime.date}
                          </div>
                        </div>
                      </td>

                      {/* Extension Rule - Preserved, displays trigger and Forced Close subline below xl */}
                      <td className="py-2.5 px-2 whitespace-nowrap">
                        <span
                          className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 border border-slate-200/60"
                          title={`Anti-sniping trigger: ${formatExtensionTrigger(rfq.extension_trigger)} (+${rfq.extension_minutes}m extension)`}
                        >
                          {formatExtensionTrigger(rfq.extension_trigger)}
                        </span>
                        <div
                          className="text-[10px] text-slate-400 font-mono xl:hidden mt-0.5"
                          title={`Forced Close Limit: ${formatDateTimeUTC(rfq.forced_close_at)}`}
                        >
                          Forced: {forcedTime.date}
                        </div>
                      </td>

                      {/* Bid Start - Dedicated column on xl+ */}
                      <td className="py-2.5 px-2 whitespace-nowrap hidden xl:table-cell">
                        <div className="font-mono text-[11px] leading-tight text-slate-600">
                          <div>{startTime.date}</div>
                          <div className="text-slate-400 text-[10px]">{startTime.time}</div>
                        </div>
                      </td>

                      {/* Forced Close - Dedicated column on xl+ */}
                      <td className="py-2.5 px-2 whitespace-nowrap hidden xl:table-cell">
                        <div className="font-mono text-[11px] leading-tight text-slate-600">
                          <div>{forcedTime.date}</div>
                          <div className="text-slate-400 text-[10px]">{forcedTime.time}</div>
                        </div>
                      </td>

                      {/* Created - Dedicated column on 2xl+ */}
                      <td className="py-2.5 px-2 whitespace-nowrap hidden 2xl:table-cell">
                        <div className="font-mono text-[11px] leading-tight text-slate-500">
                          <div>{createdTime.date}</div>
                          <div className="text-slate-400 text-[10px]">{createdTime.time}</div>
                        </div>
                      </td>

                      {/* Action - Prioritized Workspace pill CTA */}
                      <td className="py-2.5 px-2.5 text-right whitespace-nowrap">
                        <Link
                          href={`/rfqs/${rfq.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50/80 hover:bg-blue-100 rounded-full transition-colors border border-blue-200/60"
                        >
                          <span>Workspace</span>
                          <span>&rarr;</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile & Tablet Card List */}
          <div className="divide-y divide-slate-100 lg:hidden">
            {filteredAndSortedRfqs.map((rfq) => {
              const statusStyle = getStatusStyle(rfq.status);
              return (
                <div key={rfq.id} className="p-4 space-y-2.5 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      href={`/rfqs/${rfq.id}`}
                      className="font-mono text-xs font-semibold text-blue-700 hover:underline"
                    >
                      {rfq.reference_id}
                    </Link>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${statusStyle.badge}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`}
                        aria-hidden="true"
                      />
                      {rfq.status}
                    </span>
                  </div>

                  <Link
                    href={`/rfqs/${rfq.id}`}
                    className="text-xs font-semibold text-slate-900 hover:text-blue-700 block"
                  >
                    {rfq.name}
                  </Link>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[10px] font-medium uppercase">Current Close</span>
                      <span className="font-mono font-semibold text-slate-800">
                        {formatShortDateUTC(rfq.current_close_at)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-medium uppercase">Extension Rule</span>
                      <span className="font-medium text-slate-700">
                        {formatExtensionTrigger(rfq.extension_trigger)}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Link
                      href={`/rfqs/${rfq.id}`}
                      className="inline-flex items-center gap-1 px-3.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50/80 hover:bg-blue-100 rounded-full transition-colors border border-blue-200/60"
                    >
                      <span>Open Workspace</span>
                      <span>&rarr;</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
