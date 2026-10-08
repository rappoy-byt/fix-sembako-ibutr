import "server-only";

import { describeDbError, fetchAllRows } from "@/lib/supabase/helpers";
import { createClient } from "@/lib/supabase/server";
import type { Category, Product, QueryResult, StockBatch } from "@/types/domain";

import {
  getStoreToday,
  sortBatchesFefo,
  summarizeProductStock,
  type ProductStockSnapshot,
} from "./lib/business-rules";

export type CategoryRef = Pick<Category, "id" | "name" | "default_expiry_days" | "is_active">;

export interface InventoryProduct extends Product {
  category: CategoryRef | null;
  stock: ProductStockSnapshot;
}

export interface InventoryOverview {
  today: string;
  categories: Category[];
  products: InventoryProduct[];
}

const CATEGORY_REF = "id, name, default_expiry_days, is_active";

/** Semua kategori (urut nama) — untuk filter dan form produk. */
export async function getCategories(): Promise<QueryResult<Category[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("categories").select("*").order("name");
  if (error) return { data: null, error: describeDbError(error, "Gagal memuat kategori") };
  return { data, error: null };
}

/**
 * Daftar barang + kategori + ringkasan stok (dihitung dari stock_batches
 * dengan tanggal bisnis WIB). Urutan default: produk terbaru lebih dulu.
 */
export async function getInventoryOverview(): Promise<QueryResult<InventoryOverview>> {
  const supabase = await createClient();
  const today = getStoreToday();

  const [categoriesResult, productsResult, batchesResult] = await Promise.all([
    getCategories(),
    fetchAllRows((from, to) =>
      supabase
        .from("products")
        .select(`*, category:categories(${CATEGORY_REF})`)
        .order("created_at", { ascending: false })
        .order("id")
        .range(from, to)
    ),
    // Hanya batch yang masih punya sisa fisik yang memengaruhi stok.
    fetchAllRows((from, to) =>
      supabase
        .from("stock_batches")
        .select("product_id, remaining_quantity, expiry_date, status")
        .gt("remaining_quantity", 0)
        .order("id")
        .range(from, to)
    ),
  ]);

  if (categoriesResult.error !== null) return categoriesResult;
  if (productsResult.error) {
    return { data: null, error: describeDbError(productsResult.error, "Gagal memuat barang") };
  }
  if (batchesResult.error) {
    return { data: null, error: describeDbError(batchesResult.error, "Gagal memuat stok batch") };
  }

  const batchesByProduct = new Map<string, typeof batchesResult.data>();
  for (const batch of batchesResult.data) {
    const list = batchesByProduct.get(batch.product_id);
    if (list) list.push(batch);
    else batchesByProduct.set(batch.product_id, [batch]);
  }

  const products: InventoryProduct[] = productsResult.data.map((product) => ({
    ...product,
    stock: summarizeProductStock(
      batchesByProduct.get(product.id) ?? [],
      product.minimum_stock,
      today
    ),
  }));

  return { data: { today, categories: categoriesResult.data, products }, error: null };
}

export interface ProductDetail {
  today: string;
  product: Product & { category: CategoryRef | null };
  /** Semua batch produk, urut FEFO (kedaluwarsa terdekat lebih dulu). */
  batches: StockBatch[];
  stock: ProductStockSnapshot;
}

/** Detail satu barang beserta seluruh batch-nya. `data: null` tanpa error = tidak ditemukan. */
export async function getProductDetail(
  productId: string
): Promise<{ data: ProductDetail | null; error: null } | { data: null; error: string }> {
  const supabase = await createClient();
  const today = getStoreToday();

  const [productResult, batchesResult] = await Promise.all([
    supabase
      .from("products")
      .select(`*, category:categories(${CATEGORY_REF})`)
      .eq("id", productId)
      .maybeSingle(),
    fetchAllRows((from, to) =>
      supabase
        .from("stock_batches")
        .select("*")
        .eq("product_id", productId)
        .order("id")
        .range(from, to)
    ),
  ]);

  if (productResult.error) {
    return { data: null, error: describeDbError(productResult.error, "Gagal memuat barang") };
  }
  if (!productResult.data) return { data: null, error: null };
  if (batchesResult.error) {
    return { data: null, error: describeDbError(batchesResult.error, "Gagal memuat stok batch") };
  }

  const product = productResult.data;
  return {
    data: {
      today,
      product,
      batches: sortBatchesFefo(batchesResult.data),
      stock: summarizeProductStock(batchesResult.data, product.minimum_stock, today),
    },
    error: null,
  };
}
