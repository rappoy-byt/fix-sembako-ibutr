import {
  CalendarRange,
  PackageSearch,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Truck,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "AI Analytics" };

const PLANNED: { icon: LucideIcon; title: string; description: string }[] = [
  { icon: TrendingUp, title: "Tren penjualan", description: "Pola penjualan harian, mingguan, dan bulanan." },
  { icon: Sparkles, title: "Produk terlaris", description: "Produk dengan kontribusi penjualan terbesar." },
  { icon: TrendingDown, title: "Produk lambat laku", description: "Produk yang jarang terjual dan berisiko menumpuk." },
  { icon: PackageSearch, title: "Pergerakan stok", description: "Analisis stok masuk, keluar, dan kedaluwarsa." },
  { icon: Truck, title: "Rekomendasi restock", description: "Saran jumlah belanja ulang berdasarkan permintaan." },
  { icon: CalendarRange, title: "Prediksi permintaan", description: "Perkiraan sederhana kebutuhan periode berikutnya." },
];

export default function AiAnalyticsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Analytics"
        description="Analisis berbasis AI dari data penjualan dan stok toko."
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-md border border-dashed px-2.5 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles aria-hidden className="size-3.5" />
            Segera hadir
          </span>
        }
      />

      <Card className="gap-1 px-5 py-5">
        <p className="font-semibold">Modul ini sedang disiapkan</p>
        <p className="text-sm text-muted-foreground">
          AI Analytics akan aktif setelah data transaksi dan stok tersedia. Modul hanya membaca data
          dan terpisah dari proses transaksi, sehingga tidak memengaruhi kecepatan kasir.
        </p>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {PLANNED.map(({ icon: Icon, title, description }) => (
          <div key={title} className="flex gap-3 rounded-xl border border-dashed p-4">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Icon aria-hidden className="size-4" />
            </span>
            <div>
              <p className="text-sm font-medium">{title}</p>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
