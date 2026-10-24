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
        placeholder="Cari nama barang atau scan barcode"
        aria-label="Cari nama barang atau SKU"
        autoComplete="off"
        className="h-10 rounded-lg border-transparent bg-muted pr-24 pl-9 text-base focus-visible:bg-card"
        autoFocus
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Hapus pencarian"
          className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      ) : (
        // Scanner barcode mengetik SKU + Enter ke kolom ini; label hanya petunjuk.
        <span className="pointer-events-none absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-1.5 rounded-md border bg-card px-2 py-1 text-xs font-medium text-muted-foreground">
          <ScanBarcode aria-hidden className="size-3.5" />
          Scan
        </span>
      )}
    </div>
  );
}

interface CategoryFilterProps {
  categories: PosCategory[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

/** Tab kategori bergaris bawah; bisa digulir horizontal di layar sempit. */
export function CategoryFilter({ categories, selectedId, onSelect }: CategoryFilterProps) {
  const options = [{ id: null, name: "Semua" }, ...categories];
  return (
    <div
      role="radiogroup"
      aria-label="Filter kategori"
      className="flex gap-5 overflow-x-auto [scrollbar-width:none]"
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
              "-mb-px shrink-0 border-b-2 py-2.5 text-sm whitespace-nowrap transition-colors",
              "focus-visible:text-foreground focus-visible:outline-none",
              active
                ? "border-primary font-semibold text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {option.name}
          </button>
        );
      })}
    </div>
  );
}
