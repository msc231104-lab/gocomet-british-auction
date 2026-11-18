import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import RfqListClient from "@/components/rfqs/RfqListClient";
import { getRFQs } from "@/lib/api";
import { PlusIcon } from "@/components/ui/Icons";

export const instant = false;

export default async function RfqsPage() {
  const { data: initialRfqs, error: initialError } = await getRFQs();

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
            className="inline-flex items-center gap-1.5 rounded-full bg-blue-700 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-blue-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            <PlusIcon className="h-4 w-4" />
            <span>Create RFQ</span>
          </Link>
        }
      />

      {/* Interactive RFQ Table & Filter Section */}
      <RfqListClient
        initialRfqs={initialRfqs}
        initialError={initialError}
      />
    </div>
  );
}
