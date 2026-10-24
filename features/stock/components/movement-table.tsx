import { ArrowDownToLine, ArrowUpFromLine, ReceiptText, type LucideIcon } from "lucide-react";
import Link from "next/link";

import { StatusBadge } from "@/components/shared/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatNumber } from "@/lib/format";
import type { StatusMeta } from "@/lib/status";
import { cn } from "@/lib/utils";
import type { StockMovementType } from "@/types/domain";

import { formatSignedQuantity, MOVEMENT_DIRECTION, MOVEMENT_LABEL } from "../lib/movements";
import type { MovementRow } from "../queries";

const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Jakarta",
});

const DIRECTION_ICON: Record<"in" | "out", LucideIcon> = { in: ArrowDownToLine, out: ArrowUpFromLine };

function movementMeta(type: StockMovementType): StatusMeta {
  const direction = MOVEMENT_DIRECTION[type];
  return {
    label: MOVEMENT_LABEL[type],
    tone: direction === "in" ? "success" : "info",
    icon: type === "SALE" ? ReceiptText : DIRECTION_ICON[direction],
  };
}

function ProductCell({ row }: { row: MovementRow }) {
  if (!row.product) return <span className="text-muted-foreground">Barang tidak ditemukan</span>;
  return (
    <div className="min-w-0">
      <Link
        href={`/barang/${row.product.id}`}
        className="block truncate font-medium text-foreground hover:text-primary hover:underline"
      >
        {row.product.name}
      </Link>
      <p className="font-mono text-xs text-muted-foreground">{row.product.sku}</p>
    </div>
  );
}

function BatchCell({ row }: { row: MovementRow }) {
  if (!row.batch) return <span className="text-muted-foreground">-</span>;
  return (
    <div>
      <p className="font-mono text-xs">{row.batch.batchNumber}</p>
      {row.batch.expiryDate && (
        <p className="text-xs text-muted-foreground">Exp. {formatDate(row.batch.expiryDate)}</p>
      )}
    </div>
  );
}

/** Referensi dari data relasi (bukan dari teks note). */
function ReferenceCell({ row }: { row: MovementRow }) {
  if (row.transactionNumber) return <span className="font-mono text-xs">{row.transactionNumber}</span>;
  if (row.movementType === "IN") return <span className="text-xs text-muted-foreground">Batch masuk</span>;
  if (row.referenceId) return <span className="text-xs text-muted-foreground">Transaksi tidak ditemukan</span>;
  return <span className="text-muted-foreground">-</span>;
}

function QuantityText({ row }: { row: MovementRow }) {
  return (
    <span
      className={cn(
        "numeric font-semibold",
        row.quantity > 0 ? "text-success" : row.quantity < 0 ? "text-foreground" : "text-muted-foreground"
      )}
    >
      {formatSignedQuantity(row.quantity, formatNumber)}
      {row.product && <span className="ml-1 text-xs font-normal text-muted-foreground">{row.product.unit}</span>}
    </span>
  );
}

export function MovementTable({ rows }: { rows: MovementRow[] }) {
  return (
    <>
      {/* Desktop: tabel */}
      <div className="hidden overflow-hidden rounded-xl border bg-card md:block">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="pl-4">Tanggal (WIB)</TableHead>
              <TableHead>Barang</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead className="text-right">Jumlah</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead className="pr-4">Referensi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="pl-4 text-xs whitespace-nowrap text-muted-foreground">
                  {dateTimeFormatter.format(new Date(row.createdAt))}
                </TableCell>
                <TableCell className="max-w-64">
                  <ProductCell row={row} />
                </TableCell>
                <TableCell>
                  <StatusBadge meta={movementMeta(row.movementType)} />
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <QuantityText row={row} />
                </TableCell>
                <TableCell>
                  <BatchCell row={row} />
                </TableCell>
                <TableCell className="pr-4">
                  <ReferenceCell row={row} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile: kartu bertumpuk */}
      <ul className="space-y-2 md:hidden" aria-label="Riwayat pergerakan stok">
        {rows.map((row) => (
          <li key={row.id} className="space-y-2 rounded-xl border bg-card p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <StatusBadge meta={movementMeta(row.movementType)} />
                <p className="text-xs text-muted-foreground">{dateTimeFormatter.format(new Date(row.createdAt))}</p>
              </div>
              <QuantityText row={row} />
            </div>
            <ProductCell row={row} />
            <div className="flex flex-wrap items-start justify-between gap-2 border-t pt-2">
              <BatchCell row={row} />
              <ReferenceCell row={row} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
