"use client";

import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

import { isCashierPath } from "./nav-config";

/**
 * Area konten utama. Di mode kasir tanpa header, padding dirapatkan dan
 * lebar maksimum dilepas agar kasir memenuhi layar.
 */
export function AppMain({ children }: { children: React.ReactNode }) {
  const cashierMode = isCashierPath(usePathname());

  return (
    <main className={cn("flex-1", cashierMode ? "p-3 lg:p-4" : "px-4 py-6 lg:px-8")}>
      <div className={cn("mx-auto w-full", !cashierMode && "max-w-[1440px]")}>{children}</div>
    </main>
  );
}
