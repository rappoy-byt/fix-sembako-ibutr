import { Loader2 } from "lucide-react";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { InventoryNotificationSync } from "@/components/layout/expired-batch-sync";
import { getCurrentOwner } from "@/features/auth/queries";
import { getNotifications } from "@/features/notifications/data";

/**
 * Layout untuk semua halaman yang membutuhkan login.
 * Pemeriksaan sesi membaca cookie (data per request), jadi dibungkus Suspense
 * sesuai aturan Cache Components di Next.js 16.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<ShellFallback />}>
      <AuthenticatedShell>{children}</AuthenticatedShell>
    </Suspense>
  );
}

/**
 * proxy.ts sudah melakukan cek optimistik; di sini sesi diverifikasi ulang
 * di server sebagai lapisan keamanan utama.
 */
async function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const owner = await getCurrentOwner();
  if (!owner) redirect("/login");

  const notifications = await getNotifications();
  const unreadCount = notifications.data?.unreadCount ?? 0;

  return (
    <div className="flex min-h-svh">
      <AppSidebar unreadCount={unreadCount} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader ownerEmail={owner.email} notifications={notifications} />
        <main className="flex-1 px-4 py-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1440px]">{children}</div>
        </main>
      </div>
      <InventoryNotificationSync />
    </div>
  );
}

function ShellFallback() {
  return (
    <div
      className="flex min-h-svh items-center justify-center gap-2 text-sm text-muted-foreground"
      aria-busy="true"
    >
      <Loader2 aria-hidden className="size-4 animate-spin" />
      Memuat…
    </div>
  );
}
