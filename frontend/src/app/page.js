import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import EmptyState from "@/components/ui/EmptyState";
import {
  ClockIcon,
  RfqIcon,
  SupplierIcon,
  TrendingDownIcon,
  PlusIcon,
  ShieldCheckIcon,
} from "@/components/ui/Icons";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        title="Procurement & Auction Dashboard"
        description="Real-time overview of British reverse auctions, active freight RFQs, and supplier bidding rounds."
        badge="British Auction Engine"
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

      {/* KPI Placeholder Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Auctions"
          value="0"
          caption="No live reverse bidding rounds"
          badgeText="Standby"
          icon={ClockIcon}
        />
        <StatCard
          title="Total RFQs"
          value="0"
          caption="Drafted and published freight tenders"
          badgeText="Total"
          icon={RfqIcon}
        />
        <StatCard
          title="Enrolled Suppliers"
          value="0"
          caption="Authorized logistics carriers"
          badgeText="Verified"
          icon={SupplierIcon}
        />
        <StatCard
          title="Average Savings"
          value="0.0%"
          caption="Target vs lowest winning rate"
          badgeText="Target"
          icon={TrendingDownIcon}
        />
      </div>

      {/* Empty State */}
      <EmptyState
        icon={ClockIcon}
        title="No British Reverse Auctions In Progress"
        description="British reverse auctions drive competitive freight rates through descending price rounds with dynamic decrement steps. Once an RFQ enters its live auction window, real-time supplier bids and countdown clocks will appear here."
        action={
          <Link
            href="/rfqs/new"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            <PlusIcon className="h-4 w-4" />
            <span>Initiate New RFQ</span>
          </Link>
        }
        secondaryNote="Auctions automatically extend if qualifying bids are placed in the closing overtime period."
      />

      {/* Protocol Information Callout */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheckIcon className="h-5 w-5 text-blue-700" />
          <h2 className="text-base font-semibold text-slate-900">
            British Reverse Auction Operational Rules
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-600">
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
            <h3 className="font-semibold text-slate-900 mb-1">
              1. Dynamic Decrement
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Suppliers must place bids that are at least one minimum decrement step lower than the current prevailing bid.
            </p>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
            <h3 className="font-semibold text-slate-900 mb-1">
              2. Overtime Extension
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Bids submitted within the final overtime window automatically extend the auction clock to ensure fair competition.
            </p>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
            <h3 className="font-semibold text-slate-900 mb-1">
              3. Procurement Award
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              When the timer expires with no further qualifying bids, the supplier with the lowest valid price is awarded the lane.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
