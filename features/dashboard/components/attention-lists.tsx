import { CalendarClock, PackageCheck, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExpiryBadge, StockLevelBadge } from "@/features/inventory/components/stock-badges";
import { NEAR_EXPIRY_DAYS } from "@/features/inventory/lib/business-rules";
import { formatDate, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

import type { ExpiryRow, LowStockRow } from "../lib/summary";

/** Jumlah baris maksimum per kartu; sisanya dirujuk ke halaman Barang. */
const LIST_LIMIT = 6;

interface AttentionCardProps {
  title: string;
  description: string;
  total: number;
  tone?: "danger";
  empty: { icon: LucideIcon; title: string };
  children: ReactNode;
}

function AttentionCard({ title, description, total, tone, empty, children }: AttentionCardProps) {
  return (
    <Card className={cn(tone === "danger" && total > 0 && "ring-danger/40")}>
      <CardHeader>
        <CardTitle className="font-semibold">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        {total > LIST_LIMIT && (
          <CardAction>
            <Link href="/barang" className="text-xs font-medium text-primary hover:underline">
              Lihat semua ({formatNumber(total)})
            </Link>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {total === 0 ? <EmptyState icon={empty.icon} title={empty.title} className="py-8" /> : children}
      </CardContent>
    </Card>
  );
}

function ExpiryRows({ rows, today }: { rows: ExpiryRow[]; today: string }) {
  return (
    <ul className="divide-y">
      {rows.slice(0, LIST_LIMIT).map((row) => (
        <li key={row.batchId} className="flex items-center justify-between gap-3 py-2.5">
          <div className="min-w-0">
            <Link
              href={`/barang/${row.productId}`}
              className="block truncate text-sm font-medium hover:text-primary hover:underline"
            >
              {row.productName}
            </Link>
            <p className="numeric text-xs text-muted-foreground">
              {row.batchNumber} · sisa {formatNumber(row.remainingQuantity)} {row.unit} ·{" "}
              {formatDate(row.expiryDate)}
            </p>
          </div>
          <ExpiryBadge expiryDate={row.expiryDate} today={today} />
        </li>
      ))}
    </ul>
  );
}

export function ExpiredList({ rows, today }: { rows: ExpiryRow[]; today: string }) {
  return (
    <AttentionCard
      title="Stok Expired"
      description="Tidak boleh dijual — pisahkan dari rak. Tidak dihitung sebagai stok tersedia."
      total={rows.length}
      tone="danger"
      empty={{ icon: PackageCheck, title: "Tidak ada stok expired" }}
    >
      <ExpiryRows rows={rows} today={today} />
    </AttentionCard>
  );
}

export function NearExpiryList({ rows, today }: { rows: ExpiryRow[]; today: string }) {
  return (
    <AttentionCard
      title="Hampir Kedaluwarsa"
      description={`Batch layak jual yang kedaluwarsa dalam ${NEAR_EXPIRY_DAYS} hari — dijual lebih dulu (FEFO).`}
      total={rows.length}
      empty={{ icon: CalendarClock, title: "Tidak ada batch hampir kedaluwarsa" }}
    >
      <ExpiryRows rows={rows} today={today} />
    </AttentionCard>
  );
}

export function LowStockList({ rows }: { rows: LowStockRow[] }) {
  return (
    <AttentionCard
      title="Stok Menipis & Habis"
      description="Barang aktif dengan stok tersedia ≤ batas minimum."
      total={rows.length}
      empty={{ icon: PackageCheck, title: "Semua stok di atas batas minimum" }}
    >
      <ul className="divide-y">
        {rows.slice(0, LIST_LIMIT).map((row) => (
          <li key={row.productId} className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <Link
                href={`/barang/${row.productId}`}
                className="block truncate text-sm font-medium hover:text-primary hover:underline"
              >
                {row.productName}
              </Link>
              <p className="numeric text-xs text-muted-foreground">
                Tersedia {formatNumber(row.availableStock)} / minimum {formatNumber(row.minimumStock)}{" "}
                {row.unit}
              </p>
            </div>
            <StockLevelBadge availableStock={row.availableStock} minimumStock={row.minimumStock} />
          </li>
        ))}
      </ul>
    </AttentionCard>
  );
}

