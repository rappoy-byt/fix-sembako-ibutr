"use client";

import { CircleCheck, ShoppingCart } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatNumber, formatRupiah } from "@/lib/format";

import type { CheckoutReceipt } from "../lib/checkout";
import { PAYMENT_METHODS } from "../lib/cart";

const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Jakarta",
});

interface CheckoutSuccessDialogProps {
  receipt: CheckoutReceipt | null;
  onClose: () => void;
}

/** Ringkasan transaksi berhasil. Semua angka berasal dari hasil server (RPC). */
export function CheckoutSuccessDialog({ receipt, onClose }: CheckoutSuccessDialogProps) {
  const methodLabel = PAYMENT_METHODS.find((m) => m.value === receipt?.paymentMethod)?.label;

  return (
    <Dialog open={receipt !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-md">
        {receipt && (
          <>
            <DialogHeader className="items-center text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-success-soft text-success">
                <CircleCheck aria-hidden className="size-6" />
              </span>
              <DialogTitle className="text-lg font-semibold">
                {receipt.alreadyProcessed ? "Transaksi sudah tercatat" : "Transaksi berhasil"}
              </DialogTitle>
              <DialogDescription>
                <span className="font-mono font-semibold text-foreground">{receipt.transactionNumber}</span>
                {receipt.transactionDate && (
                  <>
                    <br />
                    {dateTimeFormatter.format(new Date(receipt.transactionDate))} WIB
                  </>
                )}
              </DialogDescription>
            </DialogHeader>

            {receipt.alreadyProcessed && (
              <p className="rounded-lg border border-info/30 bg-info-soft px-3 py-2 text-xs text-info">
                Permintaan ini sudah diproses sebelumnya. Tidak ada transaksi kedua yang dibuat.
              </p>
            )}

            <ul className="divide-y rounded-lg border text-sm">
              {receipt.items.map((item, index) => (
                <li key={`${item.productName}-${index}`} className="flex items-start justify-between gap-3 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.productName}</p>
                    <p className="numeric text-xs text-muted-foreground">
                      {formatNumber(item.quantity)} × {formatRupiah(item.unitPrice)}
                    </p>
                  </div>
                  <span className="numeric font-medium">{formatRupiah(item.subtotal)}</span>
                </li>
              ))}
            </ul>

            <dl className="space-y-1.5 text-sm">
              <Row label="Total" value={formatRupiah(receipt.total)} strong />
              <Row label={`Dibayar (${methodLabel ?? receipt.paymentMethod})`} value={formatRupiah(receipt.paidAmount)} />
              {receipt.paymentMethod === "CASH" && (
                <Row label="Kembalian" value={formatRupiah(receipt.changeAmount)} strong highlight />
              )}
            </dl>

            <DialogFooter>
              <Button size="lg" className="w-full" onClick={onClose} autoFocus>
                <ShoppingCart />
                Transaksi Baru
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({
  label,
  value,
  strong,
  highlight,
}: {
  label: string;
  value: string;
  strong?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={
          "numeric " +
          (strong ? "font-semibold " : "") +
          (highlight ? "text-xl text-success" : "text-foreground")
        }
      >
        {value}
      </dd>
    </div>
  );
}
