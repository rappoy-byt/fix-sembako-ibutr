import { Banknote, CreditCard, QrCode, ReceiptText, type LucideIcon } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber, formatRupiah } from "@/lib/format";
import type { PaymentMethod } from "@/types/domain";

import type { SalesSummary } from "../lib/summary";
import type { RecentTransaction } from "../queries";

const METHODS: { value: PaymentMethod; label: string; icon: LucideIcon }[] = [
  { value: "CASH", label: "Tunai", icon: Banknote },
  { value: "QRIS", label: "QRIS", icon: QrCode },
  { value: "DEBIT", label: "Debit / EDC", icon: CreditCard },
];

const timeFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Jakarta",
});

export function PaymentBreakdown({ sales }: { sales: SalesSummary }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-semibold">Metode Pembayaran Hari Ini</CardTitle>
        <CardDescription>Jumlah transaksi dan nominal per metode.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {METHODS.map(({ value, label, icon: Icon }) => {
            const { count, total } = sales.byMethod[value];
            const share = sales.revenue > 0 ? Math.round((total / sales.revenue) * 100) : 0;
            return (
              <li key={value} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <Icon aria-hidden className="size-3.5" />
                    </span>
                    {label}
                    <span className="numeric text-xs text-muted-foreground">
                      {formatNumber(count)} transaksi
                    </span>
                  </span>
                  <span className="numeric font-medium">{formatRupiah(total)}</span>
                </div>
                <div
                  className="h-1.5 overflow-hidden rounded-full bg-muted"
                  role="img"
                  aria-label={`${label}: ${share}% dari pendapatan hari ini`}
                >
                  <div className="h-full rounded-full bg-primary" style={{ width: `${share}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

export function RecentTransactions({ transactions }: { transactions: RecentTransaction[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-semibold">Transaksi Terakhir</CardTitle>
        <CardDescription>Penjualan terbaru yang sudah tercatat.</CardDescription>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <EmptyState icon={ReceiptText} title="Belum ada transaksi" className="py-8" />
        ) : (
          <ul className="divide-y">
            {transactions.map((tx) => (
              <li key={tx.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate font-mono text-sm font-medium">{tx.transactionNumber}</p>
                  <p className="text-xs text-muted-foreground">
                    {timeFormatter.format(new Date(tx.transactionDate))} ·{" "}
                    {METHODS.find((m) => m.value === tx.paymentMethod)?.label ?? tx.paymentMethod}
                  </p>
                </div>
                <span className="numeric text-sm font-semibold">{formatRupiah(tx.total)}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
