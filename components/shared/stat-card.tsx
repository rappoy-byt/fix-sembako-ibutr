import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TONE_STYLES, type StatusTone } from "@/lib/status";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  hint?: string;
  tone?: StatusTone;
}

/** Kartu angka ringkasan (KPI). Nada warna dipakai hanya untuk indikator yang butuh perhatian. */
export function StatCard({ label, value, icon: Icon, hint, tone = "neutral" }: StatCardProps) {
  return (
    <Card className="gap-3 px-4 py-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span
          className={cn(
            "flex size-8 items-center justify-center rounded-lg",
            tone === "neutral" ? "bg-accent text-accent-foreground" : TONE_STYLES[tone].soft
          )}
        >
          <Icon aria-hidden className="size-4" />
        </span>
      </div>
      <p className="numeric font-heading text-2xl font-semibold tracking-tight">{value}</p>
      {hint && (
        <p className={cn("text-xs", tone === "neutral" ? "text-muted-foreground" : TONE_STYLES[tone].text)}>
          {hint}
        </p>
      )}
    </Card>
  );
}

export function StatCardSkeleton() {
  return (
    <Card className="gap-3 px-4 py-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="size-8 rounded-lg" />
      </div>
      <Skeleton className="h-7 w-28" />
      <Skeleton className="h-3 w-32" />
    </Card>
  );
}
