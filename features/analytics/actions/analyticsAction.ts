'use server';

import { geminiAnalyticsProvider } from '@/features/analytics/provider/geminiProvider';
import { generateWithFallback } from '@/features/analytics/provider/geminiClient';
import { getAnalyticsInput } from '@/features/analytics/provider/analyticsData';
import { AnalyticsInput, AnalyticsReport } from '@/features/analytics/types';
import { createClient } from '@/lib/supabase/server';

const ALLOWED_RANGES = [7, 30, 90];
const MAX_PRODUCTS_FOR_AI = 40;

const hasSalesData = (input: AnalyticsInput) =>
  input.dailySales.some((d) => d.totalSales > 0) ||
  input.productSales.some((p) => p.quantitySold > 0);

// Batasi jumlah produk yang dikirim ke Gemini supaya prompt tidak terlalu besar:
// prioritaskan stok menipis + omzet tertinggi, lalu sisipkan beberapa produk paling lambat laku.
function trimForAI(input: AnalyticsInput): AnalyticsInput {
  if (input.productSales.length <= MAX_PRODUCTS_FOR_AI) return input;

  const sorted = [...input.productSales].sort((a, b) => {
    const aLow = a.availableStock <= a.minimumStock ? 1 : 0;
    const bLow = b.availableStock <= b.minimumStock ? 1 : 0;
    if (aLow !== bLow) return bLow - aLow;
    return b.totalRevenue - a.totalRevenue;
  });

  const top = sorted.slice(0, 30);
  const topIds = new Set(top.map((p) => p.productId));
  const slow = sorted
    .filter((p) => !topIds.has(p.productId) && p.availableStock > 0)
    .sort((a, b) => a.quantitySold - b.quantitySold || b.availableStock - a.availableStock)
    .slice(0, 10);

  return { dailySales: input.dailySales, productSales: [...top, ...slow] };
}

// 0. Action untuk mengambil data asli dari database
export async function getAnalyticsDataAction(
  days: number = 7
): Promise<{ success: boolean; data?: AnalyticsInput; error?: string }> {
  try {
    const range = ALLOWED_RANGES.includes(days) ? days : 7;
    const supabase = await createClient();
    const data = await getAnalyticsInput(supabase, range);
    return { success: true, data };
  } catch (error: any) {
    console.error('Error fetching analytics data:', error);
    return {
      success: false,
      error: error.message || 'Gagal mengambil data dari database.',
    };
  }
}

// 1. Action untuk Generate Insight Dashboard Otomatis
export async function generateAIReportAction(
  inputData: AnalyticsInput
): Promise<{ success: boolean; data?: AnalyticsReport; error?: string }> {
  try {
    if (!hasSalesData(inputData)) {
      return {
        success: false,
        error: 'Belum ada data penjualan pada periode ini, jadi analisis AI belum bisa dibuat.',
      };
    }
    const report = await geminiAnalyticsProvider.analyze(trimForAI(inputData));
    return { success: true, data: report };
  } catch (error: any) {
    console.error('Error generating AI report:', error);
    return {
      success: false,
      error: error.message || 'Gagal mengambil analisis dari AI.',
    };
  }
}

// 2. Action untuk Tanya Jawab Chat AI Interaktif
export async function askAIChatAction(
  query: string,
  contextData: AnalyticsInput
): Promise<{ success: boolean; reply?: string; error?: string }> {
  try {
    const context = trimForAI(contextData);
    const prompt = `
Kamu adalah asisten AI toko sembako pintar untuk Toko Sembako Ibu TR.
Berikut data kondisi toko saat ini:
- Ringkasan Penjualan Harian: 
${JSON.stringify(context.dailySales)}
- Performa & Stok Produk: 
${JSON.stringify(context.productSales)}

Pertanyaan Pemilik Toko: "${query}"

Instruksi Respons:
1. Jawab secara langsung, lugas, ramah, dan solutif berbasis data di atas.
2. Batasi jawaban maksimal 2 sampai 3 kalimat saja.
3. Gunakan bahasa Indonesia baku namun santai (seperti manajer/mitra bisnis terpercaya).
4. Hindari penggunaan format markdown tebal (bold/asterisk **) berlebihan.
`;

    const responseText = (await generateWithFallback(prompt)).trim();
    return { success: true, reply: responseText };
  } catch (error: any) {
    console.error('Error in AI Chat Action:', error);
    return {
      success: false,
      error: error.message || 'Gagal memproses pertanyaan ke Gemini.',
    };
  }
}