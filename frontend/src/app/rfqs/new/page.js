import PageHeader from "@/components/ui/PageHeader";
import CreateRfqForm from "@/components/rfqs/CreateRfqForm";

export const metadata = {
  title: "Create Freight RFQ | GoComet British Auction",
  description: "Configure a new freight RFQ with British reverse-auction bidding rules and schedule milestones.",
};

export default function CreateRfqPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Create Freight RFQ"
        description="Configure a new freight tender with British reverse-auction bidding rules, milestone deadlines, and dynamic overtime extension parameters."
        breadcrumbs={["Procurement", "RFQs", "Create RFQ"]}
        badge="British Reverse Auction"
      />

      {/* Main Creation Form */}
      <CreateRfqForm />
    </div>
  );
}
