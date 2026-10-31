'use server';

import { geminiAnalyticsProvider } from '@/features/analytics/provider/geminiProvider';
import { AnalyticsInput, AnalyticsReport } from '@/features/analytics/types';
import { GoogleGenerativeAI } from '@google/generative-ai';

// 1. Action untuk Generate Insight Dashboard Otomatis
export async function generateAIReportAction(
  inputData: AnalyticsInput
): Promise<{ success: boolean; data?: AnalyticsReport; error?: string }> {
  try {
    const report = await geminiAnalyticsProvider.analyze(inputData);
    return { success: true, data: report };
  } catch (error: any) {
    console.error('Error generating AI report:', error);
    return { 
      success: false, 
      error: error.message || 'Gagal mengambil analisis dari AI.' 
    };
  }
}

// 2. Action untuk Tanya Jawab Chat AI Interaktif
export async function askAIChatAction(
  query: string, 
  contextData: AnalyticsInput
): Promise<{ success: boolean; reply?: string; error?: string }> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { 
        success: false, 
        error: 'API Key Gemini belum terkonfigurasi di file .env.local.' 
      };
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `
Kamu adalah asisten AI toko sembako pintar untuk Toko Sembako Ibu TR.
Berikut data kondisi toko saat ini:
- Ringkasan Penjualan Harian: ${JSON.stringify(contextData.dailySales)}
- Performa & Stok Produk: ${JSON.stringify(contextData.productSales)}

Pertanyaan Pemilik Toko: "${query}"

Instruksi Respons:
1. Jawab secara langsung, lugas, ramah, dan solutif berbasis data di atas.
2. Batasi jawaban maksimal 2 sampai 3 kalimat saja.
3. Gunakan bahasa Indonesia baku namun santai (seperti manajer/mitra bisnis terpercaya).
4. Hindari penggunaan format markdown tebal (bold/asterisk **) berlebihan.
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();

    return { success: true, reply: responseText };
  } catch (error: any) {
    console.error('Error in AI Chat Action:', error);
    return { 
      success: false, 
      error: error.message || 'Gagal memproses pertanyaan ke Gemini.' 
    };
  }
}