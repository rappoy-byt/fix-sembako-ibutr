import React from 'react';
import AnalyticsDashboard from '@/features/analytics/components/AnalyticsDashboard';

export default function AIAnalyticsPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Analytics</h1>
        <p className="text-gray-500">Analisis tren dan performa toko sembako Anda.</p>
      </div>

      <AnalyticsDashboard />
    </div>
  );
}