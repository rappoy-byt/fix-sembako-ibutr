'use client';

import React, { useMemo } from 'react';
import { ProductSalesInput } from '@/features/analytics/types';

interface ProductPerformanceProps {
  productSales: ProductSalesInput[] | null;
  isLoading: boolean;
}

function SkeletonList() {
  return (
    <div className="space-y-4 animate-pulse">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-[74px] bg-gray-50 rounded-lg" />
      ))}
    </div>
  );
}

export default function ProductPerformance({ productSales, isLoading }: ProductPerformanceProps) {
  const { bestSellers, slowMovers } = useMemo(() => {
    const list = productSales ?? [];

    // Terlaris: terjual terbanyak (hanya yang pernah terjual)
    const best = [...list]
      .filter((p) => p.quantitySold > 0)
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, 3);

    // Lambat laku: masih punya stok tapi penjualannya paling sedikit
    const slow = [...list]
      .filter((p) => p.availableStock > 0)
      .sort((a, b) => a.quantitySold - b.quantitySold || b.availableStock - a.availableStock)
      .slice(0, 3);

    return { bestSellers: best, slowMovers: slow };
  }, [productSales]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
      <div className="p-6 bg-white border rounded-xl shadow-sm">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Produk Terlaris</h2>
        {isLoading ? (
          <SkeletonList />
        ) : bestSellers.length === 0 ? (
          <p className="text-sm text-gray-500">Belum ada penjualan pada periode ini.</p>
        ) : (
          <div className="space-y-4">
            {bestSellers.map((item, index) => (
              <div
                key={item.productId}
                className="flex justify-between items-center p-4 bg-green-50/50 border border-green-100 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-200 flex items-center justify-center text-green-700 font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800">{item.productName}</div>
                    <div className="text-xs text-gray-500">Terjual: {item.quantitySold} pcs</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-green-700">
                    Rp {item.totalRevenue.toLocaleString('id-ID')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-6 bg-white border rounded-xl shadow-sm">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Produk Lambat Laku</h2>
        {isLoading ? (
          <SkeletonList />
        ) : slowMovers.length === 0 ? (
          <p className="text-sm text-gray-500">Tidak ada produk berstok yang lambat laku.</p>
        ) : (
          <div className="space-y-4">
            {slowMovers.map((item, index) => (
              <div
                key={item.productId}
                className="flex justify-between items-center p-4 bg-red-50/50 border border-red-100 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-200 flex items-center justify-center text-red-700 font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800">{item.productName}</div>
                    <div className="text-xs text-gray-500">Terjual: {item.quantitySold} pcs</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-red-600">Sisa Stok: {item.availableStock}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}