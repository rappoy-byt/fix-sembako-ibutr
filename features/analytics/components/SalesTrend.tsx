'use client';

import React, { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { DailySalesInput } from '@/features/analytics/types';
import { Period, PERIOD_LABEL } from '@/features/analytics/constants';

interface SalesTrendProps {
  dailySales: DailySalesInput[] | null;
  isLoading: boolean;
  error: string | null;
  period: Period;
  onPeriodChange: (period: Period) => void;
  onRetry: () => void;
}

interface ChartPoint {
  date: string;
  revenue: number;
}

const TIMEZONE = 'Asia/Jakarta';

const formatDate = (date: string, options: Intl.DateTimeFormatOptions) =>
  new Date(`${date}T12:00:00+07:00`).toLocaleDateString('id-ID', {
    ...options,
    timeZone: TIMEZONE,
  });

function buildChartData(dailySales: DailySalesInput[], period: Period): ChartPoint[] {
  // 7 hari: per hari, label nama hari
  if (period === '7d') {
    return dailySales.map((d) => ({
      date: formatDate(d.date, { weekday: 'long' }),
      revenue: d.totalSales,
    }));
  }

  // 30 hari: per hari, label tanggal
  if (period === '30d') {
    return dailySales.map((d) => ({
      date: formatDate(d.date, { day: 'numeric', month: 'short' }),
      revenue: d.totalSales,
    }));
  }

  // 90 hari: dirangkum per minggu (blok 7 hari, dihitung dari hari terbaru)
  const buckets: ChartPoint[] = [];
  for (let end = dailySales.length; end > 0; end -= 7) {
    const chunk = dailySales.slice(Math.max(0, end - 7), end);
    buckets.unshift({
      date: formatDate(chunk[0].date, { day: 'numeric', month: 'short' }),
      revenue: chunk.reduce((sum, d) => sum + d.totalSales, 0),
    });
  }
  return buckets;
}

const sum = (points: ChartPoint[]) => points.reduce((total, p) => total + p.revenue, 0);

export default function SalesTrend({
  dailySales,
  isLoading,
  error,
  period,
  onPeriodChange,
  onRetry,
}: SalesTrendProps) {
  const chartData = useMemo(
    () => (dailySales ? buildChartData(dailySales, period) : []),
    [dailySales, period]
  );

  const totalRevenue = sum(chartData);
  const hasSales = totalRevenue > 0;

  // Bandingkan separuh periode awal dengan separuh periode akhir
  const half = Math.floor(chartData.length / 2);
  const isUptrend = chartData.length < 2 || sum(chartData.slice(half)) >= sum(chartData.slice(0, half));
  const lineColor = isUptrend ? '#10b981' : '#ef4444';

  return (
    <div className="p-6 bg-white border rounded-xl shadow-sm">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Tren Penjualan</h2>
          <div className="mt-1 flex items-baseline gap-2">
            {isLoading ? (
              <div className="h-8 w-48 bg-gray-100 rounded animate-pulse" />
            ) : (
              <>
                <p className="text-2xl font-extrabold text-gray-900">
                  Rp {totalRevenue.toLocaleString('id-ID')}
                </p>
                {hasSales && (
                  <span className={`text-sm font-medium ${isUptrend ? 'text-green-600' : 'text-red-600'}`}>
                    {isUptrend ? '▲ Uptrend' : '▼ Downtrend'}
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {/* Toggle Periode 7d / 30d / 90d */}
        <div className="flex bg-gray-100 p-1 rounded-lg">
          {(['7d', '30d', '90d'] as Period[]).map((p) => (
            <button
              key={p}
              suppressHydrationWarning
              onClick={() => onPeriodChange(p)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                period === p
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {PERIOD_LABEL[p]}
            </button>
          ))}
        </div>
      </div>

      <div className="h-72 w-full mt-4">
        {isLoading ? (
          <div className="h-full w-full bg-gray-50 rounded-lg animate-pulse" />
        ) : error ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
            <p className="text-sm text-red-600">{error}</p>
            <button
              suppressHydrationWarning
              onClick={onRetry}
              className="text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg"
            >
              Coba Lagi
            </button>
          </div>
        ) : !hasSales ? (
          <div className="h-full flex items-center justify-center text-sm text-gray-500">
            Belum ada transaksi pada {PERIOD_LABEL[period].toLowerCase()} terakhir.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6b7280', fontSize: 12 }}
                dy={10}
                minTickGap={16}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                width={72}
                tick={{ fill: '#6b7280', fontSize: 12 }}
                tickFormatter={(value) => `Rp ${(value / 1000000).toFixed(1)}Jt`}
              />
              <Tooltip
                formatter={(value: any) => [`Rp ${Number(value).toLocaleString('id-ID')}`, 'Pendapatan']}
                labelFormatter={(label) => (period === '90d' ? `Minggu mulai ${label}` : label)}
                labelStyle={{ color: '#374151', fontWeight: 'bold' }}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke={lineColor}
                strokeWidth={3}
                dot={chartData.length <= 14 ? { r: 4, strokeWidth: 2, fill: '#fff' } : false}
                activeDot={{ r: 6, strokeWidth: 0, fill: lineColor }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}