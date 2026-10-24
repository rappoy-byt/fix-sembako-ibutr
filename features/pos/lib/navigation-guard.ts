/**
 * POS Focus Mode — aturan murni (tanpa React/I/O) untuk menjaga transaksi kasir
 * yang belum selesai saat pengguna hendak meninggalkan /kasir.
 */

/**
 * Status kasir yang SEDANG AKTIF (halaman /kasir terbuka). Semua level tetap
 * memunculkan dialog konfirmasi saat meninggalkan kasir; yang berbeda isinya.
 * - idle       : keranjang kosong, tidak ada proses → boleh keluar setelah konfirmasi.
 * - cart       : keranjang berisi barang → boleh keluar setelah konfirmasi.
 * - submitting : checkout sedang berjalan → TIDAK boleh keluar.
 * - uncertain  : hasil checkout belum pasti (transaction ID masih disimpan untuk
 *                percobaan ulang) → TIDAK boleh keluar, agar ID tidak hilang.
 */
export type PosGuardLevel = "idle" | "cart" | "submitting" | "uncertain";

/**
 * Status yang dilaporkan ke penjaga navigasi. null = kasir TIDAK aktif (belum
 * dibuka, sudah ditinggalkan, atau disembunyikan <Activity>) → navigasi normal.
 * Sengaja dibedakan dari "idle" (kasir aktif dengan keranjang kosong).
 */
export type PosGuardStatus = PosGuardLevel | null;

export type LeaveIntent = "navigate" | "logout";

export function getPosGuardLevel(state: {
  lineCount: number;
  isSubmitting: boolean;
  /** pendingTransactionIdRef.current !== null */
  hasPendingTransactionId: boolean;
}): PosGuardLevel {
  if (state.isSubmitting) return "submitting";
  // Di luar proses kirim, ID hanya tersisa jika hasil percobaan terakhir tidak pasti.
  if (state.hasPendingTransactionId) return "uncertain";
  if (state.lineCount > 0) return "cart";
  return "idle";
}

/** Perlu dialog sebelum meninggalkan kasir? Ya, selama kasir aktif — termasuk keranjang kosong. */
export function needsLeaveConfirmation(status: PosGuardStatus): status is PosGuardLevel {
  return status !== null;
}

/**
 * Tahan refresh/tutup tab (beforeunload)? Hanya bila ada yang berisiko hilang;
 * keranjang kosong tidak perlu dialog bawaan browser.
 */
export function shouldBlockUnload(status: PosGuardStatus) {
  return status !== null && status !== "idle";
}

/** Boleh meninggalkan kasir setelah pengguna mengonfirmasi? */
export function canLeaveAfterConfirm(level: PosGuardLevel) {
  return level === "idle" || level === "cart";
}

export interface LeaveDialogCopy {
  title: string;
  description: string;
  /** null = tidak ada tombol untuk tetap keluar. */
  confirmLabel: string | null;
}

export function getLeaveDialogCopy(level: PosGuardLevel, intent: LeaveIntent): LeaveDialogCopy {
  switch (level) {
    case "idle":
      return {
        title: intent === "logout" ? "Keluar dari aplikasi?" : "Tinggalkan kasir?",
        description: "Anda akan meninggalkan halaman kasir. Keranjang kosong dan tidak ada pembayaran yang sedang diproses.",
        confirmLabel: intent === "logout" ? "Tetap keluar" : "Tinggalkan kasir",
      };
    case "cart":
      return {
        title: intent === "logout" ? "Keluar dari aplikasi?" : "Tinggalkan kasir?",
        // Next.js (cacheComponents) kadang menyimpan halaman kasir saat ditinggalkan,
        // tetapi tidak dijamin — jangan menjanjikan keranjang hilang ataupun tersimpan.
        description:
          "Keranjang masih berisi barang yang belum dibayar dan belum ada transaksi yang tercatat. Isi keranjang tidak dijamin tersimpan setelah Anda keluar.",
        confirmLabel: intent === "logout" ? "Tetap keluar" : "Tinggalkan kasir",
      };
    case "submitting":
      return {
        title: "Pembayaran sedang diproses",
        description:
          "Tunggu sampai pembayaran selesai sebelum meninggalkan kasir, agar hasil transaksi dan struknya tidak terlewat.",
        confirmLabel: null,
      };
    case "uncertain":
      return {
        title: "Status transaksi belum pasti",
        description:
          "Koneksi terputus saat pembayaran terakhir. Tekan Bayar lagi untuk memastikan statusnya. Transaksi tidak akan tercatat dua kali. Jika Anda keluar sekarang, status transaksi ini tidak bisa dicek dari kasir.",
        confirmLabel: null,
      };
  }
}
