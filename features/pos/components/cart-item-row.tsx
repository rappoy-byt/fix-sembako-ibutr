import { CircleAlert, Minus, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatNumber, formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";

import { getLineSubtotal, type CartItem } from "../lib/cart";

interface CartItemRowProps {
  item: CartItem;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
  disabled?: boolean;
}

export function CartItemRow({ item, onQuantityChange, onRemove, disabled = false }: CartItemRowProps) {
  const unavailable = item.issue === "unavailable";
  const atMax = item.quantity >= item.maxQuantity;

  return (
    <li className={cn("space-y-2 py-3", unavailable && "opacity-80")}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={cn("truncate text-sm font-medium", unavailable && "line-through")}>{item.name}</p>
          {!unavailable && (
            <p className="numeric text-xs text-muted-foreground">
              {formatRupiah(item.price)} / {item.unit}
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onRemove}
          disabled={disabled}
          aria-label={`Hapus ${item.name} dari keranjang`}
          className="text-muted-foreground hover:text-danger"
        >
          <Trash2 />
        </Button>
      </div>

      {unavailable ? (
        <p className="flex items-center gap-1.5 text-xs font-medium text-danger">
          <CircleAlert aria-hidden className="size-3.5 shrink-0" />
          Tidak bisa dijual lagi (stok habis, expired, atau nonaktif). Hapus dari keranjang.
        </p>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center rounded-lg border bg-background">
              <Button
                variant="ghost"
                size="icon-sm"
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
                className="numeric h-7 w-12 border-x bg-transparent text-center text-sm font-medium outline-none [appearance:textfield] focus-visible:bg-accent/50 disabled:opacity-50 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <Button
                variant="ghost"
                size="icon-sm"
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
    </li>
  );
}
