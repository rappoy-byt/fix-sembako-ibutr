import {
  AlertTriangle,
  CalendarX2,
  CircleCheck,
  PackageCheck,
  PackageMinus,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExpiryBadge, StockLevelBadge } from "@/features/inventory/components/stock-badges";
import { NEAR_EXPIRY_DAYS } from "@/features/inventory/lib/business-rules";
import { formatDate, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

import type { ExpiryRow, InventorySummary, LowStockRow } from "../lib/summary";

/** Jumlah baris maksimum per tab; sisanya dirujuk ke halaman Barang. */
const LIST_LIMIT = 6;

/** Anchor kartu tab, tujuan klik dari chip peringatan. */
const LIST_ANCHOR = "daftar-stok";

interface AlertChip {
  count: number;
  title: string;
  hint: string;
  icon: LucideIcon;
  className: string;
}

/**
 * Baris chip peringatan stok. Chip hanya muncul bila ada masalah;
 * bila semuanya aman, diganti satu baris hijau "Stok aman".
 */
export function StockAlertChips({ inventory }: { inventory: InventorySummary }) {
  const lowCount = inventory.lowStockCount + inventory.outOfStockCount;
  const chips: AlertChip[] = [
    {
      count: inventory.expiredProductCount,
      title: `${formatNumber(inventory.expiredProductCount)} barang expired`,
      hint: "Pisahkan dari rak, tidak boleh dijual",
      icon: CalendarX2,
      className: "bg-danger-soft text-danger ring-danger/20 hover:ring-danger/40",
    },
    {
      count: inventory.nearExpiryProductCount,
      title: `${formatNumber(inventory.nearExpiryProductCount)} hampir kedaluwarsa`,
      hint: `≤ ${NEAR_EXPIRY_DAYS} hari, jual lebih dulu`,
      icon: AlertTriangle,
      className: "bg-warning-soft text-warning ring-warning/20 hover:ring-warning/40",
    },
    {
      count: lowCount,
      title: `${formatNumber(lowCount)} stok menipis`,
      hint:
        inventory.outOfStockCount > 0
          ? `${formatNumber(inventory.outOfStockCount)} di antaranya habis`
          : "Perlu belanja stok",
      icon: PackageMinus,
      className: "bg-orange-50 text-orange-800 ring-orange-200 hover:ring-orange-300",
    },
  ].filter((chip) => chip.count > 0);

  if (chips.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-success-soft px-4 py-3.5 text-success ring-1 ring-success/20">
        <CircleCheck aria-hidden className="size-5 shrink-0" />
        <p className="text-sm">
          <span className="font-semibold">Stok aman.</span> Tidak ada barang expired, hampir kedaluwarsa, atau
          menipis.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {chips.map(({ title, hint, icon: Icon, className }) => (
        <a
          key={title}
          href={`#${LIST_ANCHOR}`}
          className={cn("flex items-center gap-3 rounded-2xl px-4 py-3.5 ring-1 transition-shadow", className)}
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/70">
            <Icon aria-hidden className="size-5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-semibold">{title}</span>
            <span className="block truncate text-xs opacity-80">{hint}</span>
          </span>
        </a>
      ))}
    </div>
  );
}

/** Satu kartu bertab untuk daftar Expired / Hampir kedaluwarsa / Menipis. */
export function StockAttentionTabs({ inventory, today }: { inventory: InventorySummary; today: string }) {
  const tabs = [
    { value: "expired", label: "Expired", total: inventory.expiredBatches.length },
    { value: "near", label: "Hampir expired", total: inventory.nearExpiryBatches.length },
    { value: "low", label: "Menipis", total: inventory.lowStockProducts.length },
  ];
  // Buka tab pertama yang berisi; urutan = tingkat bahaya.
  const defaultTab = tabs.find((tab) => tab.total > 0)?.value ?? "expired";

  return (
    <Card id={LIST_ANCHOR} className="scroll-mt-20">
      <CardHeader>
        <CardTitle className="font-semibold">Stok perlu perhatian</CardTitle>
        <CardDescription className="numeric">
          {formatNumber(inventory.activeProducts)} barang aktif ·{" "}
          {formatNumber(inventory.availableStockUnits)} unit layak jual
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={defaultTab}>
          <TabsList className="h-9! w-full">
            {tabs.map(({ value, label, total }) => (
              <TabsTrigger key={value} value={value} className="gap-1.5">
                {label}
                {total > 0 && (
                  <span className="numeric rounded-full bg-muted px-1.5 text-xs text-muted-foreground">
                    {formatNumber(total)}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="expired">
            <ListOrEmpty total={inventory.expiredBatches.length} empty="Tidak ada stok expired">
              <ExpiryRows rows={inventory.expiredBatches} today={today} />
            </ListOrEmpty>
          </TabsContent>
          <TabsContent value="near">
            <ListOrEmpty total={inventory.nearExpiryBatches.length} empty="Tidak ada batch hampir kedaluwarsa">
              <ExpiryRows rows={inventory.nearExpiryBatches} today={today} />
            </ListOrEmpty>
          </TabsContent>
          <TabsContent value="low">
            <ListOrEmpty total={inventory.lowStockProducts.length} empty="Semua stok di atas batas minimum">
              <LowStockRows rows={inventory.lowStockProducts} />
            </ListOrEmpty>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function ListOrEmpty({ total, empty, children }: { total: number; empty: string; children: ReactNode }) {
  if (total === 0) return <EmptyState icon={PackageCheck} title={empty} className="mt-2 py-8" />;
  return (
    <>
      {children}
      {total > LIST_LIMIT && (
        <Link href="/barang" className="mt-2 inline-block text-xs font-medium text-primary hover:underline">
          Lihat semua ({formatNumber(total)})
        </Link>
      )}
    </>
  );
}

function ExpiryRows({ rows, today }: { rows: ExpiryRow[]; today: string }) {
  return (
    <ul className="divide-y">
      {rows.slice(0, LIST_LIMIT).map((row) => (
        <li key={row.batchId} className="flex items-center justify-between gap-3 py-3">
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

function LowStockRows({ rows }: { rows: LowStockRow[] }) {
  return (
    <ul className="divide-y">
      {rows.slice(0, LIST_LIMIT).map((row) => (
        <li key={row.productId} className="flex items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <Link
              href={`/barang/${row.productId}`}
              className="block truncate text-sm font-medium hover:text-primary hover:underline"
            >
              {row.productName}
            </Link>
            <p className="numeric text-xs text-muted-foreground">
              Tersedia {formatNumber(row.availableStock)} / minimum {formatNumber(row.minimumStock)} {row.unit}
            </p>
          </div>
          <StockLevelBadge availableStock={row.availableStock} minimumStock={row.minimumStock} />
        </li>
      ))}
    </ul>
  );
}
