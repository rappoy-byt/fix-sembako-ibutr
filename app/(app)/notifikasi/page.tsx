import type { Metadata } from "next";
import { Suspense } from "react";

import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { NotificationCenter } from "@/features/notifications/components/notification-center";
import { getNotifications } from "@/features/notifications/data";

export const metadata: Metadata = { title: "Notifikasi" };

export default function NotifikasiPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifikasi"
        description="Hal yang perlu kamu urus di warung."
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
    <div className="space-y-4" aria-busy="true">
      <Skeleton className="h-9 w-96 max-w-full rounded-full" />
      <Skeleton className="h-96 w-full rounded-2xl" />
    </div>
  );
}
