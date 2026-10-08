import { ShoppingBasket, Trash } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatNumber, formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PaymentMethod } from "@/types/domain";

import { getCartTotals, type CartItem } from "../lib/cart";
import { CartItemRow } from "./cart-item-row";
import { PaymentSection } from "./payment-section";

export interface CartPanelProps {
  items: CartItem[];
  onQuantityChange: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
  onClear: () => void;
  method: PaymentMethod;
  onMethodChange: (method: PaymentMethod) => void;
  paidAmount: string;
  onPaidAmountChange: (value: string) => void;
  blockReason: string | null;
  isSubmitting: boolean;
  onPay: () => void;
  className?: string;
}

/** Keranjang + ringkasan + pembayaran. Dipakai di sisi kanan desktop dan di sheet mobile. */
export function CartPanel({
  items,
  onQuantityChange,
  onRemove,
  onClear,
  method,
  onMethodChange,
  paidAmount,
  onPaidAmountChange,
  blockReason,
  isSubmitting,
  onPay,
  className,
}: CartPanelProps) {
  const { itemCount, lineCount, total } = getCartTotals(items);

  return (
    <div className={cn("flex min-h-0 flex-col overflow-hidden rounded-xl border bg-card", className)}>
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <div>
          <h2 className="font-semibold">Keranjang</h2>
          <p className="numeric text-xs text-muted-foreground">
            {lineCount === 0
              ? "Belum ada barang"
              : `${formatNumber(lineCount)} barang · ${formatNumber(itemCount)} unit`}
          </p>
        </div>
        {lineCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            disabled={isSubmitting}
            className="text-muted-foreground hover:text-danger"
          >
            <Trash />
            Kosongkan
          </Button>
        )}
      </div>

      {lineCount === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-10 text-center">
          <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <ShoppingBasket aria-hidden className="size-5" />
          </span>
          <p className="text-sm font-medium">Keranjang masih kosong</p>
          <p className="max-w-60 text-xs text-muted-foreground">
            Pilih barang di katalog, atau scan / ketik SKU lalu tekan Enter.
          </p>
        </div>
      ) : (
        <ul className="min-h-0 flex-1 divide-y overflow-y-auto px-4" aria-label="Isi keranjang">
          {items.map((item) => (
            <CartItemRow
              key={item.productId}
              item={item}
              disabled={isSubmitting}
              onQuantityChange={(quantity) => onQuantityChange(item.productId, quantity)}
              onRemove={() => onRemove(item.productId)}
            />
          ))}
        </ul>
      )}

      <div className="space-y-3 border-t bg-muted/30 p-4">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Subtotal</span>
          <span className="numeric">{formatRupiah(total)}</span>
        </div>
        <PaymentSection
          total={total}
          method={method}
          onMethodChange={onMethodChange}
          paidAmount={paidAmount}
          onPaidAmountChange={onPaidAmountChange}
          hasItems={lineCount > 0}
          blockReason={blockReason}
          isSubmitting={isSubmitting}
          onPay={onPay}
        />
      </div>
    </div>
  );
}
