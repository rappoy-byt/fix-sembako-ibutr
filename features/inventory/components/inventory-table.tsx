"use client";

import {
  CircleCheck,
  CircleOff,
  Eye,
  MoreHorizontal,
  PackageOpen,
  Pencil,
  Plus,
  Search,
  SearchX,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatNumber, formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Category } from "@/types/domain";

import type { InventoryProduct } from "../queries";
import { ProductActiveDialog } from "./product-active-dialog";
import { ProductFormDialog } from "./product-form-dialog";
import { ProductThumb } from "./product-thumb";
import { ExpiredStockBadge, ExpiryBadge, ProductActiveBadge, StockLevelBadge } from "./stock-badges";

type StatusFilter = "all" | "active" | "inactive";
type StockFilter = "all" | "low_stock" | "out_of_stock" | "expired";

const STATUS_ITEMS = [
  { value: "all", label: "Semua status" },
  { value: "active", label: "Aktif" },
  { value: "inactive", label: "Nonaktif" },
];

const STOCK_ITEMS = [
  { value: "all", label: "Semua stok" },
  { value: "low_stock", label: "Stok menipis" },
  { value: "out_of_stock", label: "Stok habis" },
  { value: "expired", label: "Ada batch expired" },
];

interface InventoryTableProps {
  products: InventoryProduct[];
  categories: Category[];
  today: string;
}

export function InventoryTable({ products, categories, today }: InventoryTableProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [stock, setStock] = useState<StockFilter>("all");

  const [isCreating, setIsCreating] = useState(false);
  const [editing, setEditing] = useState<InventoryProduct | null>(null);
  const [toggling, setToggling] = useState<InventoryProduct | null>(null);

  const categoryItems = useMemo(
    () => [{ value: "all", label: "Semua kategori" }, ...categories.map((c) => ({ value: c.id, label: c.name }))],
    [categories]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (categoryId !== "all" && p.category_id !== categoryId) return false;
      if (status === "active" && !p.is_active) return false;
      if (status === "inactive" && p.is_active) return false;
      if (stock === "low_stock" && p.stock.stockLevel !== "low_stock") return false;
      if (stock === "out_of_stock" && p.stock.stockLevel !== "out_of_stock") return false;
      if (stock === "expired" && p.stock.expiredStock <= 0) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
    });
  }, [products, query, categoryId, status, stock]);

  const hasFilter = query !== "" || categoryId !== "all" || status !== "all" || stock !== "all";

  function resetFilters() {
    setQuery("");
    setCategoryId("all");
    setStatus("all");
    setStock("all");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-60 flex-1">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama barang atau SKU…"
            aria-label="Cari nama barang atau SKU"
            className="h-9 bg-card pl-9"
          />
        </div>
        <FilterSelect label="Filter kategori" items={categoryItems} value={categoryId} onChange={setCategoryId} />
        <FilterSelect
          label="Filter status"
          items={STATUS_ITEMS}
          value={status}
          onChange={(v) => setStatus(v as StatusFilter)}
        />
        <FilterSelect
          label="Filter stok"
          items={STOCK_ITEMS}
          value={stock}
          onChange={(v) => setStock(v as StockFilter)}
        />
        <Button size="lg" onClick={() => setIsCreating(true)}>
          <Plus />
          Tambah Barang
        </Button>
      </div>

      {products.length === 0 ? (
        <EmptyState
          icon={PackageOpen}
          title="Belum ada barang"
          description="Tambahkan barang pertama, lalu isi stoknya melalui batch di halaman detail barang."
          action={
            <Button onClick={() => setIsCreating(true)}>
              <Plus />
              Tambah Barang
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="Tidak ada barang yang cocok"
          description="Ubah kata kunci atau filter yang dipilih."
          action={
            <Button variant="outline" onClick={resetFilters}>
              Reset filter
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="pl-4">Barang</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead className="text-right">Harga beli</TableHead>
                <TableHead className="text-right">Harga jual</TableHead>
                <TableHead>Stok tersedia</TableHead>
                <TableHead>Terdekat expired</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12 pr-4">
                  <span className="sr-only">Aksi</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id} className={cn(!p.is_active && "bg-muted/30 text-muted-foreground")}>
                  <TableCell className="pl-4">
                    <div className="flex items-center gap-3">
                      <ProductThumb imageUrl={p.image_url} name={p.name} className={cn(!p.is_active && "opacity-60")} />
                      <div className="min-w-0">
                        <Link
                          href={`/barang/${p.id}`}
                          className="block max-w-64 truncate font-medium text-foreground hover:text-primary hover:underline"
                        >
                          {p.name}
                        </Link>
                        <p className="font-mono text-xs text-muted-foreground">{p.sku}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{p.category?.name ?? "—"}</TableCell>
                  <TableCell className="numeric text-right">{formatRupiah(p.purchase_price)}</TableCell>
                  <TableCell className="numeric text-right font-medium">
                    {formatRupiah(p.selling_price)}
                    <span className="block text-xs font-normal text-muted-foreground">/{p.unit}</span>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <StockLevelBadge
                        availableStock={p.stock.availableStock}
                        minimumStock={p.minimum_stock}
                        unit={p.unit}
                        showQuantity
                      />
                      <p className="numeric text-xs text-muted-foreground">
                        min {formatNumber(p.minimum_stock)} {p.unit}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {p.stock.nearestSellableExpiry ? (
                        <ExpiryBadge expiryDate={p.stock.nearestSellableExpiry} today={today} />
                      ) : (
                        p.stock.expiredStock === 0 && <span className="text-xs text-muted-foreground">—</span>
                      )}
                      <ExpiredStockBadge quantity={p.stock.expiredStock} unit={p.unit} />
                    </div>
                  </TableCell>
                  <TableCell>
                    <ProductActiveBadge isActive={p.is_active} />
                  </TableCell>
                  <TableCell className="pr-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={<Button variant="ghost" size="icon" aria-label={`Aksi untuk ${p.name}`} />}
                      >
                        <MoreHorizontal />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem render={<Link href={`/barang/${p.id}`} />}>
                          <Eye />
                          Detail & batch stok
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEditing(p)}>
                          <Pencil />
                          Edit barang
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {p.is_active ? (
                          <DropdownMenuItem variant="destructive" onClick={() => setToggling(p)}>
                            <CircleOff />
                            Nonaktifkan
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => setToggling(p)}>
                            <CircleCheck />
                            Aktifkan
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="border-t px-4 py-2.5 text-xs text-muted-foreground">
            Menampilkan {formatNumber(filtered.length)} dari {formatNumber(products.length)} barang
            {hasFilter && " (difilter)"} · urut dari yang terbaru
          </p>
        </div>
      )}

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
    </div>
  );
}

interface FilterSelectProps {
  label: string;
  items: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}

function FilterSelect({ label, items, value, onChange }: FilterSelectProps) {
  return (
    <Select items={items} value={value} onValueChange={(v) => onChange((v as string | null) ?? "all")}>
      <SelectTrigger aria-label={label} className="h-9 min-w-40 bg-card">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
