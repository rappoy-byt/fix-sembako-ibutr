/**
 * State keranjang kasir (hanya di browser).
 *
 * Keranjang hanya menyimpan productId + jumlah. Nama, harga, dan stok selalu
 * diturunkan dari data katalog TERBARU dari server, sehingga setelah stok/harga
 * di-refresh, keranjang otomatis memakai nilai baru. Validasi final tetap di
 * RPC checkout_transaction (harga DB, stok FEFO, atomik).
 */
import type { PaymentMethod } from "@/types/domain";

import type { PosProduct } from "./catalog";

export interface CartLine {
  productId: string;
  quantity: number;
  /** Nama terakhir yang diketahui, untuk ditampilkan bila produk hilang dari katalog. */
  name: string;
}

export type CartAction =
  | { type: "add"; product: PosProduct }
  | { type: "setQuantity"; productId: string; quantity: number; maxQuantity: number }
  | { type: "remove"; productId: string }
  | { type: "clear" };

export function cartReducer(lines: CartLine[], action: CartAction): CartLine[] {
  switch (action.type) {
    case "add": {
      const { product } = action;
      if (product.sellability !== "sellable") return lines;
      const existing = lines.find((l) => l.productId === product.id);
      if (existing) {
        return lines.map((l) =>
          l.productId === product.id
            ? { ...l, quantity: Math.min(l.quantity + 1, product.availableStock) }
            : l
        );
      }
      return [...lines, { productId: product.id, quantity: 1, name: product.name }];
    }
    case "setQuantity":
      return lines.flatMap((l) => {
        if (l.productId !== action.productId) return [l];
        const quantity = Math.min(Math.max(Math.floor(action.quantity), 0), action.maxQuantity);
        return quantity === 0 ? [] : [{ ...l, quantity }];
      });
    case "remove":
      return lines.filter((l) => l.productId !== action.productId);
    case "clear":
      return [];
  }
}

/** Masalah baris keranjang terhadap data stok terbaru. */
export type CartIssue = "unavailable" | "exceeds_stock" | null;

export interface CartItem {
  productId: string;
  name: string;
  sku: string;
  unit: string;
  price: number;
  quantity: number;
  /** Stok tersedia terbaru — batas atas jumlah. */
  maxQuantity: number;
  issue: CartIssue;
}

/** Gabungkan baris keranjang dengan data katalog terbaru. */
export function resolveCart(lines: CartLine[], productsById: Map<string, PosProduct>): CartItem[] {
  return lines.map((line) => {
    const product = productsById.get(line.productId);
    if (!product || product.sellability !== "sellable") {
      return {
        productId: line.productId,
        name: product?.name ?? line.name,
        sku: product?.sku ?? "",
        unit: product?.unit ?? "",
        price: product?.price ?? 0,
        quantity: line.quantity,
        maxQuantity: 0,
        issue: "unavailable",
      };
    }
    return {
      productId: product.id,
      name: product.name,
      sku: product.sku,
      unit: product.unit,
      price: product.price,
      quantity: line.quantity,
      maxQuantity: product.availableStock,
      issue: line.quantity > product.availableStock ? "exceeds_stock" : null,
    };
  });
}

export function getLineSubtotal(item: Pick<CartItem, "price" | "quantity">) {
  return item.price * item.quantity;
}

/** Pembulatan 2 desimal — sama dengan pembanding round(…, 2) di RPC. */
export function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function getCartTotals(items: CartItem[]) {
  return {
    itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
    lineCount: items.length,
    total: roundMoney(items.reduce((sum, i) => sum + getLineSubtotal(i), 0)),
    hasIssues: items.some((i) => i.issue !== null),
  };
}

/** Kembalian tunai. Negatif = uang kurang. Hanya perhitungan tampilan sebelum bayar. */
export function getChange(total: number, paid: number) {
  return paid - total;
}

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "CASH", label: "Tunai" },
  { value: "QRIS", label: "QRIS" },
  { value: "DEBIT", label: "Debit / EDC" },
];
