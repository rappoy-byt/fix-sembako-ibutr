import {
  AlertTriangle,
  Boxes,
  CalendarX2,
  Package,
  PackageMinus,
  PackageOpen,
  ReceiptText,
  ShoppingBag,
  Wallet,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard, StatCardSkeleton } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ExpiredList, LowStockList, NearExpiryList } from "@/features/dashboard/components/attention-lists";
import { PaymentBreakdown, RecentTransactions } from "@/features/dashboard/components/sales-panels";
import { getDashboardData } from "@/features/dashboard/queries";
import { NEAR_EXPIRY_DAYS } from "@/features/inventory/lib/business-rules";
import { formatLongDate, formatNumber, formatRupiah } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Penjualan hari ini dan kondisi stok yang perlu perhatian. Semua angka dari database, tanggal bisnis WIB."
      />
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}

async function DashboardContent() {
  const result = await getDashboardData();
  if (result.error !== null) {
    return <ErrorState title="Dashboard gagal dimuat" message={result.error} />;
  }

  const { today, inventory, sales, recentTransactions } = result.data;
  const hasProducts = inventory.activeProducts + inventory.inactiveProducts > 0;

  return (
    <div className="space-y-8">
      <section aria-labelledby="sales-heading" className="space-y-4">
        <SectionHeading id="sales-heading" title="Penjualan Hari Ini" subtitle={formatLongDate(`${today}`)} />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Transaksi"
            value={formatNumber(sales.transactionCount)}
            icon={ReceiptText}
            hint="Nota selesai hari ini"
          />
          <StatCard
            label="Pendapatan"
            value={formatRupiah(sales.revenue)}
            icon={Wallet}
            hint="Total penjualan kotor"
          />
          <StatCard
            label="Unit Terjual"
            value={formatNumber(sales.unitsSold)}
            icon={ShoppingBag}
            hint="Jumlah semua barang terjual"
          />
          <StatCard
            label="Rata-rata per Transaksi"
            value={formatRupiah(sales.averageTicket)}
            icon={Wallet}
            hint={sales.transactionCount > 0 ? "Pendapatan ÷ jumlah transaksi" : "Belum ada transaksi hari ini"}
          />
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <PaymentBreakdown sales={sales} />
          <RecentTransactions transactions={recentTransactions} />
        </div>
      </section>

      <section aria-labelledby="stock-heading" className="space-y-4">
        <SectionHeading id="stock-heading" title="Kondisi Stok" subtitle="Stok layak jual dihitung dari batch yang belum expired" />
        {!hasProducts ? (
          <EmptyState
            icon={PackageOpen}
            title="Belum ada barang"
            description="Tambahkan barang dan batch stoknya untuk melihat kondisi stok di sini."
            action={
              <Button render={<Link href="/barang" />} nativeButton={false}>
                Buka halaman Barang
              </Button>
            }
          />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              <StatCard
                label="Barang Aktif"
                value={formatNumber(inventory.activeProducts)}
                icon={Package}
                hint={`${formatNumber(inventory.inactiveProducts)} barang nonaktif`}
              />
              <StatCard
                label="Stok Tersedia"
                value={formatNumber(inventory.availableStockUnits)}
                icon={Boxes}
                hint="Unit layak jual barang aktif"
              />
              <StatCard
                label="Stok Menipis"
                value={formatNumber(inventory.lowStockCount)}
                icon={PackageMinus}
                hint={`${formatNumber(inventory.outOfStockCount)} barang stok habis`}
                tone={inventory.lowStockCount + inventory.outOfStockCount > 0 ? "warning" : "neutral"}
              />
              <StatCard
                label="Hampir Kedaluwarsa"
                value={formatNumber(inventory.nearExpiryProductCount)}
                icon={AlertTriangle}
                hint={`Barang dengan batch ≤ ${NEAR_EXPIRY_DAYS} hari`}
                tone={inventory.nearExpiryProductCount > 0 ? "warning" : "neutral"}
              />
              <StatCard
                label="Expired"
                value={formatNumber(inventory.expiredProductCount)}
                icon={CalendarX2}
                hint={`${formatNumber(inventory.expiredStockUnits)} unit tidak boleh dijual`}
                tone={inventory.expiredProductCount > 0 ? "danger" : "neutral"}
              />
            </div>
            <div className="grid gap-4 xl:grid-cols-3">
              <ExpiredList rows={inventory.expiredBatches} today={today} />
              <NearExpiryList rows={inventory.nearExpiryBatches} today={today} />
              <LowStockList rows={inventory.lowStockProducts} />
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function SectionHeading({ id, title, subtitle }: { id: string; title: string; subtitle: string }) {
  return (
    <div>
      <h2 id={id} className="font-heading text-lg font-semibold">
        {title}
      </h2>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Memuat dashboard">
      {[4, 5].map((count, section) => (
        <div key={section} className="space-y-4">
          <Skeleton className="h-6 w-48" />
          <div className={`grid gap-4 sm:grid-cols-2 ${count === 5 ? "xl:grid-cols-5" : "xl:grid-cols-4"}`}>
            {Array.from({ length: count }, (_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <Skeleton className="h-56 rounded-xl" />
            <Skeleton className="h-56 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}
