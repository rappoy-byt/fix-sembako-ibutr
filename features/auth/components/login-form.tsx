"use client";

import { ArrowRight, CircleAlert, Eye, EyeOff, Loader2, LockKeyhole, Mail } from "lucide-react";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { signIn, type SignInState } from "../actions";

const initialState: SignInState = { error: null, email: "" };

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(signIn, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="space-y-5">
      {state.error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-danger/30 bg-danger-soft px-3.5 py-3 text-sm text-danger"
        >
          <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <Mail
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            // Remount saat email dikembalikan action agar defaultValue tidak berubah setelah mount.
            key={state.email}
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="pemilik@contoh.com"
            defaultValue={state.email}
            required
            autoFocus
            className="h-11 rounded-xl bg-card pl-10 shadow-xs"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Kata sandi</Label>
        <div className="relative">
          <LockKeyhole
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            required
            className="h-11 rounded-xl bg-card px-10 shadow-xs"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
            aria-pressed={showPassword}
            className="absolute top-1/2 right-1.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            {showPassword ? <EyeOff aria-hidden className="size-4" /> : <Eye aria-hidden className="size-4" />}
          </button>
        </div>
      </div>

      <Button
        type="submit"
        size="lg"
        className="group h-11 w-full rounded-xl text-[15px] shadow-md shadow-primary/20"
        disabled={isPending}
      >
        {isPending ? (
          <>
            <Loader2 className="animate-spin" />
            Memproses…
          </>
        ) : (
          <>
            Masuk
            <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
          </>
        )}
      </Button>
    </form>
  );
}
