/**
 * Aturan bisnis inventaris yang dipakai bersama oleh Barang, Stok, POS,
 * Dashboard, dan Notifikasi. Semua fungsi di sini murni (tanpa I/O) sehingga
 * aman dipakai di server maupun klien, dan mudah diuji.
 *
 * TANGGAL BISNIS = Asia/Jakarta (WIB). Database berjalan di UTC, jadi aplikasi
 * TIDAK memakai CURRENT_DATE database (termasuk fungsi get_product_available_stock
 * dan refresh_expired_batches). "Hari ini" selalu berasal dari getStoreToday().
 *
 * Aturan stok tersedia mengikuti fungsi DB get_product_available_stock, hanya
 * tanggalnya diganti tanggal WIB:
 *   status = 'ACTIVE' AND remaining_quantity > 0
 *   AND (expiry_date IS NULL OR expiry_date >= hari ini WIB)
 */
import { STORE_TIME_ZONE } from "@/lib/constants";
import type { StockBatch } from "@/types/domain";

/** Batas "hampir kedaluwarsa": tanggal kedaluwarsa dalam 30 hari ke depan. */
export const NEAR_EXPIRY_DAYS = 30;

export type ExpiryStatus = "expired" | "near_expiry" | "fresh" | "no_expiry";
export type StockLevelStatus = "out_of_stock" | "low_stock" | "in_stock";
/** Status tampilan batch: Aman / Segera Expired / Expired / Habis. */
export type BatchDisplayStatus = "safe" | "near_expiry" | "expired" | "depleted";

/** Kolom batch yang dibutuhkan aturan stok (subset StockBatch). */
export type BatchStockFields = Pick<
  StockBatch,
  "remaining_quantity" | "expiry_date" | "status"
>;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Tanggal hari ini di zona waktu toko (WIB), format "YYYY-MM-DD". */
export function getStoreToday(now: Date = new Date()) {
  // Locale en-CA menghasilkan format YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: STORE_TIME_ZONE }).format(now);
}

/** Offset zona waktu toko. Asia/Jakarta tetap UTC+7 sepanjang tahun (tanpa DST). */
const STORE_UTC_OFFSET = "+07:00";

/**
 * Rentang satu hari bisnis WIB untuk memfilter kolom timestamptz:
 * `start <= waktu < end`. Contoh 2026-10-08 → 2026-10-08T00:00:00+07:00 s/d
 * 2026-10-09T00:00:00+07:00 (bukan hari UTC).
 */
export function getStoreDayRange(date: string) {
  return {
    start: `${date}T00:00:00${STORE_UTC_OFFSET}`,
    end: `${addDaysToDate(date, 1)}T00:00:00${STORE_UTC_OFFSET}`,
  };
}

/** Menambah n hari ke tanggal "YYYY-MM-DD" (aritmetika kalender, tanpa zona waktu). */
export function addDaysToDate(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Selisih hari antara hari ini dan tanggal kedaluwarsa.
 * 0 = kedaluwarsa hari ini (masih boleh dijual), negatif = sudah lewat.
 */
export function getDaysUntilExpiry(expiryDate: string, today = getStoreToday()) {
  const expiry = Date.parse(`${expiryDate}T00:00:00Z`);
  const base = Date.parse(`${today}T00:00:00Z`);
  return Math.round((expiry - base) / MS_PER_DAY);
}

/** Expired jika expiry_date < hari ini WIB. Kedaluwarsa hari ini BELUM expired. */
export function isExpired(expiryDate: string | null, today = getStoreToday()) {
  // Tanggal "YYYY-MM-DD" bisa dibandingkan langsung secara leksikografis.
  return expiryDate !== null && expiryDate < today;
}

export function getExpiryStatus(
  expiryDate: string | null,
  today = getStoreToday()
): ExpiryStatus {
  if (!expiryDate) return "no_expiry";
  const days = getDaysUntilExpiry(expiryDate, today);
  if (days < 0) return "expired";
  if (days <= NEAR_EXPIRY_DAYS) return "near_expiry";
  return "fresh";
}

/**
 * Batch layak jual: ACTIVE, masih ada sisa, dan belum expired (tanggal WIB).
 * Batch berstatus EXPIRED/DEPLETED tidak pernah layak jual.
 */
export function isBatchSellable(batch: BatchStockFields, today = getStoreToday()) {
  return (
    batch.status === "ACTIVE" &&
    batch.remaining_quantity > 0 &&
    !isExpired(batch.expiry_date, today)
  );
}

/** Batch yang masih punya sisa fisik tetapi sudah expired (status atau tanggal). */
export function isBatchExpiredWithStock(batch: BatchStockFields, today = getStoreToday()) {
  return (
    batch.remaining_quantity > 0 &&
    batch.status !== "DEPLETED" &&
    (batch.status === "EXPIRED" || isExpired(batch.expiry_date, today))
  );
}

export function getBatchDisplayStatus(
  batch: BatchStockFields,
  today = getStoreToday()
): BatchDisplayStatus {
  if (batch.remaining_quantity <= 0 || batch.status === "DEPLETED") return "depleted";
  if (isBatchExpiredWithStock(batch, today)) return "expired";
  if (getExpiryStatus(batch.expiry_date, today) === "near_expiry") return "near_expiry";
  return "safe";
}

/**
 * Status stok produk berdasarkan stok TERSEDIA (sellable).
 * Low stock = tersedia <= minimum_stock. Habis = tidak ada stok tersedia.
 */
export function getStockLevelStatus(
  availableStock: number,
  minimumStock: number
): StockLevelStatus {
  if (availableStock <= 0) return "out_of_stock";
  if (availableStock <= minimumStock) return "low_stock";
  return "in_stock";
}

/** Barang hanya bisa dijual jika masih ada stok tersedia yang belum expired. */
export function isSellable(availableStock: number) {
  return availableStock > 0;
}

/**
 * Urutan FEFO: kedaluwarsa paling dekat lebih dulu. Batch tanpa tanggal
 * kedaluwarsa paling akhir. Jika sama, batch yang masuk lebih dulu didahulukan.
 */
export function compareBatchesFefo<
  T extends Pick<StockBatch, "expiry_date" | "incoming_date" | "created_at">,
>(a: T, b: T) {
  if (a.expiry_date !== b.expiry_date) {
    if (a.expiry_date === null) return 1;
    if (b.expiry_date === null) return -1;
    return a.expiry_date < b.expiry_date ? -1 : 1;
  }
  if (a.incoming_date !== b.incoming_date) return a.incoming_date < b.incoming_date ? -1 : 1;
  return a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0;
}

export function sortBatchesFefo<
  T extends Pick<StockBatch, "expiry_date" | "incoming_date" | "created_at">,
>(batches: readonly T[]) {
  return [...batches].sort(compareBatchesFefo);
}

/** Batch layak jual dalam urutan FEFO — dasar alokasi penjualan POS. */
export function getSellableBatchesFefo<
  T extends BatchStockFields & Pick<StockBatch, "incoming_date" | "created_at">,
>(batches: readonly T[], today = getStoreToday()) {
  return sortBatchesFefo(batches.filter((b) => isBatchSellable(b, today)));
}

export interface FefoAllocation {
  batchId: string;
  quantity: number;
}

export interface FefoAllocationPlan {
  allocations: FefoAllocation[];
  /** Jumlah yang tidak bisa dipenuhi stok tersedia (0 = terpenuhi semua). */
  shortfall: number;
}

/**
 * Rencana alokasi FEFO untuk menjual `quantity` unit (belum menulis ke DB).
 * Disiapkan untuk POS (Phase 3); eksekusinya nanti harus atomik di database.
 */
export function planFefoAllocation(
  batches: readonly (BatchStockFields &
    Pick<StockBatch, "id" | "incoming_date" | "created_at">)[],
  quantity: number,
  today = getStoreToday()
): FefoAllocationPlan {
  const allocations: FefoAllocation[] = [];
  let remaining = quantity;
  for (const batch of getSellableBatchesFefo(batches, today)) {
    if (remaining <= 0) break;
    const take = Math.min(batch.remaining_quantity, remaining);
    allocations.push({ batchId: batch.id, quantity: take });
    remaining -= take;
  }
  return { allocations, shortfall: Math.max(remaining, 0) };
}

export interface ProductStockSnapshot {
  /** Stok layak jual (mengikuti aturan get_product_available_stock, tanggal WIB). */
  availableStock: number;
  /** Semua sisa fisik (sama dengan get_product_physical_stock). */
  physicalStock: number;
  /** Sisa fisik yang sudah expired — tidak boleh dijual. */
  expiredStock: number;
  /** Kedaluwarsa terdekat dari batch yang MASIH layak jual (urutan FEFO). */
  nearestSellableExpiry: string | null;
  stockLevel: StockLevelStatus;
}

export function summarizeProductStock(
  batches: readonly BatchStockFields[],
  minimumStock: number,
  today = getStoreToday()
): ProductStockSnapshot {
  let availableStock = 0;
  let physicalStock = 0;
  let expiredStock = 0;
  let nearestSellableExpiry: string | null = null;

  for (const batch of batches) {
    physicalStock += batch.remaining_quantity;
    if (isBatchSellable(batch, today)) {
      availableStock += batch.remaining_quantity;
      if (
        batch.expiry_date &&
        (nearestSellableExpiry === null || batch.expiry_date < nearestSellableExpiry)
      ) {
        nearestSellableExpiry = batch.expiry_date;
      }
    } else if (isBatchExpiredWithStock(batch, today)) {
      expiredStock += batch.remaining_quantity;
    }
  }

  return {
    availableStock,
    physicalStock,
    expiredStock,
    nearestSellableExpiry,
    stockLevel: getStockLevelStatus(availableStock, minimumStock),
  };
}
