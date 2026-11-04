"use server";

import { revalidatePath } from "next/cache";

import { getCurrentOwner } from "@/features/auth/queries";
import { getStoreToday } from "@/features/inventory/lib/business-rules";
import { sendPendingTelegramAlerts } from "@/features/monitoring/telegram-alerts";
import { formatDate, formatNumber } from "@/lib/format";
import { chunk, describeDbError, fetchAllRows, PG_ERROR } from "@/lib/supabase/helpers";
import { createClient } from "@/lib/supabase/server";
import type { TablesInsert } from "@/types/database";

import {
  lowStockMessage,
  nearExpiryMessage,
  selectLowStockProducts,
  selectNearExpiryBatches,
  shouldCreateLowStock,
  type AlertBatch,
  type AlertProduct,
  type LowStockHistory,
} from "./lib/inventory-alerts";

export interface InventorySyncCounts {
  /** Batch expired yang masih punya sisa stok. */
  expiredBatches: number;
  /** Batch yang status-nya baru diubah ACTIVE → EXPIRED. */
  statusUpdated: number;
  /** Notifikasi EXPIRED yang baru dibuat. */
  expiredCreated: number;
  /** Notifikasi NEAR_EXPIRY yang baru dibuat. */
  nearExpiryCreated: number;
  /** Notifikasi LOW_STOCK yang baru dibuat. */
  lowStockCreated: number;
}

export type SyncInventoryResult = ({ ok: true } & InventorySyncCounts) | { ok: false; error: string };

type Supabase = Awaited<ReturnType<typeof createClient>>;
type StepResult<T> = ({ ok: true } & T) | { ok: false; error: string };

/**
 * Sinkronisasi notifikasi inventaris (EXPIRED, NEAR_EXPIRY, LOW_STOCK) memakai
 * tanggal bisnis WIB dari getStoreToday() — bukan CURRENT_DATE database.
 * Idempoten: aman dipanggil berulang (saat app dibuka, berkala, saat tab aktif lagi).
 *
 * Pencegahan duplikat:
 * - EXPIRED & NEAR_EXPIRY: cek dulu + UNIQUE (batch_id, type) dengan ON CONFLICT DO NOTHING.
 * - LOW_STOCK: aturan satu siklus stok (lihat shouldCreateLowStock) + partial unique
 *   index notifications_low_stock_unread_product_key; insert satu per satu dan
 *   23505 (sudah dibuat proses lain) dianggap "sudah ada", bukan error.
 */
export async function syncInventoryNotifications(): Promise<SyncInventoryResult> {
  if (!(await getCurrentOwner())) {
    return { ok: false, error: "Sesi login berakhir. Silakan masuk kembali." };
  }

  const supabase = await createClient();
  const today = getStoreToday();

  // EXPIRED lebih dulu: status batch expired diperbarui sebelum stok dihitung.
  const expired = await syncExpired(supabase, today);
  if (!expired.ok) return expired;

  const [productsResult, batchesResult] = await Promise.all([
    fetchAllRows((from, to) =>
      supabase
        .from("products")
        .select("id, name, unit, minimum_stock, is_active")
        .eq("is_active", true)
        .order("id")
        .range(from, to)
    ),
    fetchAllRows((from, to) =>
      supabase
        .from("stock_batches")
        .select("id, product_id, batch_number, expiry_date, remaining_quantity, status")
        .gt("remaining_quantity", 0)
        .order("id")
        .range(from, to)
    ),
  ]);
  if (productsResult.error) {
    return { ok: false, error: describeDbError(productsResult.error, "Gagal memuat barang untuk notifikasi") };
  }
  if (batchesResult.error) {
    return { ok: false, error: describeDbError(batchesResult.error, "Gagal memuat stok untuk notifikasi") };
  }

  const nearExpiry = await syncNearExpiry(supabase, productsResult.data, batchesResult.data, today);
  if (!nearExpiry.ok) return nearExpiry;

  const lowStock = await syncLowStock(supabase, productsResult.data, batchesResult.data, today);
  if (!lowStock.ok) return lowStock;

  const counts: InventorySyncCounts = {
    expiredBatches: expired.expiredBatches,
    statusUpdated: expired.statusUpdated,
    expiredCreated: expired.notificationsCreated,
    nearExpiryCreated: nearExpiry.created,
    lowStockCreated: lowStock.created,
  };

  // BARU: kirim peringatan baru ke Telegram. Gagal kirim tidak boleh menggagalkan sinkronisasi.
  try {
    await sendPendingTelegramAlerts(supabase);
  } catch (error) {
    console.error("[Telegram] Gagal mengirim peringatan:", error);
  }

  if (
    counts.statusUpdated > 0 ||
    counts.expiredCreated > 0 ||
    counts.nearExpiryCreated > 0 ||
    counts.lowStockCreated > 0
  ) {
    revalidatePath("/", "layout");
  }

  return { ok: true, ...counts };
}

/**
 * EXPIRED — perilaku sama seperti sebelumnya (refresh_expired_batches() sengaja
 * tidak dipakai karena memakai CURRENT_DATE UTC):
 *
 * 1. Cari batch dengan expiry_date < hari ini WIB, remaining_quantity > 0,
 *    status ACTIVE/EXPIRED.
 * 2. Ubah status ACTIVE → EXPIRED.
 * 3. Buat notifikasi EXPIRED untuk batch yang belum punya.
 */
async function syncExpired(
  supabase: Supabase,
  today: string
): Promise<StepResult<{ expiredBatches: number; statusUpdated: number; notificationsCreated: number }>> {
  const expiredResult = await fetchAllRows((from, to) =>
    supabase
      .from("stock_batches")
      .select("id, product_id, batch_number, expiry_date, remaining_quantity, status, product:products(name, unit)")
      .gt("remaining_quantity", 0)
      .in("status", ["ACTIVE", "EXPIRED"])
      .not("expiry_date", "is", null)
      .lt("expiry_date", today)
      .order("id")
      .range(from, to)
  );
  if (expiredResult.error) {
    return { ok: false, error: describeDbError(expiredResult.error, "Gagal memeriksa batch kedaluwarsa") };
  }

  const expired = expiredResult.data;
  if (expired.length === 0) {
    return { ok: true, expiredBatches: 0, statusUpdated: 0, notificationsCreated: 0 };
  }

  // 2. Status ACTIVE → EXPIRED (filter ulang di query agar idempoten).
  let statusUpdated = 0;
  const activeIds = expired.filter((b) => b.status === "ACTIVE").map((b) => b.id);
  for (const ids of chunk(activeIds)) {
    const { data, error } = await supabase
      .from("stock_batches")
      .update({ status: "EXPIRED" })
      .in("id", ids)
      .eq("status", "ACTIVE")
      .lt("expiry_date", today)
      .select("id");
    if (error) {
      return { ok: false, error: describeDbError(error, "Gagal memperbarui status batch kedaluwarsa") };
    }
    statusUpdated += data.length;
  }

  // 3a. Cek notifikasi yang sudah ada (dibaca maupun belum).
  const notified = new Set<string>();
  for (const ids of chunk(expired.map((b) => b.id))) {
    const { data, error } = await supabase
      .from("notifications")
      .select("batch_id")
      .eq("type", "EXPIRED")
      .in("batch_id", ids);
    if (error) {
      return { ok: false, error: describeDbError(error, "Gagal memeriksa notifikasi") };
    }
    for (const row of data) if (row.batch_id) notified.add(row.batch_id);
  }

  // 3b. Buat yang belum ada. ignoreDuplicates → ON CONFLICT (batch_id, type) DO NOTHING.
  const newRows: TablesInsert<"notifications">[] = expired
    .filter((b) => !notified.has(b.id))
    .map((b) => {
      const unit = b.product?.unit ?? "";
      return {
        type: "EXPIRED",
        product_id: b.product_id,
        batch_id: b.id,
        title: "Batch kedaluwarsa",
        message:
          `Batch ${b.batch_number} (sisa ${formatNumber(b.remaining_quantity)} ${unit}`.trimEnd() +
          `) sudah melewati tanggal kedaluwarsa ${formatDate(b.expiry_date ?? today)}. ` +
          `Jangan dijual. Pisahkan dari rak.`,
      };
    });

  let notificationsCreated = 0;
  for (const rows of chunk(newRows)) {
    const { data, error } = await supabase
      .from("notifications")
      .upsert(rows, { onConflict: "batch_id,type", ignoreDuplicates: true })
      .select("id");
    if (error) {
      return { ok: false, error: describeDbError(error, "Gagal membuat notifikasi kedaluwarsa") };
    }
    notificationsCreated += data.length;
  }

  return { ok: true, expiredBatches: expired.length, statusUpdated, notificationsCreated };
}

/** NEAR_EXPIRY — satu notifikasi per batch (UNIQUE (batch_id, type)). */
async function syncNearExpiry(
  supabase: Supabase,
  products: AlertProduct[],
  batches: AlertBatch[],
  today: string
): Promise<StepResult<{ created: number }>> {
  const candidates = selectNearExpiryBatches(products, batches, today);
  if (candidates.length === 0) return { ok: true, created: 0 };

  const notified = new Set<string>();
  for (const ids of chunk(candidates.map((b) => b.id))) {
    const { data, error } = await supabase
      .from("notifications")
      .select("batch_id")
      .eq("type", "NEAR_EXPIRY")
      .in("batch_id", ids);
    if (error) return { ok: false, error: describeDbError(error, "Gagal memeriksa notifikasi hampir kedaluwarsa") };
    for (const row of data) if (row.batch_id) notified.add(row.batch_id);
  }

  const unitByProduct = new Map(products.map((p) => [p.id, p.unit]));
  const newRows: TablesInsert<"notifications">[] = candidates
    .filter((b) => !notified.has(b.id))
    .map((b) => ({
      type: "NEAR_EXPIRY",
      product_id: b.product_id,
      batch_id: b.id,
      ...nearExpiryMessage(b, unitByProduct.get(b.product_id) ?? ""),
    }));

  let created = 0;
  for (const rows of chunk(newRows)) {
    const { data, error } = await supabase
      .from("notifications")
      .upsert(rows, { onConflict: "batch_id,type", ignoreDuplicates: true })
      .select("id");
    if (error) return { ok: false, error: describeDbError(error, "Gagal membuat notifikasi hampir kedaluwarsa") };
    created += data.length;
  }
  return { ok: true, created };
}

/** LOW_STOCK — satu notifikasi per siklus stok per produk. */
async function syncLowStock(
  supabase: Supabase,
  products: AlertProduct[],
  batches: AlertBatch[],
  today: string
): Promise<StepResult<{ created: number }>> {
  const candidates = selectLowStockProducts(products, batches, today);
  if (candidates.length === 0) return { ok: true, created: 0 };

  const history = new Map<string, LowStockHistory>(
    candidates.map((c) => [c.product.id, { latestNotificationAt: null, hasUnread: false, lastRestockAt: null }])
  );

  for (const ids of chunk(candidates.map((c) => c.product.id))) {
    const [notificationsResult, restockResult] = await Promise.all([
      supabase
        .from("notifications")
        .select("product_id, is_read, created_at")
        .eq("type", "LOW_STOCK")
        .in("product_id", ids),
      // Restock = batch baru (termasuk yang kini sudah habis), jadi tanpa filter sisa.
      supabase.from("stock_batches").select("product_id, created_at").in("product_id", ids),
    ]);
    if (notificationsResult.error) {
      return { ok: false, error: describeDbError(notificationsResult.error, "Gagal memeriksa notifikasi stok menipis") };
    }
    if (restockResult.error) {
      return { ok: false, error: describeDbError(restockResult.error, "Gagal memeriksa riwayat restock") };
    }

    for (const row of notificationsResult.data) {
      const h = row.product_id ? history.get(row.product_id) : undefined;
      if (!h) continue;
      if (!row.is_read) h.hasUnread = true;
      if (h.latestNotificationAt === null || Date.parse(row.created_at) > Date.parse(h.latestNotificationAt)) {
        h.latestNotificationAt = row.created_at;
      }
    }
    for (const row of restockResult.data) {
      const h = history.get(row.product_id);
      if (h && (h.lastRestockAt === null || Date.parse(row.created_at) > Date.parse(h.lastRestockAt))) {
        h.lastRestockAt = row.created_at;
      }
    }
  }

  let created = 0;
  for (const { product, availableStock } of candidates) {
    const h = history.get(product.id);
    if (!h || !shouldCreateLowStock(h)) continue;

    // Satu per satu: partial unique index tidak bisa dipakai sebagai target ON CONFLICT.
    const { error } = await supabase.from("notifications").insert({
      type: "LOW_STOCK",
      product_id: product.id,
      batch_id: null,
      ...lowStockMessage(product, availableStock),
    });
    if (error) {
      // Proses lain baru saja membuat LOW_STOCK belum-dibaca untuk produk ini.
      if (error.code === PG_ERROR.UNIQUE_VIOLATION) continue;
      return { ok: false, error: describeDbError(error, "Gagal membuat notifikasi stok menipis") };
    }
    created += 1;
  }
  return { ok: true, created };
}

export type MarkReadResult = { ok: true } | { ok: false; error: string };

export async function markNotificationRead(id: string): Promise<MarkReadResult> {
  if (!(await getCurrentOwner())) {
    return { ok: false, error: "Sesi login berakhir. Silakan masuk kembali." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id)
    .select("id");
  if (error) return { ok: false, error: describeDbError(error, "Gagal menandai notifikasi") };
  if (data.length === 0) return { ok: false, error: "Notifikasi tidak ditemukan." };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function markAllNotificationsRead(): Promise<MarkReadResult> {
  if (!(await getCurrentOwner())) {
    return { ok: false, error: "Sesi login berakhir. Silakan masuk kembali." };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("is_read", false);
  if (error) return { ok: false, error: describeDbError(error, "Gagal menandai notifikasi") };
  revalidatePath("/", "layout");
  return { ok: true };
}