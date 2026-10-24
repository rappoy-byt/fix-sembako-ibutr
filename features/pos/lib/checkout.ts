/**
 * Kontrak checkout kasir ↔ RPC public.checkout_transaction.
 * Murni (tanpa I/O): tipe, parsing hasil RPC, dan pemetaan error ke pesan ramah.
 */
import { formatNumber, formatRupiah } from "@/lib/format";
import type { PaymentMethod } from "@/types/domain";

export interface CheckoutRequest {
  /** Kunci idempotensi — UUID per percobaan checkout. */
  transactionId: string;
  items: { productId: string; quantity: number }[];
  paymentMethod: PaymentMethod;
  /** Nominal dibayar (CASH). Untuk QRIS/DEBIT server memakai total. */
  paidAmount: number | null;
  /** Total yang tampil di layar kasir. */
  expectedTotal: number;
}

export interface ReceiptItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface CheckoutReceipt {
  transactionId: string;
  transactionNumber: string;
  transactionDate: string | null;
  paymentMethod: PaymentMethod;
  total: number;
  paidAmount: number;
  changeAmount: number;
  items: ReceiptItem[];
  /** true = request ulang dengan transaction_id yang sama; tidak ada transaksi kedua. */
  alreadyProcessed: boolean;
}

/** Kode error yang di-RAISE oleh RPC (message), plus kode khusus aplikasi. */
export type CheckoutErrorCode =
  | "INSUFFICIENT_STOCK"
  | "PRODUCT_NOT_FOUND"
  | "PRODUCT_INACTIVE"
  | "PRICE_CHANGED"
  | "INSUFFICIENT_PAYMENT"
  | "INVALID_PAYMENT_METHOD"
  | "EMPTY_CART"
  | "INVALID_TRANSACTION_ID"
  | "NOT_AUTHENTICATED"
  | "INVALID_ITEM"
  | "TOO_MANY_ITEMS"
  | "INVALID_AMOUNT"
  | "LOCK_TIMEOUT"
  | "NETWORK"
  | "UNKNOWN";

export type CheckoutResult =
  | { ok: true; receipt: CheckoutReceipt }
  | {
      ok: false;
      code: CheckoutErrorCode;
      message: string;
      /**
       * true = hasil di server tidak pasti (mis. koneksi putus). Percobaan ulang
       * harus memakai transaction_id yang SAMA agar tidak tercipta transaksi kedua.
       */
      outcomeUnknown: boolean;
      /** Data katalog perlu dimuat ulang (stok/harga/status berubah). */
      shouldRefresh: boolean;
    };

const KNOWN_CODES = new Set<CheckoutErrorCode>([
  "INSUFFICIENT_STOCK",
  "PRODUCT_NOT_FOUND",
  "PRODUCT_INACTIVE",
  "PRICE_CHANGED",
  "INSUFFICIENT_PAYMENT",
  "INVALID_PAYMENT_METHOD",
  "EMPTY_CART",
  "INVALID_TRANSACTION_ID",
  "NOT_AUTHENTICATED",
  "INVALID_ITEM",
  "TOO_MANY_ITEMS",
  "INVALID_AMOUNT",
]);

const REFRESH_CODES = new Set<CheckoutErrorCode>([
  "INSUFFICIENT_STOCK",
  "PRODUCT_NOT_FOUND",
  "PRODUCT_INACTIVE",
  "PRICE_CHANGED",
]);

type Details = Record<string, unknown>;

function parseDetails(raw: string | null | undefined): Details {
  if (!raw) return {};
  try {
    const value: unknown = JSON.parse(raw);
    return value !== null && typeof value === "object" ? (value as Details) : {};
  } catch {
    return {};
  }
}

const str = (d: Details, key: string) => (typeof d[key] === "string" ? (d[key] as string) : null);
const num = (d: Details, key: string) => (typeof d[key] === "number" ? (d[key] as number) : null);

/** Pesan ramah untuk owner. `details` = kolom detail JSON dari RAISE di RPC. */
export function describeCheckoutError(code: CheckoutErrorCode, rawDetails?: string | null): string {
  const d = parseDetails(rawDetails);
  switch (code) {
    case "INSUFFICIENT_STOCK": {
      const name = str(d, "name") ?? "Salah satu barang";
      const requested = num(d, "requested");
      const available = num(d, "available");
      return requested !== null && available !== null
        ? `Stok ${name} tidak cukup: diminta ${formatNumber(requested)}, tersedia ${formatNumber(available)}. Stok sudah diperbarui — sesuaikan jumlah di keranjang.`
        : `Stok ${name} tidak cukup. Stok sudah diperbarui — sesuaikan jumlah di keranjang.`;
    }
    case "PRODUCT_NOT_FOUND":
      return "Ada barang di keranjang yang sudah tidak ditemukan. Hapus barang tersebut lalu bayar lagi.";
    case "PRODUCT_INACTIVE":
      return `${str(d, "name") ?? "Salah satu barang"} sudah dinonaktifkan dan tidak bisa dijual. Hapus dari keranjang.`;
    case "PRICE_CHANGED": {
      const actual = num(d, "actual_total");
      return actual !== null
        ? `Harga barang berubah. Total terbaru ${formatRupiah(actual)} — periksa keranjang lalu bayar lagi.`
        : "Harga barang berubah. Periksa keranjang lalu bayar lagi.";
    }
    case "INSUFFICIENT_PAYMENT": {
      const total = num(d, "total");
      return total !== null
        ? `Uang tunai kurang. Total ${formatRupiah(total)}.`
        : "Uang tunai kurang dari total belanja.";
    }
    case "INVALID_PAYMENT_METHOD":
      return "Metode pembayaran tidak valid. Pilih Tunai atau QRIS.";
    case "EMPTY_CART":
      return "Keranjang masih kosong.";
    case "INVALID_TRANSACTION_ID":
      return "Kode transaksi tidak valid. Silakan tekan Bayar sekali lagi.";
    case "NOT_AUTHENTICATED":
      return "Sesi login berakhir. Silakan masuk kembali, keranjang tidak diproses.";
    case "INVALID_ITEM":
      return "Ada jumlah barang yang tidak valid di keranjang.";
    case "TOO_MANY_ITEMS":
      return "Terlalu banyak jenis barang dalam satu transaksi (maksimal 200).";
    case "INVALID_AMOUNT":
      return "Nominal pembayaran tidak valid.";
    case "LOCK_TIMEOUT":
      return "Kasir sedang memproses transaksi lain untuk barang yang sama. Coba lagi sebentar.";
    case "NETWORK":
      return "Koneksi ke server terputus. Status transaksi belum pasti — tekan Bayar lagi; transaksi tidak akan tercatat dua kali.";
    case "UNKNOWN":
      return "Checkout gagal karena kesalahan tak terduga. Tidak ada perubahan stok. Coba lagi.";
  }
}

/**
 * Memetakan error PostgREST dari RPC ke hasil checkout.
 *
 * Error yang membawa kode SQLSTATE / PGRST berasal dari database atau PostgREST:
 * transaksi DB pasti sudah rollback, jadi hasilnya pasti GAGAL.
 *
 * Error TANPA kode (code "" / tidak ada) adalah kegagalan transport antara
 * Next.js dan Supabase — supabase-js mengisinya untuk fetch yang gagal, stream
 * respons yang putus, atau respons gateway non-JSON (mis. 502/504). RPC mungkin
 * SUDAH commit, jadi hasilnya TIDAK PASTI: client wajib mengulang dengan
 * transaction_id yang sama agar RPC mengembalikan already_processed.
 */
export function mapRpcError(error: { code?: string; message?: string; details?: string | null }): CheckoutResult {
  if (!error.code) {
    return {
      ok: false,
      code: "NETWORK",
      message: describeCheckoutError("NETWORK"),
      outcomeUnknown: true,
      shouldRefresh: true,
    };
  }

  let code: CheckoutErrorCode = "UNKNOWN";
  if (error.code === "P0001" && error.message && KNOWN_CODES.has(error.message as CheckoutErrorCode)) {
    code = error.message as CheckoutErrorCode;
  } else if (error.code === "55P03") {
    code = "LOCK_TIMEOUT";
  } else if (error.code === "PGRST301" || error.code === "PGRST303") {
    code = "NOT_AUTHENTICATED";
  }
  return {
    ok: false,
    code,
    message: describeCheckoutError(code, error.details),
    // Error dari database = transaksi DB sudah rollback → hasilnya pasti (gagal).
    outcomeUnknown: false,
    shouldRefresh: REFRESH_CODES.has(code),
  };
}

const PAYMENT_METHODS = new Set<PaymentMethod>(["CASH", "QRIS", "DEBIT"]);

/** Parsing defensif JSON hasil RPC (sukses, bukan already_processed). */
export function parseReceipt(value: unknown): CheckoutReceipt | null {
  if (value === null || typeof value !== "object") return null;
  const r = value as Record<string, unknown>;
  const method = r.payment_method;
  if (
    typeof r.transaction_id !== "string" ||
    typeof r.transaction_number !== "string" ||
    typeof r.total !== "number" ||
    typeof r.paid_amount !== "number" ||
    typeof r.change_amount !== "number" ||
    typeof method !== "string" ||
    !PAYMENT_METHODS.has(method as PaymentMethod) ||
    !Array.isArray(r.items)
  ) {
    return null;
  }

  const items: ReceiptItem[] = [];
  for (const raw of r.items) {
    if (raw === null || typeof raw !== "object") return null;
    const i = raw as Record<string, unknown>;
    if (
      typeof i.product_name !== "string" ||
      typeof i.quantity !== "number" ||
      typeof i.unit_price !== "number" ||
      typeof i.subtotal !== "number"
    ) {
      return null;
    }
    items.push({
      productName: i.product_name,
      quantity: i.quantity,
      unitPrice: i.unit_price,
      subtotal: i.subtotal,
    });
  }

  return {
    transactionId: r.transaction_id,
    transactionNumber: r.transaction_number,
    transactionDate: typeof r.transaction_date === "string" ? r.transaction_date : null,
    paymentMethod: method as PaymentMethod,
    total: r.total,
    paidAmount: r.paid_amount,
    changeAmount: r.change_amount,
    items,
    alreadyProcessed: false,
  };
}
