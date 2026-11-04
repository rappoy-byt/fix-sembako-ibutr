"use client";

import {
  ArrowLeft,
  CalendarX2,
  ChevronDown,
  CircleCheck,
  CircleOff,
  Eye,
  EyeOff,
  Package,
  PackageMinus,
  PackageOpen,
  PackageX,
  Pencil,
  Plus,
  Search,
  SearchX,
  TrendingDown,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatNumber, formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Category } from "@/types/domain";

import { getDaysUntilExpiry, getExpiryStatus } from "../lib/business-rules";
import type { InventoryProduct } from "../queries";
import { ProductActiveDialog } from "./product-active-dialog";
import { ProductFormDialog } from "./product-form-dialog";
import { ProductThumb } from "./product-thumb";
import { StockOutDialog } from "./stock-out-dialog";

/** Filter utama halaman: dipilih lewat panel ringkasan, atau tombol "tidak dijual". */
type ViewFilter = "all" | "low_stock" | "out_of_stock" | "expired" | "inactive";

const VIEW_TITLES: Record<ViewFilter, string> = {
  all: "Semua barang",
  low_stock: "Hampir habis",
  out_of_stock: "Habis",
  expired: "Ada stok kedaluwarsa",
  inactive: "Tidak dijual",
};

type Tone = "success" | "warning" | "danger" | "neutral";

const DOT_STYLES: Record<Tone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  neutral: "bg-muted-foreground/50",
};

interface InventoryTableProps {
  products: InventoryProduct[];
  categories: Category[];
  today: string;
}

export function InventoryTable({ products, categories, today }: InventoryTableProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [view, setView] = useState<ViewFilter>("all");

  const [isCreating, setIsCreating] = useState(false);
  const [editing, setEditing] = useState<InventoryProduct | null>(null);
  const [toggling, setToggling] = useState<InventoryProduct | null>(null);
  const [stockOut, setStockOut] = useState<InventoryProduct | null>(null);

  const categoryItems = useMemo(
    () => [{ value: "all", label: "Semua kategori" }, ...categories.map((c) => ({ value: c.id, label: c.name }))],
    [categories]
  );

  // Status stok hanya relevan untuk barang aktif (yang bisa dijual).
  const counts = useMemo(() => {
    const active = products.filter((p) => p.is_active);
    return {
      all: active.length,
      low_stock: active.filter((p) => p.stock.stockLevel === "low_stock").length,
      out_of_stock: active.filter((p) => p.stock.stockLevel === "out_of_stock").length,
      expired: products.filter((p) => p.stock.expiredStock > 0).length,
      inactive: products.length - active.length,
    };
  }, [products]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = products.filter((p) => {
      if (view === "inactive" ? p.is_active : !p.is_active && view !== "expired") return false;
      if (view === "low_stock" && p.stock.stockLevel !== "low_stock") return false;
      if (view === "out_of_stock" && p.stock.stockLevel !== "out_of_stock") return false;
      if (view === "expired" && p.stock.expiredStock <= 0) return false;
      if (categoryId !== "all" && p.category_id !== categoryId) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
    });
    // Sort stabil: dalam tingkat yang sama, urutan asal (terbaru dulu) tetap dipakai.
    return matches.sort((a, b) => urgencyRank(a, today) - urgencyRank(b, today));
  }, [products, query, categoryId, view, today]);

  function resetFilters() {
    setQuery("");
    setCategoryId("all");
    setView("all");
  }

  if (products.length === 0) {
    return (
      <>
        <EmptyState
          icon={PackageOpen}
          title="Belum ada barang"
          description="Tambahkan barang pertama, lalu isi stoknya di halaman detail barang."
          action={
            <Button onClick={() => setIsCreating(true)}>
              <Plus />
              Tambah Barang
            </Button>
          }
        />
        <ProductFormDialog
          open={isCreating}
          onOpenChange={setIsCreating}
          categories={categories}
          onSaved={(id) => router.push(`/barang/${id}`)}
        />
      </>
    );
  }

  return (
    <div className="space-y-4">
      <section aria-label="Kondisi stok" className="rounded-2xl border bg-card px-5 py-5 sm:px-6">
        <div className="grid grid-cols-2 gap-y-5 lg:grid-cols-4">
          <SummaryTile
            icon={Package}
            label="Barang dijual"
            value={counts.all}
            active={view === "all"}
            onSelect={() => setView("all")}
          />
          <SummaryTile
            icon={TrendingDown}
            label="Hampir habis"
            value={counts.low_stock}
            active={view === "low_stock"}
            onSelect={() => setView("low_stock")}
          />
          <SummaryTile
            icon={PackageX}
            label="Habis"
            value={counts.out_of_stock}
            active={view === "out_of_stock"}
            onSelect={() => setView("out_of_stock")}
          />
          <SummaryTile
            icon={CalendarX2}
            label="Kedaluwarsa"
            value={counts.expired}
            active={view === "expired"}
            onSelect={() => setView("expired")}
          />
        </div>
      </section>

      <section aria-label="Daftar barang" className="space-y-4 rounded-2xl border bg-card px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {view === "inactive" && (
              <Button variant="ghost" size="icon" aria-label="Kembali ke barang dijual" onClick={() => setView("all")}>
                <ArrowLeft />
              </Button>
            )}
            <h2 className="text-base font-semibold">
              {VIEW_TITLES[view]}
              <span className="font-normal text-muted-foreground"> · {formatNumber(filtered.length)} barang</span>
            </h2>
          </div>
          <Button className="h-10 px-4 text-sm" onClick={() => setIsCreating(true)}>
            <Plus />
            Tambah Barang
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-60 flex-1">
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nama barang…"
              aria-label="Cari nama barang atau SKU"
              className="h-10 pl-9 text-sm"
            />
          </div>
          <Select
            items={categoryItems}
            value={categoryId}
            onValueChange={(v) => setCategoryId((v as string | null) ?? "all")}
          >
            <SelectTrigger aria-label="Filter kategori" className="h-10 min-w-44 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categoryItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="Tidak ada barang yang cocok"
            description="Ubah kata kunci atau pilihan yang dipilih."
            action={
              <Button variant="outline" onClick={resetFilters}>
                Tampilkan semua barang
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {filtered.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                today={today}
                onEdit={() => setEditing(p)}
                onStockOut={() => setStockOut(p)}
                onToggleActive={() => setToggling(p)}
              />
            ))}
          </div>
        )}

        {view !== "inactive" && counts.inactive > 0 && (
          <Button variant="ghost" className="h-10 w-full text-sm text-muted-foreground" onClick={() => setView("inactive")}>
            <EyeOff />
            Lihat barang yang tidak dijual ({formatNumber(counts.inactive)})
          </Button>
        )}
      </section>

      <ProductFormDialog
        open={isCreating}
        onOpenChange={setIsCreating}
        categories={categories}
        onSaved={(id) => router.push(`/barang/${id}`)}
      />
      <ProductFormDialog
        key={editing?.id ?? "none"}
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        categories={categories}
        product={editing ?? undefined}
      />
      <ProductActiveDialog product={toggling} onOpenChange={(open) => !open && setToggling(null)} />
      <StockOutDialog
        key={`stock-out-${stockOut?.id ?? "none"}`}
        product={stockOut}
        onOpenChange={(open) => !open && setStockOut(null)}
      />
    </div>
  );
}

interface SummaryTileProps {
  icon: LucideIcon;
  label: string;
  value: number;
  active: boolean;
  onSelect: () => void;
}

/** Satu angka di panel ringkasan; mengklik-nya memfilter daftar barang. */
function SummaryTile({ icon: Icon, label, value, active, onSelect }: SummaryTileProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onSelect}
      className="group border-l px-5 text-left outline-none first:border-l-0 first:pl-0 odd:max-lg:border-l-0 odd:max-lg:pl-0 focus-visible:underline"
    >
      <span
        className={cn(
          "flex items-center gap-2 text-sm text-muted-foreground group-hover:text-foreground",
          active && "text-foreground"
        )}
      >
        <Icon aria-hidden className="size-4" />
        {label}
      </span>
      <span
        className={cn(
          "numeric mt-3 block text-3xl leading-none font-semibold tracking-tight",
          active && "text-primary"
        )}
      >
        {formatNumber(value)}
      </span>
    </button>
  );
}

interface ProductCardProps {
  product: InventoryProduct;
  today: string;
  onEdit: () => void;
  onStockOut: () => void;
  onToggleActive: () => void;
}

function ProductCard({ product: p, today, onEdit, onStockOut, onToggleActive }: ProductCardProps) {
  const status = describeStatus(p);
  const note = describeNote(p, today);
  const { availableStock } = p.stock;

  // Bar penuh ≈ 3× stok minimum, agar "hampir habis" terlihat pendek.
  const fullAt = Math.max(p.minimum_stock * 3, 1);
  const fill = availableStock <= 0 ? 0 : Math.max(5, Math.min(100, (availableStock / fullAt) * 100));

  return (
    <article className={cn("flex flex-col rounded-2xl bg-muted/70 p-2", !p.is_active && "opacity-75")}>
      <div className="flex items-center gap-4 px-2.5 pt-2.5 pb-4">
        <ProductThumb imageUrl={p.image_url} name={p.name} className="size-16 rounded-xl bg-card" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span aria-hidden className={cn("size-1.5 rounded-full", DOT_STYLES[status.tone])} />
            {status.label}
          </p>
          <Link
            href={`/barang/${p.id}`}
            className="mt-1 block truncate text-base font-semibold text-foreground hover:text-primary hover:underline"
          >
            {p.name}
          </Link>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">{p.category?.name ?? "Tanpa kategori"}</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">Harga jual</span>
          <span className="numeric font-semibold">
            {formatRupiah(p.selling_price)}
            <span className="text-xs font-normal text-muted-foreground"> / {p.unit}</span>
          </span>
        </div>

        <div className="my-3.5 h-px bg-border" />

        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">Sisa stok</span>
          <span
            className={cn(
              "numeric font-semibold",
              p.stock.stockLevel === "out_of_stock" && "text-danger",
              p.stock.stockLevel === "low_stock" && "text-warning"
            )}
          >
            {formatNumber(availableStock)}
            <span className="text-xs font-normal text-muted-foreground"> {p.unit}</span>
          </span>
        </div>
        <div
          aria-hidden
          className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[repeating-linear-gradient(90deg,var(--input)_0_3px,transparent_3px_7px)]"
        >
          <div
            className={cn("h-full rounded-full", p.stock.stockLevel === "low_stock" ? "bg-warning" : "bg-success")}
            style={{ width: `${fill}%` }}
          />
        </div>
        <p className={cn("mt-2.5 text-sm", note.className)}>{note.text}</p>

        <div className="mt-auto pt-4">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="outline" className="h-10 w-full text-sm" aria-label={`Kelola barang ${p.name}`} />
              }
            >
              Kelola barang
              <ChevronDown data-icon="inline-end" className="text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="min-w-48">
              <DropdownMenuItem onClick={onStockOut} disabled={p.stock.physicalStock <= 0}>
                <PackageMinus />
                Keluarkan stok
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit}>
                <Pencil />
                Ubah barang
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link href={`/barang/${p.id}`} />}>
                <Eye />
                Detail & batch stok
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {p.is_active ? (
                <DropdownMenuItem variant="destructive" onClick={onToggleActive}>
                  <CircleOff />
                  Nonaktifkan
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={onToggleActive}>
                  <CircleCheck />
                  Aktifkan
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </article>
  );
}

/** Barang yang paling perlu ditindak tampil lebih dulu: habis, hampir habis, lalu kedaluwarsa. */
function urgencyRank(p: InventoryProduct, today: string) {
  if (p.stock.stockLevel === "out_of_stock") return 0;
  if (p.stock.stockLevel === "low_stock") return 1;
  if (p.stock.expiredStock > 0) return 2;
  if (getExpiryStatus(p.stock.nearestSellableExpiry, today) === "near_expiry") return 3;
  return 4;
}

function describeStatus(p: InventoryProduct): { label: string; tone: Tone } {
  if (!p.is_active) return { label: "Tidak dijual", tone: "neutral" };
  if (p.stock.stockLevel === "out_of_stock") return { label: "Habis", tone: "danger" };
  if (p.stock.expiredStock > 0) return { label: "Ada yang kedaluwarsa", tone: "danger" };
  if (p.stock.stockLevel === "low_stock") return { label: "Hampir habis", tone: "warning" };
  return { label: "Aman", tone: "success" };
}

/** Satu baris keterangan di bawah bar stok — yang paling perlu diketahui pemilik. */
function describeNote(p: InventoryProduct, today: string): { text: string; className: string } {
  if (p.stock.expiredStock > 0) {
    return {
      text: `${formatNumber(p.stock.expiredStock)} ${p.unit} sudah kedaluwarsa`,
      className: "text-danger",
    };
  }
  const expiry = p.stock.nearestSellableExpiry;
  if (expiry && getExpiryStatus(expiry, today) === "near_expiry") {
    const days = getDaysUntilExpiry(expiry, today);
    return {
      text: days === 0 ? "Kedaluwarsa hari ini" : `Kedaluwarsa ${formatNumber(days)} hari lagi`,
      className: "text-warning",
    };
  }
  return { text: `Stok minimal ${formatNumber(p.minimum_stock)} ${p.unit}`, className: "text-muted-foreground" };
}
