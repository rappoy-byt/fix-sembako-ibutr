'use client';
import React from 'react';

// Mock data berdasarkan struktur productSales di type.ts
const mockProductSales = [
  { productId: 'P01', productName: 'Beras Rojolele 5kg', quantitySold: 45, revenue: 3150000, availableStock: 10, minimumStock: 15 },
  { productId: 'P02', productName: 'Minyak Goreng Bimoli 2L', quantitySold: 60, revenue: 2100000, availableStock: 8, minimumStock: 12 },
  { productId: 'P03', productName: 'Indomie Goreng', quantitySold: 320, revenue: 960000, availableStock: 150, minimumStock: 50 },
  { productId: 'P04', productName: 'Garam Dapur', quantitySold: 2, revenue: 10000, availableStock: 40, minimumStock: 10 },
  { productId: 'P05', productName: 'Tepung Terigu Segitiga Biru', quantitySold: 5, revenue: 60000, availableStock: 25, minimumStock: 10 },
  { productId: 'P06', productName: 'Gula Pasir 1kg', quantitySold: 120, revenue: 2040000, availableStock: 50, minimumStock: 20 },
];

export default function ProductPerformance() {
  // Urutkan dari penjualan terbanyak
  const bestSellers = [...mockProductSales].sort((a, b) => b.quantitySold - a.quantitySold).slice(0, 3);
  // Urutkan dari penjualan terdikit
  const slowMovers = [...mockProductSales].sort((a, b) => a.quantitySold - b.quantitySold).slice(0, 3);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
      <div className="p-6 bg-white border rounded-xl shadow-sm">
        <h2 className="text-lg font-bold text-gray-800 mb-4">✨ Produk Terlaris</h2>
        <div className="space-y-4">
          {bestSellers.map((item, index) => (
            <div key={item.productId} className="flex justify-between items-center p-4 bg-green-50/50 border border-green-100 rounded-lg">
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
                <div className="font-bold text-green-700">Rp {item.revenue.toLocaleString('id-ID')}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-6 bg-white border rounded-xl shadow-sm">
        <h2 className="text-lg font-bold text-gray-800 mb-4">⚠️ Produk Lambat Laku</h2>
        <div className="space-y-4">
          {slowMovers.map((item, index) => (
            <div key={item.productId} className="flex justify-between items-center p-4 bg-red-50/50 border border-red-100 rounded-lg">
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
      </div>
    </div>
  );
}