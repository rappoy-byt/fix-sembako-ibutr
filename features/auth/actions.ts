"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export interface SignInState {
  error: string | null;
  /** Dikembalikan agar email tidak hilang dari form saat login gagal. */
  email: string;
}

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email dan kata sandi wajib diisi.", email };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Kredensial salah → pesan ramah. Error lain (jaringan, konfigurasi) dicatat
    // di server dan ditampilkan apa adanya agar tidak tersembunyi.
    if (error.code === "invalid_credentials") {
      return { error: "Email atau kata sandi salah.", email };
    }
    console.error("[auth] signIn gagal:", error);
    return { error: `Gagal masuk: ${error.message}`, email };
  }

  redirect("/dashboard");
}

/** Berhasil → redirect ke /login. Gagal → mengembalikan pesan error untuk ditampilkan. */
export async function signOut(): Promise<{ error: string }> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("[auth] signOut gagal:", error);
    return { error: `Gagal keluar: ${error.message}` };
  }
  redirect("/login");
}
