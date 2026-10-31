'use client';

import React, { useState } from 'react';
import { generateAIReportAction, askAIChatAction } from '@/features/analytics/actions/analyticsAction';
import { AnalyticsInput, AnalyticsReport } from '@/features/analytics/types';

// Mock Data Input Toko (Nanti bisa diganti dari Supabase)
const sampleAnalyticsInput: AnalyticsInput = {
  dailySales: [
    { date: '2026-10-25', totalSales: 1500000 },
    { date: '2026-10-26', totalSales: 1200000 },
    { date: '2026-10-27', totalSales: 1800000 },
    { date: '2026-10-28', totalSales: 1400000 },
    { date: '2026-10-29', totalSales: 2100000 },
    { date: '2026-10-30', totalSales: 3500000 },
    { date: '2026-10-31', totalSales: 3800000 },
  ],
  productSales: [
    { productId: 'P01', productName: 'Beras Rojolele 5kg', quantitySold: 45, totalRevenue: 2925000, availableStock: 10, minimumStock: 15 },
    { productId: 'P02', productName: 'Minyak Goreng Bimoli 2L', quantitySold: 80, totalRevenue: 2800000, availableStock: 25, minimumStock: 20 },
    { productId: 'P03', productName: 'Indomie Goreng', quantitySold: 320, totalRevenue: 960000, availableStock: 15, minimumStock: 50 },
    { productId: 'P06', productName: 'Gula Pasir 1kg', quantitySold: 110, totalRevenue: 1650000, availableStock: 40, minimumStock: 20 }
  ]
};

const initialMockReport: AnalyticsReport = {
  generatedAt: new Date().toISOString(),
  summary: "Berdasarkan data minggu ini, penjualan didominasi oleh kebutuhan pokok. Indomie Goreng dan Minyak Goreng Bimoli memiliki perputaran sangat cepat. Namun, Garam Dapur dan Tepung Terigu bergerak cukup lambat. Disarankan untuk fokus restock pada barang dengan perputaran tinggi untuk mengamankan ketersediaan stok akhir pekan.",
  restockRecommendations: [
    { productId: 'P01', productName: 'Beras Rojolele 5kg', suggestedQuantity: 15, reason: 'Stok menipis (10) mendekati batas minimum. Tren penjualan sedang stabil.' },
    { productId: 'P03', productName: 'Indomie Goreng', suggestedQuantity: 100, reason: 'Perputaran sangat tinggi. Hindari kehabisan stok di akhir pekan.' }
  ],
  demandForecast: [
    { productId: 'P06', productName: 'Gula Pasir 1kg', expectedQuantity: 150 },
    { productId: 'P02', productName: 'Minyak Goreng Bimoli 2L', expectedQuantity: 80 }
  ]
};

const suggestionChips = [
  "Kenapa Garam Dapur lambat laku?",
  "Berapa estimasi modal restock?",
  "Kasih saran promo buat slow-mover",
  "Produk mana yang untungnya paling gede?"
];

interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
}

export default function AIRecommendations() {
  const [aiReport, setAiReport] = useState<AnalyticsReport>(initialMockReport);
  const [isGenerating, setIsGenerating] = useState(false);
  const [inputQuery, setInputQuery] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Trigger panggil AI untuk Insight Dashboard
  const handleRefreshAI = async () => {
    setIsGenerating(true);
    const res = await generateAIReportAction(sampleAnalyticsInput);
    if (res.success && res.data) {
      setAiReport(res.data);
    } else {
      alert(res.error || 'Gagal memuat insight AI.');
    }
    setIsGenerating(false);
  };

  // Trigger Chat AI
  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputQuery;
    if (!query.trim() || isChatLoading) return;

    const newHistory: ChatMessage[] = [...chatHistory, { sender: 'user', text: query }];
    setChatHistory(newHistory);
    if (!textToSend) setInputQuery('');
    setIsChatLoading(true);

    const res = await askAIChatAction(query, sampleAnalyticsInput);
    
    if (res.success && res.reply) {
      setChatHistory([...newHistory, { sender: 'ai', text: res.reply }]);
    } else {
      setChatHistory([...newHistory, { sender: 'ai', text: `⚠️ Error: ${res.error}` }]);
    }
    
    setIsChatLoading(false);
  };

  return (
    <div className="space-y-6 mt-6">
      {/* Header & Button AI */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <h2 className="text-lg font-bold text-gray-800">Asisten AI Gemini</h2>
        </div>
        <button
          suppressHydrationWarning
          onClick={handleRefreshAI}
          disabled={isGenerating}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-all shadow-sm disabled:opacity-50"
        >
          {isGenerating ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              <span>Menganalisis...</span>
            </>
          ) : (
            <>
              <span>✨ Generate Analisis AI</span>
            </>
          )}
        </button>
      </div>

      {/* Card Ringkasan Narasi AI */}
      <div className="p-6 bg-slate-900 rounded-xl shadow-sm text-white relative overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold tracking-wider text-emerald-400 uppercase bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700">
            Model: Gemini 2.5 Flash
          </span>
          <span className="text-xs text-slate-400">
            Diperbarui: {new Date(aiReport.generatedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        
        {isGenerating ? (
          <div className="py-6 space-y-2 animate-pulse">
            <div className="h-4 bg-slate-800 rounded w-5/6"></div>
            <div className="h-4 bg-slate-800 rounded w-4/6"></div>
          </div>
        ) : (
          <p className="text-slate-200 leading-relaxed text-sm md:text-base">
            "{aiReport.summary}"
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Rekomendasi Restock AI */}
        <div className="p-6 bg-white border rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800">Rekomendasi Restock</h3>
            <span className="text-xs bg-indigo-50 text-indigo-600 font-medium px-2 py-1 rounded">Saran Otomatis</span>
          </div>
          <div className="space-y-3">
            {aiReport.restockRecommendations.map((item, idx) => (
              <div key={idx} className="p-3.5 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-gray-800 text-sm">{item.productName}</span>
                  <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-0.5 rounded">
                    +{item.suggestedQuantity} pcs
                  </span>
                </div>
                <p className="text-xs text-gray-500">{item.reason}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Prediksi Permintaan AI */}
        <div className="p-6 bg-white border rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800">Prediksi Permintaan</h3>
            <span className="text-xs bg-purple-50 text-purple-600 font-medium px-2 py-1 rounded">Forecast 7 Hari</span>
          </div>
          <div className="flex flex-col">
            {aiReport.demandForecast.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-0">
                <span className="font-medium text-gray-700 text-sm">{item.productName}</span>
                <div className="text-sm font-semibold text-gray-900 bg-gray-100 px-3 py-1 rounded-md">
                  ~{item.expectedQuantity} pcs
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MODUL INTERAKTIF CHAT AI */}
      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">💬</span>
          <div>
            <h3 className="font-bold text-gray-800 text-base">Tanya Asisten AI Toko</h3>
            <p className="text-xs text-gray-500">Penasaran dengan performa barang lain? Tanyakan langsung di sini.</p>
          </div>
        </div>

        {/* Suggestion Chips */}
        <div className="flex flex-wrap gap-2 mb-4">
          {suggestionChips.map((chip, idx) => (
            <button
              key={idx}
              suppressHydrationWarning
              onClick={() => handleSendMessage(chip)}
              className="text-xs bg-gray-50 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 border border-gray-200 px-3 py-1.5 rounded-full text-gray-600 transition-all text-left"
            >
              "{chip}"
            </button>
          ))}
        </div>

        {/* Bubble Chat History */}
        {chatHistory.length > 0 && (
          <div className="mb-4 space-y-3 max-h-60 overflow-y-auto p-3 bg-gray-50 rounded-lg border border-gray-100">
            {chatHistory.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] text-xs md:text-sm p-3 rounded-xl ${
                    msg.sender === 'user'
                      ? 'bg-emerald-600 text-white rounded-br-none'
                      : 'bg-white text-gray-800 border border-gray-200 shadow-sm rounded-bl-none'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isChatLoading && (
              <div className="flex justify-start">
                <div className="bg-white text-gray-500 border border-gray-200 text-xs p-3 rounded-xl rounded-bl-none animate-pulse">
                  Gemini sedang berpikir...
                </div>
              </div>
            )}
          </div>
        )}

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Ketik pertanyaan tentang toko sembako Anda..."
            className="flex-1 text-sm border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            type="submit"
            suppressHydrationWarning
            disabled={!inputQuery.trim() || isChatLoading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
          >
            Kirim
          </button>
        </form>
      </div>
    </div>
  );
}