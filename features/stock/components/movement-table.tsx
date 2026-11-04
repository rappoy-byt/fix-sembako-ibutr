import {
  ArrowDownLeft,
  CalendarX2,
  ChevronDown,
  PackageX,
  ReceiptText,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { addDaysToDate } from "@/features/inventory/lib/business-rules";
import { formatDate, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { StockMovementType } from "@/types/domain";

import { formatSignedQuantity } from "../lib/movements";
import type { MovementRow } from "../queries";

const timeFormatter = new Intl.DateTimeFormat("id-ID", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Jakarta",
});

/** "YYYY-MM-DD" di zona WIB, untuk mengelompokkan per hari bisnis. */
const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" });

const dayLabelFormatter = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

const shortDayFormatter = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "UTC" });

interface TypeStyle {
  label: string;
  icon: LucideIcon;
  /** Latar + warna ikon. */
  iconClassName: string;
  /** Warna teks label tipe. */
  textClassName: string;
}

const TYPE_STYLES: Record<StockMovementType, TypeStyle> = {
  IN: {
    label: "Masuk",
    icon: ArrowDownLeft,
    iconClassName: "bg-success-soft text-success",
    textClassName: "text-success",
  },
  SALE: {
    label: "Penjualan",
    icon: ReceiptText,
    iconClassName: "bg-muted text-muted-foreground",
    textClassName: "text-muted-foreground",
  },
  EXPIRED: {
    label: "Kedaluwarsa",
    icon: CalendarX2,
    iconClassName: "bg-danger-soft text-danger",
    textClassName: "text-danger",
  },
  DAMAGE: {
    label: "Rusak",
    icon: PackageX,
    iconClassName: "bg-danger-soft text-danger",
    textClassName: "text-danger",
  },
  ADJUSTMENT_OUT: {
    label: "Koreksi",
    icon: SlidersHorizontal,
    iconClassName: "bg-warning-soft text-warning",
    textClassName: "text-warning",
  },
  ADJUSTMENT_IN: {
    label: "Koreksi masuk",
    icon: SlidersHorizontal,
    iconClassName: "bg-warning-soft text-warning",
    textClassName: "text-warning",
  },
};

/**
 * Catatan pemilik dari removeStock (features/inventory/actions.ts), formatnya
 * "Dikeluarkan (alasan), batch X: catatan". Catatan lain tetap tampil di detail.
 */
function ownerNote(row: MovementRow) {
  return row.note?.match(/^Dikeluarkan \([^)]*\), batch [^:]+: ([\s\S]+)$/)?.[1] ?? null;
}

function dayLabel(dayKey: string, today: string) {
  const date = new Date(`${dayKey}T00:00:00Z`);
  if (dayKey === today) return `Hari ini, ${shortDayFormatter.format(date)}`;
  if (dayKey === addDaysToDate(today, -1)) return `Kemarin, ${shortDayFormatter.format(date)}`;
  const label = dayLabelFormatter.format(date);
  return dayKey.slice(0, 4) === today.slice(0, 4) ? label : `${label} ${dayKey.slice(0, 4)}`;
}

function groupByDay(rows: MovementRow[]) {
  const groups: { day: string; rows: MovementRow[] }[] = [];
  for (const row of rows) {
    const day = dayKeyFormatter.format(new Date(row.createdAt));
    const last = groups.at(-1);
    if (last?.day === day) last.rows.push(row);
    else groups.push({ day, rows: [row] });
  }
  return groups;
}

export function MovementTable({ rows, today }: { rows: MovementRow[]; today: string }) {
  return (
    <div className="space-y-5">
      {groupByDay(rows).map((group) => (
        <section key={group.day} aria-label={dayLabel(group.day, today)}>
          <h3 className="rounded-lg bg-muted px-3 py-2 text-sm font-medium text-muted-foreground">
            {dayLabel(group.day, today)}
          </h3>
          <ul className="divide-y">
            {group.rows.map((row) => (
              <li key={row.id}>
                <MovementItem row={row} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** Satu catatan: ringkas di baris utama, detail (batch, referensi) saat diklik. */
function MovementItem({ row }: { row: MovementRow }) {
  const style = TYPE_STYLES[row.movementType];
  const note = ownerNote(row);

  return (
    <details className="group">
      <summary className="flex cursor-pointer list-none items-center gap-4 rounded-xl px-1.5 py-4 outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
        <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", style.iconClassName)}>
          <style.icon aria-hidden className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-semibold">
            {row.product?.name ?? "Barang tidak ditemukan"}
          </span>
          <span className="mt-1 block text-sm">
            <span className={style.textClassName}>{style.label}</span>
            <span className="text-muted-foreground"> · {timeFormatter.format(new Date(row.createdAt))}</span>
          </span>
          {note && (
            <span className="mt-2 inline-block rounded-lg bg-muted px-2.5 py-1 text-sm text-muted-foreground">
              “{note}”
            </span>
          )}
        </span>
        <span
          className={cn(
            "numeric text-right text-base font-semibold whitespace-nowrap",
            row.quantity > 0 ? "text-success" : row.quantity === 0 && "text-muted-foreground"
          )}
        >
          {formatSignedQuantity(row.quantity, formatNumber)}
          {row.product && <span className="ml-1 text-sm font-normal text-muted-foreground">{row.product.unit}</span>}
        </span>
        <ChevronDown
          aria-hidden
          className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
        />
      </summary>

      <dl className="mb-4 ml-16 grid gap-x-6 gap-y-2 rounded-xl border bg-card px-4 py-3 text-sm sm:grid-cols-2">
        {row.product && (
          <Detail label="Barang">
            <Link href={`/barang/${row.product.id}`} className="font-medium hover:text-primary hover:underline">
              {row.product.name}
            </Link>{" "}
            <span className="font-mono text-xs text-muted-foreground">{row.product.sku}</span>
          </Detail>
        )}
        <Detail label="Batch">
          {row.batch ? (
            <>
              <span className="font-mono text-xs">{row.batch.batchNumber}</span>
              {row.batch.expiryDate && (
                <span className="text-muted-foreground"> · exp. {formatDate(row.batch.expiryDate)}</span>
              )}
            </>
          ) : (
            "-"
          )}
        </Detail>
        <Detail label="Referensi">
          <Reference row={row} />
        </Detail>
        {row.note && <Detail label="Catatan sistem">{row.note}</Detail>}
      </dl>
    </details>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="break-words">{children}</dd>
    </div>
  );
}

/** Referensi dari data relasi (bukan dari teks note). */
function Reference({ row }: { row: MovementRow }) {
  if (row.transactionNumber) return <span className="font-mono text-xs">{row.transactionNumber}</span>;
  if (row.movementType === "IN") return <span className="text-muted-foreground">Batch masuk</span>;
  if (row.referenceId) return <span className="text-muted-foreground">Transaksi tidak ditemukan</span>;
  return <span className="text-muted-foreground">-</span>;
}
