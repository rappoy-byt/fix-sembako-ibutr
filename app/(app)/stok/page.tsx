import { CircleAlert, History, RotateCcw, SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatCardSkeleton } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getStoreToday } from "@/features/inventory/lib/business-rules";
import { getInventoryOverview } from "@/features/inventory/queries";
import { MovementFilterBar } from "@/features/stock/components/movement-filters";
import { MovementTable } from "@/features/stock/components/movement-table";
import { MovementPagination } from "@/features/stock/components/pagination";
import { StockSummary } from "@/features/stock/components/stock-summary";
import {
  buildMovementSearch,
  DEFAULT_RANGE_DAYS,
  parseMovementFilters,
} from "@/features/stock/lib/movements";
import { getMovementTotals, getStockMovements } from "@/features/stock/queries";

export const metadata: Metadata = { title: "Stok" };

export default function StokPage(props: PageProps<"/stok">) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Stok"
        description="Ringkasan stok dan riwayat pergerakan yang tercatat (barang masuk & penjualan). Tanggal bisnis WIB."
      />
      <Suspense fallback={<StokSkeleton />}>
        <StokContent searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

/** Semua data dibaca di server (READ-ONLY); URL adalah sumber kebenaran filter. */
async function StokContent({ searchParams }: { searchParams: PageProps<"/stok">["searchParams"] }) {
  // "Hari ini" (WIB) dibaca dari waktu saat request. searchParams bisa diketahui
  // saat prefetch, jadi tandai konten ini request-time sebelum getStoreToday().
  await connection();
  const params = await searchParams;
  const today = getStoreToday();
  const { filters, error: filterError, isDefault } = parseMovementFilters(params, today);
  const valid = filterError === null;

  const [inventory, movements, totals] = await Promise.all([
    getInventoryOverview(),
    valid ? getStockMovements(filters) : null,
    valid ? getMovementTotals(filters) : null,
  ]);

  if (inventory.error !== null) {
    return <ErrorState title="Data stok gagal dimuat" message={inventory.error} />;
  }

  const productOptions = [...inventory.data.products]
    .sort((a, b) => a.name.localeCompare(b.name, "id"))
    .map(({ id, name, sku }) => ({ id, name, sku }));
  const resetAction = (
    <Button variant="outline" render={<Link href="/stok" />} nativeButton={false}>
      <RotateCcw />
      Reset filter
    </Button>
  );

  return (
    <div className="space-y-6">
      <StockSummary
        products={inventory.data.products}
        totals={totals && totals.error === null ? totals.data : null}
        from={filters.from}
        to={filters.to}
      />

      <section aria-labelledby="history-heading" className="space-y-3">
        <div>
          <h2 id="history-heading" className="font-heading text-lg font-semibold">
            Riwayat Pergerakan
          </h2>
          <p className="text-sm text-muted-foreground">
            Hanya pergerakan yang tercatat di sistem. Batch yang kedaluwarsa tidak dicatat sebagai
            stok keluar.
          </p>
        </div>

        <MovementFilterBar
          key={`${filters.productId ?? ""}|${filters.type}|${filters.from}|${filters.to}`}
          filters={filters}
          today={today}
          products={productOptions}
          isDefault={isDefault}
        />

        {!valid ? (
          <div
            role="alert"
            className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-danger/40 bg-danger-soft px-4 py-3"
          >
            <p className="flex items-start gap-2 text-sm text-danger">
              <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
              {filterError}
            </p>
            {resetAction}
          </div>
        ) : totals && totals.error !== null ? (
          <ErrorState title="Total stok gagal dihitung" message={totals.error} />
        ) : !movements || movements.error !== null ? (
          <ErrorState title="Riwayat stok gagal dimuat" message={movements?.error ?? "Tidak diketahui."} />
        ) : movements.data.pageOutOfRange ? (
          <EmptyState
            icon={SearchX}
            title="Halaman tidak ditemukan"
            description={`Riwayat untuk filter ini hanya ${movements.data.pageCount} halaman.`}
            action={
              <Button
                variant="outline"
                render={<Link href={`/stok${buildMovementSearch(filters, today, { page: 1 })}`} />}
                nativeButton={false}
              >
                Ke halaman 1
              </Button>
            }
          />
        ) : movements.data.total === 0 ? (
          isDefault ? (
            <EmptyState
              icon={History}
              title="Belum ada pergerakan stok"
              description={`Tidak ada barang masuk atau penjualan dalam ${DEFAULT_RANGE_DAYS} hari terakhir.`}
            />
          ) : (
            <EmptyState
              icon={SearchX}
              title="Tidak ada pergerakan untuk filter ini"
              description="Ubah barang, tipe, atau rentang tanggal."
              action={resetAction}
            />
          )
        ) : (
          <>
            <MovementTable rows={movements.data.rows} />
            <MovementPagination
              filters={filters}
              today={today}
              total={movements.data.total}
              pageCount={movements.data.pageCount}
            />
          </>
        )}
      </section>
    </div>
  );
}

function StokSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Memuat data stok">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-16 w-full rounded-xl" />
      <Skeleton className="h-80 w-full rounded-xl" />
    </div>
  );
}
