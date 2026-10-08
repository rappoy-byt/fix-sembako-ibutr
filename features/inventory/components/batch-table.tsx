import { Layers } from "lucide-react";
import type { ReactNode } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatNumber, formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { StockBatch } from "@/types/domain";

import { getBatchDisplayStatus, isBatchSellable } from "../lib/business-rules";
import { BatchStatusBadge, describeExpiry } from "./stock-badges";

interface BatchTableProps {
  /** Sudah urut FEFO (kedaluwarsa terdekat lebih dulu). */
  batches: StockBatch[];
  unit: string;
  today: string;
  emptyAction?: ReactNode;
}

export function BatchTable({ batches, unit, today, emptyAction }: BatchTableProps) {
  if (batches.length === 0) {
    return (
      <EmptyState
        icon={Layers}
        title="Belum ada batch stok"
        description="Stok barang ini masih 0. Tambahkan batch saat barang masuk."
        action={emptyAction}
      />
    );
  }

  // Nomor urut jual FEFO hanya untuk batch yang layak jual (batches sudah urut FEFO).
  const sellableIds = batches.filter((b) => isBatchSellable(b, today)).map((b) => b.id);

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="w-24 pl-4">Urutan jual</TableHead>
            <TableHead>No. batch</TableHead>
            <TableHead>Tgl masuk</TableHead>
            <TableHead className="text-right">Awal</TableHead>
            <TableHead className="text-right">Sisa</TableHead>
            <TableHead>Kedaluwarsa</TableHead>
            <TableHead className="text-right">Harga beli</TableHead>
            <TableHead className="pr-4">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {batches.map((batch) => {
            const status = getBatchDisplayStatus(batch, today);
            const fefoRank = sellableIds.indexOf(batch.id) + 1;
            const sellable = fefoRank > 0;
            return (
              <TableRow
                key={batch.id}
                className={cn(
                  status === "expired" && "bg-danger-soft/40",
                  status === "depleted" && "text-muted-foreground"
                )}
              >
                <TableCell className="pl-4">
                  {sellable ? (
                    <span className="numeric inline-flex size-6 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                      {fefoRank}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {status === "expired" ? "Tidak dijual" : "—"}
                    </span>
                  )}
                </TableCell>
                <TableCell className="font-mono text-xs">{batch.batch_number}</TableCell>
                <TableCell>{formatDate(batch.incoming_date)}</TableCell>
                <TableCell className="numeric text-right">{formatNumber(batch.initial_quantity)}</TableCell>
                <TableCell className="numeric text-right font-medium">
                  {formatNumber(batch.remaining_quantity)}{" "}
                  <span className="text-xs font-normal text-muted-foreground">{unit}</span>
                </TableCell>
                <TableCell>
                  {batch.expiry_date ? (
                    <>
                      <span className="block">{formatDate(batch.expiry_date)}</span>
                      {status !== "depleted" && (
                        <span
                          className={cn(
                            "text-xs",
                            status === "expired" ? "font-medium text-danger" : "text-muted-foreground"
                          )}
                        >
                          {describeExpiry(batch.expiry_date, today)}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-muted-foreground">Tanpa kedaluwarsa</span>
                  )}
                </TableCell>
                <TableCell className="numeric text-right">{formatRupiah(batch.purchase_price)}</TableCell>
                <TableCell className="pr-4">
                  <BatchStatusBadge status={status} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
