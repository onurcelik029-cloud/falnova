// Google Gemini — metin, sohbet ve kader analizleri.
import { config } from '../config.ts';
import { ProviderError, parseJsonLoose, postJson } from './http.ts';

export const geminiEnabled = () => !!config.gemini.key;

const endpoint = () => `${config.gemini.baseUrl}/models/${config.gemini.model}:generateContent`;
const headers = () => ({ 'x-goog-api-key': config.gemini.key });

function dataUriToPart(uri: string) {
  const m = /^data:(image\/[a-z+.-]+);base64,(.+)$/i.exec(uri);
  if (!m) throw new ProviderError('Geçersiz görsel');
  return { inline_data: { mime_type: m[1], data: m[2] } };
}

async function generate(body: unknown): Promise<string> {
  const res = await postJson(endpoint(), headers(), body, 60000);
  const json = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[] };
  const finishReason = json.candidates?.[0]?.finishReason;
  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('').trim();
  if (!text) throw new ProviderError(`Gemini boş yanıt (${finishReason ?? 'bilinmiyor'})`);
  // MAX_TOKENS: yanıt bütçe dolmadan bitmedi, yarım kalmış olabilir — yarım bir fal/sohbet metnini
  // kullanıcıya sessizce göstermek yerine hata fırlatıp mock/yedek içeriğe düşülsün.
  if (finishReason === 'MAX_TOKENS') throw new ProviderError('Gemini yanıtı belirlenen token sınırında kesildi (MAX_TOKENS)');
  return text;
}

// "Düşünme" (thinking) bütçesini kapatır: bu uygulamada Gemini'den karmaşık çok adımlı akıl
// yürütme değil, üsluplu/yaratıcı düz yazı isteniyor — thinking hem gecikme hem maliyet ekliyor,
// hem de kapalıyken bile bazı modellerde maxOutputTokens'ın büyük bir kısmını "düşünce" token'larına
// harcatıp asıl yanıtı yarıda kesebiliyor (canlı testte doğrulandı: thinkingBudget:0 olmadan bir
// sohbet yanıtı 700 token'lık bütçenin neredeyse tamamını düşünmeye harcayıp cümle ortasında kesildi).
const NO_THINKING = { thinkingBudget: 0 } as const;

export async function geminiJson(opts: { system: string; user: string; images?: string[] }): Promise<unknown> {
  const parts: unknown[] = [{ text: opts.user }, ...(opts.images ?? []).map(dataUriToPart)];
  const text = await generate({
    systemInstruction: { parts: [{ text: opts.system }] },
    contents: [{ role: 'user', parts }],
    generationConfig: { temperature: 0.95, maxOutputTokens: 2200, responseMimeType: 'application/json', thinkingConfig: NO_THINKING },
  });
  return parseJsonLoose(text);
}

export async function geminiChat(opts: { system: string; history: { role: 'user' | 'assistant'; text: string }[]; user: string }): Promise<string> {
  const contents = [
    ...opts.history.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.text }] })),
    { role: 'user', parts: [{ text: opts.user }] },
  ];
  return generate({
    systemInstruction: { parts: [{ text: opts.system }] },
    contents,
    generationConfig: { temperature: 0.9, maxOutputTokens: 700, thinkingConfig: NO_THINKING },
  });
}
