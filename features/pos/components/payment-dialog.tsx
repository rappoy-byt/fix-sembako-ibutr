"use client";

import { ArrowLeft, Banknote, CreditCard, Delete, Loader2, Maximize2, QrCode, type LucideIcon } from "lucide-react";
import { useState, type KeyboardEvent } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { formatNumber, formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PaymentMethod } from "@/types/domain";

import { getChange, PAYMENT_METHODS, suggestCashAmounts } from "../lib/cart";

const METHOD_ICONS: Record<PaymentMethod, LucideIcon> = {
  CASH: Banknote,
  QRIS: QrCode,
  DEBIT: CreditCard,
};

/** Batas digit nominal tunai (hingga ratusan miliar) agar input tidak meluap. */
const MAX_DIGITS = 12;

const KEYPAD = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "000", "0"] as const;

/** Nominal pembayaran tunai yang sudah diparsing (null = kosong / tidak valid). */
export function parsePaidAmount(value: string): number | null {
  if (value.trim() === "") return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  method: PaymentMethod;
  onMethodChange: (method: PaymentMethod) => void;
  /** Nominal tunai sebagai string digit tanpa pemisah (mis. "200000"). */
  paidAmount: string;
  onPaidAmountChange: (value: string) => void;
  /** Alasan tombol Selesaikan dikunci (null = boleh bayar). */
  blockReason: string | null;
  isSubmitting: boolean;
  onPay: () => void;
}

/**
 * Layar pembayaran terpisah: metode di kiri, nominal + keypad di kanan.
 * Kembalian di sini hanya pratinjau; angka final berasal dari hasil RPC checkout.
 */
export function PaymentDialog({
  open,
  onOpenChange,
  total,
  method,
  onMethodChange,
  paidAmount,
  onPaidAmountChange,
  blockReason,
  isSubmitting,
  onPay,
}: PaymentDialogProps) {
  const [isQrisZoomed, setIsQrisZoomed] = useState(false);
  const paid = parsePaidAmount(paidAmount);
  const change = paid === null ? null : getChange(total, paid);
  const suggestions = suggestCashAmounts(total);

  function setDigits(value: string) {
    // Buang nol di depan; kosong tetap kosong agar placeholder tampil.
    onPaidAmountChange(value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, MAX_DIGITS));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      onPay();
    }
  }

  return (
    <Dialog
      open={open}
      // Selama checkout berjalan layar tidak boleh ditutup.
      onOpenChange={(next) => !isSubmitting && onOpenChange(next)}
    >
      <DialogContent showCloseButton={false} className="gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <div className="relative flex flex-col">
          <div className="flex h-14 items-center justify-between border-b px-3">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              <ArrowLeft />
              Kembali
            </Button>
            <DialogTitle className="font-semibold">Pembayaran</DialogTitle>
            {/* Penyeimbang agar judul tetap di tengah. */}
            <span aria-hidden className="w-24" />
          </div>
          <DialogDescription className="sr-only">
            Pilih metode pembayaran dan masukkan nominal yang diterima.
          </DialogDescription>

          <div className="grid sm:grid-cols-[200px_minmax(0,1fr)]">
          <div className="border-b bg-muted/40 p-3 sm:border-r sm:border-b-0">
            <p className="mb-2 hidden px-1 text-xs font-medium text-muted-foreground sm:block">Metode pembayaran</p>
            <div role="radiogroup" aria-label="Metode pembayaran" className="grid grid-cols-2 gap-2 sm:grid-cols-1">
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
                      "flex h-12 items-center justify-center gap-2.5 rounded-lg border px-3 text-sm transition-colors disabled:opacity-60 sm:justify-start",
                      "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                      active
                        ? "border-primary bg-accent font-semibold text-accent-foreground ring-1 ring-primary"
                        : "bg-card text-foreground/80 hover:bg-muted"
                    )}
                  >
                    <Icon aria-hidden className="size-[18px] shrink-0" />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-4 p-4 sm:p-5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm text-muted-foreground">Total tagihan</span>
              <span className="numeric font-heading text-3xl font-semibold tracking-tight">{formatRupiah(total)}</span>
            </div>

            {method === "CASH" ? (
              <>
                <div className="space-y-1.5">
                  <label htmlFor="pos-paid" className="text-xs font-medium text-muted-foreground">
                    Uang diterima
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground">
                      Rp
                    </span>
                    <input
                      id="pos-paid"
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      autoFocus
                      value={paid === null ? "" : formatNumber(paid)}
                      onChange={(e) => setDigits(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={isSubmitting}
                      placeholder="0"
                      className="numeric h-12 w-full rounded-lg border-2 border-input bg-card pr-3 pl-11 text-right text-xl font-semibold outline-none focus-visible:border-primary disabled:opacity-60"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <QuickAmount active={paid === total} disabled={isSubmitting} onClick={() => onPaidAmountChange(String(total))}>
                    Uang pas
                  </QuickAmount>
                  {suggestions.map((amount) => (
                    <QuickAmount
                      key={amount}
                      active={paid === amount}
                      disabled={isSubmitting}
                      onClick={() => setDigits(String(amount))}
                    >
                      {formatNumber(amount)}
                    </QuickAmount>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-2" aria-label="Keypad nominal">
                  {KEYPAD.map((key) => (
                    <KeypadButton key={key} disabled={isSubmitting} onClick={() => setDigits(paidAmount + key)}>
                      {key}
                    </KeypadButton>
                  ))}
                  <KeypadButton
                    disabled={isSubmitting || paidAmount === ""}
                    onClick={() => setDigits(paidAmount.slice(0, -1))}
                    aria-label="Hapus satu digit"
                  >
                    <Delete aria-hidden className="size-5" />
                  </KeypadButton>
                </div>

                <div className="flex items-baseline justify-between border-t pt-3">
                  <span className="text-sm">{change !== null && change < 0 ? "Kurang" : "Kembalian"}</span>
                  <span
                    className={cn(
                      "numeric text-xl font-semibold",
                      change === null && "text-muted-foreground",
                      change !== null && (change < 0 ? "text-danger" : "text-primary")
                    )}
                  >
                    {change === null ? "-" : formatRupiah(Math.abs(change))}
                  </span>
                </div>
              </>
            ) : method === "QRIS" ? (
              <div className="space-y-3">
                <div className="flex flex-col items-center rounded-xl border bg-white p-2.5 shadow-xs dark:bg-card">
                  <button
                    type="button"
                    onClick={() => setIsQrisZoomed(true)}
                    className="group relative cursor-pointer overflow-hidden rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    title="Klik untuk memperbesar QRIS"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/images/qris.jpg"
                      alt="QRIS TRwarung"
                      className="h-44 sm:h-48 w-auto max-w-full rounded-md object-contain transition-transform duration-200 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 flex items-center justify-center rounded-md bg-black/30 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                      <span className="flex items-center gap-1.5 rounded-full bg-background/90 px-3 py-1 text-xs font-semibold text-foreground shadow-sm">
                        <Maximize2 className="size-3.5" />
                        Perbesar
                      </span>
                    </div>
                  </button>

                  <div className="mt-1.5 text-center">
                    <p className="text-xs font-semibold tracking-wide text-foreground">TRwarung</p>
                    <p className="font-mono text-[11px] text-muted-foreground">NMID: ID1026613887243</p>
                  </div>
                </div>

                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-foreground">
                  <div className="flex items-start gap-2.5">
                    <QrCode className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <div className="space-y-0.5">
                      <p className="font-semibold text-emerald-900 dark:text-emerald-200">
                        Total Tagihan: {formatRupiah(total)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Pastikan notifikasi dana masuk sudah diterima di aplikasi Anda sebelum menekan tombol di bawah.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                Pastikan transaksi EDC sebesar total tagihan sudah berhasil, lalu selesaikan pembayaran.
              </p>
            )}

            <div className="space-y-2">
              <Button
                size="lg"
                className="h-12 w-full text-base font-semibold"
                disabled={blockReason !== null || isSubmitting}
                onClick={onPay}
                aria-describedby={blockReason ? "pos-pay-note" : undefined}
              >
                {isSubmitting && <Loader2 className="animate-spin" />}
                {isSubmitting ? "Memproses…" : "Selesaikan pembayaran"}
              </Button>
              {blockReason && !isSubmitting && (
                <p id="pos-pay-note" className="text-center text-xs text-muted-foreground">
                  {blockReason}
                </p>
              )}
            </div>
          </div>
        </div>

        {isQrisZoomed && (
          <div
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/95 p-4 backdrop-blur-xs animate-in fade-in-0 duration-150"
            onClick={() => setIsQrisZoomed(false)}
          >
            <div
              className="relative flex max-h-full max-w-sm flex-col items-center gap-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex w-full items-center justify-between">
                <div>
                  <p className="text-base font-semibold">QRIS TRwarung</p>
                  <p className="text-xs text-muted-foreground">
                    Total: <span className="font-bold text-foreground">{formatRupiah(total)}</span>
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setIsQrisZoomed(false)}>
                  Tutup
                </Button>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/qris.jpg"
                alt="QRIS TRwarung Besar"
                className="max-h-[68vh] w-auto rounded-xl border bg-white p-2 shadow-xl object-contain"
              />
            </div>
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function QuickAmount({
  children,
  active,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "numeric h-10 truncate rounded-lg border px-1 text-sm transition-colors disabled:opacity-60",
        "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        active ? "border-primary bg-accent font-semibold text-accent-foreground" : "bg-card hover:bg-muted"
      )}
    >
      {children}
    </button>
  );
}

function KeypadButton({
  children,
  disabled,
  onClick,
  ...props
}: {
  children: React.ReactNode;
  disabled: boolean;
  onClick: () => void;
  "aria-label"?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "numeric flex h-12 items-center justify-center rounded-lg border bg-card text-lg font-semibold transition-colors",
        "hover:bg-muted active:bg-accent disabled:opacity-50",
        "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      )}
      {...props}
    >
      {children}
    </button>
  );
}
