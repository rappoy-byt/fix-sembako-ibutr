'use client';

import React, { useState } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

type Period = '7d' | '30d' | '90d';

const mockData = {
  '7d': [
    { date: 'Senin', revenue: 1500000, transactions: 45 },
    { date: 'Selasa', revenue: 1200000, transactions: 38 },
    { date: 'Rabu', revenue: 1800000, transactions: 52 },
    { date: 'Kamis', revenue: 1400000, transactions: 41 },
    { date: 'Jumat', revenue: 2100000, transactions: 65 },
    { date: 'Sabtu', revenue: 3500000, transactions: 110 },
    { date: 'Minggu', revenue: 3800000, transactions: 125 },
  ],
  '30d': [
    { date: 'Mgg 1', revenue: 8500000, transactions: 250 },
    { date: 'Mgg 2', revenue: 7200000, transactions: 210 },
    { date: 'Mgg 3', revenue: 9800000, transactions: 280 },
    { date: 'Mgg 4', revenue: 12500000, transactions: 340 },
  ],
  '90d': [
    { date: 'Bulan 1', revenue: 32000000, transactions: 950 },
    { date: 'Bulan 2', revenue: 28000000, transactions: 820 },
    { date: 'Bulan 3', revenue: 45000000, transactions: 1200 },
  ]
};

export default function SalesTrend() {
  const [period, setPeriod] = useState<Period>('7d');
  const activeData = mockData[period];
  
  const totalRevenue = activeData.reduce((sum, item) => sum + item.revenue, 0);

  const isUptrend = activeData[activeData.length - 1].revenue >= activeData[0].revenue;
  const lineColor = isUptrend ? '#10b981' : '#ef4444';

  return (
    <div className="p-6 bg-white border rounded-xl shadow-sm">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Tren Penjualan</h2>
          <div className="mt-1 flex items-baseline gap-2">
            <p className="text-2xl font-extrabold text-gray-900">
              Rp {totalRevenue.toLocaleString('id-ID')}
            </p>
            <span className={`text-sm font-medium ${isUptrend ? 'text-green-600' : 'text-red-600'}`}>
              {isUptrend ? '▲ Uptrend' : '▼ Downtrend'}
            </span>
          </div>
        </div>

        {/* Toggle Periode 7d / 30d / 90d */}
        <div className="flex bg-gray-100 p-1 rounded-lg">
          {(['7d', '30d', '90d'] as Period[]).map((p) => (
            <button
              key={p}
              suppressHydrationWarning
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                period === p 
                  ? 'bg-white text-gray-800 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {p === '7d' ? '7 Hari' : p === '30d' ? '30 Hari' : '90 Hari'}
            </button>
          ))}
        </div>
      </div>

      {/* Grafik Trading Recharts */}
      <div className="h-72 w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={activeData} margin={{ top: 5, right: 0, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#6b7280', fontSize: 12 }} 
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#6b7280', fontSize: 12 }}
              tickFormatter={(value) => `Rp ${(value / 1000000).toFixed(1)}Jt`}
              dx={-10}
            />
            <Tooltip 
              formatter={(value: any) => [`Rp ${Number(value).toLocaleString('id-ID')}`, 'Pendapatan']}              
              labelStyle={{ color: '#374151', fontWeight: 'bold' }}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Line 
              type="monotone" 
              dataKey="revenue" 
              stroke={lineColor} 
              strokeWidth={3}
              dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} 
              activeDot={{ r: 6, strokeWidth: 0, fill: lineColor }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}