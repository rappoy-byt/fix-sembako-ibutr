"use client";

import { Loader2, Save } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Category, Product } from "@/types/domain";

import { createProduct, updateProduct } from "../actions";
import type { FieldErrors, ProductField } from "../lib/validation";

const UNIT_SUGGESTIONS = ["pcs", "bungkus", "botol", "kotak", "dus", "kg", "liter", "karung", "sachet", "kaleng"];

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Pick<Category, "id" | "name" | "is_active">[];
  /** Ada = mode edit; tidak ada = tambah barang baru. */
  product?: Product;
  onSaved?: (productId: string) => void;
}

export function ProductFormDialog({ open, onOpenChange, categories, product, onSaved }: ProductFormDialogProps) {
  const isEdit = product !== undefined;
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<FieldErrors<ProductField>>({});
  const [categoryId, setCategoryId] = useState<string | null>(product?.category_id ?? null);

  // Kategori nonaktif tidak ditawarkan, kecuali sedang dipakai barang yang diedit.
  const options = categories.filter((c) => c.is_active || c.id === product?.category_id);
  const items = options.map((c) => ({ value: c.id, label: c.name }));

  function handleOpenChange(next: boolean) {
    if (isPending) return;
    if (next) {
      setErrors({});
      setCategoryId(product?.category_id ?? null);
    }
    onOpenChange(next);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = isEdit ? await updateProduct(product.id, formData) : await createProduct(formData);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.message);
        return;
      }
      setErrors({});
      toast.success(result.message);
      onOpenChange(false);
      onSaved?.(result.id);
    });
  }

  const fieldProps = (name: ProductField) => ({
    id: `product-${name}`,
    name,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `product-${name}-error` : undefined,
    disabled: isPending,
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {isEdit ? "Edit Barang" : "Tambah Barang"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Perbarui data master barang. Stok tidak diubah di sini — stok dikelola per batch."
              : "Barang baru langsung aktif. Stok ditambahkan melalui batch setelah barang dibuat."}
          </DialogDescription>
        </DialogHeader>

        <form id="product-form" onSubmit={handleSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
          <FormField id="product-name" label="Nama barang" required error={errors.name} className="sm:col-span-2">
            <Input {...fieldProps("name")} defaultValue={product?.name} maxLength={120} autoFocus className="h-9" />
          </FormField>

          <FormField id="product-sku" label="SKU" required error={errors.sku} hint="Otomatis huruf besar. Harus unik.">
            <Input
              {...fieldProps("sku")}
              defaultValue={product?.sku}
              maxLength={50}
              autoComplete="off"
              className="h-9 font-mono uppercase"
            />
          </FormField>

          <FormField id="product-category_id" label="Kategori" required error={errors.category_id}>
            <input type="hidden" name="category_id" value={categoryId ?? ""} />
            <Select
              items={items}
              value={categoryId}
              onValueChange={(value) => setCategoryId(value as string | null)}
              disabled={isPending}
            >
              <SelectTrigger
                id="product-category_id"
                className="h-9 w-full"
                aria-invalid={errors.category_id ? true : undefined}
              >
                <SelectValue placeholder="Pilih kategori" />
              </SelectTrigger>
              <SelectContent>
                {items.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField id="product-unit" label="Satuan" required error={errors.unit} hint="Contoh: pcs, bungkus, kg.">
            <Input
              {...fieldProps("unit")}
              defaultValue={product?.unit ?? "pcs"}
              list="unit-suggestions"
              maxLength={20}
              className="h-9"
            />
            <datalist id="unit-suggestions">
              {UNIT_SUGGESTIONS.map((u) => (
                <option key={u} value={u} />
              ))}
            </datalist>
          </FormField>

          <FormField
            id="product-minimum_stock"
            label="Stok minimum"
            required
            error={errors.minimum_stock}
            hint="Stok tersedia ≤ angka ini dianggap menipis."
          >
            <Input
              {...fieldProps("minimum_stock")}
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              defaultValue={product?.minimum_stock ?? 0}
              className="numeric h-9"
            />
          </FormField>

          <FormField id="product-purchase_price" label="Harga beli (Rp)" required error={errors.purchase_price}>
            <Input
              {...fieldProps("purchase_price")}
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              defaultValue={product?.purchase_price ?? ""}
              className="numeric h-9"
            />
          </FormField>

          <FormField id="product-selling_price" label="Harga jual (Rp)" required error={errors.selling_price}>
            <Input
              {...fieldProps("selling_price")}
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              defaultValue={product?.selling_price ?? ""}
              className="numeric h-9"
            />
          </FormField>

          <FormField
            id="product-image_url"
            label="URL gambar"
            error={errors.image_url}
            hint="Tautan gambar produk (https://…)."
            className="sm:col-span-2"
          >
            <Input
              {...fieldProps("image_url")}
              type="url"
              inputMode="url"
              defaultValue={product?.image_url ?? ""}
              placeholder="https://"
              className="h-9"
            />
          </FormField>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
            Batal
          </Button>
          <Button type="submit" form="product-form" disabled={isPending}>
            {isPending ? <Loader2 className="animate-spin" /> : <Save />}
            {isPending ? "Menyimpan…" : isEdit ? "Simpan Perubahan" : "Simpan Barang"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
