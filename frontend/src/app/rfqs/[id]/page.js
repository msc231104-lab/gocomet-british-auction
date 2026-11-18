import Link from "next/link";
import {
  getRFQById,
  getRFQRankings,
  getRFQBidHistory,
  getRFQActivity,
  getSuppliers,
} from "@/lib/api";
import RfqWorkspaceClient from "@/components/rfqs/RfqWorkspaceClient";
import { ArrowLeftIcon, InfoIcon } from "@/components/ui/Icons";

export const instant = false;

export async function generateMetadata({ params }) {
  const { id } = await params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) {
    return { title: "RFQ Details | GoComet British Auction" };
  }

  const res = await getRFQById(numId);
  if (res.data) {
    return {
      title: `${res.data.reference_id} — ${res.data.name} | GoComet British Auction`,
      description: `Live British Reverse Auction for ${res.data.name} (${res.data.reference_id})`,
    };
  }

  return { title: `RFQ #${id} | GoComet British Auction` };
}

export default async function RfqDetailPage({ params }) {
  const { id } = await params;
  const numId = parseInt(id, 10);

  if (isNaN(numId) || numId <= 0) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center mb-4">
          <InfoIcon className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">
          Invalid RFQ Identifier
        </h2>
        <p className="text-sm text-slate-500 mb-6">
          The requested RFQ identifier &ldquo;{id}&rdquo; is not a valid numeric identifier.
        </p>
        <Link
          href="/rfqs"
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          <span>Return to RFQ Listings</span>
        </Link>
      </div>
    );
  }

  // Fetch RFQ data in parallel
  const [rfqRes, rankRes, bidsRes, actRes, supRes] = await Promise.all([
    getRFQById(numId),
    getRFQRankings(numId),
    getRFQBidHistory(numId),
    getRFQActivity(numId),
    getSuppliers(),
  ]);

  // Handle 404 Not Found
  if (rfqRes.error?.status === 404 || (!rfqRes.data && !rfqRes.error)) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-4">
          <InfoIcon className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          RFQ #{numId} Not Found
        </h2>
        <p className="text-sm text-slate-500 mb-6">
          The freight auction you requested could not be found. It may have been
          removed or does not exist in the procurement database.
        </p>
        <Link
          href="/rfqs"
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          <span>Return to All RFQs</span>
        </Link>
      </div>
    );
  }

  // Handle other API / backend errors
  if (rfqRes.error) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 mx-auto flex items-center justify-center mb-4 border border-rose-100">
          <InfoIcon className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">
          Unable to Load RFQ #{numId}
        </h2>
        <p className="text-sm text-slate-600 mb-6">
          {rfqRes.error.message || "An unexpected error occurred while communicating with the backend API."}
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/rfqs"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            <span>Back to RFQs</span>
          </Link>
          <a
            href={`/rfqs/${numId}`}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <span>Retry</span>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <RfqWorkspaceClient
        initialRfq={rfqRes.data}
        initialRankings={rankRes.data || []}
        initialBids={bidsRes.data || []}
        initialActivity={actRes.data || []}
        initialSuppliers={supRes.data || []}
      />
    </div>
  );
}
