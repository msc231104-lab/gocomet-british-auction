import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import {
  RfqIcon,
  PlusIcon,
  SearchIcon,
  FilterIcon,
  InfoIcon,
} from "@/components/ui/Icons";

const filterTabs = [
  { name: "All RFQs", count: "0", active: true },
  { name: "Draft", count: "0", active: false },
  { name: "Scheduled", count: "0", active: false },
  { name: "Live Auction", count: "0", active: false },
  { name: "Closed / Awarded", count: "0", active: false },
];

export default function RfqsPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Freight RFQ Management"
        description="Manage requests for quotations, monitor auction timelines, and oversee competitive supplier bidding."
        breadcrumbs={["Procurement", "RFQs"]}
        action={
          <Link
            href="/rfqs/new"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            <PlusIcon className="h-4 w-4" />
            <span>Create RFQ</span>
          </Link>
        }
      />

      {/* Placeholder Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
        {/* Status Filter Tabs (Visual Placeholder) */}
        <div className="flex flex-wrap items-center gap-1.5">
          {filterTabs.map((tab) => (
            <span
              key={tab.name}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium cursor-default transition-colors ${
                tab.active
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 bg-slate-50 hover:bg-slate-100"
              }`}
            >
              <span>{tab.name}</span>
              <span
                className={`rounded px-1.5 py-0.2 text-[10px] ${
                  tab.active ? "bg-slate-700 text-slate-200" : "bg-slate-200 text-slate-600"
                }`}
              >
                {tab.count}
              </span>
            </span>
          ))}
        </div>

        {/* Search & Secondary Filter Placeholder */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              disabled
              placeholder="Search RFQs, lanes, carriers..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-xs text-slate-500 placeholder:text-slate-400 focus:outline-none cursor-not-allowed"
            />
          </div>
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500 cursor-not-allowed"
            aria-label="Filter RFQs"
          >
            <FilterIcon className="h-3.5 w-3.5" />
            <span>Filter</span>
          </button>
        </div>
      </div>

      {/* RFQ Empty State */}
      <EmptyState
        icon={RfqIcon}
        title="No Freight RFQs Found"
        description="There are currently no freight RFQs in the system. Create your first RFQ to configure origin-destination trade lanes, target rate ceilings, and British reverse-auction rules."
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

      {/* Information Banner */}
      <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 text-xs text-blue-900 flex items-start gap-3">
        <InfoIcon className="h-5 w-5 text-blue-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-blue-950">
            RFQ Reverse Auction Workflow
          </p>
          <p className="text-blue-800/90 leading-relaxed">
            Freight RFQs transition across distinct stages: creation, supplier qualification, scheduled auction kickoff, live descending British bidding rounds, and final procurement award.
          </p>
        </div>
      </div>
    </div>
  );
}
