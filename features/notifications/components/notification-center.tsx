"use client";

import { BellOff, Check, CheckCheck, Loader2, OctagonAlert } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NOTIFICATION_TYPE } from "@/lib/status";
import type { AppNotification, NotificationType } from "@/types/domain";

import { markAllNotificationsRead, markNotificationRead } from "../actions";
import { NotificationItem } from "./notification-item";

type Filter = "ALL" | NotificationType;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "ALL", label: "Semua" },
  { value: "EXPIRED", label: NOTIFICATION_TYPE.EXPIRED.label },
  { value: "NEAR_EXPIRY", label: NOTIFICATION_TYPE.NEAR_EXPIRY.label },
  { value: "LOW_STOCK", label: NOTIFICATION_TYPE.LOW_STOCK.label },
];

interface NotificationCenterProps {
  items: AppNotification[];
  unreadCount: number;
}

export function NotificationCenter({ items, unreadCount }: NotificationCenterProps) {
  const [filter, setFilter] = useState<Filter>("ALL");
  const [pendingId, setPendingId] = useState<string | "all" | null>(null);
  const [, startTransition] = useTransition();

  const unreadExpired = items.filter((n) => n.type === "EXPIRED" && !n.isRead).length;
  const visible = filter === "ALL" ? items : items.filter((n) => n.type === filter);
  const countOf = (f: Filter) =>
    f === "ALL" ? items.length : items.filter((n) => n.type === f).length;

  function run(id: string | "all", action: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setPendingId(id);
    startTransition(async () => {
      const result = await action();
      setPendingId(null);
      if (!result.ok) toast.error(result.error);
    });
  }

  return (
    <div className="space-y-4">
      {unreadExpired > 0 && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-danger/40 bg-danger-soft px-4 py-3"
        >
          <OctagonAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-danger" />
          <div>
            <p className="font-semibold text-danger">
              {unreadExpired} batch kedaluwarsa, tidak boleh dijual
            </p>
            <p className="text-sm text-muted-foreground">
              Pisahkan barang dari rak. Batch kedaluwarsa tidak dihitung sebagai stok tersedia dan
              tidak akan dialokasikan saat transaksi.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={filter} onValueChange={(value) => setFilter(value as Filter)}>
          <TabsList>
            {FILTERS.map((f) => (
              <TabsTrigger key={f.value} value={f.value} className="px-3">
                {f.label}
                <span className="numeric text-xs text-muted-foreground">{countOf(f.value)}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <Button
          variant="outline"
          disabled={unreadCount === 0 || pendingId !== null}
          onClick={() => run("all", markAllNotificationsRead)}
        >
          {pendingId === "all" ? <Loader2 className="animate-spin" /> : <CheckCheck />}
          Tandai semua dibaca
        </Button>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={BellOff}
          title="Tidak ada notifikasi"
          description={
            items.length === 0
              ? "Belum ada peringatan. Batch kedaluwarsa akan otomatis muncul di sini."
              : "Belum ada peringatan untuk kategori ini."
          }
        />
      ) : (
        <div className="space-y-2">
          {visible.map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              action={
                !n.isRead && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pendingId !== null}
                    onClick={() => run(n.id, () => markNotificationRead(n.id))}
                  >
                    {pendingId === n.id ? <Loader2 className="animate-spin" /> : <Check />}
                    Tandai dibaca
                  </Button>
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
