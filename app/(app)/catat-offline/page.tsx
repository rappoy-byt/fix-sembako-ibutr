import type { Metadata } from "next";
import { Suspense } from "react";

import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getInventoryOverview } from "@/features/inventory/queries";
import { OfflineSaleForm } from "@/features/offline-sales/components/offline-sale-form";
import { toPosProduct } from "@/features/pos/lib/catalog";

export const metadata: Metadata = { title: "Catat Offline" };

export default function CatatOfflinePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Catat penjualan offline"
        description="Untuk penjualan yang lupa dicatat di kasir. Stok dan pendapatan ikut diperbarui."
      />
      <Suspense fallback={<OfflineSaleSkeleton />}>
        <OfflineSaleContent />
      </Suspense>
    </div>
  );
}

/** Daftar barang yang bisa dijual, dari data yang sama dengan katalog kasir. */
async function OfflineSaleContent() {
  const result = await getInventoryOverview();
  if (result.error !== null) {
    return <ErrorState title="Daftar barang gagal dimuat" message={result.error} />;
  }

  const products = result.data.products
    .map(toPosProduct)
    .filter((p) => p.sellability === "sellable")
    .sort((a, b) => a.name.localeCompare(b.name, "id"));
  return <OfflineSaleForm products={products} />;
}

function OfflineSaleSkeleton() {
  return (
    <div className="space-y-4 rounded-2xl border bg-card px-5 py-5 sm:px-6" aria-busy="true" aria-label="Memuat form">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  );
}
