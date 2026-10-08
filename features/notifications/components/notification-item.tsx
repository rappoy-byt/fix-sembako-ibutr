import Link from "next/link";
import type { ReactNode } from "react";

import { StatusBadge } from "@/components/shared/status-badge";
import { formatRelativeTime } from "@/lib/format";
import { NOTIFICATION_TYPE, TONE_STYLES } from "@/lib/status";
import { cn } from "@/lib/utils";
import type { AppNotification } from "@/types/domain";

interface NotificationItemProps {
  notification: AppNotification;
  /** compact = versi di dropdown header. */
  variant?: "default" | "compact";
  /** Tombol aksi di sisi kanan (mis. "Tandai dibaca"). */
  action?: ReactNode;
}

export function NotificationItem({ notification, variant = "default", action }: NotificationItemProps) {
  const meta = NOTIFICATION_TYPE[notification.type];
  const Icon = meta.icon;
  const isExpired = notification.type === "EXPIRED";
  const compact = variant === "compact";

  return (
    <div
      className={cn(
        "flex gap-3",
        compact ? "py-2" : "rounded-xl border bg-card p-4",
        !compact && isExpired && !notification.isRead && "border-danger/40 bg-danger-soft/40",
        !compact && notification.isRead && "bg-muted/30"
      )}
    >
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg",
          compact ? "size-8" : "size-9",
          TONE_STYLES[meta.tone].soft
        )}
      >
        <Icon aria-hidden className="size-4" />
      </span>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className={cn("font-medium", compact && "text-sm")}>{notification.productName}</p>
          {!compact && <StatusBadge meta={meta} />}
          {!notification.isRead && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-info">
              <span aria-hidden className="size-1.5 rounded-full bg-info" />
              Baru
            </span>
          )}
        </div>
        <p className={cn("text-muted-foreground", compact ? "line-clamp-2 text-xs" : "text-sm")}>
          {notification.message}
        </p>
        {isExpired && !compact && (
          <p className="text-xs font-semibold text-danger">
            Tidak boleh dijual — batch ini tidak dihitung sebagai stok tersedia.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <time dateTime={notification.createdAt} suppressHydrationWarning>
            {formatRelativeTime(notification.createdAt)}
          </time>
          {!compact && notification.productId && (
            <Link
              href={`/barang/${notification.productId}`}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Lihat barang & batch
            </Link>
          )}
        </div>
      </div>

      {action && <div className="shrink-0 self-start">{action}</div>}
    </div>
  );
}
