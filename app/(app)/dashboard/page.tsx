import { PackageOpen } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StockAlertChips, StockAttentionTabs } from "@/features/dashboard/components/attention-lists";
import { PaymentBreakdown, SalesMiniStats } from "@/features/dashboard/components/sales-panels";
import { WelcomeBanner } from "@/features/dashboard/components/welcome-banner";
import { getDashboardData } from "@/features/dashboard/queries";
import { STORE_TIME_ZONE } from "@/lib/constants";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}

async function DashboardContent() {
  const result = await getDashboardData();
  if (result.error !== null) {
    return <ErrorState title="Dashboard gagal dimuat" message={result.error} />;
  }

  const { today, inventory, sales } = result.data;
  const hasProducts = inventory.activeProducts + inventory.inactiveProducts > 0;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <WelcomeBanner today={today} greeting={getGreeting(new Date())} revenue={sales.revenue} />
        <SalesMiniStats sales={sales} />
      </div>

      {!hasProducts ? (
        <EmptyState
          icon={PackageOpen}
          title="Belum ada barang"
          description="Tambahkan barang dan batch stoknya untuk melihat kondisi stok di sini."
          action={
            <Button render={<Link href="/barang" />} nativeButton={false}>
              Buka halaman Barang
            </Button>
          }
        />
      ) : (
        <StockAlertChips inventory={inventory} />
      )}

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        {hasProducts && <StockAttentionTabs inventory={inventory} today={today} />}
        <PaymentBreakdown sales={sales} />
      </div>
    </div>
  );
}

const hourFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "numeric",
  hourCycle: "h23",
  timeZone: STORE_TIME_ZONE,
});

/** Sapaan menurut jam WIB. */
function getGreeting(now: Date) {
  const hour = Number(hourFormatter.format(now));
  if (hour >= 4 && hour < 11) return "Selamat pagi";
  if (hour >= 11 && hour < 15) return "Selamat siang";
  if (hour >= 15 && hour < 18) return "Selamat sore";
  return "Selamat malam";
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Memuat dashboard">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Skeleton className="h-64 rounded-2xl" />
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-[76px] rounded-xl" />
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-[72px] rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-56 rounded-xl" />
      </div>
    </div>
  );
}
