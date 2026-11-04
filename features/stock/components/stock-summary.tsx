import { ArrowDownLeft, ArrowUpRight, Package, TrendingDown, type LucideIcon } from "lucide-react";

import type { InventoryProduct } from "@/features/inventory/queries";
import { formatDate, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

import type { MovementTotals } from "../lib/movements";

interface StockSummaryProps {
  /** Dari getInventoryOverview() — stok tersedia sudah dihitung di sana. */
  products: InventoryProduct[];
  /** null = filter tidak valid, total tidak dihitung. */
  totals: MovementTotals | null;
  from: string;
  to: string;
}

export function StockSummary({ products, totals, from, to }: StockSummaryProps) {
  const active = products.filter((p) => p.is_active);
  const availableUnits = active.reduce((sum, p) => sum + p.stock.availableStock, 0);
  const needRestock = active.filter((p) => p.stock.stockLevel !== "in_stock").length;
  const period = from === to ? formatDate(from) : `${formatDate(from)} – ${formatDate(to)}`;

  return (
    <section aria-label="Ringkasan stok" className="rounded-2xl border bg-card px-5 py-5 sm:px-6">
      <div className="grid grid-cols-2 gap-y-5 lg:grid-cols-4">
        <SummaryTile icon={Package} label="Stok layak jual" value={formatNumber(availableUnits)} />
        <SummaryTile icon={TrendingDown} label="Perlu diisi" value={formatNumber(needRestock)} />
        <SummaryTile
          icon={ArrowDownLeft}
          label="Masuk"
          value={totals ? `+${formatNumber(totals.incoming)}` : "-"}
          className={totals ? "text-success" : undefined}
        />
        <SummaryTile icon={ArrowUpRight} label="Keluar" value={totals ? `−${formatNumber(totals.outgoing)}` : "-"} />
      </div>
      <p className="mt-5 border-t pt-4 text-sm text-muted-foreground">
        {totals ? `Masuk dan keluar dihitung ${period}` : "Perbaiki filter untuk melihat total masuk dan keluar"}
      </p>
    </section>
  );
}

interface SummaryTileProps {
  icon: LucideIcon;
  label: string;
  value: string;
  className?: string;
}

function SummaryTile({ icon: Icon, label, value, className }: SummaryTileProps) {
  return (
    <div className="border-l px-5 first:border-l-0 first:pl-0 odd:max-lg:border-l-0 odd:max-lg:pl-0">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon aria-hidden className="size-4" />
        {label}
      </p>
      <p className={cn("numeric mt-3 text-3xl leading-none font-semibold tracking-tight", className)}>{value}</p>
    </div>
  );
}
