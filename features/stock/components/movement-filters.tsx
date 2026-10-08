"use client";

import { Loader2, RotateCcw } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isValidIsoDate } from "@/features/inventory/lib/validation";

import {
  buildMovementSearch,
  MOVEMENT_TYPE_FILTER_OPTIONS,
  type MovementFilters,
  type MovementTypeFilter,
} from "../lib/movements";

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
  // Tanggal dikelola lokal agar input yang belum lengkap tidak langsung dikirim.
  const [from, setFrom] = useState(filters.from);
  const [to, setTo] = useState(filters.to);

  const productItems = [
    { value: "all", label: "Semua barang" },
    ...products.map((p) => ({ value: p.id, label: `${p.name} (${p.sku})` })),
  ];

  function apply(overrides: Partial<MovementFilters>) {
    const search = buildMovementSearch(filters, today, { ...overrides, page: 1 });
    startTransition(() => router.push(`${pathname}${search}`, { scroll: false }));
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
    <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-3">
      <div className="min-w-56 flex-1 space-y-1.5">
        <Label htmlFor="filter-product" className="text-xs text-muted-foreground">
          Barang
        </Label>
        <Select
          items={productItems}
          value={filters.productId ?? "all"}
          onValueChange={(value) => apply({ productId: value && value !== "all" ? String(value) : null })}
        >
          <SelectTrigger id="filter-product" className="h-9 w-full">
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
      </div>

      <div className="w-full space-y-1.5 sm:w-40">
        <Label htmlFor="filter-type" className="text-xs text-muted-foreground">
          Tipe
        </Label>
        <Select
          items={MOVEMENT_TYPE_FILTER_OPTIONS}
          value={filters.type}
          onValueChange={(value) => apply({ type: (value as MovementTypeFilter | null) ?? "all" })}
        >
          <SelectTrigger id="filter-type" className="h-9 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MOVEMENT_TYPE_FILTER_OPTIONS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid w-full grid-cols-2 gap-3 sm:w-auto">
        <div className="space-y-1.5">
          <Label htmlFor="filter-from" className="text-xs text-muted-foreground">
            Dari tanggal
          </Label>
          <Input
            id="filter-from"
            type="date"
            value={from}
            onChange={(e) => applyDate("from", e.target.value)}
            className="h-9 sm:w-40"
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
            className="h-9 sm:w-40"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="lg" onClick={reset} disabled={isDefault || isPending}>
          <RotateCcw />
          Reset
        </Button>
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
