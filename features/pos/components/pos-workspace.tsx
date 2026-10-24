"use client";

import { ChevronUp, PackageOpen, SearchX, ShoppingBasket } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { toast } from "sonner";

import { usePosNavigationGuard } from "@/components/layout/pos-navigation-guard";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatNumber, formatRupiah } from "@/lib/format";
import type { PaymentMethod } from "@/types/domain";

import { checkout } from "../actions";
import { cartReducer, getCartTotals, resolveCart, type CartAction } from "../lib/cart";
import { matchesQuery, sortPosProducts, type PosCategory, type PosProduct } from "../lib/catalog";
import { describeCheckoutError, type CheckoutReceipt } from "../lib/checkout";
import { getPosGuardLevel } from "../lib/navigation-guard";
import { CartPanel } from "./cart-panel";
import { CategoryFilter, ProductSearch } from "./catalog-toolbar";
import { CheckoutSuccessDialog } from "./checkout-success-dialog";
import { parsePaidAmount, PaymentDialog } from "./payment-dialog";
import { ProductCard } from "./product-card";

const BLOCKED_MESSAGE: Record<Exclude<PosProduct["sellability"], "sellable">, string> = {
  out_of_stock: "stok habis",
  expired: "stok yang tersisa sudah expired",
  inactive: "barang nonaktif",
};

interface PosWorkspaceProps {
  products: PosProduct[];
  categories: PosCategory[];
  /** Tanggal bisnis WIB dari server. */
  today: string;
}

export function PosWorkspace({ products, categories, today }: PosWorkspaceProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [lines, dispatch] = useReducer(cartReducer, []);
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [paidAmount, setPaidAmount] = useState("");
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<CheckoutReceipt | null>(null);

  /** Penjaga double click: true selama request checkout berjalan. */
  const inFlightRef = useRef(false);
  /**
   * transaction_id percobaan yang hasilnya belum pasti (mis. koneksi putus).
   * Dipakai ulang saat Bayar ditekan lagi agar RPC mengembalikan transaksi yang
   * sama (already_processed), bukan membuat transaksi kedua.
   */
  const pendingTransactionIdRef = useRef<string | null>(null);

  const sorted = useMemo(() => sortPosProducts(products), [products]);
  const productsById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const imageUrls = useMemo(() => new Map(products.map((p) => [p.id, p.imageUrl])), [products]);
  const inactiveCount = useMemo(() => products.filter((p) => p.sellability === "inactive").length, [products]);

  const visible = useMemo(
    () =>
      sorted.filter(
        (p) =>
          (showInactive || p.sellability !== "inactive") &&
          (categoryId === null || p.categoryId === categoryId) &&
          matchesQuery(p, query)
      ),
    [sorted, showInactive, categoryId, query]
  );

  // POS Focus Mode: laporkan status transaksi ke penjaga navigasi di layout.
  // Dibaca di dalam efek (bukan saat render) karena pendingTransactionIdRef adalah ref;
  // efek berjalan ulang setiap isi keranjang atau status kirim berubah, termasuk
  // sesudah handlePay selesai (setIsSubmitting(false)).
  const { reportPosState } = usePosNavigationGuard();
  useEffect(() => {
    reportPosState(
      getPosGuardLevel({
        lineCount: lines.length,
        isSubmitting,
        hasPendingTransactionId: pendingTransactionIdRef.current !== null,
      })
    );
  }, [reportPosState, lines.length, isSubmitting]);
  // Saat kasir ditinggalkan (unmount, atau disembunyikan oleh <Activity> Next.js),
  // laporkan kasir tidak aktif (null) agar menu lain kembali normal. Saat terlihat
  // lagi, efek di atas berjalan ulang dan melaporkan status terbaru.
  useEffect(() => () => reportPosState(null), [reportPosState]);

  const cartItems = useMemo(() => resolveCart(lines, productsById), [lines, productsById]);
  const quantityInCart = useMemo(() => new Map(lines.map((l) => [l.productId, l.quantity])), [lines]);
  const totals = getCartTotals(cartItems);
  const paid = parsePaidAmount(paidAmount);

  /** Syarat membuka layar pembayaran (dari panel pesanan). */
  const cartBlockReason =
    totals.lineCount === 0
      ? "Tambahkan barang ke keranjang untuk membayar."
      : totals.hasIssues
        ? "Perbaiki barang bertanda merah di keranjang sebelum membayar."
        : null;
  /** Syarat menyelesaikan pembayaran (di layar pembayaran). */
  const blockReason =
    cartBlockReason ??
    (method === "CASH" && paid === null
      ? "Masukkan nominal uang yang diterima."
      : method === "CASH" && paid !== null && paid < totals.total
        ? "Uang yang diterima kurang dari total."
        : null);

  /** Setiap perubahan isi keranjang = checkout baru → transaction_id baru. */
  function updateCart(action: CartAction) {
    pendingTransactionIdRef.current = null;
    dispatch(action);
  }

  function addProduct(product: PosProduct) {
    if (product.sellability !== "sellable") {
      toast.error(`${product.name} tidak bisa dijual: ${BLOCKED_MESSAGE[product.sellability]}.`);
      return;
    }
    if ((quantityInCart.get(product.id) ?? 0) >= product.availableStock) {
      toast.warning(`Stok tersedia ${product.name} sudah habis masuk keranjang.`);
      return;
    }
    updateCart({ type: "add", product });
  }

  /** Enter di kolom cari: SKU persis, atau satu-satunya hasil yang bisa dijual. */
  function handleSearchSubmit() {
    const q = query.trim().toLowerCase();
    if (!q) return;
    const exact = products.find((p) => p.sku.toLowerCase() === q);
    const sellableResults = visible.filter((p) => p.sellability === "sellable");
    const target = exact ?? (sellableResults.length === 1 ? sellableResults[0] : undefined);
    if (!target) {
      toast.info(`Tidak ada SKU "${query.trim()}". Pilih barang dari hasil pencarian.`);
      return;
    }
    addProduct(target);
    if (target.sellability === "sellable") setQuery("");
  }

  function clearCart() {
    updateCart({ type: "clear" });
    setPaidAmount("");
  }

  async function handlePay() {
    // Penjaga sinkron: klik kedua sebelum state ter-render ulang tetap ditolak.
    if (inFlightRef.current || blockReason !== null) return;
    inFlightRef.current = true;
    setIsSubmitting(true);

    const transactionId = pendingTransactionIdRef.current ?? crypto.randomUUID();
    pendingTransactionIdRef.current = transactionId;

    try {
      const result = await checkout({
        transactionId,
        items: cartItems.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        paymentMethod: method,
        paidAmount: method === "CASH" ? paid : totals.total,
        expectedTotal: totals.total,
      });

      if (result.ok) {
        pendingTransactionIdRef.current = null;
        dispatch({ type: "clear" });
        setPaidAmount("");
        setMethod("CASH");
        setMobileCartOpen(false);
        setPaymentOpen(false);
        setReceipt(result.receipt);
        router.refresh(); // stok terbaru setelah dikurangi FEFO
        return;
      }

      // Error dari database = sudah rollback → percobaan berikutnya pakai id baru.
      if (!result.outcomeUnknown) pendingTransactionIdRef.current = null;
      toast.error(result.message, { duration: 10_000 });
      if (result.shouldRefresh) router.refresh();
    } catch (error) {
      // Request tidak sampai / respons hilang: hasil di server tidak pasti.
      // transaction_id dipertahankan agar Bayar ulang tidak menggandakan transaksi.
      console.error("[checkout] request gagal:", error);
      toast.error(describeCheckoutError("NETWORK"), { duration: 10_000 });
      router.refresh();
    } finally {
      inFlightRef.current = false;
      setIsSubmitting(false);
    }
  }

  function openPayment() {
    if (cartBlockReason !== null) return;
    // Sheet keranjang mobile ditutup agar tidak ada dua overlay bertumpuk.
    setMobileCartOpen(false);
    setPaymentOpen(true);
  }

  const cartPanelProps = {
    items: cartItems,
    imageUrls,
    onQuantityChange: (productId: string, quantity: number) =>
      updateCart({
        type: "setQuantity",
        productId,
        quantity,
        maxQuantity: productsById.get(productId)?.availableStock ?? 0,
      }),
    onRemove: (productId: string) => updateCart({ type: "remove", productId }),
    onClear: clearCart,
    blockReason: cartBlockReason,
    isSubmitting,
    onCheckout: openPayment,
  };

  const successDialog = <CheckoutSuccessDialog receipt={receipt} onClose={() => setReceipt(null)} />;

  if (products.length === 0) {
    return (
      <>
        <EmptyState
          icon={PackageOpen}
          title="Belum ada barang untuk dijual"
          description="Tambahkan barang dan batch stoknya di halaman Barang, lalu kembali ke kasir."
          action={
            <Button render={<Link href="/barang" />} nativeButton={false}>
              Buka halaman Barang
            </Button>
          }
        />
        {successDialog}
      </>
    );
  }

  return (
    <>
      <div className="grid gap-4 lg:h-[calc(100svh-2rem)] lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px]">
        <section
          aria-label="Katalog barang"
          className="mb-20 flex min-h-0 flex-col overflow-hidden rounded-xl border bg-card lg:mb-0"
        >
          <div className="space-y-1 border-b px-4 pt-3">
            <ProductSearch value={query} onChange={setQuery} onSubmit={handleSearchSubmit} />
            <CategoryFilter categories={categories} selectedId={categoryId} onSelect={setCategoryId} />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-3 pb-2 text-xs text-muted-foreground">
            <span className="numeric">
              {formatNumber(visible.length)} barang
              {visible.length !== products.length && ` dari ${formatNumber(products.length)}`}
            </span>
            {inactiveCount > 0 && (
              <label className="inline-flex cursor-pointer items-center gap-1.5 select-none">
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                  className="size-3.5 accent-(--primary)"
                />
                Tampilkan {formatNumber(inactiveCount)} barang nonaktif
              </label>
            )}
          </div>

          <div className="min-h-0 flex-1 px-4 pb-4 lg:overflow-y-auto">
            {visible.length === 0 ? (
              <EmptyState
                icon={SearchX}
                title="Barang tidak ditemukan"
                description="Coba kata kunci lain, periksa SKU, atau pilih kategori Semua."
              />
            ) : (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {visible.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    inCart={quantityInCart.get(product.id) ?? 0}
                    today={today}
                    onAdd={addProduct}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        <CartPanel {...cartPanelProps} className="hidden lg:flex" />
      </div>

      {/* Layar kecil: ringkasan keranjang menempel di bawah, isi lengkap di sheet. */}
      <div className="fixed right-0 bottom-0 left-26 z-20 border-t bg-background/95 p-3 backdrop-blur lg:hidden">
        <Button size="lg" className="h-12 w-full justify-between text-base" onClick={() => setMobileCartOpen(true)}>
          <span className="flex items-center gap-2">
            <ShoppingBasket />
            {totals.lineCount === 0 ? "Keranjang kosong" : `${formatNumber(totals.itemCount)} unit`}
          </span>
          <span className="numeric flex items-center gap-1.5 font-semibold">
            {formatRupiah(totals.total)}
            <ChevronUp />
          </span>
        </Button>
      </div>

      <Sheet open={mobileCartOpen} onOpenChange={setMobileCartOpen}>
        <SheetContent side="bottom" className="max-h-[90svh] gap-0 p-0 lg:hidden">
          <SheetHeader className="sr-only">
            <SheetTitle>Keranjang</SheetTitle>
            <SheetDescription>Isi keranjang dan pembayaran</SheetDescription>
          </SheetHeader>
          <CartPanel {...cartPanelProps} className="min-h-0 rounded-none border-0" />
        </SheetContent>
      </Sheet>

      <PaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        total={totals.total}
        method={method}
        onMethodChange={setMethod}
        paidAmount={paidAmount}
        onPaidAmountChange={setPaidAmount}
        blockReason={blockReason}
        isSubmitting={isSubmitting}
        onPay={handlePay}
      />

      {successDialog}
    </>
  );
}
