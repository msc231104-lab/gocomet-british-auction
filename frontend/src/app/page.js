import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import EmptyState from "@/components/ui/EmptyState";
import ErrorBanner from "@/components/ui/ErrorBanner";
import { getRFQs } from "@/lib/api";
import {
  formatDateTimeUTC,
  formatShortDateUTC,
  formatExtensionTrigger,
  getStatusStyle,
} from "@/lib/formatters";
import {
  ClockIcon,
  RfqIcon,
  TrendingDownIcon,
  PlusIcon,
  ShieldCheckIcon,
  ChevronRightIcon,
} from "@/components/ui/Icons";

export const instant = false;

export default async function DashboardPage() {
  const { data: rfqs, error } = await getRFQs();

  // Metrics calculated strictly from real backend status values
  const totalRfqs = rfqs.length;
  const activeRfqs = rfqs.filter((r) => r.status === "Active").length;
  const closedRfqs = rfqs.filter((r) => r.status === "Closed").length;
  const forceClosedRfqs = rfqs.filter((r) => r.status === "Force Closed").length;

  // Recent 5 RFQs sorted by created_at descending
  const recentRfqs = [...rfqs]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

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

      {/* Backend Downtime / Error State */}
      {error && (
        <ErrorBanner
          title="Backend Connection Notice"
          error={error}
        />
      )}

      {/* Verified Real KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total RFQs"
          value={error ? "—" : totalRfqs.toString()}
          caption="All registered freight tenders"
          badgeText="System"
          icon={RfqIcon}
        />
        <StatCard
          title="Active Auctions"
          value={error ? "—" : activeRfqs.toString()}
          caption="Currently live or bidding"
          badgeText="Active"
          icon={ClockIcon}
        />
        <StatCard
          title="Closed RFQs"
          value={error ? "—" : closedRfqs.toString()}
          caption="Completed normally"
          badgeText="Closed"
          icon={ShieldCheckIcon}
        />
        <StatCard
          title="Force Closed"
          value={error ? "—" : forceClosedRfqs.toString()}
          caption="Terminated at forced deadline"
          badgeText="Force Closed"
          icon={TrendingDownIcon}
        />
      </div>

      {/* Recent RFQs Section or Empty State */}
      {!error && totalRfqs === 0 && (
        <EmptyState
          icon={ClockIcon}
          title="No Freight RFQs Found"
          description="There are currently no freight RFQs in the system. Create your first RFQ to configure origin-destination lanes, ceiling rates, and dynamic British reverse-auction rules."
          action={
            <Link
              href="/rfqs/new"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              <PlusIcon className="h-4 w-4" />
              <span>Initiate New RFQ</span>
            </Link>
          }
          secondaryNote="Auctions automatically extend if qualifying bids are placed within the trigger window."
        />
      )}

      {!error && totalRfqs > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 bg-slate-50/60 px-6 py-4 gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Recent Freight RFQs
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Latest {recentRfqs.length} of {totalRfqs} total tenders · Timestamps displayed in UTC
              </p>
            </div>
            <Link
              href="/rfqs"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900 transition-colors"
            >
              <span>View All RFQs</span>
              <ChevronRightIcon className="h-4 w-4" />
            </Link>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th scope="col" className="py-3 px-5">Reference ID</th>
                  <th scope="col" className="py-3 px-5">RFQ Name</th>
                  <th scope="col" className="py-3 px-4">Status</th>
                  <th scope="col" className="py-3 px-4">Extension Rule</th>
                  <th scope="col" className="py-3 px-4">Current Close (UTC)</th>
                  <th scope="col" className="py-3 px-5">Created (UTC)</th>
                  <th scope="col" className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentRfqs.map((rfq) => {
                  const statusStyle = getStatusStyle(rfq.status);
                  return (
                    <tr
                      key={rfq.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="py-3.5 px-5 font-mono font-medium">
                        <Link
                          href={`/rfqs/${rfq.id}`}
                          className="font-mono font-semibold text-blue-700 hover:text-blue-900 hover:underline"
                        >
                          {rfq.reference_id}
                        </Link>
                      </td>
                      <td className="py-3.5 px-5 font-medium text-slate-800">
                        <Link
                          href={`/rfqs/${rfq.id}`}
                          className="hover:text-blue-700 hover:underline"
                        >
                          {rfq.name}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4">
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
                      <td className="py-3.5 px-4 text-slate-600">
                        <span className="inline-flex items-center rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 border border-slate-200">
                          {formatExtensionTrigger(rfq.extension_trigger)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                        {formatDateTimeUTC(rfq.current_close_at)}
                      </td>
                      <td className="py-3.5 px-5 text-slate-500 text-[11px]">
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

          {/* Mobile Card List */}
          <div className="divide-y divide-slate-100 md:hidden">
            {recentRfqs.map((rfq) => {
              const statusStyle = getStatusStyle(rfq.status);
              return (
                <div key={rfq.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      href={`/rfqs/${rfq.id}`}
                      className="font-mono text-xs font-semibold text-blue-700 hover:underline"
                    >
                      {rfq.reference_id}
                    </Link>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border ${statusStyle.badge}`}
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
                    className="text-xs font-medium text-slate-800 hover:text-blue-700 block"
                  >
                    {rfq.name}
                  </Link>

                  <div className="text-[11px] text-slate-500 space-y-0.5 pt-1">
                    <div className="flex justify-between">
                      <span>Close Deadline:</span>
                      <span className="font-mono text-slate-700">
                        {formatShortDateUTC(rfq.current_close_at)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Trigger:</span>
                      <span className="font-medium text-slate-700">
                        {formatExtensionTrigger(rfq.extension_trigger)}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Link
                      href={`/rfqs/${rfq.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900"
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

      {/* British Auction Operational Rules */}
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
              Bids submitted within the final trigger window automatically extend the auction clock to ensure fair competition.
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
