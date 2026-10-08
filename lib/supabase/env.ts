/**
 * Membaca konfigurasi publik Supabase dari environment variable.
 * Hanya kunci publishable yang boleh dipakai di sini — service-role key
 * TIDAK PERNAH boleh diberi prefix NEXT_PUBLIC_ atau dibaca dari kode klien.
 */
export function getSupabaseEnv() {
  // Harus diakses secara literal agar Next.js bisa meng-inline nilainya ke bundle browser.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "Konfigurasi Supabase belum lengkap. Isi NEXT_PUBLIC_SUPABASE_URL dan " +
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY di file .env.local (lihat .env.example)."
    );
  }

  return { url, publishableKey };
}
