import { StatusBadge } from "@/components/shared/status-badge";
import { formatNumber } from "@/lib/format";
import {
  BATCH_STATUS,
  EXPIRY_STATUS,
  PRODUCT_ACTIVE_STATUS,
  STOCK_LEVEL_STATUS,
} from "@/lib/status";

import {
  getDaysUntilExpiry,
  getExpiryStatus,
  getStockLevelStatus,
  getStoreToday,
  type BatchDisplayStatus,
} from "../lib/business-rules";

interface StockLevelBadgeProps {
  availableStock: number;
  minimumStock: number;
  unit?: string;
  /** Tampilkan jumlah stok di dalam badge, bukan label status. */
  showQuantity?: boolean;
}

export function StockLevelBadge({
  availableStock,
  minimumStock,
  unit,
  showQuantity = false,
}: StockLevelBadgeProps) {
  const status = getStockLevelStatus(availableStock, minimumStock);
  const meta = STOCK_LEVEL_STATUS[status];
  const label =
    showQuantity && status !== "out_of_stock"
      ? `${formatNumber(availableStock)} ${unit ?? ""}`.trim()
      : meta.label;
  return <StatusBadge meta={meta} label={label} />;
}

interface ExpiryBadgeProps {
  expiryDate: string | null;
  /** Tanggal bisnis WIB dari server, agar server & klien konsisten. */
  today?: string;
  /** Sembunyikan badge jika kedaluwarsa masih jauh atau tidak ada. */
  hideWhenFresh?: boolean;
}

export function ExpiryBadge({ expiryDate, today = getStoreToday(), hideWhenFresh = false }: ExpiryBadgeProps) {
  const status = getExpiryStatus(expiryDate, today);
  if (hideWhenFresh && (status === "fresh" || status === "no_expiry")) return null;
  return <StatusBadge meta={EXPIRY_STATUS[status]} label={describeExpiry(expiryDate, today)} />;
}

/** "Kedaluwarsa hari ini", "Exp. 3 hari lagi", "Kedaluwarsa 2 hari lalu", dst. */
export function describeExpiry(expiryDate: string | null, today = getStoreToday()) {
  if (!expiryDate) return EXPIRY_STATUS.no_expiry.label;
  const days = getDaysUntilExpiry(expiryDate, today);
  if (days < 0) return `Kedaluwarsa ${Math.abs(days)} hari lalu`;
  if (days === 0) return "Kedaluwarsa hari ini";
  return `Exp. ${days} hari lagi`;
}

export function BatchStatusBadge({ status }: { status: BatchDisplayStatus }) {
  return <StatusBadge meta={BATCH_STATUS[status]} />;
}

export function ProductActiveBadge({ isActive }: { isActive: boolean }) {
  return <StatusBadge meta={PRODUCT_ACTIVE_STATUS[isActive ? "active" : "inactive"]} />;
}

/** Penanda stok expired (tidak boleh dijual) pada sebuah barang. */
export function ExpiredStockBadge({ quantity, unit }: { quantity: number; unit?: string }) {
  if (quantity <= 0) return null;
  return (
    <StatusBadge
      meta={EXPIRY_STATUS.expired}
      label={`${formatNumber(quantity)} ${unit ?? ""} expired`.replace(/\s+/g, " ")}
    />
  );
}
