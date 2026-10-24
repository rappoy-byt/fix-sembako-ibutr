import { getDaysUntilExpiry, getExpiryStatus } from "@/features/inventory/lib/business-rules";
import { formatNumber, formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";

import type { PosProduct } from "../lib/catalog";
import { ProductImage } from "./product-image";

interface ProductCardProps {
  product: PosProduct;
  /** Jumlah produk ini yang sudah ada di keranjang. */
  inCart: number;
  today: string;
  onAdd: (product: PosProduct) => void;
}

const BLOCKED_LABEL = {
  out_of_stock: "Stok habis",
  expired: "Stok expired",
  inactive: "Nonaktif",
} as const;

/**
 * Kartu produk kasir: foto (atau inisial), nama, harga, dan satu baris status stok.
 * Produk yang tidak bisa dijual (habis, hanya stok expired, atau nonaktif) tampil redup.
 */
export function ProductCard({ product, inCart, today, onAdd }: ProductCardProps) {
  const blocked = product.sellability === "sellable" ? null : BLOCKED_LABEL[product.sellability];
  const sellable = blocked === null;
  const atLimit = sellable && inCart >= product.availableStock;
  const disabled = !sellable || atLimit;
  const status = sellable ? describeStock(product, today, atLimit) : { text: blocked, tone: "danger" as const };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onAdd(product)}
      aria-label={
        sellable
          ? `Tambah ${product.name} ke keranjang, ${formatRupiah(product.price)}`
          : `${product.name} tidak bisa dijual: ${blocked}`
      }
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border bg-card text-left transition-[border-color,box-shadow]",
        "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        sellable && !atLimit && "hover:border-primary/40 hover:shadow-sm active:scale-[0.99]",
        inCart > 0 && "border-primary ring-1 ring-primary",
        disabled && "cursor-not-allowed",
        !sellable && "opacity-55"
      )}
    >
      {inCart > 0 && (
        <span className="numeric absolute top-2 left-2 z-10 min-w-6 rounded-md bg-primary px-1.5 py-0.5 text-center text-xs font-semibold text-primary-foreground">
          {formatNumber(inCart)}
        </span>
      )}

      <ProductImage
        imageUrl={product.imageUrl}
        name={product.name}
        className={cn("aspect-[16/9] w-full", !sellable && "grayscale")}
        initialsClassName="text-xl"
      />

      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="line-clamp-2 text-sm leading-snug">{product.name}</p>
        <p className="numeric mt-auto pt-1 font-semibold">{formatRupiah(product.price)}</p>
        <p
          className={cn(
            "numeric truncate text-xs",
            status.tone === "danger" && "font-medium text-danger",
            status.tone === "warning" && "text-warning",
            status.tone === "muted" && "text-muted-foreground"
          )}
        >
          {status.text}
        </p>
      </div>
    </button>
  );
}

type StockTone = "muted" | "warning" | "danger";

/** Satu baris status: batas keranjang > hampir expired > stok menipis > stok normal. */
function describeStock(product: PosProduct, today: string, atLimit: boolean): { text: string; tone: StockTone } {
  if (atLimit) return { text: "Semua stok sudah di keranjang", tone: "warning" };
  if (product.nearestExpiry && getExpiryStatus(product.nearestExpiry, today) === "near_expiry") {
    const days = getDaysUntilExpiry(product.nearestExpiry, today);
    return { text: days === 0 ? "Exp hari ini" : `Exp ${formatNumber(days)} hari lagi`, tone: "warning" };
  }
  const stock = `${formatNumber(product.availableStock)} ${product.unit}`;
  if (product.stockLevel === "low_stock") return { text: `Sisa ${stock}`, tone: "warning" };
  return { text: `Stok ${stock}`, tone: "muted" };
}
