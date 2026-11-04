import type { Metadata } from "next";
import { Suspense } from "react";

import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { InventoryTable } from "@/features/inventory/components/inventory-table";
import { getInventoryOverview } from "@/features/inventory/queries";

export const metadata: Metadata = { title: "Barang" };

export default function BarangPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Barang"
        description="Semua barang di warungmu beserta sisa stoknya."
      />
      <Suspense fallback={<InventorySkeleton />}>
        <InventoryContent />
      </Suspense>
    </div>
  );
}

async function InventoryContent() {
  const result = await getInventoryOverview();
  if (result.error !== null) {
    return <ErrorState title="Data barang gagal dimuat" message={result.error} />;
  }

  const { products, categories, today } = result.data;
  return <InventoryTable products={products} categories={categories} today={today} />;
}

function InventorySkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Memuat data barang">
      <Skeleton className="h-28 w-full rounded-2xl" />
      <div className="space-y-4 rounded-2xl border bg-card px-5 py-5 sm:px-6">
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-44" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-72 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
