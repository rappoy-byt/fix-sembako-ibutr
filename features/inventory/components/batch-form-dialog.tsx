"use client";

import { Loader2, PackagePlus, RotateCcw } from "lucide-react";
import { useState, useTransition, type FormEvent } from "react";
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
import type { Product } from "@/types/domain";

import { createStockBatch } from "../actions";
import { addDaysToDate } from "../lib/business-rules";
import { validateBatchDates, type BatchField, type FieldErrors } from "../lib/validation";
import { ExpiryBadge } from "./stock-badges";

export interface BatchFormProduct {
  product: Pick<Product, "id" | "name" | "unit" | "purchase_price">;
  categoryName: string | null;
  defaultExpiryDays: number | null;
}

interface BatchFormDialogProps extends BatchFormProduct {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Tanggal bisnis WIB dari server. */
  today: string;
  suggestedBatchNumber: string;
}

export function BatchFormDialog({
  open,
  onOpenChange,
  product,
  categoryName,
  defaultExpiryDays,
  today,
  suggestedBatchNumber,
}: BatchFormDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<FieldErrors<BatchField | "product_id">>({});
  const [incomingDate, setIncomingDate] = useState(today);
  const [expiryDate, setExpiryDate] = useState(autoExpiry(today));
  const [expiryEdited, setExpiryEdited] = useState(false);

  const requiresExpiry = defaultExpiryDays !== null;

  function autoExpiry(incoming: string) {
    return defaultExpiryDays !== null && incoming ? addDaysToDate(incoming, defaultExpiryDays) : "";
  }

  function handleIncomingChange(value: string) {
    setIncomingDate(value);
    // Ikuti perubahan tanggal masuk selama pemilik belum mengoreksi kedaluwarsa manual.
    if (!expiryEdited) setExpiryDate(autoExpiry(value));
  }

  function resetExpiry() {
    setExpiryEdited(false);
    setExpiryDate(autoExpiry(incomingDate));
  }

  function handleOpenChange(next: boolean) {
    if (isPending) return;
    if (next) {
      setErrors({});
      setIncomingDate(today);
      setExpiryDate(autoExpiry(today));
      setExpiryEdited(false);
    }
    onOpenChange(next);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Umpan balik cepat di klien; server memvalidasi ulang dengan aturan yang sama.
    const dateErrors = validateBatchDates({
      incomingDate,
      expiryDate: expiryDate || null,
      today,
      requiresExpiry,
    });
    if (Object.keys(dateErrors).length > 0) {
      setErrors(dateErrors);
      return;
    }

    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await createStockBatch(formData);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.message, { duration: 10_000 });
        // Batch tersimpan tetapi movement gagal: tutup form agar tidak disimpan dua kali.
        if (!result.fieldErrors) onOpenChange(false);
        return;
      }
      toast.success(result.message);
      onOpenChange(false);
    });
  }

  const invalid = (name: BatchField) => ({
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `batch-${name}-error` : undefined,
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Tambah Batch Stok</DialogTitle>
          <DialogDescription>
            <strong className="text-foreground">{product.name}</strong>
            {categoryName && <> · {categoryName}</>}. Stok baru dicatat sebagai batch dan dijual
            dengan prinsip FEFO.
          </DialogDescription>
        </DialogHeader>

        <form id="batch-form" onSubmit={handleSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="product_id" value={product.id} />

          <FormField id="batch-batch_number" label="Nomor batch" required error={errors.batch_number}>
            <Input
              id="batch-batch_number"
              name="batch_number"
              defaultValue={suggestedBatchNumber}
              maxLength={50}
              autoComplete="off"
              disabled={isPending}
              className="h-9 font-mono"
              {...invalid("batch_number")}
            />
          </FormField>

          <FormField
            id="batch-quantity"
            label={`Jumlah (${product.unit})`}
            required
            error={errors.quantity}
          >
            <Input
              id="batch-quantity"
              name="quantity"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              autoFocus
              disabled={isPending}
              className="numeric h-9"
              {...invalid("quantity")}
            />
          </FormField>

          <FormField id="batch-incoming_date" label="Tanggal masuk" required error={errors.incoming_date}>
            <Input
              id="batch-incoming_date"
              name="incoming_date"
              type="date"
              value={incomingDate}
              max={today}
              onChange={(e) => handleIncomingChange(e.target.value)}
              disabled={isPending}
              className="h-9"
              {...invalid("incoming_date")}
            />
          </FormField>

          <FormField
            id="batch-expiry_date"
            label="Tanggal kedaluwarsa"
            required={requiresExpiry}
            error={errors.expiry_date}
            hint={
              requiresExpiry
                ? expiryEdited
                  ? "Dikoreksi manual."
                  : `Otomatis: tanggal masuk + ${formatNumber(defaultExpiryDays ?? 0)} hari. Bisa dikoreksi.`
                : "Kategori ini tanpa default. Kosongkan jika barang tidak punya tanggal kedaluwarsa."
            }
          >
            <div className="flex gap-2">
              <Input
                id="batch-expiry_date"
                name="expiry_date"
                type="date"
                value={expiryDate}
                min={incomingDate > today ? incomingDate : today}
                onChange={(e) => {
                  setExpiryDate(e.target.value);
                  setExpiryEdited(true);
                }}
                disabled={isPending}
                className="h-9"
                {...invalid("expiry_date")}
              />
              {requiresExpiry && expiryEdited && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon-lg"
                  onClick={resetExpiry}
                  disabled={isPending}
                  aria-label="Kembalikan ke tanggal otomatis"
                >
                  <RotateCcw />
                </Button>
              )}
            </div>
            {expiryDate && <ExpiryBadge expiryDate={expiryDate} today={today} />}
          </FormField>

          <FormField
            id="batch-purchase_price"
            label="Harga beli per unit (Rp)"
            required
            error={errors.purchase_price}
            hint="Terisi dari harga beli barang. Ubah jika harga batch ini berbeda."
            className="sm:col-span-2"
          >
            <Input
              id="batch-purchase_price"
              name="purchase_price"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              defaultValue={product.purchase_price}
              disabled={isPending}
              className="numeric h-9"
              {...invalid("purchase_price")}
            />
          </FormField>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
            Batal
          </Button>
          <Button type="submit" form="batch-form" disabled={isPending}>
            {isPending ? <Loader2 className="animate-spin" /> : <PackagePlus />}
            {isPending ? "Menyimpan…" : "Simpan Batch"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
