import "server-only";

import type { createClient } from "@/lib/supabase/server";

import { escapeHtml, sendTelegramMessage } from "./telegram";

type Supabase = Awaited<ReturnType<typeof createClient>>;

const MAX_ALERTS_PER_MESSAGE = 10; // jaga pesan tetap di bawah batas panjang Telegram
const MAX_ALERT_AGE_DAYS = 3; // jangan kirim notifikasi yang sudah terlalu lama
const MAX_BODY_LENGTH = 300;

const TYPE_ICON = {
  EXPIRED: "🚫",
  NEAR_EXPIRY: "⏰",
  LOW_STOCK: "📉",
} as const;

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/**
 * Mengirim notifikasi inventaris yang belum terkirim ke Telegram dalam satu pesan.
 * Mengembalikan jumlah notifikasi yang berhasil terkirim.
 *
 * Aman dipanggil berulang atau bersamaan: baris diklaim lebih dulu
 * (telegram_sent_at diisi), dan klaim dilepas kalau pengiriman gagal.
 */
export async function sendPendingTelegramAlerts(supabase: Supabase): Promise<number> {
  // Telegram belum dikonfigurasi -> lewati tanpa error.
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) return 0;

  const cutoff = new Date(Date.now() - MAX_ALERT_AGE_DAYS * 24 * 60 * 60 * 1000).toISOString();

  // 1) Cari kandidat: belum terkirim, belum dibaca, masih baru.
  const { data: pending, error: pendingError } = await supabase
    .from("notifications")
    .select("id")
    .is("telegram_sent_at", null)
    .eq("is_read", false)
    .gte("created_at", cutoff)
    .order("created_at")
    .limit(MAX_ALERTS_PER_MESSAGE);

  if (pendingError) {
    console.error("[Telegram] Gagal membaca notifikasi pending:", pendingError.message);
    return 0;
  }
  if (!pending || pending.length === 0) return 0;

  // 2) Klaim. Hanya baris yang masih belum terkirim yang ikut terklaim.
  const { data: claimed, error: claimError } = await supabase
    .from("notifications")
    .update({ telegram_sent_at: new Date().toISOString() })
    .in("id", pending.map((row) => row.id))
    .is("telegram_sent_at", null)
    .select("id, type, title, message, created_at");

  if (claimError) {
    console.error("[Telegram] Gagal mengklaim notifikasi:", claimError.message);
    return 0;
  }
  if (!claimed || claimed.length === 0) return 0; // sudah diambil proses lain

  const sorted = [...claimed].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));

  // 3) Susun satu pesan.
  const items = sorted.map(
    (n) =>
      `${TYPE_ICON[n.type]} <b>${escapeHtml(n.title)}</b>\n${escapeHtml(truncate(n.message, MAX_BODY_LENGTH))}`
  );
  const text =
    `<b>🔔 Peringatan Inventaris</b>\nToko Sembako Ibu TR\n\n` +
    items.join("\n\n") +
    `\n\nBuka aplikasi untuk detail dan tindakan.`;

  // 4) Kirim. Kalau gagal, lepas klaim supaya dicoba lagi nanti.
  try {
    await sendTelegramMessage(text);
    return sorted.length;
  } catch (error) {
    console.error("[Telegram] Gagal mengirim pesan:", error instanceof Error ? error.message : error);
    const { error: releaseError } = await supabase
      .from("notifications")
      .update({ telegram_sent_at: null })
      .in("id", sorted.map((n) => n.id));
    if (releaseError) {
      console.error("[Telegram] Gagal melepas klaim:", releaseError.message);
    }
    return 0;
  }
}