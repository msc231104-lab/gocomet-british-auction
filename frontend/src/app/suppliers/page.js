import PageHeader from "@/components/ui/PageHeader";
import SupplierListClient from "@/components/suppliers/SupplierListClient";
import { getSuppliers } from "@/lib/api";

export const metadata = {
  title: "Supplier Management | GoComet British Auction",
  description: "Manage registered suppliers participating in freight auctions.",
};

export const instant = false;

export default async function SuppliersPage() {
  const { data: initialSuppliers, error: initialError } = await getSuppliers();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Supplier Management"
        description="Manage registered suppliers participating in freight auctions"
        breadcrumbs={["Procurement", "Suppliers"]}
        badge="Carrier Directory"
      />

      {/* Main Supplier Management Listing & Creation */}
      <SupplierListClient
        initialSuppliers={initialSuppliers}
        initialError={initialError}
      />
    </div>
  );
}
