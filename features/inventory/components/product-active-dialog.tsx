"use client";

import { CircleCheck, CircleOff, Loader2 } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Product } from "@/types/domain";

import { setProductActive } from "../actions";

interface ProductActiveDialogProps {
  product: Pick<Product, "id" | "name" | "is_active"> | null;
  onOpenChange: (open: boolean) => void;
}

/** Konfirmasi aktif/nonaktif. Tidak ada hard delete — hanya is_active. */
export function ProductActiveDialog({ product, onOpenChange }: ProductActiveDialogProps) {
  const [isPending, startTransition] = useTransition();
  const willActivate = product ? !product.is_active : false;

  function confirm() {
    if (!product) return;
    startTransition(async () => {
      const result = await setProductActive(product.id, willActivate);
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {willActivate ? "Aktifkan barang?" : "Nonaktifkan barang?"}
          </DialogTitle>
          <DialogDescription>
            {willActivate ? (
              <>
                <strong className="text-foreground">{product?.name}</strong> akan kembali muncul di
                kasir dan dapat dijual jika stoknya tersedia.
              </>
            ) : (
              <>
                <strong className="text-foreground">{product?.name}</strong> tidak akan muncul di
                kasir. Data barang dan riwayat batch tetap tersimpan, dan barang dapat diaktifkan
                kembali kapan saja.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Batal
          </Button>
          <Button variant={willActivate ? "default" : "destructive"} onClick={confirm} disabled={isPending}>
            {isPending ? <Loader2 className="animate-spin" /> : willActivate ? <CircleCheck /> : <CircleOff />}
            {willActivate ? "Aktifkan" : "Nonaktifkan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
