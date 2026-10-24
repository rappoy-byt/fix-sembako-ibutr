import type { Metadata } from "next";
import { Suspense } from "react";

import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { getInventoryOverview } from "@/features/inventory/queries";
import { PosWorkspace } from "@/features/pos/components/pos-workspace";
import { toPosProduct } from "@/features/pos/lib/catalog";

export const metadata: Metadata = { title: "Kasir" };

export default function KasirPage() {
  return (
    <Suspense fallback={<PosSkeleton />}>
      <PosContent />
    </Suspense>
  );
}

/** Katalog kasir dibaca read-only dari Supabase (barang + stok batch, tanggal WIB). */
async function PosContent() {
  const result = await getInventoryOverview();
  if (result.error !== null) {
    return <ErrorState title="Katalog kasir gagal dimuat" message={result.error} />;
  }

  const { products, categories, today } = result.data;
  return (
    <PosWorkspace
      products={products.map(toPosProduct)}
      categories={categories.filter((c) => c.is_active).map(({ id, name }) => ({ id, name }))}
      today={today}
    />
  );
}

function PosSkeleton() {
  return (
    <div
      className="grid gap-4 lg:h-[calc(100svh-2rem)] lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px]"
      aria-busy="true"
      aria-label="Memuat katalog kasir"
    >
      <div className="space-y-3">
        <Skeleton className="h-11 w-full" />
        <div className="flex gap-1.5">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-full" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 md:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 9 }, (_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </div>
      <Skeleton className="hidden rounded-xl lg:block" />
    </div>
  );
}
