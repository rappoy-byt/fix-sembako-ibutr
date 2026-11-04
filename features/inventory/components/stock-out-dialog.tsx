"use client";

import { CalendarX2, Loader2, Minus, PackageMinus, PackageX, Plus, SlidersHorizontal, type LucideIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

import { removeStock, type StockOutReason } from "../actions";
import type { InventoryProduct } from "../queries";

const REASONS: { value: StockOutReason; label: string; hint: string; icon: LucideIcon }[] = [
  { value: "EXPIRED", label: "Kedaluwarsa", hint: "Lewat tanggal exp", icon: CalendarX2 },
  { value: "DAMAGE", label: "Rusak", hint: "Sobek, pecah, basi", icon: PackageX },
  { value: "ADJUSTMENT_OUT", label: "Koreksi", hint: "Hilang atau salah hitung", icon: SlidersHorizontal },
];

interface StockOutDialogProps {
  product: InventoryProduct | null;
  onOpenChange: (open: boolean) => void;
}

/** Mengeluarkan stok karena kedaluwarsa, rusak, atau koreksi (bukan penjualan). */
export function StockOutDialog({ product, onOpenChange }: StockOutDialogProps) {
  const [isPending, startTransition] = useTransition();
  const expiredStock = product?.stock.expiredStock ?? 0;
  const availableStock = product?.stock.availableStock ?? 0;
  const unit = product?.unit ?? "";

  const [reason, setReason] = useState<StockOutReason>(expiredStock > 0 ? "EXPIRED" : "DAMAGE");
  const [quantityText, setQuantityText] = useState("1");
  const [note, setNote] = useState("");

  const isExpired = reason === "EXPIRED";
  const quantity = Number(quantityText);
  const quantityError = isExpired
    ? undefined
    : !Number.isInteger(quantity) || quantity <= 0
      ? "Isi jumlah dengan bilangan bulat lebih dari 0."
      : quantity > availableStock
        ? `Stok layak jual hanya ${formatNumber(availableStock)} ${unit}.`
        : undefined;
  const removed = isExpired ? expiredStock : quantity;
  const canSubmit = isExpired ? expiredStock > 0 : availableStock > 0 && !quantityError;

  function step(delta: number) {
    const current = Number.isInteger(quantity) ? quantity : 0;
    setQuantityText(String(Math.min(Math.max(current + delta, 1), Math.max(availableStock, 1))));
  }

  function submit() {
    if (!product || !canSubmit) return;
    startTransition(async () => {
      const result = await removeStock({ productId: product.id, reason, quantity: isExpired ? 0 : quantity, note });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={product !== null} onOpenChange={(open) => !isPending && onOpenChange(open)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Keluarkan stok</DialogTitle>
          <DialogDescription>
            {product?.name} · layak jual {formatNumber(availableStock)} {unit}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium">Kenapa dikeluarkan?</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {REASONS.map((r) => {
                const disabled = r.value === "EXPIRED" ? expiredStock === 0 : availableStock === 0;
                const selected = reason === r.value;
                return (
                  <button
                    key={r.value}
                    type="button"
                    aria-pressed={selected}
                    disabled={disabled || isPending}
                    onClick={() => setReason(r.value)}
                    className={cn(
                      "flex flex-col gap-1 rounded-xl border px-3.5 py-3 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
                      selected ? "border-primary bg-accent ring-1 ring-primary" : "bg-card hover:bg-muted"
                    )}
                  >
                    <span
                      className={cn(
                        "flex items-center gap-2 text-sm font-semibold",
                        selected && "text-accent-foreground"
                      )}
                    >
                      <r.icon aria-hidden className="size-4" />
                      {r.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {r.value === "EXPIRED" && expiredStock === 0 ? "Tidak ada yang kedaluwarsa" : r.hint}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          {isExpired ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Stok yang sudah kedaluwarsa</p>
              <div className="flex items-center justify-between rounded-xl border px-4 py-3">
                <span className="numeric text-base font-semibold">
                  {formatNumber(expiredStock)} <span className="text-sm font-normal text-muted-foreground">{unit}</span>
                </span>
                <span className="text-xs text-danger">Tidak boleh dijual</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Semua stok yang sudah lewat tanggal dikeluarkan sekaligus. Stok layak jual tidak berubah.
              </p>
            </div>
          ) : (
            <>
              <FormField
                id="stock-out-quantity"
                label="Berapa yang dikeluarkan?"
                required
                error={quantityError}
                hint="Diambil otomatis dari stok yang paling cepat kedaluwarsa."
              >
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="size-11"
                    aria-label="Kurangi jumlah"
                    onClick={() => step(-1)}
                    disabled={isPending}
                  >
                    <Minus />
                  </Button>
                  <Input
                    id="stock-out-quantity"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={availableStock}
                    step={1}
                    value={quantityText}
                    onChange={(e) => setQuantityText(e.target.value)}
                    aria-invalid={quantityError !== undefined}
                    className="numeric h-11 w-24 text-center text-base"
                    disabled={isPending}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="size-11"
                    aria-label="Tambah jumlah"
                    onClick={() => step(1)}
                    disabled={isPending}
                  >
                    <Plus />
                  </Button>
                  <span className="text-sm text-muted-foreground">{unit}</span>
                </div>
              </FormField>
              <FormField id="stock-out-note" label="Catatan">
                <Input
                  id="stock-out-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={200}
                  placeholder={reason === "DAMAGE" ? "Kemasan sobek kena tikus" : "Hasil hitung ulang rak"}
                  className="h-10"
                  disabled={isPending}
                />
              </FormField>
            </>
          )}

          <div className="flex items-center justify-between rounded-xl bg-muted px-4 py-3 text-sm">
            <span className="text-muted-foreground">Stok layak jual</span>
            <span className="numeric font-semibold">
              {isExpired || quantityError ? (
                <>
                  {formatNumber(availableStock)} {unit}
                  {isExpired && <span className="font-normal text-muted-foreground"> (tidak berubah)</span>}
                </>
              ) : (
                <>
                  {formatNumber(availableStock)} <span className="font-normal text-muted-foreground">→</span>{" "}
                  {formatNumber(availableStock - quantity)} {unit}
                </>
              )}
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Batal
          </Button>
          <Button variant="destructive" onClick={submit} disabled={!canSubmit || isPending}>
            {isPending ? <Loader2 className="animate-spin" /> : <PackageMinus />}
            {canSubmit ? `Keluarkan ${formatNumber(removed)} ${unit}` : "Keluarkan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
