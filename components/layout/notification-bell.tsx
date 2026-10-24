"use client";

import { Bell, CircleAlert } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { NotificationFeed } from "@/features/notifications/data";
import { NotificationItem } from "@/features/notifications/components/notification-item";
import type { QueryResult } from "@/types/domain";

import { useGuardedNavigate } from "./pos-navigation-guard";

const PREVIEW_LIMIT = 4;

interface NotificationBellProps {
  feed: QueryResult<NotificationFeed>;
}

export function NotificationBell({ feed }: NotificationBellProps) {
  const guardedNavigate = useGuardedNavigate();
  const items = feed.data?.items ?? [];
  const unreadCount = feed.data?.unreadCount ?? 0;
  const hasUnreadExpired = items.some((n) => !n.isRead && n.type === "EXPIRED");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-lg"
            className="relative"
            aria-label={`Notifikasi, ${unreadCount} belum dibaca`}
          />
        }
      >
        <Bell className="size-[18px]" />
        {unreadCount > 0 && (
          <span
            className={
              "numeric absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold ring-2 ring-background " +
              (hasUnreadExpired
                ? "bg-danger text-danger-foreground"
                : "bg-warning text-warning-foreground")
            }
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-96 p-0">
        <DropdownMenuGroup>
          <div className="flex items-center justify-between px-3 py-2.5">
            <DropdownMenuLabel className="p-0 text-sm font-semibold text-foreground">
              Notifikasi
            </DropdownMenuLabel>
            {unreadCount > 0 && (
              <span className="text-xs text-muted-foreground">{unreadCount} belum dibaca</span>
            )}
          </div>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="my-0" />

        {feed.error !== null ? (
          <p className="flex items-start gap-2 px-3 py-6 text-sm text-danger">
            <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
            {feed.error}
          </p>
        ) : items.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">
            Tidak ada notifikasi.
          </p>
        ) : (
          <div className="divide-y px-3">
            {items.slice(0, PREVIEW_LIMIT).map((n) => (
              <NotificationItem key={n.id} notification={n} variant="compact" />
            ))}
          </div>
        )}

        <DropdownMenuSeparator className="my-0" />
        <div className="p-1">
          <DropdownMenuItem
            render={<Link href="/notifikasi" onNavigate={guardedNavigate("/notifikasi")} />}
            className="justify-center py-2 text-sm font-medium"
          >
            Lihat semua notifikasi
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
