import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

export interface Owner {
  id: string;
  email: string;
}

/**
 * Mengambil pemilik yang sedang login dari JWT yang sudah diverifikasi.
 * Di-cache per request sehingga aman dipanggil dari beberapa komponen.
 * Aplikasi ini hanya punya satu pengguna (pemilik), jadi tidak ada cek peran.
 */
export const getCurrentOwner = cache(async (): Promise<Owner | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error) {
    console.error("[auth] getClaims gagal:", error);
    return null;
  }
  if (!data?.claims) return null;

  return {
    id: data.claims.sub,
    email: typeof data.claims.email === "string" ? data.claims.email : "",
  };
});
