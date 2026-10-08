import "server-only";

import { describeDbError, fetchAllRows } from "@/lib/supabase/helpers";
import { createClient } from "@/lib/supabase/server";
import type { QueryResult, StockMovementType } from "@/types/domain";

import {
  getMovementTypeForQuery,
  getPageCount,
  MOVEMENTS_PAGE_SIZE,
  sumMovementTotals,
  toCreatedAtRange,
  type MovementFilters,
  type MovementTotals,
} from "./lib/movements";

export interface MovementRow {
  id: string;
  movementType: StockMovementType;
  /** Nilai aktual: IN positif, SALE negatif. */
  quantity: number;
  note: string | null;
  createdAt: string;
  product: { id: string; name: string; sku: string; unit: string } | null;
  batch: { id: string; batchNumber: string; expiryDate: string | null } | null;
  /** Nomor transaksi dari reference_id (SALE). null bila tidak ada/ tidak ditemukan. */
  transactionNumber: string | null;
  referenceId: string | null;
}

export interface MovementPage {
  rows: MovementRow[];
  total: number;
  page: number;
  pageCount: number;
  /** true = halaman diminta melewati jumlah halaman yang ada. */
  pageOutOfRange: boolean;
}

// Satu string literal agar supabase-js bisa menurunkan tipe baris.
const MOVEMENT_SELECT =
  "id, product_id, batch_id, movement_type, quantity, reference_id, note, created_at, product:products(id, name, sku, unit), batch:stock_batches(id, batch_number, expiry_date)";

/**
 * Riwayat pergerakan stok (READ-ONLY), 25 baris per halaman, terbaru dulu.
 * Semua filter dijalankan di server (PostgREST); riwayat tidak pernah diambil
 * seluruhnya ke klien.
 */
export async function getStockMovements(filters: MovementFilters): Promise<QueryResult<MovementPage>> {
  const supabase = await createClient();
  const { start, end } = toCreatedAtRange(filters);
  const type = getMovementTypeForQuery(filters.type);
  const from = (filters.page - 1) * MOVEMENTS_PAGE_SIZE;

  let query = supabase
    .from("stock_movements")
    .select(MOVEMENT_SELECT, { count: "exact" })
    .gte("created_at", start)
    .lt("created_at", end);
  if (filters.productId) query = query.eq("product_id", filters.productId);
  if (type) query = query.eq("movement_type", type);

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, from + MOVEMENTS_PAGE_SIZE - 1);

  if (error) {
    // Halaman di luar jangkauan (mis. URL lama setelah filter berubah).
    if (error.code === "PGRST103") {
      const total = await countMovements(filters);
      if (total.error !== null) return total;
      return {
        data: {
          rows: [],
          total: total.data,
          page: filters.page,
          pageCount: getPageCount(total.data),
          pageOutOfRange: true,
        },
        error: null,
      };
    }
    return { data: null, error: describeDbError(error, "Gagal memuat riwayat stok") };
  }

  // reference_id tidak punya FK → cari nomor transaksi untuk halaman ini saja.
  const referenceIds = [...new Set(data.map((r) => r.reference_id).filter((id): id is string => id !== null))];
  const transactionNumbers = new Map<string, string>();
  if (referenceIds.length > 0) {
    const { data: transactions, error: txError } = await supabase
      .from("transactions")
      .select("id, transaction_number")
      .in("id", referenceIds);
    if (txError) return { data: null, error: describeDbError(txError, "Gagal memuat referensi transaksi") };
    for (const tx of transactions) transactionNumbers.set(tx.id, tx.transaction_number);
  }

  const total = count ?? 0;
  return {
    data: {
      rows: data.map((r) => ({
        id: r.id,
        movementType: r.movement_type,
        quantity: r.quantity,
        note: r.note,
        createdAt: r.created_at,
        product: r.product,
        batch: r.batch
          ? { id: r.batch.id, batchNumber: r.batch.batch_number, expiryDate: r.batch.expiry_date }
          : null,
        referenceId: r.reference_id,
        transactionNumber: r.reference_id ? (transactionNumbers.get(r.reference_id) ?? null) : null,
      })),
      total,
      page: filters.page,
      pageCount: getPageCount(total),
      pageOutOfRange: false,
    },
    error: null,
  };
}

async function countMovements(filters: MovementFilters): Promise<QueryResult<number>> {
  const supabase = await createClient();
  const { start, end } = toCreatedAtRange(filters);
  const type = getMovementTypeForQuery(filters.type);
  let query = supabase
    .from("stock_movements")
    .select("id", { count: "exact", head: true })
    .gte("created_at", start)
    .lt("created_at", end);
  if (filters.productId) query = query.eq("product_id", filters.productId);
  if (type) query = query.eq("movement_type", type);
  const { count, error } = await query;
  if (error) return { data: null, error: describeDbError(error, "Gagal menghitung riwayat stok") };
  return { data: count ?? 0, error: null };
}

/**
 * Total masuk/keluar untuk filter yang sama (READ-ONLY). Hanya mengambil
 * movement_type & quantity, per halaman 1000 baris (fetchAllRows) agar tidak
 * terpotong diam-diam oleh batas PostgREST.
 */
export async function getMovementTotals(filters: MovementFilters): Promise<QueryResult<MovementTotals>> {
  const supabase = await createClient();
  const { start, end } = toCreatedAtRange(filters);
  const type = getMovementTypeForQuery(filters.type);

  const result = await fetchAllRows((rangeFrom, rangeTo) => {
    let query = supabase
      .from("stock_movements")
      .select("movement_type, quantity")
      .gte("created_at", start)
      .lt("created_at", end);
    if (filters.productId) query = query.eq("product_id", filters.productId);
    if (type) query = query.eq("movement_type", type);
    return query.order("id").range(rangeFrom, rangeTo);
  });

  if (result.error) return { data: null, error: describeDbError(result.error, "Gagal menghitung total stok") };
  return { data: sumMovementTotals(result.data), error: null };
}
