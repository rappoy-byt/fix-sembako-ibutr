import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type {
  AnalyticsInput,
  DailySalesInput,
  ProductSalesInput,
} from '../types';

const TIMEZONE = 'Asia/Jakarta';

// Nilai enum transaction_status di database. Hanya transaksi ini yang dihitung sebagai penjualan.
const COMPLETED_STATUS = 'COMPLETED' as const;

const PAGE_SIZE = 1000; // batas baris per request di Supabase

const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

// Hasil: "2026-11-03" (tanggal menurut zona waktu Jakarta)
const toLocalDate = (value: Date | string) => dateFormatter.format(new Date(value));

function lastNDates(days: number): string[] {
  const now = Date.now();
  const result: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    result.push(toLocalDate(new Date(now - i * 24 * 60 * 60 * 1000)));
  }
  return result;
}

// Mengambil semua baris walau lebih dari 1000 (Supabase membatasi per request)
async function fetchAll(
  build: (
    from: number,
    to: number
  ) => PromiseLike<{ data: any[] | null; error: { message: string } | null }>
): Promise<any[]> {
  const rows: any[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await build(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return rows;
}

export async function getAnalyticsInput(
  supabase: SupabaseClient<Database>,
  days = 7
): Promise<AnalyticsInput> {
  const dates = lastNDates(days);
  const since = `${dates[0]}T00:00:00+07:00`;
  const today = dates[dates.length - 1];

  const [transactions, items, products, batches] = await Promise.all([
    // Total penjualan per transaksi
    fetchAll((from, to) =>
      supabase
        .from('transactions')
        .select('transaction_date, total')
        .eq('status', COMPLETED_STATUS)
        .gte('transaction_date', since)
        .order('transaction_date')
        .order('id')
        .range(from, to)
    ),
    // Item per transaksi (untuk performa produk)
    fetchAll((from, to) =>
      supabase
        .from('transaction_items')
        .select(
          'product_id, product_name, quantity, subtotal, transactions!inner(transaction_date, status)'
        )
        .eq('transactions.status', COMPLETED_STATUS)
        .gte('transactions.transaction_date', since)
        .order('created_at')
        .order('id')
        .range(from, to)
    ),
    // Produk aktif
    fetchAll((from, to) =>
      supabase
        .from('products')
        .select('id, name, minimum_stock')
        .eq('is_active', true)
        .order('id')
        .range(from, to)
    ),
    // Stok tersisa (batch yang masih ada isinya dan belum kedaluwarsa)
    fetchAll((from, to) =>
      supabase
        .from('stock_batches')
        .select('product_id, remaining_quantity, expiry_date')
        .gt('remaining_quantity', 0)
        .or(`expiry_date.is.null,expiry_date.gte.${today}`)
        .order('id')
        .range(from, to)
    ),
  ]);

  // 1) Penjualan harian (hari tanpa transaksi diisi 0)
  const salesByDate = new Map<string, number>(dates.map((d) => [d, 0]));
  for (const t of transactions) {
    const day = toLocalDate(t.transaction_date);
    if (salesByDate.has(day)) {
      salesByDate.set(day, (salesByDate.get(day) ?? 0) + Number(t.total ?? 0));
    }
  }
  const dailySales: DailySalesInput[] = dates.map((date) => ({
    date,
    totalSales: salesByDate.get(date) ?? 0,
  }));

  // 2) Terjual per produk
  const soldByProduct = new Map<string, { quantity: number; revenue: number }>();
  for (const it of items) {
    if (!it.product_id) continue;
    const current = soldByProduct.get(it.product_id) ?? { quantity: 0, revenue: 0 };
    current.quantity += Number(it.quantity ?? 0);
    current.revenue += Number(it.subtotal ?? 0);
    soldByProduct.set(it.product_id, current);
  }

  // 3) Stok tersedia per produk
  const stockByProduct = new Map<string, number>();
  for (const b of batches) {
    stockByProduct.set(
      b.product_id,
      (stockByProduct.get(b.product_id) ?? 0) + Number(b.remaining_quantity ?? 0)
    );
  }

  // 4) Gabungkan (produk yang tidak laku tetap ikut, penting untuk slow-mover)
  const productSales: ProductSalesInput[] = products.map((p) => {
    const sold = soldByProduct.get(p.id);
    return {
      productId: p.id,
      productName: p.name,
      quantitySold: sold?.quantity ?? 0,
      totalRevenue: sold?.revenue ?? 0,
      availableStock: stockByProduct.get(p.id) ?? 0,
      minimumStock: Number(p.minimum_stock ?? 0),
    };
  });

  return { dailySales, productSales };
}