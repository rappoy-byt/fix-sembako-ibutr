import { CircleAlert, Minus, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatNumber, formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";

import { getLineSubtotal, type CartItem } from "../lib/cart";
import { ProductImage } from "./product-image";

interface CartItemRowProps {
  item: CartItem;
  /** Foto barang dari katalog (null = tampil inisial). */
  imageUrl: string | null;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
  disabled?: boolean;
}

export function CartItemRow({ item, imageUrl, onQuantityChange, onRemove, disabled = false }: CartItemRowProps) {
  const unavailable = item.issue === "unavailable";
  const atMax = item.quantity >= item.maxQuantity;

  return (
    <li className="flex gap-3 py-3">
      <ProductImage
        imageUrl={imageUrl}
        name={item.name}
        className={cn("size-10 rounded-lg", unavailable && "opacity-50 grayscale")}
        initialsClassName="text-xs"
      />

      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className={cn("truncate text-sm", unavailable && "text-muted-foreground line-through")}>
              {item.name}
            </p>
            {!unavailable && (
              <p className="numeric text-xs text-muted-foreground">
                {formatRupiah(item.price)} / {item.unit}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onRemove}
            disabled={disabled}
            aria-label={`Hapus ${item.name} dari keranjang`}
            className="-mt-0.5 -mr-1 text-muted-foreground hover:text-danger"
          >
            <X />
          </Button>
        </div>

        {unavailable ? (
          <p className="flex items-start gap-1.5 text-xs font-medium text-danger">
            <CircleAlert aria-hidden className="mt-px size-3.5 shrink-0" />
            Tidak bisa dijual lagi (stok habis, expired, atau nonaktif). Hapus dari keranjang.
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center overflow-hidden rounded-lg border">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-none"
                  onClick={() => onQuantityChange(item.quantity - 1)}
                  disabled={disabled}
                  aria-label={item.quantity === 1 ? `Hapus ${item.name}` : `Kurangi ${item.name}`}
                >
                  <Minus />
                </Button>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={item.maxQuantity}
                  value={item.quantity}
                  disabled={disabled}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    if (e.target.value !== "" && Number.isFinite(value)) onQuantityChange(value);
                  }}
                  aria-label={`Jumlah ${item.name}`}
                  className="numeric h-7 w-10 border-x bg-transparent text-center text-sm font-semibold outline-none [appearance:textfield] focus-visible:bg-accent/50 disabled:opacity-50 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-none"
                  onClick={() => onQuantityChange(item.quantity + 1)}
                  disabled={disabled || atMax}
                  aria-label={`Tambah ${item.name}`}
                >
                  <Plus />
                </Button>
              </div>
              <p className="numeric text-sm font-semibold">{formatRupiah(getLineSubtotal(item))}</p>
            </div>

            {item.issue === "exceeds_stock" ? (
              <p className="flex items-center gap-1.5 text-[11px] font-medium text-danger">
                <CircleAlert aria-hidden className="size-3.5 shrink-0" />
                Stok tersedia tinggal {formatNumber(item.maxQuantity)} {item.unit}. Kurangi jumlahnya.
              </p>
            ) : (
              atMax && (
                <p className="text-[11px] text-warning">
                  Maksimal {formatNumber(item.maxQuantity)} {item.unit} (stok tersedia)
                </p>
              )
            )}
          </>
        )}
      </div>
    </li>
  );
}
