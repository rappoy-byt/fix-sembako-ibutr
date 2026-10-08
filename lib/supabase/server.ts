import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";

import type { Database } from "@/types/database";

import { getSupabaseEnv } from "./env";

/**
 * Supabase client untuk Server Component, Server Action, dan Route Handler.
 * Buat client baru di setiap request — jangan disimpan sebagai variabel global.
 */
export async function createClient() {
  // Supabase Auth membandingkan masa berlaku token dengan Date.now(). Dengan
  // Cache Components, nilai waktu hanya boleh dibaca saat request sungguhan
  // (bukan saat prerender/prefetch), jadi tandai client ini sebagai per-request.
  await connection();
  const cookieStore = await cookies();
  const { url, publishableKey } = getSupabaseEnv();

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Server Component tidak boleh menulis cookie. Aman diabaikan karena
          // proxy.ts sudah me-refresh sesi di setiap request.
        }
      },
    },
  });
}
