import type { Metadata } from "next";

import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = { title: "Masuk" };

export default function LoginPage() {
  return (
    <section className="relative flex min-h-svh flex-col px-6 py-8 sm:px-10">
      <div className="flex flex-1 items-center justify-center py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 space-y-2">
            <p className="text-sm font-medium text-primary">Selamat datang kembali</p>
            <h1 className="font-heading text-3xl font-semibold tracking-tight">Masuk ke akun toko</h1>
            <p className="text-sm text-muted-foreground">
              Masukkan email dan kata sandi pemilik untuk membuka kasir.
            </p>
          </div>

          <LoginForm />
        </div>
      </div>
    </section>
  );
}
