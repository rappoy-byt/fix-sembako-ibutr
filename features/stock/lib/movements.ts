/**
 * Helper murni untuk modul Riwayat Stok (/stok). Tanpa I/O.
 *
 * Tanggal filter adalah tanggal bisnis WIB ("YYYY-MM-DD"). Rentang created_at
 * (timestamptz) dibentuk dengan getStoreDayRange() yang sudah ada, sehingga
 * tidak ada pergeseran hari akibat zona waktu.
 */
import { addDaysToDate, getStoreDayRange } from "@/features/inventory/lib/business-rules";
import { isUuid, isValidIsoDate } from "@/features/inventory/lib/validation";
import type { StockMovementType } from "@/types/domain";

export const MOVEMENTS_PAGE_SIZE = 25;
/** Rentang bawaan: 30 hari terakhir termasuk hari ini (WIB). */
export const DEFAULT_RANGE_DAYS = 30;
/** Rentang maksimum yang boleh dipilih (inklusif). */
export const MAX_RANGE_DAYS = 366;

/** Pilihan tipe yang tampil di UI. ADJUSTMENT_IN belum punya alur data di aplikasi. */
export type MovementTypeFilter = "all" | "in" | "sale" | "expired" | "damage" | "adjustment";

export const MOVEMENT_TYPE_FILTER_MAP: Record<Exclude<MovementTypeFilter, "all">, StockMovementType> = {
  in: "IN",
  sale: "SALE",
  expired: "EXPIRED",
  damage: "DAMAGE",
  adjustment: "ADJUSTMENT_OUT",
};

export const MOVEMENT_TYPE_FILTER_OPTIONS: { value: MovementTypeFilter; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "in", label: "Masuk" },
  { value: "sale", label: "Penjualan" },
  { value: "expired", label: "Kedaluwarsa" },
  { value: "damage", label: "Rusak" },
  { value: "adjustment", label: "Koreksi" },
];

export interface MovementFilters {
  productId: string | null;
  type: MovementTypeFilter;
  /** Tanggal awal WIB, inklusif. */
  from: string;
  /** Tanggal akhir WIB, inklusif. */
  to: string;
  page: number;
}

export interface ParsedMovementFilters {
  /** Nilai filter seperti yang dipilih pengguna (tidak diubah diam-diam). */
  filters: MovementFilters;
  /** Pesan validasi; null = filter valid dan boleh dipakai query. */
  error: string | null;
  /** true = tidak ada filter selain bawaan (untuk membedakan empty state). */
  isDefault: boolean;
}

type SearchParams = Record<string, string | string[] | undefined>;

function single(params: SearchParams, key: string): string | undefined {
  const value = params[key];
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

/** Selisih hari kalender antara dua tanggal "YYYY-MM-DD" (to − from), tanpa zona waktu. */
export function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

export function getDefaultRange(today: string) {
  return { from: addDaysToDate(today, -(DEFAULT_RANGE_DAYS - 1)), to: today };
}

/**
 * Membaca filter dari URL (?product=&type=&from=&to=&page=).
 * Tanggal tidak pernah dikoreksi otomatis: bila tidak valid, `error` diisi dan
 * nilai pilihan pengguna tetap dikembalikan untuk ditampilkan.
 */
export function parseMovementFilters(params: SearchParams, today: string): ParsedMovementFilters {
  const defaults = getDefaultRange(today);
  const errors: string[] = [];

  const productRaw = single(params, "product");
  let productId: string | null = null;
  if (productRaw) {
    if (isUuid(productRaw)) productId = productRaw;
    else errors.push("Produk pada filter tidak valid.");
  }

  const typeRaw = single(params, "type") ?? "all";
  let type: MovementTypeFilter = "all";
  if (MOVEMENT_TYPE_FILTER_OPTIONS.some((o) => o.value === typeRaw)) type = typeRaw as MovementTypeFilter;
  else errors.push("Tipe pergerakan tidak valid.");

  const fromRaw = single(params, "from");
  const toRaw = single(params, "to");
  const to = toRaw ?? defaults.to;
  // Tanpa "from": 30 hari terakhir sampai tanggal akhir yang dipilih.
  const from = fromRaw ?? (isValidIsoDate(to) ? addDaysToDate(to, -(DEFAULT_RANGE_DAYS - 1)) : defaults.from);

  if (!isValidIsoDate(from)) errors.push("Tanggal awal tidak valid.");
  if (!isValidIsoDate(to)) errors.push("Tanggal akhir tidak valid.");
  if (isValidIsoDate(from) && isValidIsoDate(to)) {
    if (from > to) {
      errors.push("Tanggal awal tidak boleh setelah tanggal akhir.");
    } else if (daysBetween(from, to) + 1 > MAX_RANGE_DAYS) {
      errors.push(
        `Rentang tanggal maksimal ${MAX_RANGE_DAYS} hari (dipilih ${daysBetween(from, to) + 1} hari). Persempit rentangnya.`
      );
    }
  }

  const pageRaw = single(params, "page");
  const pageNumber = pageRaw && /^\d{1,6}$/.test(pageRaw) ? Number(pageRaw) : 1;
  const page = pageNumber >= 1 ? pageNumber : 1;

  return {
    filters: { productId, type, from, to, page },
    error: errors.length > 0 ? errors.join(" ") : null,
    isDefault: productId === null && type === "all" && from === defaults.from && to === defaults.to,
  };
}

/** Rentang created_at (timestamptz) dari tanggal bisnis WIB: start ≤ waktu < end. */
export function toCreatedAtRange(filters: Pick<MovementFilters, "from" | "to">) {
  return { start: getStoreDayRange(filters.from).start, end: getStoreDayRange(filters.to).end };
}

export function getMovementTypeForQuery(type: MovementTypeFilter): StockMovementType | null {
  return type === "all" ? null : MOVEMENT_TYPE_FILTER_MAP[type];
}

/**
 * Query string untuk link (pagination, reset). Nilai bawaan tidak ditulis agar
 * URL tetap bersih; `page` 1 juga dihilangkan.
 */
export function buildMovementSearch(
  filters: MovementFilters,
  today: string,
  overrides: Partial<MovementFilters> = {}
) {
  const next = { ...filters, ...overrides };
  const defaults = getDefaultRange(today);
  const params = new URLSearchParams();
  if (next.productId) params.set("product", next.productId);
  if (next.type !== "all") params.set("type", next.type);
  if (next.from !== defaults.from || next.to !== defaults.to) {
    params.set("from", next.from);
    params.set("to", next.to);
  }
  if (next.page > 1) params.set("page", String(next.page));
  const query = params.toString();
  return query ? `?${query}` : "";
}

// ---------------------------------------------------------------- Tipe & jumlah

export type MovementDirection = "in" | "out";

/** Arah setiap tipe enum aktual (untuk total & tampilan). */
export const MOVEMENT_DIRECTION: Record<StockMovementType, MovementDirection> = {
  IN: "in",
  ADJUSTMENT_IN: "in",
  SALE: "out",
  ADJUSTMENT_OUT: "out",
  DAMAGE: "out",
  EXPIRED: "out",
};

export const MOVEMENT_LABEL: Record<StockMovementType, string> = {
  IN: "Masuk",
  ADJUSTMENT_IN: "Penyesuaian masuk",
  SALE: "Penjualan",
  ADJUSTMENT_OUT: "Penyesuaian keluar",
  DAMAGE: "Rusak",
  EXPIRED: "Kedaluwarsa",
};

export interface MovementTotals {
  /** Σ IN + ADJUSTMENT_IN. */
  incoming: number;
  /** Σ |SALE| + |ADJUSTMENT_OUT| + |DAMAGE| + |EXPIRED|. */
  outgoing: number;
  movementCount: number;
}

/** Menjumlah movement yang benar-benar tercatat; tidak mengarang movement lain. */
export function sumMovementTotals(
  rows: readonly { movement_type: StockMovementType; quantity: number }[]
): MovementTotals {
  let incoming = 0;
  let outgoing = 0;
  for (const row of rows) {
    if (MOVEMENT_DIRECTION[row.movement_type] === "in") incoming += Math.abs(row.quantity);
    else outgoing += Math.abs(row.quantity);
  }
  return { incoming, outgoing, movementCount: rows.length };
}

/** Tampilan jumlah memakai tanda nilai aktual: 30 → "+30", -1 → "−1". */
export function formatSignedQuantity(quantity: number, format: (n: number) => string = String) {
  if (quantity > 0) return `+${format(quantity)}`;
  if (quantity < 0) return `−${format(Math.abs(quantity))}`;
  return format(0);
}

export function getPageCount(total: number) {
  return Math.max(1, Math.ceil(total / MOVEMENTS_PAGE_SIZE));
}
