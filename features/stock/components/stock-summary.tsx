import { ArrowDownToLine, ArrowUpFromLine, Boxes, PackageMinus } from "lucide-react";

import { StatCard } from "@/components/shared/stat-card";
import type { InventoryProduct } from "@/features/inventory/queries";
import { formatDate, formatNumber } from "@/lib/format";

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
  const low = active.filter((p) => p.stock.stockLevel === "low_stock").length;
  const out = active.filter((p) => p.stock.stockLevel === "out_of_stock").length;
  const period = from === to ? formatDate(from) : `${formatDate(from)} – ${formatDate(to)}`;

  return (
    <section aria-label="Ringkasan stok" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Stok Tersedia"
        value={formatNumber(availableUnits)}
        icon={Boxes}
        hint={`Unit layak jual dari ${formatNumber(active.length)} barang aktif`}
      />
      <StatCard
        label="Menipis / Habis"
        value={`${formatNumber(low)} / ${formatNumber(out)}`}
        icon={PackageMinus}
        hint="Barang aktif ≤ stok minimum / tanpa stok"
        tone={low + out > 0 ? "warning" : "neutral"}
      />
      <StatCard
        label="Stok Masuk"
        value={totals ? `+${formatNumber(totals.incoming)}` : "—"}
        icon={ArrowDownToLine}
        hint={totals ? `Unit tercatat · ${period}` : "Perbaiki filter untuk melihat total"}
      />
      <StatCard
        label="Stok Keluar"
        value={totals ? `−${formatNumber(totals.outgoing)}` : "—"}
        icon={ArrowUpFromLine}
        hint={totals ? `Unit tercatat · ${period}` : "Perbaiki filter untuk melihat total"}
      />
    </section>
  );
}
