"use client";

import { CalendarDays } from "lucide-react";
import { usePathname } from "next/navigation";

import { formatLongDate } from "@/lib/format";
import type { NotificationFeed } from "@/features/notifications/data";
import type { QueryResult } from "@/types/domain";

import { findNavItem, isCashierPath } from "./nav-config";
import { NotificationBell } from "./notification-bell";
import { UserMenu } from "./user-menu";

interface AppHeaderProps {
  ownerEmail: string;
  notifications: QueryResult<NotificationFeed>;
}

export function AppHeader({ ownerEmail, notifications }: AppHeaderProps) {
  const pathname = usePathname();
  const current = findNavItem(pathname);

  // Mode kasir tidak memakai header; keluar hanya lewat tombol di sidebar.
  if (isCashierPath(pathname)) return null;

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/80 lg:px-6">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{current?.title ?? "Warung Sembako Ibu TR"}</p>
        {current && (
          <p className="hidden truncate text-xs text-muted-foreground sm:block">{current.description}</p>
        )}
      </div>

      <div
        className="hidden items-center gap-1.5 text-sm text-muted-foreground md:flex"
        suppressHydrationWarning
      >
        <CalendarDays aria-hidden className="size-4" />
        {formatLongDate(new Date())}
      </div>

      <div className="h-6 w-px bg-border" aria-hidden />

      <div className="flex items-center gap-1">
        <NotificationBell feed={notifications} />
        <UserMenu email={ownerEmail} />
      </div>
    </header>
  );
}
