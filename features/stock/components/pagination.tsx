import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/format";

import { buildMovementSearch, MOVEMENTS_PAGE_SIZE, type MovementFilters } from "../lib/movements";

interface MovementPaginationProps {
  filters: MovementFilters;
  today: string;
  total: number;
  pageCount: number;
}

/** Navigasi halaman berbasis URL; semua filter ikut dipertahankan. */
export function MovementPagination({ filters, today, total, pageCount }: MovementPaginationProps) {
  const { page } = filters;
  const first = (page - 1) * MOVEMENTS_PAGE_SIZE + 1;
  const last = Math.min(page * MOVEMENTS_PAGE_SIZE, total);
  const href = (target: number) => `/stok${buildMovementSearch(filters, today, { page: target })}`;

  return (
    <nav aria-label="Halaman riwayat stok" className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
      <p className="numeric text-sm text-muted-foreground">
        {formatNumber(first)}–{formatNumber(last)} dari {formatNumber(total)} catatan
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Button variant="outline" className="h-10 px-3.5 text-sm" render={<Link href={href(page - 1)} scroll={false} />} nativeButton={false}>
            <ChevronLeft />
            Sebelumnya
          </Button>
        ) : (
          <Button variant="outline" className="h-10 px-3.5 text-sm" disabled>
            <ChevronLeft />
            Sebelumnya
          </Button>
        )}
        {page < pageCount ? (
          <Button variant="outline" className="h-10 px-3.5 text-sm" render={<Link href={href(page + 1)} scroll={false} />} nativeButton={false}>
            Berikutnya
            <ChevronRight />
          </Button>
        ) : (
          <Button variant="outline" className="h-10 px-3.5 text-sm" disabled>
            Berikutnya
            <ChevronRight />
          </Button>
        )}
      </div>
    </nav>
  );
}
