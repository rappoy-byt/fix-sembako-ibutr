/**
 * Aturan pembuatan notifikasi NEAR_EXPIRY & LOW_STOCK (murni, tanpa I/O).
 *
 * Tidak ada definisi stok baru: semua memakai business-rules inventaris yang
 * sama dengan /barang dan /kasir, dengan tanggal bisnis WIB (`today`).
 */
import {
  addDaysToDate,
  isBatchSellable,
  NEAR_EXPIRY_DAYS,
  summarizeProductStock,
  type BatchStockFields,
} from "@/features/inventory/lib/business-rules";
import { formatDate, formatNumber } from "@/lib/format";
import type { Product, StockBatch } from "@/types/domain";

export type AlertProduct = Pick<Product, "id" | "name" | "unit" | "minimum_stock" | "is_active">;
export type AlertBatch = BatchStockFields &
  Pick<StockBatch, "id" | "product_id" | "batch_number">;

export interface AlertMessage {
  title: string;
  message: string;
}

// ---------------------------------------------------------------- NEAR_EXPIRY

/** Jendela hampir kedaluwarsa: today ≤ expiry_date ≤ today + 30 (tanggal WIB). */
export function getNearExpiryWindow(today: string) {
  return { from: today, to: addDaysToDate(today, NEAR_EXPIRY_DAYS) };
}

/**
 * Batch layak notifikasi NEAR_EXPIRY: barang aktif, batch layak jual
 * (ACTIVE, sisa > 0, belum expired) dan kedaluwarsa dalam jendela 0–30 hari.
 * Kedaluwarsa hari ini termasuk (masih boleh dijual hari ini).
 */
export function isNearExpiryCandidate(
  batch: AlertBatch,
  product: AlertProduct | undefined,
  today: string
) {
  if (!product?.is_active || !batch.expiry_date) return false;
  if (!isBatchSellable(batch, today)) return false;
  const { from, to } = getNearExpiryWindow(today);
  return batch.expiry_date >= from && batch.expiry_date <= to;
}

export function selectNearExpiryBatches(
  products: AlertProduct[],
  batches: AlertBatch[],
  today: string
) {
  const productsById = new Map(products.map((p) => [p.id, p]));
  return batches.filter((b) => isNearExpiryCandidate(b, productsById.get(b.product_id), today));
}

/** Pesan memakai tanggal absolut — teks "N hari lagi" akan basi setelah disimpan. */
export function nearExpiryMessage(
  batch: Pick<AlertBatch, "batch_number" | "remaining_quantity" | "expiry_date">,
  unit: string
): AlertMessage {
  return {
    title: "Hampir kedaluwarsa",
    message:
      `Batch ${batch.batch_number} (sisa ${formatNumber(batch.remaining_quantity)} ${unit}`.trimEnd() +
      `) kedaluwarsa ${formatDate(batch.expiry_date ?? "")}. Jual lebih dulu (FEFO).`,
  };
}

// ---------------------------------------------------------------- LOW_STOCK

export interface LowStockCandidate {
  product: AlertProduct;
  availableStock: number;
}

/**
 * Barang aktif dengan stok tersedia ≤ minimum_stock (termasuk 0).
 * `batches` = batch dengan sisa > 0; stok tersedia dihitung oleh
 * summarizeProductStock (aturan yang sama dengan /barang & /kasir).
 */
export function selectLowStockProducts(
  products: AlertProduct[],
  batches: (BatchStockFields & Pick<StockBatch, "product_id">)[],
  today: string
): LowStockCandidate[] {
  const byProduct = new Map<string, BatchStockFields[]>();
  for (const batch of batches) {
    const list = byProduct.get(batch.product_id);
    if (list) list.push(batch);
    else byProduct.set(batch.product_id, [batch]);
  }

  const result: LowStockCandidate[] = [];
  for (const product of products) {
    if (!product.is_active) continue;
    const stock = summarizeProductStock(byProduct.get(product.id) ?? [], product.minimum_stock, today);
    if (stock.stockLevel !== "in_stock") {
      result.push({ product, availableStock: stock.availableStock });
    }
  }
  return result;
}

/** Riwayat notifikasi LOW_STOCK sebuah produk yang relevan untuk keputusan. */
export interface LowStockHistory {
  /** created_at notifikasi LOW_STOCK terbaru (dibaca maupun belum), null = belum pernah. */
  latestNotificationAt: string | null;
  /** Masih ada LOW_STOCK yang belum dibaca. */
  hasUnread: boolean;
  /** created_at batch terbaru produk ini (= restock terakhir), null = belum pernah ada batch. */
  lastRestockAt: string | null;
}

/**
 * Satu notifikasi LOW_STOCK per siklus stok:
 * - masih ada yang belum dibaca → jangan buat lagi;
 * - belum pernah ada → buat;
 * - sudah ada → buat lagi HANYA jika ada restock (batch baru) setelah notifikasi
 *   terakhir dan stok kembali menipis (siklus baru).
 */
export function shouldCreateLowStock(history: LowStockHistory) {
  if (history.hasUnread) return false;
  if (history.latestNotificationAt === null) return true;
  if (history.lastRestockAt === null) return false;
  return Date.parse(history.lastRestockAt) > Date.parse(history.latestNotificationAt);
}

export function lowStockMessage(product: Pick<AlertProduct, "unit" | "minimum_stock">, availableStock: number): AlertMessage {
  const minimum = formatNumber(product.minimum_stock);
  if (availableStock <= 0) {
    return { title: "Stok habis", message: `Stok habis (minimum ${minimum}).` };
  }
  return {
    title: "Stok menipis",
    message: `Stok tersedia ${formatNumber(availableStock)} ${product.unit}, minimum ${minimum}.`,
  };
}
