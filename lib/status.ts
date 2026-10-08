import {
  AlertTriangle,
  CalendarClock,
  CalendarX2,
  CheckCircle2,
  CircleOff,
  PackageX,
  PackageMinus,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

import type {
  BatchDisplayStatus,
  ExpiryStatus,
  StockLevelStatus,
} from "@/features/inventory/lib/business-rules";
import type { NotificationType } from "@/types/domain";

/** Nada warna semantik. Dipetakan ke token CSS di globals.css. */
export type StatusTone = "neutral" | "success" | "warning" | "danger" | "info";

export interface StatusMeta {
  label: string;
  tone: StatusTone;
  icon: LucideIcon;
}

/**
 * Satu sumber kebenaran untuk label, warna, dan ikon status.
 * Status tidak pernah hanya ditandai warna: selalu ada ikon + teks.
 */
export const STOCK_LEVEL_STATUS: Record<StockLevelStatus, StatusMeta> = {
  in_stock: { label: "Stok aman", tone: "neutral", icon: CheckCircle2 },
  low_stock: { label: "Stok menipis", tone: "warning", icon: PackageMinus },
  out_of_stock: { label: "Stok habis", tone: "danger", icon: PackageX },
};

export const EXPIRY_STATUS: Record<ExpiryStatus, StatusMeta> = {
  fresh: { label: "Aman", tone: "neutral", icon: CalendarClock },
  no_expiry: { label: "Tanpa kedaluwarsa", tone: "neutral", icon: CalendarClock },
  near_expiry: { label: "Hampir kedaluwarsa", tone: "warning", icon: AlertTriangle },
  expired: { label: "Kedaluwarsa", tone: "danger", icon: CalendarX2 },
};

/** Status batch di detail barang: Aman / Segera Expired / Expired / Habis. */
export const BATCH_STATUS: Record<BatchDisplayStatus, StatusMeta> = {
  safe: { label: "Aman", tone: "success", icon: ShieldCheck },
  near_expiry: { label: "Segera Expired", tone: "warning", icon: AlertTriangle },
  expired: { label: "Expired", tone: "danger", icon: CalendarX2 },
  depleted: { label: "Habis", tone: "neutral", icon: PackageX },
};

export const PRODUCT_ACTIVE_STATUS: Record<"active" | "inactive", StatusMeta> = {
  active: { label: "Aktif", tone: "success", icon: CheckCircle2 },
  inactive: { label: "Nonaktif", tone: "neutral", icon: CircleOff },
};

export const NOTIFICATION_TYPE: Record<NotificationType, StatusMeta> = {
  EXPIRED: { label: "Kedaluwarsa", tone: "danger", icon: CalendarX2 },
  NEAR_EXPIRY: { label: "Hampir kedaluwarsa", tone: "warning", icon: AlertTriangle },
  LOW_STOCK: { label: "Stok menipis", tone: "warning", icon: PackageMinus },
};

/** Kelas Tailwind per nada, dipakai badge, ikon, dan alert. */
export const TONE_STYLES: Record<
  StatusTone,
  { soft: string; text: string; border: string; solid: string }
> = {
  neutral: {
    soft: "bg-muted text-muted-foreground",
    text: "text-muted-foreground",
    border: "border-border",
    solid: "bg-foreground text-background",
  },
  success: {
    soft: "bg-success-soft text-success",
    text: "text-success",
    border: "border-success/30",
    solid: "bg-success text-success-foreground",
  },
  warning: {
    soft: "bg-warning-soft text-warning",
    text: "text-warning",
    border: "border-warning/30",
    solid: "bg-warning text-warning-foreground",
  },
  danger: {
    soft: "bg-danger-soft text-danger",
    text: "text-danger",
    border: "border-danger/30",
    solid: "bg-danger text-danger-foreground",
  },
  info: {
    soft: "bg-info-soft text-info",
    text: "text-info",
    border: "border-info/30",
    solid: "bg-info text-info-foreground",
  },
};
