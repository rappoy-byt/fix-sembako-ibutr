import {
  ArrowLeft,
  Boxes,
  CalendarClock,
  CalendarX2,
  CircleOff,
  OctagonAlert,
  PackageCheck,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ErrorState } from "@/components/shared/error-state";
import { StatCard, StatCardSkeleton } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BatchTable } from "@/features/inventory/components/batch-table";
import { ProductDetailActions } from "@/features/inventory/components/product-detail-actions";
import { ProductThumb } from "@/features/inventory/components/product-thumb";
import { describeExpiry, ProductActiveBadge, StockLevelBadge } from "@/features/inventory/components/stock-badges";
import { getExpiryStatus } from "@/features/inventory/lib/business-rules";
import { isUuid } from "@/features/inventory/lib/validation";
import { getCategories, getProductDetail } from "@/features/inventory/queries";
import { formatDate, formatNumber, formatRupiah } from "@/lib/format";
import { STOCK_LEVEL_STATUS, type StatusTone } from "@/lib/status";
import type { StockBatch } from "@/types/domain";

export const metadata: Metadata = { title: "Detail Barang" };

export default function ProductDetailPage(props: PageProps<"/barang/[id]">) {
  return (
    <div className="space-y-6">
      <Link
        href="/barang"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Kembali ke daftar barang
      </Link>
      <Suspense fallback={<DetailSkeleton />}>
        <ProductDetailContent params={props.params} />
      </Suspense>
    </div>
  );
}

async function ProductDetailContent({ params }: { params: PageProps<"/barang/[id]">["params"] }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const [detailResult, categoriesResult] = await Promise.all([getProductDetail(id), getCategories()]);
  if (detailResult.error !== null) {
    return <ErrorState title="Detail barang gagal dimuat" message={detailResult.error} />;
  }
  if (categoriesResult.error !== null) {
    return <ErrorState title="Kategori gagal dimuat" message={categoriesResult.error} />;
  }
  if (!detailResult.data) notFound();

  const { product, batches, stock, today } = detailResult.data;
  const { category, ...productRow } = product;
  const nearestStatus = getExpiryStatus(stock.nearestSellableExpiry, today);
  const stockTone: StatusTone = STOCK_LEVEL_STATUS[stock.stockLevel].tone;
  const margin = product.selling_price - product.purchase_price;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <ProductThumb imageUrl={product.image_url} name={product.name} size="lg" />
          <div className="space-y-1.5">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">{product.name}</h1>
            <p className="text-sm text-muted-foreground">
              <span className="font-mono">{product.sku}</span> · {category?.name ?? "Tanpa kategori"} ·{" "}
              {product.unit}
            </p>
            <div className="flex flex-wrap gap-1.5">
              <ProductActiveBadge isActive={product.is_active} />
              {product.is_active && (
                <StockLevelBadge availableStock={stock.availableStock} minimumStock={product.minimum_stock} />
              )}
            </div>
          </div>
        </div>
        <ProductDetailActions
          product={productRow}
          categories={categoriesResult.data}
          categoryName={category?.name ?? null}
          defaultExpiryDays={category?.default_expiry_days ?? null}
          today={today}
          suggestedBatchNumber={suggestBatchNumber(batches, today)}
        />
      </div>

      {!product.is_active && (
        <div className="flex items-start gap-3 rounded-xl border bg-muted/50 px-4 py-3 text-sm">
          <CircleOff aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <p>
            <strong>Barang nonaktif.</strong>{" "}
            <span className="text-muted-foreground">
              Tidak akan muncul sebagai barang yang bisa dijual di kasir, walaupun masih ada stok.
            </span>
          </p>
        </div>
      )}

      {stock.expiredStock > 0 && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-danger/40 bg-danger-soft px-4 py-3"
        >
          <OctagonAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-danger" />
          <div>
            <p className="font-semibold text-danger">
              {formatNumber(stock.expiredStock)} {product.unit} stok sudah expired — tidak boleh dijual
            </p>
            <p className="text-sm text-muted-foreground">
              Batch expired tidak dihitung sebagai stok tersedia dan tidak akan dialokasikan saat
              penjualan. Pisahkan barangnya dari rak.
            </p>
          </div>
        </div>
      )}

      <section aria-label="Ringkasan stok" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Stok Tersedia"
          value={`${formatNumber(stock.availableStock)} ${product.unit}`}
          icon={PackageCheck}
          hint={`${STOCK_LEVEL_STATUS[stock.stockLevel].label} · minimum ${formatNumber(product.minimum_stock)}`}
          tone={stockTone}
        />
        <StatCard
          label="Stok Fisik"
          value={`${formatNumber(stock.physicalStock)} ${product.unit}`}
          icon={Boxes}
          hint="Semua sisa batch, termasuk yang expired"
        />
        <StatCard
          label="Stok Expired"
          value={`${formatNumber(stock.expiredStock)} ${product.unit}`}
          icon={CalendarX2}
          hint="Tidak boleh dijual"
          tone={stock.expiredStock > 0 ? "danger" : "neutral"}
        />
        <StatCard
          label="Terdekat Expired"
          value={stock.nearestSellableExpiry ? formatDate(stock.nearestSellableExpiry) : "—"}
          icon={CalendarClock}
          hint={
            stock.nearestSellableExpiry
              ? `${describeExpiry(stock.nearestSellableExpiry, today)} · dijual lebih dulu (FEFO)`
              : "Tidak ada batch layak jual bertanggal kedaluwarsa"
          }
          tone={nearestStatus === "near_expiry" ? "warning" : "neutral"}
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section aria-labelledby="batch-heading" className="min-w-0 space-y-3">
          <div>
            <h2 id="batch-heading" className="font-heading text-lg font-semibold">
              Batch Stok
            </h2>
            <p className="text-sm text-muted-foreground">
              Urut FEFO: kedaluwarsa terdekat dijual lebih dulu. Kedaluwarsa hari ini masih boleh dijual.
            </p>
          </div>
          <BatchTable batches={batches} unit={product.unit} today={today} />
        </section>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="font-semibold">Informasi Barang</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2.5 text-sm">
              <InfoRow label="Harga beli" value={formatRupiah(product.purchase_price)} />
              <InfoRow label="Harga jual" value={formatRupiah(product.selling_price)} />
              <InfoRow
                label="Margin per unit"
                value={formatRupiah(margin)}
                valueClassName={margin < 0 ? "text-danger" : undefined}
              />
              <InfoRow label="Satuan" value={product.unit} />
              <InfoRow label="Stok minimum" value={`${formatNumber(product.minimum_stock)} ${product.unit}`} />
              <InfoRow
                label="Default kedaluwarsa"
                value={
                  category?.default_expiry_days != null
                    ? `${formatNumber(category.default_expiry_days)} hari`
                    : "Tidak ada"
                }
              />
              <InfoRow label="Dibuat" value={formatDate(product.created_at)} />
              <InfoRow label="Diperbarui" value={formatDate(product.updated_at)} />
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InfoRow({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`numeric text-right font-medium ${valueClassName ?? ""}`}>{value}</dd>
    </div>
  );
}

/** Saran nomor batch: B-YYYYMMDD-NN (tanggal WIB), nomor berikutnya yang belum dipakai. */
function suggestBatchNumber(batches: StockBatch[], today: string) {
  const prefix = `B-${today.replaceAll("-", "")}`;
  const used = new Set(batches.map((b) => b.batch_number));
  for (let n = 1; ; n++) {
    const candidate = `${prefix}-${String(n).padStart(2, "0")}`;
    if (!used.has(candidate)) return candidate;
  }
}

function DetailSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Memuat detail barang">
      <div className="flex items-start gap-4">
        <Skeleton className="size-20 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-5 w-32" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <Skeleton className="h-72 w-full rounded-xl" />
    </div>
  );
}
