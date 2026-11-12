"use server";

import { revalidatePath } from "next/cache";

import { getCurrentOwner } from "@/features/auth/queries";
import { getStoreToday } from "@/features/inventory/lib/business-rules";
import { sendPendingTelegramAlerts } from "@/features/monitoring/telegram-alerts";
import { describeDbError } from "@/lib/supabase/helpers";
import { createClient } from "@/lib/supabase/server";

import { runInventorySync, type RunInventorySyncResult } from "./lib/inventory-sync";

export type { InventorySyncCounts } from "./lib/inventory-sync";
export type SyncInventoryResult = RunInventorySyncResult;

/**
 * Sinkronisasi notifikasi inventaris yang dipicu dari aplikasi (saat dibuka, tiap 5 menit,
 * saat tab aktif lagi). Pemeriksaan otomatis tanpa aplikasi dibuka dilakukan oleh
 * route cron /api/cron/inventory-monitor yang memakai inti sinkronisasi yang sama.
 */
export async function syncInventoryNotifications(): Promise<SyncInventoryResult> {
  if (!(await getCurrentOwner())) {
    return { ok: false, error: "Sesi login berakhir. Silakan masuk kembali." };
  }

  const supabase = await createClient();
  const result = await runInventorySync(supabase, getStoreToday());
  if (!result.ok) return result;

  // Kirim peringatan baru ke Telegram. Gagal kirim tidak boleh menggagalkan sinkronisasi.
  try {
    await sendPendingTelegramAlerts(supabase);
  } catch (error) {
    console.error("[Telegram] Gagal mengirim peringatan:", error);
  }

  if (
    result.statusUpdated > 0 ||
    result.expiredCreated > 0 ||
    result.nearExpiryCreated > 0 ||
    result.lowStockCreated > 0
  ) {
    revalidatePath("/", "layout");
  }

  return result;
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