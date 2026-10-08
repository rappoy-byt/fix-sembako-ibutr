import type { Metadata } from "next";
import { Suspense } from "react";

import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { NEAR_EXPIRY_DAYS } from "@/features/inventory/lib/business-rules";
import { NotificationCenter } from "@/features/notifications/components/notification-center";
import { getNotifications } from "@/features/notifications/data";

export const metadata: Metadata = { title: "Notifikasi" };

export default function NotifikasiPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Notifikasi"
        description={`Peringatan batch kedaluwarsa, hampir kedaluwarsa (≤ ${NEAR_EXPIRY_DAYS} hari), dan stok di bawah minimum.`}
      />
      <Suspense fallback={<NotificationsSkeleton />}>
        <NotificationsContent />
      </Suspense>
    </div>
  );
}

async function NotificationsContent() {
  const feed = await getNotifications();
  if (feed.error !== null) return <ErrorState message={feed.error} />;
  return <NotificationCenter items={feed.data.items} unreadCount={feed.data.unreadCount} />;
}

function NotificationsSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true">
      <Skeleton className="h-8 w-96" />
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} className="h-24 w-full rounded-xl" />
      ))}
    </div>
  );
}
