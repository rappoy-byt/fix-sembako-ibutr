import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { getStoreToday } from "@/features/inventory/lib/business-rules";
import { sendPendingTelegramAlerts } from "@/features/monitoring/telegram-alerts";
import { runInventorySync } from "@/features/notifications/lib/inventory-sync";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 30;

type AuthResult = "ok" | "unauthorized" | "not-configured";

function checkAuth(request: Request): AuthResult {
  const secret = process.env.CRON_SECRET;
  if (!secret) return "not-configured";

  const received = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);

  if (received.length !== expected.length) return "unauthorized";
  return timingSafeEqual(received, expected) ? "ok" : "unauthorized";
}

/**
 * Pemeriksaan inventaris otomatis (tanpa aplikasi dibuka), dipanggil oleh penjadwal
 * dengan header Authorization: Bearer <CRON_SECRET>.
 */
export async function GET(request: Request) {
  const auth = checkAuth(request);
  if (auth === "not-configured") {
    return NextResponse.json({ ok: false, error: "CRON_SECRET belum diisi." }, { status: 503 });
  }
  if (auth === "unauthorized") {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();

    const sync = await runInventorySync(supabase, getStoreToday());
    if (!sync.ok) {
      console.error("[Cron] Sinkronisasi gagal:", sync.error);
      return NextResponse.json({ ok: false, error: "Sinkronisasi gagal." }, { status: 500 });
    }

    const telegramSent = await sendPendingTelegramAlerts(supabase);
    console.log("[Cron] Selesai:", { ...sync, telegramSent });

    return NextResponse.json({ ok: true, sync, telegramSent });
  } catch (error) {
    console.error("[Cron] Error tak terduga:", error);
    return NextResponse.json({ ok: false, error: "Terjadi kesalahan." }, { status: 500 });
  }
}