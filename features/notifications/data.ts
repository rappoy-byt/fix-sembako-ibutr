import "server-only";

import { cache } from "react";

import {
  getStoreToday,
  summarizeProductStock,
  type BatchStockFields,
} from "@/features/inventory/lib/business-rules";
import { chunk, describeDbError, fetchAllRows } from "@/lib/supabase/helpers";
import { createClient } from "@/lib/supabase/server";
import type { AppNotification, QueryResult } from "@/types/domain";

import { combineFeed, getPriorityKey, sortByPriority } from "./lib/priority";

/** Jumlah notifikasi SUDAH DIBACA terbaru yang ikut dimuat. Yang belum dibaca selalu dimuat semua. */
const READ_FEED_LIMIT = 100;

export interface NotificationFeed {
  /** Urut berdasarkan urgensi saat ini (lihat lib/priority.ts). */
  items: AppNotification[];
  /** Total belum dibaca di database. */
  unreadCount: number;
}

// Harus satu string literal agar supabase-js bisa menurunkan tipe baris dari select.
const FEED_SELECT =
  "id, type, title, message, product_id, batch_id, is_read, created_at, product:products(name, minimum_stock, is_active), batch:stock_batches(expiry_date, remaining_quantity, status)";

/**
 * Notifikasi dari tabel `notifications` (READ-ONLY). Di-cache per request karena
 * dipakai oleh layout (lonceng & sidebar) dan halaman /notifikasi sekaligus.
 *
 * - Semua notifikasi BELUM DIBACA dimuat (tanpa batas), sehingga notifikasi urgent
 *   lama tidak pernah terpotong; ditambah 100 notifikasi sudah dibaca terbaru.
 * - Urutan = urgensi saat ini dengan tanggal bisnis WIB (getStoreToday()),
 *   memakai data batch & stok terkini — bukan sekadar created_at.
 */
export const getNotifications = cache(async (): Promise<QueryResult<NotificationFeed>> => {
  const supabase = await createClient();
  const today = getStoreToday();

  const [unreadResult, readResult] = await Promise.all([
    fetchAllRows((from, to) =>
      supabase
        .from("notifications")
        .select(FEED_SELECT)
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .order("id")
        .range(from, to)
    ),
    supabase
      .from("notifications")
      .select(FEED_SELECT)
      .eq("is_read", true)
      .order("created_at", { ascending: false })
      .order("id")
      .limit(READ_FEED_LIMIT),
  ]);

  if (unreadResult.error) {
    return { data: null, error: describeDbError(unreadResult.error, "Gagal memuat notifikasi") };
  }
  if (readResult.error) {
    return { data: null, error: describeDbError(readResult.error, "Gagal memuat notifikasi") };
  }

  const rows = combineFeed(unreadResult.data, readResult.data, READ_FEED_LIMIT);

  // Stok tersedia SAAT INI untuk barang yang punya notifikasi LOW_STOCK
  // (aturan stok yang sama dengan /barang & /kasir, tanggal WIB).
  const lowStockProductIds = [
    ...new Set(
      rows.filter((r) => r.type === "LOW_STOCK" && r.product_id).map((r) => r.product_id as string)
    ),
  ];
  const availableByProduct = new Map<string, number>();
  if (lowStockProductIds.length > 0) {
    const batchesByProduct = new Map<string, BatchStockFields[]>();
    for (const ids of chunk(lowStockProductIds)) {
      const batchesResult = await fetchAllRows((from, to) =>
        supabase
          .from("stock_batches")
          .select("product_id, remaining_quantity, expiry_date, status")
          .in("product_id", ids)
          .gt("remaining_quantity", 0)
          .order("id")
          .range(from, to)
      );
      if (batchesResult.error) {
        return { data: null, error: describeDbError(batchesResult.error, "Gagal memuat stok untuk notifikasi") };
      }
      for (const batch of batchesResult.data) {
        const list = batchesByProduct.get(batch.product_id);
        if (list) list.push(batch);
        else batchesByProduct.set(batch.product_id, [batch]);
      }
    }
    for (const row of rows) {
      if (row.type !== "LOW_STOCK" || !row.product_id || !row.product) continue;
      const stock = summarizeProductStock(
        batchesByProduct.get(row.product_id) ?? [],
        row.product.minimum_stock,
        today
      );
      availableByProduct.set(row.product_id, stock.availableStock);
    }
  }

  const sorted = sortByPriority(rows, (row) =>
    getPriorityKey(
      {
        id: row.id,
        type: row.type,
        createdAt: row.created_at,
        batch: row.batch,
        product: row.product,
        availableStock: row.product_id ? (availableByProduct.get(row.product_id) ?? null) : null,
      },
      today
    )
  );

  const items: AppNotification[] = sorted.map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    productId: row.product_id,
    productName: row.product?.name ?? "Produk tidak diketahui",
    batchId: row.batch_id,
    createdAt: row.created_at,
    isRead: row.is_read,
  }));

  return {
    data: { items, unreadCount: unreadResult.data.length },
    error: null,
  };
});
