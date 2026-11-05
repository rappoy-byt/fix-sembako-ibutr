"use client";

import { BellOff, CalendarX2, Check, CheckCheck, ClockAlert, Loader2, ShoppingCart, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { getDaysUntilExpiry, getStoreToday } from "@/features/inventory/lib/business-rules";
import { formatNumber, formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AppNotification, NotificationType } from "@/types/domain";

import { markAllNotificationsRead, markNotificationRead } from "../actions";

type Filter = "ALL" | NotificationType;

interface GroupMeta {
  /** Label tombol filter: tindakan yang perlu dilakukan. */
  filterLabel: string;
  title: string;
  hint: string;
  icon: LucideIcon;
  iconClassName: string;
  titleClassName: string;
  actionLabel: string;
}

/** Urutan kelompok = urutan urgensi. */
const GROUPS: { type: NotificationType; meta: GroupMeta }[] = [
  {
    type: "EXPIRED",
    meta: {
      filterLabel: "Buang",
      title: "Kedaluwarsa",
      hint: "Pisahkan dari rak",
      icon: CalendarX2,
      iconClassName: "bg-danger-soft text-danger",
      titleClassName: "text-danger",
      actionLabel: "Keluarkan stok",
    },
  },
  {
    type: "NEAR_EXPIRY",
    meta: {
      filterLabel: "Jual duluan",
      title: "Hampir kedaluwarsa",
      hint: "Jual lebih dulu",
      icon: ClockAlert,
      iconClassName: "bg-warning-soft text-warning",
      titleClassName: "text-warning",
      actionLabel: "Lihat barang",
    },
  },
  {
    type: "LOW_STOCK",
    meta: {
      filterLabel: "Perlu belanja",
      title: "Stok menipis",
      hint: "Perlu belanja",
      icon: ShoppingCart,
      iconClassName: "bg-warning-soft text-warning",
      titleClassName: "text-warning",
      actionLabel: "Lihat barang",
    },
  },
];

const shortDateFormatter = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "UTC" });
const shortDate = (isoDate: string) => shortDateFormatter.format(new Date(`${isoDate}T00:00:00Z`));

/** Satu kalimat inti dari data terkini; pesan asli dipakai bila rinciannya tidak ada. */
function describe(n: AppNotification, today: string) {
  const unit = n.unit ?? "";
  if (n.type === "LOW_STOCK" && n.availableStock !== null && n.minimumStock !== null) {
    const minimum = `minimal ${formatNumber(n.minimumStock)}`;
    return n.availableStock <= 0
      ? `Stok habis, ${minimum}`
      : `Sisa ${formatNumber(n.availableStock)} ${unit}, ${minimum}`;
  }
  if (n.expiryDate && n.remainingQuantity !== null) {
    if (n.remainingQuantity <= 0) return `Sudah tidak ada di stok (exp. ${shortDate(n.expiryDate)})`;
    const quantity = `${formatNumber(n.remainingQuantity)} ${unit}`;
    if (n.type === "EXPIRED") return `${quantity} lewat tanggal ${shortDate(n.expiryDate)}`;
    const days = getDaysUntilExpiry(n.expiryDate, today);
    if (days < 0) return `${quantity} lewat tanggal ${shortDate(n.expiryDate)}`;
    if (days === 0) return `${quantity} kedaluwarsa hari ini`;
    return `${quantity} kedaluwarsa ${shortDate(n.expiryDate)}, ${formatNumber(days)} hari lagi`;
  }
  return n.message;
}

interface NotificationCenterProps {
  items: AppNotification[];
  unreadCount: number;
}

export function NotificationCenter({ items, unreadCount }: NotificationCenterProps) {
  const [filter, setFilter] = useState<Filter>("ALL");
  const [pendingId, setPendingId] = useState<string | "all" | null>(null);
  const [, startTransition] = useTransition();
  const today = getStoreToday();

  // Batch yang sudah punya notifikasi kedaluwarsa tidak perlu tampil lagi sebagai "hampir kedaluwarsa".
  const expiredBatches = new Set(items.filter((n) => n.type === "EXPIRED" && n.batchId).map((n) => n.batchId));
  const shown = items.filter((n) => !(n.type === "NEAR_EXPIRY" && n.batchId && expiredBatches.has(n.batchId)));
  const countOf = (f: Filter) => (f === "ALL" ? shown.length : shown.filter((n) => n.type === f).length);

  function run(id: string | "all", action: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setPendingId(id);
    startTransition(async () => {
      const result = await action();
      setPendingId(null);
      if (!result.ok) toast.error(result.error);
    });
  }

  const groups = GROUPS.filter((g) => filter === "ALL" || filter === g.type)
    .map((g) => ({ ...g, items: shown.filter((n) => n.type === g.type) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(["ALL", ...GROUPS.map((g) => g.type)] as Filter[]).map((value) => {
            const active = filter === value;
            const label = value === "ALL" ? "Semua" : GROUPS.find((g) => g.type === value)?.meta.filterLabel;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(value)}
                className={cn(
                  "h-9 rounded-full border px-4 text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  active
                    ? "border-primary/40 bg-accent font-medium text-accent-foreground"
                    : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {label} <span className="numeric">{formatNumber(countOf(value))}</span>
              </button>
            );
          })}
        </div>

        <Button
          variant="outline"
          className="h-10 text-sm"
          disabled={unreadCount === 0 || pendingId !== null}
          onClick={() => run("all", markAllNotificationsRead)}
        >
          {pendingId === "all" ? <Loader2 className="animate-spin" /> : <CheckCheck />}
          Tandai semua dibaca
        </Button>
      </div>

      {groups.length === 0 ? (
        <EmptyState
          icon={BellOff}
          title="Tidak ada notifikasi"
          description={
            shown.length === 0
              ? "Belum ada yang perlu diurus. Peringatan stok dan kedaluwarsa akan muncul di sini."
              : "Tidak ada notifikasi untuk pilihan ini."
          }
        />
      ) : (
        <section aria-label="Daftar notifikasi" className="space-y-6 rounded-2xl border bg-card px-5 py-5 sm:px-6">
          {groups.map(({ type, meta, items: groupItems }) => (
            <div key={type}>
              <div className="flex items-baseline justify-between gap-3">
                <div>
                  <h2 className={cn("text-base font-semibold", meta.titleClassName)}>{meta.title}</h2>
                  <p className="mt-0.5 text-sm text-muted-foreground">{meta.hint}</p>
                </div>
                <span className="text-sm text-muted-foreground">{formatNumber(groupItems.length)} barang</span>
              </div>
              <ul className="mt-1 divide-y">
                {groupItems.map((n) => (
                  <li key={n.id} className="flex items-center gap-4 py-4">
                    <span
                      className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", meta.iconClassName)}
                    >
                      <meta.icon aria-hidden className="size-5" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-base font-semibold">
                        {!n.isRead && (
                          <span aria-label="Belum dibaca" className="size-2 shrink-0 rounded-full bg-primary" />
                        )}
                        <span className="truncate">{n.productName}</span>
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">{describe(n, today)}</p>
                      <time
                        dateTime={n.createdAt}
                        suppressHydrationWarning
                        className="mt-0.5 block text-xs text-muted-foreground/80"
                      >
                        {formatRelativeTime(n.createdAt)}
                      </time>
                    </div>

                    {n.productId ? (
                      <Button
                        variant={type === "EXPIRED" ? "default" : "outline"}
                        className="h-10 shrink-0 text-sm"
                        render={
                          <Link
                            href={`/barang/${n.productId}`}
                            onClick={() => {
                              if (!n.isRead) void markNotificationRead(n.id);
                            }}
                          />
                        }
                        nativeButton={false}
                      >
                        {meta.actionLabel}
                      </Button>
                    ) : (
                      !n.isRead && (
                        <Button
                          variant="ghost"
                          className="h-10 shrink-0 text-sm"
                          disabled={pendingId !== null}
                          onClick={() => run(n.id, () => markNotificationRead(n.id))}
                        >
                          {pendingId === n.id ? <Loader2 className="animate-spin" /> : <Check />}
                          Tandai dibaca
                        </Button>
                      )
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
