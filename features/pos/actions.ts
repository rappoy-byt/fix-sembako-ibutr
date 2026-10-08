"use server";

import { revalidatePath } from "next/cache";

import { getCurrentOwner } from "@/features/auth/queries";
import { isUuid } from "@/features/inventory/lib/validation";
import { createClient } from "@/lib/supabase/server";
import type { PaymentMethod } from "@/types/domain";

import {
  describeCheckoutError,
  mapRpcError,
  parseReceipt,
  type CheckoutReceipt,
  type CheckoutRequest,
  type CheckoutResult,
} from "./lib/checkout";

const PAYMENT_METHODS: readonly PaymentMethod[] = ["CASH", "QRIS", "DEBIT"];
const MAX_LINES = 200;

function fail(code: Extract<CheckoutResult, { ok: false }>["code"]): CheckoutResult {
  return {
    ok: false,
    code,
    message: describeCheckoutError(code),
    outcomeUnknown: false,
    shouldRefresh: false,
  };
}

/** Stok berubah setelah checkout → muat ulang kasir & semua halaman barang. */
function revalidateStock() {
  revalidatePath("/kasir");
  revalidatePath("/barang", "layout");
}

/**
 * Checkout kasir. SEMUA penulisan (transactions, transaction_items,
 * transaction_batch_allocations, stock_batches, stock_movements) terjadi di
 * dalam satu RPC atomik `checkout_transaction` dengan sesi owner (RLS berlaku).
 * Aksi ini tidak pernah menulis ke tabel-tabel tersebut secara langsung.
 */
export async function checkout(request: CheckoutRequest): Promise<CheckoutResult> {
  if (!(await getCurrentOwner())) return fail("NOT_AUTHENTICATED");

  // Validasi bentuk input lebih awal; RPC tetap memvalidasi ulang secara lengkap.
  if (!isUuid(request.transactionId)) return fail("INVALID_TRANSACTION_ID");
  if (!PAYMENT_METHODS.includes(request.paymentMethod)) return fail("INVALID_PAYMENT_METHOD");
  if (!Array.isArray(request.items) || request.items.length === 0) return fail("EMPTY_CART");
  if (request.items.length > MAX_LINES) return fail("TOO_MANY_ITEMS");
  if (
    request.items.some(
      (i) => !isUuid(i.productId) || !Number.isInteger(i.quantity) || i.quantity <= 0
    )
  ) {
    return fail("INVALID_ITEM");
  }
  if (!Number.isFinite(request.expectedTotal) || request.expectedTotal < 0) return fail("INVALID_AMOUNT");
  if (request.paymentMethod === "CASH") {
    if (request.paidAmount === null || !Number.isFinite(request.paidAmount) || request.paidAmount < 0) {
      return fail("INVALID_AMOUNT");
    }
    if (request.paidAmount < request.expectedTotal) return fail("INSUFFICIENT_PAYMENT");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("checkout_transaction", {
    p_transaction_id: request.transactionId,
    p_items: request.items.map((i) => ({ product_id: i.productId, quantity: i.quantity })),
    p_payment_method: request.paymentMethod,
    // QRIS/DEBIT: server memakai total; nilai ini diabaikan oleh RPC.
    p_paid_amount: request.paymentMethod === "CASH" ? request.paidAmount : request.expectedTotal,
    p_expected_total: request.expectedTotal,
  });

  if (error) {
    const result = mapRpcError(error);
    if (result.ok === false && result.code === "UNKNOWN") {
      console.error("[checkout] RPC checkout_transaction gagal:", error);
    }
    if (result.ok === false && result.shouldRefresh) revalidateStock();
    return result;
  }

  const record = data !== null && typeof data === "object" && !Array.isArray(data) ? data : null;

  // Request ulang dengan transaction_id yang sama: transaksi sudah ada, tidak dibuat ulang.
  if (record && record.already_processed === true && typeof record.transaction_id === "string") {
    const receipt = await loadReceipt(record.transaction_id);
    revalidateStock();
    if (!receipt) {
      return {
        ok: false,
        code: "UNKNOWN",
        message: `Transaksi ${String(record.transaction_number ?? "")} sudah tercatat, tetapi rinciannya gagal dimuat. Jangan ulangi pembayaran.`,
        outcomeUnknown: false,
        shouldRefresh: true,
      };
    }
    return { ok: true, receipt };
  }

  const receipt = parseReceipt(record);
  revalidateStock();
  if (!receipt) {
    console.error("[checkout] Format hasil RPC tidak dikenali:", data);
    return {
      ok: false,
      code: "UNKNOWN",
      message:
        "Transaksi kemungkinan sudah tercatat, tetapi hasilnya tidak bisa dibaca. Periksa riwayat sebelum mengulang pembayaran.",
      outcomeUnknown: true,
      shouldRefresh: true,
    };
  }
  return { ok: true, receipt };
}

/** Rincian transaksi yang sudah ada (read-only) untuk respons already_processed. */
async function loadReceipt(transactionId: string): Promise<CheckoutReceipt | null> {
  const supabase = await createClient();
  const [txResult, itemsResult] = await Promise.all([
    supabase
      .from("transactions")
      .select("id, transaction_number, transaction_date, payment_method, total, paid_amount, change_amount")
      .eq("id", transactionId)
      .maybeSingle(),
    supabase
      .from("transaction_items")
      .select("product_name, quantity, unit_price, subtotal")
      .eq("transaction_id", transactionId)
      .order("created_at"),
  ]);

  if (txResult.error || itemsResult.error || !txResult.data) {
    console.error("[checkout] Gagal memuat transaksi:", txResult.error ?? itemsResult.error);
    return null;
  }

  const tx = txResult.data;
  return {
    transactionId: tx.id,
    transactionNumber: tx.transaction_number,
    transactionDate: tx.transaction_date,
    paymentMethod: tx.payment_method,
    total: tx.total,
    paidAmount: tx.paid_amount,
    changeAmount: tx.change_amount,
    items: itemsResult.data.map((i) => ({
      productName: i.product_name,
      quantity: i.quantity,
      unitPrice: i.unit_price,
      subtotal: i.subtotal,
    })),
    alreadyProcessed: true,
  };
}
