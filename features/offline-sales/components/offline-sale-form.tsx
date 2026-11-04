"use client";

import { Combobox } from "@base-ui/react/combobox";
import { Check, Clock, Loader2, Minus, PackageOpen, Plus, Search, ShoppingBasket, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { checkout } from "@/features/pos/actions";
import { describeCheckoutError } from "@/features/pos/lib/checkout";
import type { PosProduct } from "@/features/pos/lib/catalog";
import { formatNumber, formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PaymentMethod } from "@/types/domain";

/** Kasir hanya menerima CASH dan QRIS (lihat features/pos/actions.ts). */
const PAYMENT_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: "CASH", label: "Tunai" },
  { value: "QRIS", label: "QRIS" },
];

interface Line {
  productId: string;
  quantity: number;
}

interface OfflineSaleFormProps {
  /** Hanya barang yang bisa dijual (aktif dan punya stok layak jual). */
  products: PosProduct[];
}

/**
 * Mencatat penjualan yang terjadi tanpa kasir. Disimpan lewat aksi checkout kasir
 * yang sama (RPC atomik, harga dari database, stok FEFO); uang dianggap pas.
 */
export function OfflineSaleForm({ products }: OfflineSaleFormProps) {
  const router = useRouter();
  const [lines, setLines] = useState<Line[]>([]);
  const [search, setSearch] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inFlightRef = useRef(false);
  // Dipertahankan bila hasil tidak pasti, agar simpan ulang tidak menggandakan transaksi.
  const pendingTransactionIdRef = useRef<string | null>(null);

  const productById = new Map(products.map((p) => [p.id, p]));
  const quantityOf = (productId: string) => lines.find((l) => l.productId === productId)?.quantity ?? 0;
  const overStock = lines.find((l) => l.quantity > (productById.get(l.productId)?.availableStock ?? 0));
  const total = lines.reduce((sum, l) => sum + (productById.get(l.productId)?.price ?? 0) * l.quantity, 0);
  const blockReason =
    lines.length === 0
      ? "Tambahkan minimal satu barang."
      : overStock
        ? `Stok ${productById.get(overStock.productId)?.name} hanya ${formatNumber(productById.get(overStock.productId)?.availableStock ?? 0)}.`
        : null;

  function setQuantity(productId: string, quantity: number) {
    setLines((current) => current.map((l) => (l.productId === productId ? { ...l, quantity } : l)));
  }

  /** Barang dari pencarian: baris baru, atau jumlahnya +1 bila sudah ada di daftar. */
  function addProduct(product: PosProduct) {
    setLines((current) =>
      current.some((l) => l.productId === product.id)
        ? current.map((l) => (l.productId === product.id ? { ...l, quantity: l.quantity + 1 } : l))
        : [...current, { productId: product.id, quantity: 1 }]
    );
    setSearch("");
  }

  async function handleSave() {
    if (inFlightRef.current || blockReason !== null) return;
    inFlightRef.current = true;
    setIsSubmitting(true);

    const transactionId = pendingTransactionIdRef.current ?? crypto.randomUUID();
    pendingTransactionIdRef.current = transactionId;

    try {
      const result = await checkout({
        transactionId,
        items: lines.map(({ productId, quantity }) => ({ productId, quantity })),
        paymentMethod: method,
        paidAmount: total,
        expectedTotal: total,
      });

      if (result.ok) {
        pendingTransactionIdRef.current = null;
        toast.success(`Penjualan tersimpan sebagai ${result.receipt.transactionNumber}.`);
        setLines([]);
        setMethod("CASH");
        router.refresh();
        return;
      }

      // Error dari database = sudah rollback → percobaan berikutnya pakai id baru.
      if (!result.outcomeUnknown) pendingTransactionIdRef.current = null;
      toast.error(result.message, { duration: 10_000 });
      if (result.shouldRefresh) router.refresh();
    } catch (error) {
      console.error("[catat-offline] request gagal:", error);
      toast.error(describeCheckoutError("NETWORK"), { duration: 10_000 });
      router.refresh();
    } finally {
      inFlightRef.current = false;
      setIsSubmitting(false);
    }
  }

  if (products.length === 0) {
    return (
      <EmptyState
        icon={PackageOpen}
        title="Belum ada barang yang bisa dijual"
        description="Penjualan offline hanya bisa dicatat untuk barang aktif yang masih punya stok."
        action={
          <Button variant="outline" render={<Link href="/barang" />} nativeButton={false}>
            Ke halaman Barang
          </Button>
        }
      />
    );
  }

  return (
    <section aria-label="Form penjualan offline" className="rounded-2xl border bg-card px-5 py-5 sm:px-6">
      <h2 className="text-base font-semibold">Barang yang terjual</h2>

      <Combobox.Root<PosProduct>
        items={products}
        value={null}
        onValueChange={(product) => product && addProduct(product)}
        inputValue={search}
        onInputValueChange={setSearch}
        itemToStringLabel={(product) => product.name}
        autoHighlight
        disabled={isSubmitting}
      >
        <div className="relative mt-3">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground"
          />
          <Combobox.Input
            aria-label="Cari barang yang terjual"
            placeholder="Ketik nama barang, misal: indomie"
            className="h-12 w-full rounded-xl border border-input bg-transparent pr-3 pl-11 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
          />
        </div>
        <Combobox.Portal>
          <Combobox.Positioner sideOffset={6} className="isolate z-50">
            <Combobox.Popup className="max-h-80 w-(--anchor-width) overflow-y-auto rounded-xl bg-popover p-1.5 text-popover-foreground shadow-md ring-1 ring-foreground/10">
              <Combobox.Empty className="px-3 py-4 text-center text-sm text-muted-foreground empty:hidden">
                Barang tidak ditemukan
              </Combobox.Empty>
              <Combobox.List>
                {(product: PosProduct) => {
                  const inList = quantityOf(product.id);
                  return (
                    <Combobox.Item
                      key={product.id}
                      value={product}
                      disabled={inList >= product.availableStock}
                      className="flex cursor-default items-center justify-between gap-3 rounded-lg px-3 py-2.5 outline-none select-none data-disabled:opacity-50 data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                    >
                      <span className="min-w-0 truncate text-sm font-medium">{product.name}</span>
                      <span className="numeric shrink-0 text-xs text-muted-foreground">
                        {formatRupiah(product.price)} · sisa {formatNumber(product.availableStock)}
                        {inList > 0 && ` · di daftar ${formatNumber(inList)}`}
                      </span>
                    </Combobox.Item>
                  );
                }}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>

      {lines.length === 0 ? (
        <div className="mt-4 flex flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center">
          <ShoppingBasket aria-hidden className="size-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Belum ada barang. Cari barang yang terjual di atas.</p>
        </div>
      ) : (
        <ul className="mt-2 divide-y">
          {lines.map((line) => {
            const product = productById.get(line.productId);
            return (
              <li
                key={line.productId}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]"
              >
                <div className="col-span-2 min-w-0 sm:col-span-1">
                  <p className="truncate text-base font-semibold">{product?.name ?? "Barang tidak ditemukan"}</p>
                  {product && (
                    <p className="numeric mt-1 text-sm text-muted-foreground">
                      {formatRupiah(product.price)} / {product.unit} · sisa {formatNumber(product.availableStock)}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    className="size-10"
                    aria-label="Kurangi jumlah"
                    onClick={() => setQuantity(line.productId, Math.max(1, line.quantity - 1))}
                    disabled={isSubmitting || line.quantity <= 1}
                  >
                    <Minus />
                  </Button>
                  <span className="numeric min-w-8 text-center text-base font-semibold" aria-live="polite">
                    {formatNumber(line.quantity)}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    className="size-10"
                    aria-label="Tambah jumlah"
                    onClick={() => setQuantity(line.productId, line.quantity + 1)}
                    disabled={isSubmitting}
                  >
                    <Plus />
                  </Button>
                </div>

                <span className="numeric text-right text-sm font-semibold sm:min-w-24">
                  {formatRupiah((product?.price ?? 0) * line.quantity)}
                </span>

                <Button
                  type="button"
                  variant="ghost"
                  className="size-10 text-muted-foreground"
                  aria-label={`Hapus ${product?.name ?? "barang"}`}
                  onClick={() => setLines((current) => current.filter((l) => l.productId !== line.productId))}
                  disabled={isSubmitting}
                >
                  <Trash2 />
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-5 flex items-baseline justify-between border-t pt-4">
        <span className="text-sm text-muted-foreground">Total</span>
        <span className="numeric text-2xl font-semibold tracking-tight">{formatRupiah(total)}</span>
      </div>

      <fieldset className="mt-5">
        <legend className="mb-2 text-sm font-medium">Dibayar pakai</legend>
        <div className="flex gap-2">
          {PAYMENT_OPTIONS.map((option) => {
            const selected = method === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={selected}
                onClick={() => setMethod(option.value)}
                disabled={isSubmitting}
                className={cn(
                  "h-11 flex-1 rounded-xl border text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  selected
                    ? "border-primary bg-accent font-semibold text-accent-foreground ring-1 ring-primary"
                    : "bg-card hover:bg-muted"
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock aria-hidden className="size-3.5" />
        Tercatat dengan jam sekarang
      </p>
      {blockReason && (
        <p role="alert" className="mt-2 text-sm font-medium text-danger">
          {blockReason}
        </p>
      )}

      <Button className="mt-3 h-12 w-full text-base" onClick={handleSave} disabled={isSubmitting || blockReason !== null}>
        {isSubmitting ? <Loader2 className="animate-spin" /> : <Check />}
        Simpan penjualan
      </Button>
    </section>
  );
}
