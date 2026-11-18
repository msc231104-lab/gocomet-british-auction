"use client";

import { useState, useMemo } from "react";
import EmptyState from "@/components/ui/EmptyState";
import ErrorBanner from "@/components/ui/ErrorBanner";
import StatCard from "@/components/ui/StatCard";
import SupplierCreateModal from "./SupplierCreateModal";
import { formatDateTimeUTC, formatShortDateUTC } from "@/lib/formatters";
import {
  SupplierIcon,
  PlusIcon,
  SearchIcon,
  CloseIcon,
  ClockIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
} from "@/components/ui/Icons";

const SORT_OPTIONS = [
  { value: "created_desc", label: "Registration Date (Newest first)" },
  { value: "created_asc", label: "Registration Date (Oldest first)" },
  { value: "name_asc", label: "Supplier Name (A – Z)" },
  { value: "name_desc", label: "Supplier Name (Z – A)" },
];

export default function SupplierListClient({
  initialSuppliers = [],
  initialError = null,
}) {
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [error, setError] = useState(initialError);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Search & Sort State
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("created_desc");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [successBanner, setSuccessBanner] = useState(null);

  // Client-side refresh via same-origin route proxy
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/suppliers", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || json.error) {
        setError(json.error || { message: `HTTP ${res.status}: Failed to refresh suppliers` });
      } else {
        setSuppliers(json.data || []);
        setError(null);
      }
    } catch (err) {
      setError({ message: err.message || "Failed to connect to internal suppliers proxy." });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Callback on successful creation
  const handleSupplierCreated = (newSupplier) => {
    setSuppliers((prev) => [newSupplier, ...prev]);
    setSuccessBanner(
      `Supplier "${newSupplier.name}" (ID #${newSupplier.id}) registered successfully!`
    );
    // Also trigger background refresh to ensure full database synchronization
    handleRefresh();
  };

  // Filtered and Sorted suppliers
  const filteredAndSortedSuppliers = useMemo(() => {
    let result = [...suppliers];

    // Search by Name or ID
    const query = searchTerm.trim().toLowerCase();
    if (query) {
      result = result.filter((supplier) => {
        const nameMatch = supplier.name && supplier.name.toLowerCase().includes(query);
        const idMatch = String(supplier.id).toLowerCase().includes(query);
        return nameMatch || idMatch;
      });
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === "name_asc") {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === "name_desc") {
        return b.name.localeCompare(a.name);
      }
      if (sortBy === "created_desc") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === "created_asc") {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      return 0;
    });

    return result;
  }, [suppliers, searchTerm, sortBy]);

  return (
    <div className="space-y-6">
      {/* Creation Modal */}
      {isModalOpen && (
        <SupplierCreateModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleSupplierCreated}
        />
      )}

      {/* Backend Error State */}
      {error && (
        <ErrorBanner
          title="Backend Connection Notice"
          error={error}
          onRetry={handleRefresh}
        />
      )}

      {/* Success Notification Banner */}
      {successBanner && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50/90 p-4 text-emerald-900 shadow-xs flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2.5">
            <CheckCircleIcon className="h-5 w-5 text-emerald-700 shrink-0" />
            <p className="text-xs font-semibold text-emerald-950">{successBanner}</p>
          </div>
          <button
            type="button"
            onClick={() => setSuccessBanner(null)}
            className="text-emerald-700 hover:text-emerald-900 p-1"
            aria-label="Dismiss banner"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Supplier Metrics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Registered Suppliers"
          value={error ? "—" : suppliers.length.toString()}
          caption="Total logistics carriers in network"
          badgeText="Registered"
          icon={SupplierIcon}
        />
        <StatCard
          title="Supplier Directory"
          value={error ? "—" : suppliers.length > 0 ? "Available" : "Empty"}
          caption="Registered supplier records"
          badgeText="Status"
          icon={ShieldCheckIcon}
        />
        <StatCard
          title="Directory Growth"
          value={error ? "—" : `${suppliers.length} Enrolled`}
          caption="Carrier records in database"
          badgeText="Directory"
          icon={ClockIcon}
        />
      </div>

      {/* Control Bar: Search, Sort, Refresh, Register Action */}
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Input (Name or ID) */}
          <div className="relative flex-1 max-w-md">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by supplier name or ID..."
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

          {/* Action Group: Sort, Refresh & Register Supplier */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5">
              <label
                htmlFor="supplier-sort"
                className="text-xs font-medium text-slate-500 whitespace-nowrap hidden sm:inline"
              >
                Sort:
              </label>
              <select
                id="supplier-sort"
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

            {/* Refresh Button */}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:opacity-50"
            >
              <ClockIcon className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-blue-700" : ""}`} />
              <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
            </button>

            {/* Register Supplier Primary Button */}
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              <PlusIcon className="h-4 w-4" />
              <span>Register Supplier</span>
            </button>
          </div>
        </div>

        {/* Results Summary Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-500 border-t border-slate-100">
          <div>
            Showing <span className="font-semibold text-slate-800">{filteredAndSortedSuppliers.length}</span> of{" "}
            <span className="font-semibold text-slate-800">{suppliers.length}</span> registered suppliers
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="ml-2 font-medium text-blue-700 hover:underline"
              >
                Clear search
              </button>
            )}
          </div>
          <div className="text-slate-400">
            Registration dates formatted in UTC
          </div>
        </div>
      </div>

      {/* Main Content Area: Table, Mobile Cards, or Empty State */}
      {!error && suppliers.length === 0 && (
        <EmptyState
          icon={SupplierIcon}
          title="No Suppliers Registered Yet"
          description="Your supplier directory is currently empty. Register your first freight carrier or forwarder to enable supplier participation in British reverse auctions."
          action={
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              <PlusIcon className="h-4 w-4" />
              <span>Register First Supplier</span>
            </button>
          }
        />
      )}

      {!error && suppliers.length > 0 && filteredAndSortedSuppliers.length === 0 && (
        <EmptyState
          icon={SearchIcon}
          title="No Matching Suppliers Found"
          description={`No registered suppliers match your search query "${searchTerm}". Try searching by another carrier name or ID.`}
          action={
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              <span>Clear Search Query</span>
            </button>
          }
        />
      )}

      {!error && filteredAndSortedSuppliers.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/60 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th scope="col" className="py-3 px-5 w-24">Supplier ID</th>
                  <th scope="col" className="py-3 px-6">Supplier Name</th>
                  <th scope="col" className="py-3 px-6">Registration Date (UTC)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAndSortedSuppliers.map((supplier) => (
                  <tr
                    key={supplier.id}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="py-3.5 px-5 font-mono font-medium text-slate-700">
                      <span className="inline-flex items-center rounded bg-slate-100 px-2 py-0.5 text-xs font-mono font-semibold text-slate-800 border border-slate-200">
                        #{supplier.id}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 font-semibold text-slate-900 text-sm">
                      {supplier.name}
                    </td>
                    <td className="py-3.5 px-6 font-mono text-xs text-slate-600">
                      {formatDateTimeUTC(supplier.created_at, true)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List */}
          <div className="divide-y divide-slate-100 md:hidden">
            {filteredAndSortedSuppliers.map((supplier) => (
              <div key={supplier.id} className="p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center rounded bg-slate-100 px-2 py-0.5 text-xs font-mono font-semibold text-slate-800 border border-slate-200">
                    ID #{supplier.id}
                  </span>
                  <span className="font-mono text-[11px] text-slate-500">
                    {formatShortDateUTC(supplier.created_at)}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900">
                  {supplier.name}
                </h3>

                <p className="text-[11px] text-slate-500 pt-0.5">
                  Registered: {formatDateTimeUTC(supplier.created_at)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
