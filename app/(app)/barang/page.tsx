import { CalendarX2, Package, PackageMinus, PackageX } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";

import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard, StatCardSkeleton } from "@/components/shared/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { InventoryTable } from "@/features/inventory/components/inventory-table";
import { getInventoryOverview, type InventoryProduct } from "@/features/inventory/queries";
import { formatNumber } from "@/lib/format";

export const metadata: Metadata = { title: "Barang" };

export default function BarangPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Barang"
        description="Data master barang dan kondisi stoknya. Stok dihitung dari batch yang layak jual (belum expired) dengan tanggal bisnis WIB."
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
  return (
    <>
      <InventoryStats products={products} />
      <InventoryTable products={products} categories={categories} today={today} />
    </>
  );
}

function InventoryStats({ products }: { products: InventoryProduct[] }) {
  // Status stok hanya relevan untuk barang aktif (yang bisa dijual).
  const active = products.filter((p) => p.is_active);
  const low = active.filter((p) => p.stock.stockLevel === "low_stock").length;
  const out = active.filter((p) => p.stock.stockLevel === "out_of_stock").length;
  const withExpired = products.filter((p) => p.stock.expiredStock > 0).length;

  return (
    <section aria-label="Ringkasan barang" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Barang Aktif"
        value={formatNumber(active.length)}
        icon={Package}
        hint={`${formatNumber(products.length - active.length)} barang nonaktif`}
      />
      <StatCard
        label="Stok Menipis"
        value={formatNumber(low)}
        icon={PackageMinus}
        hint="Stok tersedia ≤ stok minimum"
        tone={low > 0 ? "warning" : "neutral"}
      />
      <StatCard
        label="Stok Habis"
        value={formatNumber(out)}
        icon={PackageX}
        hint="Tidak ada stok layak jual"
        tone={out > 0 ? "danger" : "neutral"}
      />
      <StatCard
        label="Ada Batch Expired"
        value={formatNumber(withExpired)}
        icon={CalendarX2}
        hint="Barang dengan stok expired (tidak boleh dijual)"
        tone={withExpired > 0 ? "danger" : "neutral"}
      />
    </section>
  );
}

function InventorySkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Memuat data barang">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-9 flex-1" />
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-36" />
      </div>
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  );
}
