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
    <div className="space-y-6">
      {/* Backend Downtime / Error Notice */}
      {error && (
        <ErrorBanner
          title="Backend Service Notice"
          error={error}
          onRetry={handleRefresh}
        />
      )}

      {/* Control Bar: Status Tabs, Search, Sort & Refresh */}
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
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
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${
                    active
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-mono ${
                      active ? "bg-slate-700 text-slate-100" : "bg-slate-200 text-slate-700"
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
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:opacity-50"
          >
            <ClockIcon className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-blue-700" : ""}`} />
            <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>

        {/* Search Input & Sort Dropdown */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Client-side Search */}
          <div className="relative flex-1 max-w-md">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Reference ID or Name..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-8 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 transition-colors"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
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
              className="rounded-lg border border-slate-200 bg-white py-1.5 pl-2.5 pr-8 text-xs font-medium text-slate-800 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
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
                className="ml-2 font-medium text-blue-700 hover:underline"
              >
                Reset filters
              </button>
            )}
          </div>
          <div className="inline-flex items-center gap-1 text-slate-500 bg-slate-100/70 px-2 py-0.5 rounded border border-slate-200">
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
              className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
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
              className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              <span>Clear Search &amp; Filters</span>
            </button>
          }
        />
      )}

      {!error && filteredAndSortedRfqs.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/60 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th scope="col" className="py-3 px-4">Reference ID</th>
                  <th scope="col" className="py-3 px-4">RFQ Name</th>
                  <th scope="col" className="py-3 px-3">Status</th>
                  <th scope="col" className="py-3 px-3">Bid Start (UTC)</th>
                  <th scope="col" className="py-3 px-3">Current Close (UTC)</th>
                  <th scope="col" className="py-3 px-3">Forced Close (UTC)</th>
                  <th scope="col" className="py-3 px-3">Extension Trigger</th>
                  <th scope="col" className="py-3 px-4">Created (UTC)</th>
                  <th scope="col" className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAndSortedRfqs.map((rfq) => {
                  const statusStyle = getStatusStyle(rfq.status);
                  return (
                    <tr
                      key={rfq.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-medium whitespace-nowrap">
                        <Link
                          href={`/rfqs/${rfq.id}`}
                          className="font-mono font-semibold text-blue-700 hover:text-blue-900 hover:underline"
                        >
                          {rfq.reference_id}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800 max-w-xs truncate" title={rfq.name}>
                        <Link
                          href={`/rfqs/${rfq.id}`}
                          className="hover:text-blue-700 hover:underline"
                        >
                          {rfq.name}
                        </Link>
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium border ${statusStyle.badge}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`}
                            aria-hidden="true"
                          />
                          {rfq.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                        {formatShortDateUTC(rfq.bid_start_at)}
                      </td>
                      <td className="py-3.5 px-3 font-mono text-[11px] font-medium text-slate-900 whitespace-nowrap">
                        {formatShortDateUTC(rfq.current_close_at)}
                      </td>
                      <td className="py-3.5 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {formatShortDateUTC(rfq.forced_close_at)}
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 border border-slate-200">
                          {formatExtensionTrigger(rfq.extension_trigger)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                        {formatShortDateUTC(rfq.created_at)}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <Link
                          href={`/rfqs/${rfq.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 rounded-md transition-colors"
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

          {/* Mobile & Tablet Card Layout */}
          <div className="divide-y divide-slate-100 lg:hidden">
            {filteredAndSortedRfqs.map((rfq) => {
              const statusStyle = getStatusStyle(rfq.status);
              return (
                <div key={rfq.id} className="p-4 sm:p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link
                        href={`/rfqs/${rfq.id}`}
                        className="font-mono text-xs font-bold text-blue-700 hover:underline block"
                      >
                        {rfq.reference_id}
                      </Link>
                      <Link
                        href={`/rfqs/${rfq.id}`}
                        className="text-sm font-semibold text-slate-800 hover:text-blue-700 block mt-0.5"
                      >
                        {rfq.name}
                      </Link>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-medium border shrink-0 ${statusStyle.badge}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`}
                        aria-hidden="true"
                      />
                      {rfq.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
                    <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                        Bid Start (UTC)
                      </span>
                      <span className="font-mono text-slate-800">
                        {formatShortDateUTC(rfq.bid_start_at)}
                      </span>
                    </div>

                    <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                        Current Close (UTC)
                      </span>
                      <span className="font-mono font-medium text-slate-900">
                        {formatShortDateUTC(rfq.current_close_at)}
                      </span>
                    </div>

                    <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                        Forced Close (UTC)
                      </span>
                      <span className="font-mono text-slate-700">
                        {formatShortDateUTC(rfq.forced_close_at)}
                      </span>
                    </div>

                    <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                        Extension Rule
                      </span>
                      <span className="font-medium text-slate-800">
                        {formatExtensionTrigger(rfq.extension_trigger)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-50">
                    <span>Created: {formatDateTimeUTC(rfq.created_at)}</span>
                    <span className="text-slate-500">ID #{rfq.id}</span>
                  </div>

                  <Link
                    href={`/rfqs/${rfq.id}`}
                    className="block w-full text-center py-2 px-3 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors"
                  >
                    Enter Live Workspace &rarr;
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
