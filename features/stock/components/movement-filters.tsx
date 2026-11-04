"use client";

import { Loader2, RotateCcw } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addDaysToDate } from "@/features/inventory/lib/business-rules";
import { isValidIsoDate } from "@/features/inventory/lib/validation";
import { cn } from "@/lib/utils";

import {
  buildMovementSearch,
  DEFAULT_RANGE_DAYS,
  MOVEMENT_TYPE_FILTER_OPTIONS,
  type MovementFilters,
} from "../lib/movements";

type PeriodPreset = "30d" | "7d" | "month" | "custom";

const PERIOD_ITEMS: { value: PeriodPreset; label: string }[] = [
  { value: "30d", label: `${DEFAULT_RANGE_DAYS} hari terakhir` },
  { value: "7d", label: "7 hari terakhir" },
  { value: "month", label: "Bulan ini" },
  { value: "custom", label: "Atur tanggal…" },
];

/** Rentang tanggal untuk tiap pilihan cepat (selain "custom"). */
function presetRange(preset: Exclude<PeriodPreset, "custom">, today: string) {
  if (preset === "month") return { from: `${today.slice(0, 8)}01`, to: today };
  return { from: addDaysToDate(today, preset === "7d" ? -6 : -(DEFAULT_RANGE_DAYS - 1)), to: today };
}

function detectPreset(filters: MovementFilters, today: string): PeriodPreset {
  for (const preset of ["30d", "7d", "month"] as const) {
    const range = presetRange(preset, today);
    if (range.from === filters.from && range.to === filters.to) return preset;
  }
  return "custom";
}

interface MovementFiltersProps {
  filters: MovementFilters;
  /** Tanggal bisnis WIB dari server (untuk menentukan rentang bawaan). */
  today: string;
  products: { id: string; name: string; sku: string }[];
  isDefault: boolean;
}

/**
 * Filter riwayat stok. URL adalah sumber kebenaran: setiap perubahan menulis
 * ?product=&type=&from=&to= (halaman kembali ke 1) dan server menjalankan query.
 */
export function MovementFilterBar({ filters, today, products, isDefault }: MovementFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [preset, setPreset] = useState<PeriodPreset>(() => detectPreset(filters, today));
  // Tanggal dikelola lokal agar input yang belum lengkap tidak langsung dikirim.
  const [from, setFrom] = useState(filters.from);
  const [to, setTo] = useState(filters.to);

  const productItems = [
    { value: "all", label: "Semua barang" },
    ...products.map((p) => ({ value: p.id, label: p.name })),
  ];

  function apply(overrides: Partial<MovementFilters>) {
    const search = buildMovementSearch(filters, today, { ...overrides, page: 1 });
    startTransition(() => router.push(`${pathname}${search}`, { scroll: false }));
  }

  function applyPreset(value: PeriodPreset) {
    setPreset(value);
    if (value !== "custom") apply(presetRange(value, today));
  }

  function applyDate(field: "from" | "to", value: string) {
    if (field === "from") setFrom(value);
    else setTo(value);
    if (isValidIsoDate(value)) apply({ [field]: value });
  }

  function reset() {
    startTransition(() => router.push(pathname, { scroll: false }));
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Select
          items={productItems}
          value={filters.productId ?? "all"}
          onValueChange={(value) => apply({ productId: value && value !== "all" ? String(value) : null })}
        >
          <SelectTrigger aria-label="Filter barang" className="h-10 min-w-48 flex-1 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {productItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          items={PERIOD_ITEMS}
          value={preset}
          onValueChange={(value) => applyPreset((value as PeriodPreset | null) ?? "30d")}
        >
          <SelectTrigger aria-label="Rentang tanggal" className="h-10 min-w-44 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_ITEMS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {preset === "custom" && (
        <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
          <div className="space-y-1.5">
            <Label htmlFor="filter-from" className="text-xs text-muted-foreground">
              Dari tanggal
            </Label>
            <Input
              id="filter-from"
              type="date"
              value={from}
              onChange={(e) => applyDate("from", e.target.value)}
              className="h-10 sm:w-44"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="filter-to" className="text-xs text-muted-foreground">
              Sampai tanggal
            </Label>
            <Input
              id="filter-to"
              type="date"
              value={to}
              onChange={(e) => applyDate("to", e.target.value)}
              className="h-10 sm:w-44"
            />
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {MOVEMENT_TYPE_FILTER_OPTIONS.map((option) => {
          const active = filters.type === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => apply({ type: option.value })}
              className={cn(
                "h-9 rounded-full border px-4 text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                active
                  ? "border-primary/40 bg-accent font-medium text-accent-foreground"
                  : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {option.label}
            </button>
          );
        })}
        {!isDefault && (
          <Button variant="ghost" className="h-9 text-sm text-muted-foreground" onClick={reset} disabled={isPending}>
            <RotateCcw />
            Reset
          </Button>
        )}
        {isPending && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground" aria-live="polite">
            <Loader2 aria-hidden className="size-3.5 animate-spin" />
            Memuat…
          </span>
        )}
      </div>
    </div>
  );
}
