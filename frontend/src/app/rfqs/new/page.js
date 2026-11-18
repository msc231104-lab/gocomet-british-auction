import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import {
  RfqIcon,
  ClockIcon,
  SupplierIcon,
  InfoIcon,
  ChevronRightIcon,
} from "@/components/ui/Icons";

export default function CreateRfqPage() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        title="Create Freight RFQ"
        description="Configure a new freight RFQ with British reverse-auction bidding rules and supplier qualification criteria."
        breadcrumbs={["Procurement", "RFQs", "Create RFQ"]}
        badge="British Reverse Auction"
      />

      {/* Stage Scope Guidance Notice */}
      <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 text-sm text-blue-900 flex items-start gap-3">
        <InfoIcon className="h-5 w-5 text-blue-700 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-blue-950">
            Frontend Shell Preview (Stage F2)
          </p>
          <p className="mt-1 text-xs text-blue-800 leading-relaxed">
            This page represents the application shell layout for RFQ creation. Interactive input fields, schema validation, and auction launch APIs will be integrated in subsequent implementation stages.
          </p>
        </div>
      </div>

      {/* Placeholder Configuration Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Section 1: Freight Lane & Cargo Parameters */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
              <RfqIcon className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                1. Freight Lane & Cargo
              </h2>
              <p className="text-[11px] text-slate-500">
                Origin, destination, cargo volume
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs text-slate-500">
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-3">
              <span className="font-medium text-slate-700">Origin / Port of Loading</span>
              <p className="text-[11px] text-slate-400 mt-0.5">e.g., Shanghai Port (CNSHA)</p>
            </div>
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-3">
              <span className="font-medium text-slate-700">Destination / Port of Discharge</span>
              <p className="text-[11px] text-slate-400 mt-0.5">e.g., Rotterdam (NLRTM)</p>
            </div>
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-3">
              <span className="font-medium text-slate-700">Mode & Equipment</span>
              <p className="text-[11px] text-slate-400 mt-0.5">Ocean FCL · 40ft High Cube</p>
            </div>
          </div>
        </div>

        {/* Section 2: British Reverse Auction Engine Parameters */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
              <ClockIcon className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                2. British Auction Rules
              </h2>
              <p className="text-[11px] text-slate-500">
                Ceiling price, decrement, clock
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs text-slate-500">
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-3">
              <span className="font-medium text-slate-700">Ceiling / Starting Price</span>
              <p className="text-[11px] text-slate-400 mt-0.5">Maximum initial opening rate</p>
            </div>
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-3">
              <span className="font-medium text-slate-700">Minimum Decrement Step</span>
              <p className="text-[11px] text-slate-400 mt-0.5">Enforced drop required per bid</p>
            </div>
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-3">
              <span className="font-medium text-slate-700">Clock & Overtime Extension</span>
              <p className="text-[11px] text-slate-400 mt-0.5">Auto-extends on last-minute bids</p>
            </div>
          </div>
        </div>

        {/* Section 3: Invited Carriers & Allocation */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
              <SupplierIcon className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                3. Carrier Participation
              </h2>
              <p className="text-[11px] text-slate-500">
                Invited suppliers & notifications
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs text-slate-500">
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-3">
              <span className="font-medium text-slate-700">Eligible Carriers</span>
              <p className="text-[11px] text-slate-400 mt-0.5">Select approved forwarders</p>
            </div>
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-3">
              <span className="font-medium text-slate-700">Confidentiality & Blind Rank</span>
              <p className="text-[11px] text-slate-400 mt-0.5">Mask competitor identities</p>
            </div>
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-3">
              <span className="font-medium text-slate-700">Tender Invitation Alerts</span>
              <p className="text-[11px] text-slate-400 mt-0.5">Automated email & portal notices</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer Placeholder */}
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <Link
          href="/rfqs"
          className="text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 rounded px-2 py-1"
        >
          Cancel &amp; Return to RFQs
        </Link>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-2 rounded-lg bg-slate-200 px-4 py-2 text-xs sm:text-sm font-semibold text-slate-400 cursor-not-allowed"
          >
            <span>Launch British Auction</span>
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
