import { ArrowRight, Plus, ShoppingBasket, ShoppingCart } from "lucide-react";
import Link from "next/link";

import { formatLongDate, formatRupiah } from "@/lib/format";

interface WelcomeBannerProps {
  /** Tanggal bisnis WIB (YYYY-MM-DD). */
  today: string;
  greeting: string;
  revenue: number;
}

/** Banner sapaan Dashboard: pendapatan hari ini sebagai angka utama + aksi cepat. */
export function WelcomeBanner({ today, greeting, revenue }: WelcomeBannerProps) {
  return (
    <section
      aria-label="Ringkasan hari ini"
      className="relative overflow-hidden rounded-2xl bg-linear-to-br from-primary to-[oklch(0.3_0.06_168)] p-6 text-primary-foreground shadow-lg shadow-primary/15"
    >
      {/* Dekorasi: cahaya lembut dan ikon keranjang samar. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-white/10 blur-3xl"
      />
      <ShoppingBasket
        aria-hidden
        strokeWidth={1.25}
        className="pointer-events-none absolute -right-4 -bottom-6 size-40 -rotate-12 text-white/[0.08]"
      />

      <div className="relative space-y-5">
        <div>
          <p className="text-sm text-white/70">{formatLongDate(today)}</p>
          <p className="mt-1 font-heading text-xl font-semibold">{greeting}, Ibu</p>
        </div>

        <div>
          <p className="text-sm text-white/70">Pendapatan hari ini</p>
          <p className="numeric mt-1 font-heading text-4xl font-semibold tracking-tight">{formatRupiah(revenue)}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/kasir"
            className="group inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-primary shadow-sm transition-colors hover:bg-white/90"
          >
            <ShoppingCart aria-hidden className="size-4" />
            Buka kasir
            <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/stok"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 text-sm font-medium text-white transition-colors hover:bg-white/20"
          >
            <Plus aria-hidden className="size-4" />
            Tambah stok
          </Link>
        </div>
      </div>
    </section>
  );
}
