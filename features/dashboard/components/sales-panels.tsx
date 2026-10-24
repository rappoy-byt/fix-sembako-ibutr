import { Banknote, CreditCard, QrCode, ReceiptText, ShoppingBag, Wallet, type LucideIcon } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber, formatRupiah } from "@/lib/format";
import type { PaymentMethod } from "@/types/domain";

import type { SalesSummary } from "../lib/summary";
import type { RecentTransaction } from "../queries";

const METHODS: { value: PaymentMethod; label: string; icon: LucideIcon; color: string }[] = [
  { value: "CASH", label: "Tunai", icon: Banknote, color: "bg-success" },
  { value: "QRIS", label: "QRIS", icon: QrCode, color: "bg-info" },
  { value: "DEBIT", label: "Debit / EDC", icon: CreditCard, color: "bg-warning" },
];

const timeFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Jakarta",
});

/** Tiga angka pendukung di samping banner pendapatan. */
export function SalesMiniStats({ sales }: { sales: SalesSummary }) {
  const items = [
    { label: "Transaksi", value: formatNumber(sales.transactionCount), icon: ReceiptText },
    { label: "Unit terjual", value: formatNumber(sales.unitsSold), icon: ShoppingBag },
    { label: "Rata-rata per nota", value: formatRupiah(sales.averageTicket), icon: Wallet },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
      {items.map(({ label, value, icon: Icon }) => (
        <Card key={label} className="flex-row items-center gap-3 px-4 py-3.5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <Icon aria-hidden className="size-[18px]" />
          </span>
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="numeric truncate font-heading text-xl font-semibold tracking-tight">{value}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}

export function PaymentBreakdown({ sales }: { sales: SalesSummary }) {
  // Debit sudah tidak dipakai kasir; tampil hanya bila ada transaksi lama agar total tetap cocok.
  const methods = METHODS.filter(({ value }) => value !== "DEBIT" || sales.byMethod.DEBIT.count > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-semibold">Metode pembayaran</CardTitle>
        <CardDescription>Porsi pendapatan hari ini per metode.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Satu bilah bertumpuk; abu-abu penuh bila belum ada penjualan. */}
        <div
          className="flex h-2.5 overflow-hidden rounded-full bg-muted"
          role="img"
          aria-label={methods.map(({ value, label }) => `${label} ${share(sales, value)}%`).join(", ")}
        >
          {methods.map(({ value, color }) => (
            <div key={value} className={color} style={{ width: `${share(sales, value)}%` }} />
          ))}
        </div>

        <ul className="space-y-3">
          {methods.map(({ value, label, icon: Icon, color }) => {
            const { count, total } = sales.byMethod[value];
            return (
              <li key={value} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2.5">
                  <span aria-hidden className={`size-2.5 shrink-0 rounded-sm ${color}`} />
                  <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{label}</span>
                  <span className="numeric shrink-0 text-xs text-muted-foreground">
                    {formatNumber(count)} transaksi
                  </span>
                </span>
                <span className="numeric font-semibold">{formatRupiah(total)}</span>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

function share(sales: SalesSummary, method: PaymentMethod) {
  return sales.revenue > 0 ? Math.round((sales.byMethod[method].total / sales.revenue) * 100) : 0;
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
