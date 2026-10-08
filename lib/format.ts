import { STORE_TIME_ZONE } from "./constants";

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("id-ID");

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: STORE_TIME_ZONE,
});

const longDateFormatter = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: STORE_TIME_ZONE,
});

/** 15000 → "Rp 15.000" */
export function formatRupiah(value: number) {
  return currencyFormatter.format(value);
}

/** 1250 → "1.250" */
export function formatNumber(value: number) {
  return numberFormatter.format(value);
}

/** Menerima Date atau string tanggal ISO ("2026-10-07"). */
export function formatDate(value: Date | string) {
  return dateFormatter.format(toDate(value));
}

export function formatLongDate(value: Date | string) {
  return longDateFormatter.format(toDate(value));
}

const relativeFormatter = new Intl.RelativeTimeFormat("id-ID", { numeric: "auto" });

/** "5 menit yang lalu", "kemarin", dst. */
export function formatRelativeTime(value: Date | string, now: Date = new Date()) {
  const diffMinutes = Math.round((toDate(value).getTime() - now.getTime()) / 60_000);
  if (Math.abs(diffMinutes) < 60) return relativeFormatter.format(diffMinutes, "minute");
  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return relativeFormatter.format(diffHours, "hour");
  return relativeFormatter.format(Math.round(diffHours / 24), "day");
}

function toDate(value: Date | string) {
  if (value instanceof Date) return value;
  // Tanggal tanpa jam (kolom DATE) diperlakukan sebagai siang hari agar
  // tidak bergeser ke hari sebelumnya karena konversi zona waktu.
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00`)
    : new Date(value);
}
