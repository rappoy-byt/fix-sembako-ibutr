/**
 * Agregasi Dashboard (murni, tanpa I/O) dari data Supabase asli.
 * Semua aturan stok/kedaluwarsa memakai business-rules yang sama dengan
 * /barang dan /kasir, dengan tanggal bisnis WIB.
 */
import {
  getExpiryStatus,
  isBatchExpiredWithStock,
  isBatchSellable,
  summarizeProductStock,
  type StockLevelStatus,
} from "@/features/inventory/lib/business-rules";
import type { PaymentMethod, Product, StockBatch } from "@/types/domain";

export type DashboardProduct = Pick<Product, "id" | "name" | "sku" | "unit" | "minimum_stock" | "is_active">;
export type DashboardBatch = Pick<
  StockBatch,
  "id" | "product_id" | "batch_number" | "expiry_date" | "remaining_quantity" | "status"
>;

export interface ExpiryRow {
  batchId: string;
  productId: string;
  productName: string;
  unit: string;
  batchNumber: string;
  expiryDate: string;
  remainingQuantity: number;
}

export interface LowStockRow {
  productId: string;
  productName: string;
  unit: string;
  availableStock: number;
  minimumStock: number;
  level: Exclude<StockLevelStatus, "in_stock">;
}

export interface InventorySummary {
  activeProducts: number;
  inactiveProducts: number;
  /** Unit layak jual dari barang aktif (tanpa batch expired). */
  availableStockUnits: number;
  lowStockCount: number;
  outOfStockCount: number;
  /** Barang aktif yang punya batch layak jual dengan kedaluwarsa ≤ 30 hari. */
  nearExpiryProductCount: number;
  /** Barang (aktif maupun nonaktif) yang masih menyimpan stok expired. */
  expiredProductCount: number;
  expiredStockUnits: number;
  nearExpiryBatches: ExpiryRow[];
  expiredBatches: ExpiryRow[];
  lowStockProducts: LowStockRow[];
}

export function buildInventorySummary(
  products: DashboardProduct[],
  batches: DashboardBatch[],
  today: string
): InventorySummary {
  const productsById = new Map(products.map((p) => [p.id, p]));
  const batchesByProduct = new Map<string, DashboardBatch[]>();
  for (const batch of batches) {
    const list = batchesByProduct.get(batch.product_id);
    if (list) list.push(batch);
    else batchesByProduct.set(batch.product_id, [batch]);
  }

  let activeProducts = 0;
  let availableStockUnits = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;
  const lowStockProducts: LowStockRow[] = [];

  for (const product of products) {
    if (!product.is_active) continue;
    activeProducts += 1;
    const stock = summarizeProductStock(batchesByProduct.get(product.id) ?? [], product.minimum_stock, today);
    availableStockUnits += stock.availableStock;
    if (stock.stockLevel === "in_stock") continue;
    if (stock.stockLevel === "low_stock") lowStockCount += 1;
    else outOfStockCount += 1;
    lowStockProducts.push({
      productId: product.id,
      productName: product.name,
      unit: product.unit,
      availableStock: stock.availableStock,
      minimumStock: product.minimum_stock,
      level: stock.stockLevel,
    });
  }

  const nearExpiryBatches: ExpiryRow[] = [];
  const expiredBatches: ExpiryRow[] = [];
  let expiredStockUnits = 0;

  for (const batch of batches) {
    const product = productsById.get(batch.product_id);
    if (!product || !batch.expiry_date) continue;
    const row: ExpiryRow = {
      batchId: batch.id,
      productId: product.id,
      productName: product.name,
      unit: product.unit,
      batchNumber: batch.batch_number,
      expiryDate: batch.expiry_date,
      remainingQuantity: batch.remaining_quantity,
    };
    if (isBatchExpiredWithStock(batch, today)) {
      // Stok expired harus dipisahkan dari rak, termasuk milik barang nonaktif.
      expiredBatches.push(row);
      expiredStockUnits += batch.remaining_quantity;
    } else if (
      product.is_active &&
      isBatchSellable(batch, today) &&
      getExpiryStatus(batch.expiry_date, today) === "near_expiry"
    ) {
      nearExpiryBatches.push(row);
    }
  }

  const byExpiry = (a: ExpiryRow, b: ExpiryRow) =>
    a.expiryDate.localeCompare(b.expiryDate) || a.productName.localeCompare(b.productName, "id");
  nearExpiryBatches.sort(byExpiry);
  expiredBatches.sort(byExpiry);
  // Habis lebih dulu, lalu yang paling jauh di bawah minimum.
  lowStockProducts.sort(
    (a, b) =>
      Number(b.level === "out_of_stock") - Number(a.level === "out_of_stock") ||
      a.availableStock - a.minimumStock - (b.availableStock - b.minimumStock) ||
      a.productName.localeCompare(b.productName, "id")
  );

  return {
    activeProducts,
    inactiveProducts: products.length - activeProducts,
    availableStockUnits,
    lowStockCount,
    outOfStockCount,
    nearExpiryProductCount: new Set(nearExpiryBatches.map((r) => r.productId)).size,
    expiredProductCount: new Set(expiredBatches.map((r) => r.productId)).size,
    expiredStockUnits,
    nearExpiryBatches,
    expiredBatches,
    lowStockProducts,
  };
}

export interface SalesTransactionRow {
  total: number;
  payment_method: PaymentMethod;
  transaction_items: { quantity: number }[];
}

export interface SalesSummary {
  transactionCount: number;
  revenue: number;
  unitsSold: number;
  averageTicket: number;
  byMethod: Record<PaymentMethod, { count: number; total: number }>;
}

const roundMoney = (value: number) => Math.round(value * 100) / 100;

/** Ringkasan penjualan dari transaksi COMPLETED pada satu hari bisnis WIB. */
export function buildSalesSummary(transactions: SalesTransactionRow[]): SalesSummary {
  const byMethod: SalesSummary["byMethod"] = {
    CASH: { count: 0, total: 0 },
    QRIS: { count: 0, total: 0 },
    DEBIT: { count: 0, total: 0 },
  };
  let revenue = 0;
  let unitsSold = 0;

  for (const tx of transactions) {
    revenue += tx.total;
    byMethod[tx.payment_method].count += 1;
    byMethod[tx.payment_method].total += tx.total;
    for (const item of tx.transaction_items) unitsSold += item.quantity;
  }

  for (const method of Object.keys(byMethod) as PaymentMethod[]) {
    byMethod[method].total = roundMoney(byMethod[method].total);
  }

  return {
    transactionCount: transactions.length,
    revenue: roundMoney(revenue),
    unitsSold,
    averageTicket: transactions.length > 0 ? roundMoney(revenue / transactions.length) : 0,
    byMethod,
  };
}
