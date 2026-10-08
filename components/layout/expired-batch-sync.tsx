"use client";

import { useEffect } from "react";
import { toast } from "sonner";

import { syncInventoryNotifications } from "@/features/notifications/actions";
import { formatNumber } from "@/lib/format";

/** Sinkronisasi berkala selama tab aktif. */
const SYNC_INTERVAL_MS = 5 * 60 * 1000;
/** Jeda minimum antar-sinkronisasi (focus & visibilitychange sering terpicu bersamaan). */
const MIN_GAP_MS = 30 * 1000;

// Status di level modul: satu sinkronisasi pada satu waktu untuk seluruh app,
// juga saat StrictMode memasang efek dua kali di development.
let inFlight = false;
let lastRunAt = 0;
let lastRunFailed = false;

async function runSync(force: boolean) {
  if (inFlight || document.visibilityState !== "visible") return;
  if (!force && Date.now() - lastRunAt < MIN_GAP_MS) return;
  inFlight = true;
  lastRunAt = Date.now();

  try {
    const result = await syncInventoryNotifications();
    if (!result.ok) {
      // Jangan memenuhi layar dengan toast yang sama tiap 5 menit saat offline.
      if (!lastRunFailed) toast.error("Pemeriksaan notifikasi stok gagal", { description: result.error });
      lastRunFailed = true;
      return;
    }
    lastRunFailed = false;

    if (result.expiredCreated > 0) {
      toast.warning(`${formatNumber(result.expiredCreated)} batch kedaluwarsa baru ditemukan`, {
        description: "Batch tersebut tidak dihitung sebagai stok tersedia. Lihat Notifikasi.",
      });
    }
    const otherCreated = result.nearExpiryCreated + result.lowStockCreated;
    if (otherCreated > 0) {
      toast.info(`${formatNumber(otherCreated)} notifikasi stok baru`, {
        description: "Ada barang hampir kedaluwarsa atau stok menipis. Lihat Notifikasi.",
      });
    }
  } catch (error) {
    console.error("[sync] syncInventoryNotifications gagal:", error);
    if (!lastRunFailed) {
      toast.error("Pemeriksaan notifikasi stok gagal", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
    lastRunFailed = true;
  } finally {
    inFlight = false;
  }
}

/**
 * Memicu sinkronisasi notifikasi inventaris (EXPIRED, NEAR_EXPIRY, LOW_STOCK):
 * - saat aplikasi dibuka;
 * - setiap 5 menit selama tab terlihat;
 * - saat tab kembali terlihat / jendela mendapat fokus.
 *
 * Sengaja dijalankan dari browser, bukan saat render server: Next.js bisa
 * me-render halaman lebih awal untuk prefetch, dan penulisan data tidak boleh
 * terjadi di sana. Server action-nya idempoten, jadi pemanggilan berulang aman.
 */
export function InventoryNotificationSync() {
  useEffect(() => {
    void runSync(lastRunAt === 0);

    const interval = window.setInterval(() => void runSync(true), SYNC_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void runSync(false);
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, []);

  return null;
}
