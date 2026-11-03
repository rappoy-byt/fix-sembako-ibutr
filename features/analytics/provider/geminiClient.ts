import { GoogleGenerativeAI, GenerationConfig } from '@google/generative-ai';

// Model utama dari .env, lalu cadangan. Model "lite" biasanya lebih longgar kapasitasnya.
const MODEL_CANDIDATES = Array.from(
  new Set([
    process.env.GEMINI_MODEL ?? 'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-3.8-flash',
    'gemini-3.7-flash',
    'gemini-3.5-flash',
    'gemini-flash-latest',
  ])
);

const REQUEST_TIMEOUT_MS = 20_000; // satu request maksimal 20 detik
const TOTAL_BUDGET_MS = 55_000; // seluruh proses maksimal 55 detik
const MAX_RETRIES_PER_MODEL = 1; // cukup 1x ulang, karena sudah ada model cadangan
const RETRY_DELAY_MS = 1500;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const messageOf = (err: unknown) => String((err as Error)?.message ?? err);

function isRetryable(err: unknown) {
  const msg = messageOf(err).toLowerCase();
  return (
    msg.includes('503') ||
    msg.includes('429') ||
    msg.includes('500') ||
    msg.includes('high demand') ||
    msg.includes('overloaded') ||
    msg.includes('fetch failed') ||
    msg.includes('abort') ||
    msg.includes('timeout') ||
    msg.includes('timed out')
  );
}

function isModelUnavailable(err: unknown) {
  return messageOf(err).includes('404');
}

/**
 * Memanggil Gemini dengan timeout, retry, dan fallback ke model lain.
 * Mengembalikan teks respons mentah.
 */
export async function generateWithFallback(
  prompt: string,
  generationConfig?: GenerationConfig
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY belum terpasang di file .env');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const startedAt = Date.now();
  let lastError: unknown;

  for (const modelName of MODEL_CANDIDATES) {
    const model = genAI.getGenerativeModel(
      {
        model: modelName,
        ...(generationConfig ? { generationConfig } : {}),
      },
      { timeout: REQUEST_TIMEOUT_MS }
    );

    for (let attempt = 0; attempt <= MAX_RETRIES_PER_MODEL; attempt++) {
      if (Date.now() - startedAt > TOTAL_BUDGET_MS) {
        throw new Error(
          'Layanan AI terlalu lama merespons. Coba lagi sebentar lagi. Detail: ' +
            messageOf(lastError)
        );
      }

      try {
        const result = await model.generateContent(prompt);
        console.log(`[Gemini] berhasil memakai ${modelName}`);
        return result.response.text();
      } catch (err) {
        lastError = err;
        console.warn(
          `[Gemini] ${modelName} percobaan ${attempt + 1} gagal:`,
          messageOf(err).slice(0, 200)
        );

        // Model tidak tersedia untuk akun ini -> langsung model berikutnya
        if (isModelUnavailable(err)) break;

        // Error lain (API key salah, request invalid, dll) -> berhenti, jangan ditutupi
        if (!isRetryable(err)) throw err;

        if (attempt < MAX_RETRIES_PER_MODEL) {
          await sleep(RETRY_DELAY_MS);
        }
      }
    }
  }

  throw new Error(
    'Layanan AI sedang sibuk. Coba lagi beberapa saat. Detail: ' + messageOf(lastError)
  );
}