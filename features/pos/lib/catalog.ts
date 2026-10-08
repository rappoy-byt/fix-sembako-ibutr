/**
 * Katalog kasir: bentuk data produk untuk layar POS + status bisa-dijual.
 * Murni (tanpa I/O). Stok berasal dari ringkasan stok inventaris (tanggal WIB).
 *
 * Phase 3.1: hanya tampilan. Validasi stok final & alokasi FEFO dilakukan saat
 * checkout atomik di fase berikutnya — angka stok di sini bersifat informasi.
 */
import type { InventoryProduct } from "@/features/inventory/queries";
import type { StockLevelStatus } from "@/features/inventory/lib/business-rules";

/** Alasan sebuah produk bisa / tidak bisa ditambahkan ke keranjang. */
export type PosSellability = "sellable" | "out_of_stock" | "expired" | "inactive";

export interface PosProduct {
  id: string;
  name: string;
  sku: string;
  unit: string;
  price: number;
  imageUrl: string | null;
  categoryId: string;
  categoryName: string | null;
  minimumStock: number;
  availableStock: number;
  expiredStock: number;
  nearestExpiry: string | null;
  stockLevel: StockLevelStatus;
  sellability: PosSellability;
}

export interface PosCategory {
  id: string;
  name: string;
}

export function getPosSellability(product: InventoryProduct): PosSellability {
  if (!product.is_active) return "inactive";
  if (product.stock.availableStock > 0) return "sellable";
  // Tidak ada stok layak jual, tetapi masih ada sisa fisik yang expired.
  if (product.stock.expiredStock > 0) return "expired";
  return "out_of_stock";
}

export function toPosProduct(product: InventoryProduct): PosProduct {
  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    unit: product.unit,
    price: product.selling_price,
    imageUrl: product.image_url,
    categoryId: product.category_id,
    categoryName: product.category?.name ?? null,
    minimumStock: product.minimum_stock,
    availableStock: product.stock.availableStock,
    expiredStock: product.stock.expiredStock,
    nearestExpiry: product.stock.nearestSellableExpiry,
    stockLevel: product.stock.stockLevel,
    sellability: getPosSellability(product),
  };
}

const SELLABILITY_ORDER: Record<PosSellability, number> = {
  sellable: 0,
  expired: 1,
  out_of_stock: 2,
  inactive: 3,
};

/** Produk yang bisa dijual tampil lebih dulu, lalu urut nama. */
export function sortPosProducts(products: PosProduct[]) {
  return [...products].sort(
    (a, b) =>
      SELLABILITY_ORDER[a.sellability] - SELLABILITY_ORDER[b.sellability] ||
      a.name.localeCompare(b.name, "id")
  );
}

/** Cocokkan nama atau SKU (tanpa beda huruf besar/kecil). */
export function matchesQuery(product: PosProduct, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return product.name.toLowerCase().includes(q) || product.sku.toLowerCase().includes(q);
}
