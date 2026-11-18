import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import EmptyState from "@/components/ui/EmptyState";
import {
  SupplierIcon,
  ShieldCheckIcon,
  TruckIcon,
  SearchIcon,
  FilterIcon,
} from "@/components/ui/Icons";

export default function SuppliersPage() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        title="Supplier Directory"
        description="Approved logistics providers, freight forwarders, and ocean/air carriers authorized for reverse auctions."
        breadcrumbs={["Procurement", "Suppliers"]}
        badge="Carrier Network"
      />

      {/* KPI Stats Placeholder */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Approved Carriers"
          value="0"
          caption="Verified freight forwarders & lines"
          badgeText="Active"
          icon={SupplierIcon}
        />
        <StatCard
          title="Active Bidders"
          value="0"
          caption="Participated in last 30 days"
          badgeText="Bidding"
          icon={TruckIcon}
        />
        <StatCard
          title="Compliance Score"
          value="--"
          caption="SLA & delivery performance"
          badgeText="Verified"
          icon={ShieldCheckIcon}
        />
      </div>

      {/* Search & Filter Toolbar Placeholder */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
        <div className="relative flex-1 sm:w-72">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            disabled
            placeholder="Search suppliers by name, SCAC, trade lane..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-xs text-slate-500 placeholder:text-slate-400 focus:outline-none cursor-not-allowed"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500 cursor-not-allowed"
          >
            <FilterIcon className="h-3.5 w-3.5" />
            <span>Transport Modes</span>
          </button>
        </div>
      </div>

      {/* Empty State */}
      <EmptyState
        icon={SupplierIcon}
        title="No Suppliers Registered Yet"
        description="Your supplier network directory is currently empty. As suppliers are onboarded and invited to participate in freight RFQs, their business profiles, ratings, and bidding history will appear here."
        secondaryNote="Carrier authentication and qualification workflows will be introduced in future stages."
      />

      {/* Logistics Modes Guidance Grid */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">
          Supported Freight Modes for British Auctions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-600">
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-3.5">
            <span className="font-semibold text-slate-900 block mb-1">
              Ocean Freight (FCL / LCL)
            </span>
            <p className="text-slate-500 leading-relaxed">
              Standard 20ft/40ft/40HC containers, reefer units, and consolidated shipments across global sea corridors.
            </p>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-3.5">
            <span className="font-semibold text-slate-900 block mb-1">
              Air Freight &amp; Express
            </span>
            <p className="text-slate-500 leading-relaxed">
              Time-critical cargo, charter flights, and standard IATA air cargo pallets with urgent turnaround.
            </p>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-3.5">
            <span className="font-semibold text-slate-900 block mb-1">
              Road &amp; Intermodal (FTL / LTL)
            </span>
            <p className="text-slate-500 leading-relaxed">
              Cross-border trucking, domestic full-truckload, and rail drayage connectors with tracked milestones.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
