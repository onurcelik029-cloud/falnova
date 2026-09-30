export class ProviderError extends Error {}

const sleep = (ms: number) => new Promise((r) => { setTimeout(r, ms); });

// Gemini/OpenAI ara sıra "şu an yoğunluk var" (503) ya da hız sınırı (429) döndürüyor — bunlar kalıcı
// hatalar değil, birkaç yüz milisaniye sonra genelde başarılı oluyor. Canlı testte doğrulandı: aynı istek
// art arda denendiğinde 503 → 200 şeklinde değişebiliyor. Bu geçici hatalarda sessizce mock içeriğe düşmek
// yerine kısa aralıklarla 2 kez daha deneriz; kalıcı hatalarda (400/401/403 vb.) hâlâ hemen pes ederiz.
const RETRY_STATUS = new Set([429, 503]);
const RETRY_DELAYS_MS = [500, 1200];

export async function postJson(url: string, headers: Record<string, string>, body: unknown, timeoutMs = 45000): Promise<Response> {
  let lastErr: ProviderError | null = null;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body), signal: ctrl.signal });
      if (!res.ok) {
        const detail = (await res.text().catch(() => '')).slice(0, 300);
        if (RETRY_STATUS.has(res.status) && attempt < RETRY_DELAYS_MS.length) {
          lastErr = new ProviderError(`HTTP ${res.status} ${detail}`);
          await sleep(RETRY_DELAYS_MS[attempt]);
          continue;
        }
        throw new ProviderError(`HTTP ${res.status} ${detail}`);
      }
      return res;
    } catch (e) {
      const err = e instanceof ProviderError ? e : new ProviderError(e instanceof Error ? e.message : 'ağ hatası');
      throw err;
    } finally {
      clearTimeout(t);
    }
  }
  throw lastErr ?? new ProviderError('bilinmeyen sağlayıcı hatası');
}

/** Model bazen ```json çiti ekler; içindeki JSON'u çıkarır. */
export function parseJsonLoose(text: string): unknown {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    return JSON.parse(cleaned);
  } catch {
    const s = cleaned.indexOf('{');
    const e = cleaned.lastIndexOf('}');
    if (s >= 0 && e > s) return JSON.parse(cleaned.slice(s, e + 1));
    throw new ProviderError('Model geçerli JSON döndürmedi');
  }
}
