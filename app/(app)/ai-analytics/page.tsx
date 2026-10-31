import React from 'react';
import SalesTrend from '@/features/analytics/components/SalesTrend';
import ProductPerformance from '@/features/analytics/components/ProductPerformance';
import AIRecommendations from '@/features/analytics/components/AIRecommendations';

export default function AIAnalyticsPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Analytics</h1>
        <p className="text-gray-500">Analisis tren dan performa toko sembako Anda.</p>
      </div>

      {/* Render Modul 1 */}
      <SalesTrend />
      
      {/* Render Modul 2 & 3 */}
      <ProductPerformance />
      
      {/* Render Modul 4 */}
      <AIRecommendations />
    </div>
  );
}