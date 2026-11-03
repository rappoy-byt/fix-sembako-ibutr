import { AnalyticsInput, AnalyticsReport } from '../types';
import { generateWithFallback } from './geminiClient';

export const geminiAnalyticsProvider = {
  async analyze(inputData: AnalyticsInput): Promise<AnalyticsReport> {
    const prompt = `
Kamu adalah analisis bisnis profesional untuk toko sembako.
Analisis data penjualan dan stok berikut:
- Penjualan Harian: ${JSON.stringify(inputData.dailySales)}
- Performa Produk & Stok: ${JSON.stringify(inputData.productSales)}

Kembalikan hasilnya HANYA dalam format JSON dengan struktur persis seperti berikut (tanpa tambahan teks lain):
{
  "summary": "Ringkasan kondisi toko 2-3 kalimat",
  "restockRecommendations": [
    {
      "productId": "string",
      "productName": "string",
      "suggestedQuantity": number,
      "reason": "alasan singkat"
    }
  ],
  "demandForecast": [
    {
      "productId": "string",
      "productName": "string",
      "expectedQuantity": number
    }
  ]
}
`;

    const rawText = await generateWithFallback(prompt, {
      responseMimeType: 'application/json',
    });

    // Jaga-jaga kalau model membungkus JSON dengan ```json ... ```
    const cleanText = rawText.replace(/```json|```/g, '').trim();

    let parsedData: any;
    try {
      parsedData = JSON.parse(cleanText);
    } catch {
      throw new Error('Respons AI tidak berupa JSON yang valid. Coba generate ulang.');
    }

    return {
      generatedAt: new Date().toISOString(),
      summary: parsedData.summary,
      restockRecommendations: parsedData.restockRecommendations || [],
      demandForecast: parsedData.demandForecast || [],
    };
  },
};