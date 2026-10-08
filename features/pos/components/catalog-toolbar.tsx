import { ScanBarcode, Search, X } from "lucide-react";
import type { KeyboardEvent } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import type { PosCategory } from "../lib/catalog";

interface ProductSearchProps {
  value: string;
  onChange: (value: string) => void;
  /** Enter: tambah produk dengan SKU yang persis sama (alur scanner barcode). */
  onSubmit: () => void;
}

export function ProductSearch({ value, onChange, onSubmit }: ProductSearchProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      onSubmit();
    } else if (event.key === "Escape") {
      onChange("");
    }
  }

  return (
    <div className="relative">
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Cari nama barang atau scan / ketik SKU lalu Enter…"
        aria-label="Cari nama barang atau SKU"
        autoComplete="off"
        className="h-11 bg-card pr-10 pl-9 text-base"
        autoFocus
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Hapus pencarian"
          className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      ) : (
        <ScanBarcode
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
      )}
    </div>
  );
}

interface CategoryFilterProps {
  categories: PosCategory[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

/** Chip kategori yang bisa digulir horizontal di layar sempit. */
export function CategoryFilter({ categories, selectedId, onSelect }: CategoryFilterProps) {
  const options = [{ id: null, name: "Semua" }, ...categories];
  return (
    <div
      role="radiogroup"
      aria-label="Filter kategori"
      className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible"
    >
      {options.map((option) => {
        const active = option.id === selectedId;
        return (
          <button
            key={option.id ?? "all"}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onSelect(option.id)}
            className={cn(
              "h-8 shrink-0 rounded-full border px-3 text-sm font-medium whitespace-nowrap transition-colors",
              "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {option.name}
          </button>
        );
      })}
    </div>
  );
}
