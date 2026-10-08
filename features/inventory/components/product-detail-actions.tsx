"use client";

import { CircleCheck, CircleOff, PackagePlus, Pencil } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { Category, Product } from "@/types/domain";

import { BatchFormDialog } from "./batch-form-dialog";
import { ProductActiveDialog } from "./product-active-dialog";
import { ProductFormDialog } from "./product-form-dialog";

interface ProductDetailActionsProps {
  product: Product;
  categories: Category[];
  categoryName: string | null;
  defaultExpiryDays: number | null;
  today: string;
  suggestedBatchNumber: string;
}

export function ProductDetailActions({
  product,
  categories,
  categoryName,
  defaultExpiryDays,
  today,
  suggestedBatchNumber,
}: ProductDetailActionsProps) {
  const [dialog, setDialog] = useState<"batch" | "edit" | "active" | null>(null);
  const close = (open: boolean) => !open && setDialog(null);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={() => setDialog("active")}>
          {product.is_active ? <CircleOff /> : <CircleCheck />}
          {product.is_active ? "Nonaktifkan" : "Aktifkan"}
        </Button>
        <Button variant="outline" onClick={() => setDialog("edit")}>
          <Pencil />
          Edit Barang
        </Button>
        <Button onClick={() => setDialog("batch")}>
          <PackagePlus />
          Tambah Batch
        </Button>
      </div>

      <BatchFormDialog
        open={dialog === "batch"}
        onOpenChange={close}
        product={product}
        categoryName={categoryName}
        defaultExpiryDays={defaultExpiryDays}
        today={today}
        suggestedBatchNumber={suggestedBatchNumber}
      />
      <ProductFormDialog
        key={product.updated_at}
        open={dialog === "edit"}
        onOpenChange={close}
        categories={categories}
        product={product}
      />
      <ProductActiveDialog product={dialog === "active" ? product : null} onOpenChange={close} />
    </>
  );
}
