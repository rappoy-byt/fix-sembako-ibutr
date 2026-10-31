import { GoogleGenerativeAI } from '@google/generative-ai';
import { AnalyticsInput, AnalyticsReport } from '@/features/analytics/types';

// Inisialisasi Gemini (Hanya berjalan di Server)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export const geminiAnalyticsProvider = {
  async analyze(input: AnalyticsInput): Promise<AnalyticsReport> {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Meracik Prompt dengan menyuapkan data mentah (JSON)
    const prompt = `
      Kamu adalah asisten AI ahli ritel untuk Toko Sembako Ibu TR.
      Tugasmu adalah menganalisis data penjualan dan memberikan ringkasan, rekomendasi restock, dan prediksi permintaan dalam bahasa Indonesia yang santai, cerdas, dan to the point.
      
      Berikut adalah data toko saat ini:
      Data Penjualan: ${JSON.stringify(input.dailySales)}
      Performa Produk: ${JSON.stringify(input.productSales)}
      
      Berikan output HANYA dalam format JSON yang valid dan persis mengikuti struktur TypeScript ini tanpa tambahan teks markdown lain (seperti \`\`\`json):
      {
        "generatedAt": "Tanggal hari ini",
        "summary": "1 paragraf narasi cerdas tentang performa toko (contoh: Penjualan minggu ini didominasi sembako dasar...)",
        "bestSellers": [{ "productId", "productName", "quantitySold" }],
        "slowMovers": [{ "productId", "productName", "daysWithoutSale" }],
        "restockRecommendations": [{ "productId", "productName", "suggestedQuantity", "reason": "Saran AI: ..." }],
        "demandForecast": [{ "productId", "productName", "expectedQuantity" }]
      }
    `;

    try {
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      // Membersihkan jika Gemini masih membalas dengan tag markdown
      const cleanJson = responseText.replace(/```json\n?|```/g, '').trim();
      
      const report: AnalyticsReport = JSON.parse(cleanJson);
      return report;
    } catch (error) {
      console.error("Gagal memanggil Gemini:", error);
      throw new Error("Gagal menghasilkan AI Analytics");
    }
  }
};