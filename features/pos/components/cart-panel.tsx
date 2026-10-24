import { ScanBarcode, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatNumber, formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";

import { getCartTotals, type CartItem } from "../lib/cart";
import { CartItemRow } from "./cart-item-row";

export interface CartPanelProps {
  items: CartItem[];
  /** Foto barang per productId, untuk thumbnail baris keranjang. */
  imageUrls: Map<string, string | null>;
  onQuantityChange: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
  onClear: () => void;
  /** Alasan tombol Bayar dikunci sebelum masuk layar pembayaran (null = boleh). */
  blockReason: string | null;
  isSubmitting: boolean;
  /** Buka layar pembayaran. */
  onCheckout: () => void;
  className?: string;
}

/** Detail pesanan + total. Dipakai di sisi kanan desktop dan di sheet mobile. */
export function CartPanel({
  items,
  imageUrls,
  onQuantityChange,
  onRemove,
  onClear,
  blockReason,
  isSubmitting,
  onCheckout,
  className,
}: CartPanelProps) {
  const { itemCount, lineCount, total } = getCartTotals(items);

  return (
    <div className={cn("flex min-h-0 flex-col overflow-hidden rounded-xl border bg-card", className)}>
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4">
        <div>
          <h2 className="font-semibold">Detail pesanan</h2>
          {lineCount > 0 && (
            <p className="numeric text-xs text-muted-foreground">
              {formatNumber(lineCount)} barang · {formatNumber(itemCount)} unit
            </p>
          )}
        </div>
        {lineCount > 0 && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClear}
            disabled={isSubmitting}
            aria-label="Kosongkan pesanan"
            className="text-muted-foreground hover:text-danger"
          >
            <Trash2 />
          </Button>
        )}
      </div>

      {lineCount === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 py-12 text-center">
          <ScanBarcode aria-hidden strokeWidth={1.25} className="size-12 text-muted-foreground/60" />
          <div className="space-y-1">
            <p className="text-sm font-medium">Belum ada pesanan</p>
            <p className="text-xs text-muted-foreground">Ketuk barang di katalog, atau scan barcode.</p>
          </div>
          <dl className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 text-left text-xs text-muted-foreground">
            <dt>
              <Kbd>Enter</Kbd>
            </dt>
            <dd>tambah barang hasil scan / SKU</dd>
            <dt>
              <Kbd>Esc</Kbd>
            </dt>
            <dd>hapus kolom pencarian</dd>
          </dl>
        </div>
      ) : (
        <ul className="min-h-0 flex-1 divide-y overflow-y-auto px-4" aria-label="Isi pesanan">
          {items.map((item) => (
            <CartItemRow
              key={item.productId}
              item={item}
              imageUrl={imageUrls.get(item.productId) ?? null}
              disabled={isSubmitting}
              onQuantityChange={(quantity) => onQuantityChange(item.productId, quantity)}
              onRemove={() => onRemove(item.productId)}
            />
          ))}
        </ul>
      )}

      <div className="shrink-0 space-y-3 border-t p-4">
        <div className="space-y-1.5">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span className="numeric">Subtotal ({formatNumber(itemCount)} unit)</span>
            <span className="numeric">{formatRupiah(total)}</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="font-semibold">Total</span>
            <span className="numeric font-heading text-2xl font-semibold tracking-tight">{formatRupiah(total)}</span>
          </div>
        </div>
        <Button
          size="lg"
          className="h-12 w-full text-base font-semibold"
          disabled={blockReason !== null || isSubmitting}
          onClick={onCheckout}
          aria-describedby={blockReason ? "pos-checkout-note" : undefined}
        >
          Bayar
        </Button>
        {blockReason && (
          <p id="pos-checkout-note" className="text-center text-[11px] text-muted-foreground">
            {blockReason}
          </p>
        )}
      </div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-b-2 bg-card px-1.5 font-mono text-[11px] text-foreground">
      {children}
    </kbd>
  );
}
