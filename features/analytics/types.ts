/**
 * Kontrak modul AI Analytics (BELUM diimplementasikan di Fase 1).
 *
 * Arsitektur yang direncanakan, terpisah dari logika transaksi inti:
 *
 *   1. features/analytics/data    → agregasi read-only dari transactions,
 *                                   transaction_items, stock_movements, stock_batches
 *   2. features/analytics/provider → implementasi AnalyticsProvider yang memanggil
 *                                   API AI di SERVER saja (kunci API tidak ke browser)
 *   3. app/(app)/ai-analytics     → menampilkan AnalyticsReport
 *
 * Modul ini hanya membaca data; ia tidak pernah membuat atau mengubah transaksi/stok.
 */

export type AnalyticsPeriod = "7d" | "30d" | "90d";

/** Data ringkas yang dikirim ke penyedia AI (bukan data mentah per transaksi). */
export interface AnalyticsInput {
  period: AnalyticsPeriod;
  dailySales: { date: string; revenue: number; transactions: number }[];
  productSales: {
    productId: string;
    productName: string;
    quantitySold: number;
    revenue: number;
    availableStock: number;
    minimumStock: number;
  }[];
}

export interface RestockRecommendation {
  productId: string;
  productName: string;
  suggestedQuantity: number;
  reason: string;
}

export interface AnalyticsReport {
  generatedAt: string;
  summary: string;
  bestSellers: { productId: string; productName: string; quantitySold: number }[];
  slowMovers: { productId: string; productName: string; daysWithoutSale: number }[];
  restockRecommendations: RestockRecommendation[];
  /** Perkiraan permintaan sederhana per produk untuk periode berikutnya. */
  demandForecast: { productId: string; productName: string; expectedQuantity: number }[];
}

export interface AnalyticsProvider {
  analyze(input: AnalyticsInput): Promise<AnalyticsReport>;
}
