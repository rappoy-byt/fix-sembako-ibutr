import { CalendarX2, Layers, ShieldCheck, Store } from "lucide-react";
import type { Metadata } from "next";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/features/auth/components/login-form";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = { title: "Masuk" };

const HIGHLIGHTS = [
  { icon: Layers, text: "Stok per batch dengan prinsip FEFO" },
  { icon: CalendarX2, text: "Barang kedaluwarsa otomatis tidak bisa dijual" },
  { icon: ShieldCheck, text: "Akses khusus pemilik toko" },
];

export default function LoginPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-[1fr_minmax(440px,560px)]">
      <section className="hidden flex-col justify-between border-r bg-sidebar p-10 lg:flex">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Store aria-hidden className="size-5" />
          </span>
          <span className="font-semibold">{APP_NAME}</span>
        </div>

        <div className="max-w-md space-y-6">
          <h2 className="font-heading text-3xl leading-tight font-semibold tracking-tight">
            Kasir cepat, stok terkendali, tidak ada barang kedaluwarsa yang terjual.
          </h2>
          <ul className="space-y-3">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <Icon aria-hidden className="size-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-muted-foreground">Proyek PSAJ · Sistem Kasir & Inventaris</p>
      </section>

      <section className="flex items-center justify-center p-6">
        <Card className="w-full max-w-sm gap-6 py-6">
          <CardHeader className="px-6">
            <CardTitle className="text-xl font-semibold">Masuk</CardTitle>
            <CardDescription>Gunakan akun pemilik toko untuk melanjutkan.</CardDescription>
          </CardHeader>
          <CardContent className="px-6">
            <LoginForm />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
