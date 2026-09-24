// OpenAI GPT-4o (Vision) — kahve falı (fincan/tabak) ve el falı (avuç içi) fotoğraf analizi.
import { config } from '../config.ts';
import { ProviderError, parseJsonLoose, postJson } from './http.ts';

export const openaiEnabled = () => !!config.openai.key;

export async function openaiJson(opts: { system: string; user: string; images?: string[] }): Promise<unknown> {
  const content: unknown[] = [{ type: 'text', text: opts.user }];
  for (const img of opts.images ?? []) content.push({ type: 'image_url', image_url: { url: img, detail: 'auto' } });

  const res = await postJson(
    `${config.openai.baseUrl}/chat/completions`,
    { Authorization: `Bearer ${config.openai.key}` },
    {
      model: config.openai.model,
      temperature: 0.9,
      max_tokens: 1800,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: opts.system },
        { role: 'user', content },
      ],
    },
    60000,
  );
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = json.choices?.[0]?.message?.content;
  if (!text) throw new ProviderError('OpenAI boş yanıt döndürdü');
  return parseJsonLoose(text);
}
