export interface DailySalesInput {
  date: string;
  totalSales: number;
}

export interface ProductSalesInput {
  productId: string;
  productName: string;
  quantitySold: number;
  totalRevenue: number;
  availableStock: number;
  minimumStock: number;
}

export interface AnalyticsInput {
  dailySales: DailySalesInput[];
  productSales: ProductSalesInput[];
}

export interface RestockRecommendation {
  productId: string;
  productName: string;
  suggestedQuantity: number;
  reason: string;
}

export interface DemandForecast {
  productId: string;
  productName: string;
  expectedQuantity: number;
}

export interface AnalyticsReport {
  generatedAt: string;
  summary: string;
  restockRecommendations: RestockRecommendation[];
  demandForecast: DemandForecast[];
}