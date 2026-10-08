import { Plus } from "lucide-react";

import { StatusBadge } from "@/components/shared/status-badge";
import { ProductThumb } from "@/features/inventory/components/product-thumb";
import { ExpiryBadge, StockLevelBadge } from "@/features/inventory/components/stock-badges";
import { formatNumber, formatRupiah } from "@/lib/format";
import { EXPIRY_STATUS, PRODUCT_ACTIVE_STATUS, STOCK_LEVEL_STATUS } from "@/lib/status";
import { cn } from "@/lib/utils";

import type { PosProduct } from "../lib/catalog";

interface ProductCardProps {
  product: PosProduct;
  /** Jumlah produk ini yang sudah ada di keranjang. */
  inCart: number;
  today: string;
  onAdd: (product: PosProduct) => void;
}

const BLOCKED_REASON = {
  out_of_stock: { meta: STOCK_LEVEL_STATUS.out_of_stock, label: "Stok habis" },
  expired: { meta: EXPIRY_STATUS.expired, label: "Stok expired" },
  inactive: { meta: PRODUCT_ACTIVE_STATUS.inactive, label: "Nonaktif" },
} as const;

/**
 * Kartu produk kasir. Produk yang tidak bisa dijual (habis, hanya stok expired,
 * atau nonaktif) tampil redup dan tombolnya nonaktif.
 */
export function ProductCard({ product, inCart, today, onAdd }: ProductCardProps) {
  const blocked = product.sellability === "sellable" ? null : BLOCKED_REASON[product.sellability];
  const sellable = blocked === null;
  const atLimit = sellable && inCart >= product.availableStock;
  const disabled = !sellable || atLimit;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onAdd(product)}
      aria-label={
        sellable
          ? `Tambah ${product.name} ke keranjang, ${formatRupiah(product.price)}`
          : `${product.name} tidak bisa dijual: ${blocked.label}`
      }
      className={cn(
        "group relative flex flex-col gap-3 rounded-xl border bg-card p-3 text-left transition-colors",
        "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        sellable && !atLimit && "hover:border-primary/50 hover:bg-accent/40",
        inCart > 0 && "border-primary/50",
        !sellable && "cursor-not-allowed bg-muted/40",
        atLimit && "cursor-not-allowed"
      )}
    >
      {inCart > 0 && (
        <span className="numeric absolute top-2 right-2 rounded-full bg-primary px-1.5 py-0.5 text-[11px] font-semibold text-primary-foreground">
          {formatNumber(inCart)}×
        </span>
      )}

      <div className="flex items-start gap-3">
        <ProductThumb
          imageUrl={product.imageUrl}
          name={product.name}
          className={cn(!sellable && "opacity-50 grayscale")}
        />
        <div className="min-w-0 flex-1 pr-6">
          <p className={cn("line-clamp-2 text-sm leading-snug font-medium", !sellable && "text-muted-foreground")}>
            {product.name}
          </p>
          <p className="font-mono text-[11px] text-muted-foreground">{product.sku}</p>
        </div>
      </div>

      <div className="mt-auto space-y-2">
        <div className="flex items-end justify-between gap-2">
          <p className={cn("numeric text-base font-semibold", !sellable && "text-muted-foreground")}>
            {formatRupiah(product.price)}
            <span className="text-xs font-normal text-muted-foreground"> /{product.unit}</span>
          </p>
          {sellable && (
            <span
              aria-hidden
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-lg transition-colors",
                atLimit
                  ? "bg-muted text-muted-foreground"
                  : "bg-accent text-accent-foreground group-hover:bg-primary group-hover:text-primary-foreground"
              )}
            >
              <Plus className="size-4" />
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-1">
          {blocked === null ? (
            <>
              <StockLevelBadge
                availableStock={product.availableStock}
                minimumStock={product.minimumStock}
                unit={product.unit}
                showQuantity
              />
              <ExpiryBadge expiryDate={product.nearestExpiry} today={today} hideWhenFresh />
            </>
          ) : (
            <StatusBadge meta={blocked.meta} label={blocked.label} />
          )}
        </div>

        {atLimit && (
          <p className="text-[11px] font-medium text-warning">Semua stok tersedia sudah di keranjang</p>
        )}
        {sellable && product.expiredStock > 0 && (
          <p className="text-[11px] text-muted-foreground">
            {formatNumber(product.expiredStock)} {product.unit} expired tidak ikut dijual
          </p>
        )}
      </div>
    </button>
  );
}
