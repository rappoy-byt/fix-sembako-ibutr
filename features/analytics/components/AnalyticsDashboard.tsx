'use client';

import React, { useEffect, useState } from 'react';
import { getAnalyticsDataAction } from '@/features/analytics/actions/analyticsAction';
import { AnalyticsInput } from '@/features/analytics/types';
import { Period, PERIOD_DAYS } from '@/features/analytics/constants';
import SalesTrend from '@/features/analytics/components/SalesTrend';
import ProductPerformance from '@/features/analytics/components/ProductPerformance';
import AIRecommendations from '@/features/analytics/components/AIRecommendations';

interface LoadResult {
  days: number;
  data: AnalyticsInput | null;
  error: string | null;
}

export default function AnalyticsDashboard() {
  const [period, setPeriod] = useState<Period>('7d');
  const [result, setResult] = useState<LoadResult | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const days = PERIOD_DAYS[period];

  useEffect(() => {
    let cancelled = false;

    getAnalyticsDataAction(days)
      .then((res) => {
        if (cancelled) return;
        setResult({
          days,
          data: res.success && res.data ? res.data : null,
          error: res.success ? null : res.error ?? 'Gagal memuat data.',
        });
      })
      .catch(() => {
        if (cancelled) return;
        setResult({ days, data: null, error: 'Gagal terhubung ke server. Coba lagi.' });
      });

    return () => {
      cancelled = true;
    };
  }, [days, reloadKey]);

  // Hasil hanya dianggap valid kalau sesuai periode yang sedang dipilih
  const current = result && result.days === days ? result : null;
  const isLoading = current === null;
  const data = current?.data ?? null;
  const error = current?.error ?? null;

  const handleRetry = () => {
    setResult(null);
    setReloadKey((k) => k + 1);
  };

  return (
    <div className="space-y-6">
      <SalesTrend
        dailySales={data?.dailySales ?? null}
        isLoading={isLoading}
        error={error}
        period={period}
        onPeriodChange={setPeriod}
        onRetry={handleRetry}
      />

      <ProductPerformance productSales={data?.productSales ?? null} isLoading={isLoading} />

      <AIRecommendations analyticsInput={data} isLoadingData={isLoading} />
    </div>
  );
}