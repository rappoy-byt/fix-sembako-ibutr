import "server-only";

import { getStoreDayRange, getStoreToday } from "@/features/inventory/lib/business-rules";
import { describeDbError, fetchAllRows } from "@/lib/supabase/helpers";
import { createClient } from "@/lib/supabase/server";
import type { PaymentMethod, QueryResult } from "@/types/domain";

import {
  buildInventorySummary,
  buildSalesSummary,
  type InventorySummary,
  type SalesSummary,
} from "./lib/summary";

export interface RecentTransaction {
  id: string;
  transactionNumber: string;
  transactionDate: string;
  total: number;
  paymentMethod: PaymentMethod;
}

export interface DashboardData {
  /** Tanggal bisnis WIB yang dipakai semua metrik. */
  today: string;
  inventory: InventorySummary;
  /** Penjualan hari ini (WIB), hanya transaksi COMPLETED. */
  sales: SalesSummary;
  recentTransactions: RecentTransaction[];
}

const RECENT_LIMIT = 5;

/**
 * Data Dashboard — READ-ONLY dari Supabase dengan sesi owner (RLS berlaku).
 * Tidak memakai CURRENT_DATE database; hari bisnis = WIB dari getStoreToday().
 */
export async function getDashboardData(): Promise<QueryResult<DashboardData>> {
  const supabase = await createClient();
  const today = getStoreToday();
  const { start, end } = getStoreDayRange(today);

  const [productsResult, batchesResult, salesResult, recentResult] = await Promise.all([
    fetchAllRows((from, to) =>
      supabase
        .from("products")
        .select("id, name, sku, unit, minimum_stock, is_active")
        .order("id")
        .range(from, to)
    ),
    // Hanya batch yang masih punya sisa fisik yang memengaruhi stok & kedaluwarsa.
    fetchAllRows((from, to) =>
      supabase
        .from("stock_batches")
        .select("id, product_id, batch_number, expiry_date, remaining_quantity, status")
        .gt("remaining_quantity", 0)
        .order("id")
        .range(from, to)
    ),
    fetchAllRows((from, to) =>
      supabase
        .from("transactions")
        .select("total, payment_method, transaction_items(quantity)")
        .eq("status", "COMPLETED")
        .gte("transaction_date", start)
        .lt("transaction_date", end)
        .order("id")
        .range(from, to)
    ),
    supabase
      .from("transactions")
      .select("id, transaction_number, transaction_date, total, payment_method")
      .eq("status", "COMPLETED")
      .order("transaction_date", { ascending: false })
      .limit(RECENT_LIMIT),
  ]);

  if (productsResult.error) {
    return { data: null, error: describeDbError(productsResult.error, "Gagal memuat barang") };
  }
  if (batchesResult.error) {
    return { data: null, error: describeDbError(batchesResult.error, "Gagal memuat stok batch") };
  }
  if (salesResult.error) {
    return { data: null, error: describeDbError(salesResult.error, "Gagal memuat penjualan hari ini") };
  }
  if (recentResult.error) {
    return { data: null, error: describeDbError(recentResult.error, "Gagal memuat transaksi terakhir") };
  }

  return {
    data: {
      today,
      inventory: buildInventorySummary(productsResult.data, batchesResult.data, today),
      sales: buildSalesSummary(salesResult.data),
      recentTransactions: recentResult.data.map((tx) => ({
        id: tx.id,
        transactionNumber: tx.transaction_number,
        transactionDate: tx.transaction_date,
        total: tx.total,
        paymentMethod: tx.payment_method,
      })),
    },
    error: null,
  };
}
