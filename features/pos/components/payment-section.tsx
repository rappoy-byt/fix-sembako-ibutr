import { Banknote, CreditCard, Loader2, QrCode, Wallet, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PaymentMethod } from "@/types/domain";

import { getChange, PAYMENT_METHODS } from "../lib/cart";

const METHOD_ICONS: Record<PaymentMethod, LucideIcon> = {
  CASH: Banknote,
  QRIS: QrCode,
  DEBIT: CreditCard,
};

/** Nominal cepat yang umum di warung. */
const QUICK_AMOUNTS = [20_000, 50_000, 100_000];

interface PaymentSectionProps {
  total: number;
  method: PaymentMethod;
  onMethodChange: (method: PaymentMethod) => void;
  paidAmount: string;
  onPaidAmountChange: (value: string) => void;
  hasItems: boolean;
  /** Alasan tombol Bayar dikunci (null = boleh bayar). */
  blockReason: string | null;
  isSubmitting: boolean;
  onPay: () => void;
}

/** Nominal pembayaran tunai yang sudah diparsing (null = kosong / tidak valid). */
export function parsePaidAmount(value: string): number | null {
  if (value.trim() === "") return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

/**
 * Bagian pembayaran. Kembalian di sini hanya pratinjau; angka final (dibayar &
 * kembalian) berasal dari hasil RPC checkout dan ditampilkan di struk.
 */
export function PaymentSection({
  total,
  method,
  onMethodChange,
  paidAmount,
  onPaidAmountChange,
  hasItems,
  blockReason,
  isSubmitting,
  onPay,
}: PaymentSectionProps) {
  const paid = parsePaidAmount(paidAmount);
  const change = paid === null ? null : getChange(total, paid);
  const inputsDisabled = !hasItems || isSubmitting;

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <span className="font-medium">Total</span>
        <span className="numeric font-heading text-2xl font-semibold tracking-tight">
          {formatRupiah(total)}
        </span>
      </div>

      <div role="radiogroup" aria-label="Metode pembayaran" className="grid grid-cols-3 gap-2">
        {PAYMENT_METHODS.map(({ value, label }) => {
          const Icon = METHOD_ICONS[value];
          const active = value === method;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={isSubmitting}
              onClick={() => onMethodChange(value)}
              className={cn(
                "flex h-14 flex-col items-center justify-center gap-1 rounded-lg border text-xs font-medium transition-colors disabled:opacity-60",
                "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                active
                  ? "border-primary bg-accent text-accent-foreground"
                  : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon aria-hidden className="size-4" />
              {label}
            </button>
          );
        })}
      </div>

      {method === "CASH" ? (
        <div className="space-y-2">
          <label htmlFor="pos-paid" className="text-xs font-medium text-muted-foreground">
            Nominal pembayaran
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
              Rp
            </span>
            <Input
              id="pos-paid"
              type="number"
              inputMode="numeric"
              min={0}
              step={500}
              value={paidAmount}
              onChange={(e) => onPaidAmountChange(e.target.value)}
              disabled={inputsDisabled}
              placeholder="0"
              className="numeric h-10 pl-9 text-base"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <QuickButton disabled={inputsDisabled} onClick={() => onPaidAmountChange(String(total))}>
              Uang pas
            </QuickButton>
            {QUICK_AMOUNTS.map((amount) => (
              <QuickButton
                key={amount}
                disabled={inputsDisabled}
                onClick={() => onPaidAmountChange(String(amount))}
              >
                {formatRupiah(amount)}
              </QuickButton>
            ))}
          </div>

          <div className="flex items-baseline justify-between pt-1 text-sm">
            <span className="text-muted-foreground">
              {change !== null && change < 0 ? "Kurang" : "Kembalian"}
            </span>
            <span
              className={cn(
                "numeric text-lg font-semibold",
                change !== null && change < 0 ? "text-danger" : "text-foreground"
              )}
            >
              {change === null ? "—" : formatRupiah(Math.abs(change))}
            </span>
          </div>
        </div>
      ) : (
        <p className="rounded-lg border border-dashed px-3 py-2.5 text-xs text-muted-foreground">
          {method === "QRIS"
            ? "Pastikan pembayaran QRIS sebesar total di atas sudah diterima, lalu tekan Bayar."
            : "Pastikan transaksi EDC sebesar total di atas sudah berhasil, lalu tekan Bayar."}
        </p>
      )}

      <Button
        size="lg"
        className="h-11 w-full text-base"
        disabled={blockReason !== null || isSubmitting}
        onClick={onPay}
        aria-describedby={blockReason ? "pos-pay-note" : undefined}
      >
        {isSubmitting ? <Loader2 className="animate-spin" /> : <Wallet />}
        {isSubmitting ? "Memproses…" : `Bayar ${formatRupiah(total)}`}
      </Button>
      {blockReason && !isSubmitting && (
        <p id="pos-pay-note" className="text-center text-[11px] text-muted-foreground">
          {blockReason}
        </p>
      )}
    </div>
  );
}

function QuickButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <Button type="button" variant="outline" size="sm" onClick={onClick} disabled={disabled} className="numeric">
      {children}
    </Button>
  );
}
