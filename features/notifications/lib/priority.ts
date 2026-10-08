/**
 * Urutan tampilan notifikasi berdasarkan URGENSI saat ini (murni, tanpa I/O).
 *
 * Hanya memengaruhi urutan tampilan — tidak mengubah isi notifikasi. Urgensi
 * dihitung dari data terkini (batch & stok), bukan dari teks pesan yang
 * merupakan snapshot saat notifikasi dibuat. Hari bisnis = WIB (`today`).
 *
 * Tier (kecil = lebih urgent):
 *   1  EXPIRED (atau batch notifikasi kedaluwarsa yang kini sudah lewat)
 *   2  kedaluwarsa 0–3 hari lagi (hari ini = 0)
 *   3  kedaluwarsa 4–7 hari lagi
 *   4  LOW_STOCK dengan stok tersedia saat ini = 0
 *   5  kedaluwarsa 8–30 hari lagi
 *   6  LOW_STOCK dengan stok tersedia saat ini > 0
 *   7  sudah teratasi / tidak relevan lagi (batch habis, barang direstock di
 *      atas minimum atau dinonaktifkan, data batch/barang tidak ada)
 *
 * Tie-breaker: kedaluwarsa terdekat (tier kedaluwarsa) atau rasio
 * tersedia/minimum terendah (tier LOW_STOCK) → created_at terbaru → id.
 */
import { getDaysUntilExpiry, NEAR_EXPIRY_DAYS } from "@/features/inventory/lib/business-rules";
import type { NotificationType, StockBatch } from "@/types/domain";

export type PriorityTier = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface PriorityInput {
  id: string;
  type: NotificationType;
  createdAt: string;
  /** Batch terkait saat ini (EXPIRED / NEAR_EXPIRY). */
  batch: Pick<StockBatch, "expiry_date" | "remaining_quantity" | "status"> | null;
  /** Barang terkait saat ini (LOW_STOCK). */
  product: { minimum_stock: number; is_active: boolean } | null;
  /** Stok tersedia barang saat ini (aturan stok yang sama dengan /barang). */
  availableStock: number | null;
}

export interface PriorityKey {
  tier: PriorityTier;
  /** Untuk tier kedaluwarsa (1, 2, 3, 5). */
  expiryDate: string | null;
  /** Untuk tier LOW_STOCK (4, 6): tersedia / minimum. */
  stockRatio: number | null;
  createdAt: string;
  id: string;
}

const EXPIRY_TIERS = new Set<PriorityTier>([1, 2, 3, 5]);
const STOCK_TIERS = new Set<PriorityTier>([4, 6]);

function key(
  input: PriorityInput,
  tier: PriorityTier,
  extra: Partial<Pick<PriorityKey, "expiryDate" | "stockRatio">> = {}
): PriorityKey {
  return {
    tier,
    expiryDate: extra.expiryDate ?? null,
    stockRatio: extra.stockRatio ?? null,
    createdAt: input.createdAt,
    id: input.id,
  };
}

export function getPriorityKey(input: PriorityInput, today: string): PriorityKey {
  if (input.type === "LOW_STOCK") {
    const { product, availableStock } = input;
    if (!product || !product.is_active || availableStock === null) return key(input, 7);
    // Sudah direstock di atas minimum → kondisi menipis sudah teratasi.
    if (availableStock > product.minimum_stock) return key(input, 7);
    if (availableStock <= 0) return key(input, 4, { stockRatio: 0 });
    // Di tier ini minimum_stock ≥ tersedia > 0, jadi tidak pernah dibagi nol.
    return key(input, 6, { stockRatio: availableStock / product.minimum_stock });
  }

  // EXPIRED / NEAR_EXPIRY: urgensi dari batch saat ini.
  const { batch } = input;
  if (!batch || !batch.expiry_date) return key(input, 7);
  // Batch sudah habis terjual / dikeluarkan → tidak ada stok yang perlu ditangani.
  if (batch.remaining_quantity <= 0 || batch.status === "DEPLETED") return key(input, 7);

  const expiryDate = batch.expiry_date;
  const days = getDaysUntilExpiry(expiryDate, today);
  if (input.type === "EXPIRED" || batch.status === "EXPIRED" || days < 0) {
    return key(input, 1, { expiryDate });
  }
  if (days <= 3) return key(input, 2, { expiryDate });
  if (days <= 7) return key(input, 3, { expiryDate });
  if (days <= NEAR_EXPIRY_DAYS) return key(input, 5, { expiryDate });
  return key(input, 7);
}

export function compareByPriority(a: PriorityKey, b: PriorityKey): number {
  if (a.tier !== b.tier) return a.tier - b.tier;

  if (EXPIRY_TIERS.has(a.tier) && a.expiryDate !== b.expiryDate) {
    if (a.expiryDate === null) return 1;
    if (b.expiryDate === null) return -1;
    return a.expiryDate < b.expiryDate ? -1 : 1;
  }
  if (STOCK_TIERS.has(a.tier) && a.stockRatio !== b.stockRatio) {
    return (a.stockRatio ?? Infinity) - (b.stockRatio ?? Infinity);
  }

  const createdDiff = Date.parse(b.createdAt) - Date.parse(a.createdAt);
  if (createdDiff !== 0 && !Number.isNaN(createdDiff)) return createdDiff;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Gabungan feed: SEMUA notifikasi belum dibaca + `readLimit` notifikasi sudah
 * dibaca terbaru. Notifikasi urgent lama yang belum dibaca tidak pernah
 * terpotong oleh notifikasi yang lebih baru. Duplikat id diabaikan.
 */
export function combineFeed<T extends { id: string; is_read: boolean; created_at: string }>(
  unread: readonly T[],
  read: readonly T[],
  readLimit: number
): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const row of unread) {
    if (row.is_read || seen.has(row.id)) continue;
    seen.add(row.id);
    result.push(row);
  }
  const newestRead = read
    .filter((row) => row.is_read && !seen.has(row.id))
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
    .slice(0, readLimit);
  return [...result, ...newestRead];
}

/** Urutkan item apa pun berdasarkan kunci prioritasnya (tidak memodifikasi input). */
export function sortByPriority<T>(items: readonly T[], keyOf: (item: T) => PriorityKey): T[] {
  return items
    .map((item) => ({ item, key: keyOf(item) }))
    .sort((a, b) => compareByPriority(a.key, b.key))
    .map(({ item }) => item);
}
