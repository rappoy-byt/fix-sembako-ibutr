import type { PostgrestError } from "@supabase/supabase-js";

/** Kode error Postgres/PostgREST yang ditangani khusus oleh aplikasi. */
export const PG_ERROR = {
  UNIQUE_VIOLATION: "23505",
  FOREIGN_KEY_VIOLATION: "23503",
  CHECK_VIOLATION: "23514",
  INVALID_TEXT: "22P02",
  RLS_VIOLATION: "42501",
} as const;

/** Pesan error siap tampil (Bahasa Indonesia) + detail teknis untuk log. */
export function describeDbError(error: PostgrestError, context: string) {
  console.error(`[db] ${context}:`, error);
  switch (error.code) {
    case PG_ERROR.RLS_VIOLATION:
      return `${context}: akses ditolak oleh kebijakan database (RLS). Pastikan Anda masih login.`;
    case "PGRST301":
    case "PGRST303":
      return `${context}: sesi login berakhir. Silakan masuk kembali.`;
    case PG_ERROR.CHECK_VIOLATION:
      return `${context}: data ditolak database karena melanggar aturan nilai (${error.message}).`;
    default:
      return `${context}: ${error.message}`;
  }
}

const PAGE_SIZE = 1000;

/**
 * PostgREST membatasi jumlah baris per request (default 1000). Fungsi ini
 * mengambil semua halaman agar data tidak terpotong diam-diam.
 * Query WAJIB memiliki urutan deterministik (mis. order by id) agar halaman konsisten.
 */
export async function fetchAllRows<T>(
  fetchPage: (
    from: number,
    to: number
  ) => PromiseLike<{ data: T[] | null; error: PostgrestError | null }>
): Promise<{ data: T[]; error: null } | { data: null; error: PostgrestError }> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await fetchPage(from, from + PAGE_SIZE - 1);
    if (error) return { data: null, error };
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return { data: rows, error: null };
}

/** Membagi array untuk filter `.in()` agar URL request tidak terlalu panjang. */
export function chunk<T>(items: readonly T[], size = 100): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size));
  return result;
}
