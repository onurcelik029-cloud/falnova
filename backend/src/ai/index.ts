// Yapay zekâ dağıtımı:
//   Kahve falı (görsel)        → OpenAI GPT-4o Vision  (yedek: Gemini Vision → mock)
//   Tarot/burç/rüya/kader/çift/sohbet → Google Gemini  (yedek: mock)
//   Sesli yanıt                → ElevenLabs             (yedek: cihaz TTS)
// Bir sağlayıcı anahtarsız ya da hatalıysa kullanıcı deneyimi bozulmaz: içerik motoru devreye girer.

import type {
  AiProvider, CoffeeRequest, CoupleRequest, DreamRequest, KarmicRequest, PalmRequest, Profile, TarotRequest, VoiceTone, ZodiacId,
} from '../../../app/src/shared/types.ts';
import { mockCoffee, mockDream, mockHoroscope, mockNatal, mockPalm, mockTarot, type Draft } from '../../../app/src/shared/mock.ts';
import { mockChatReply, mockCouple, mockKarmic } from '../../../app/src/shared/mock2.ts';
import { todayKey } from '../../../app/src/shared/rng.ts';
import { openaiEnabled, openaiJson } from './openai.ts';
import { geminiChat, geminiEnabled, geminiJson } from './gemini.ts';
import { elevenEnabled, synthesize } from './elevenlabs.ts';
import * as P from './prompts.ts';
import type { AiCtx } from './prompts.ts';

const str = (v: unknown, max = 1200): string | null => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

function sectionsFrom(v: unknown): { title: string; body: string }[] | null {
  if (!Array.isArray(v)) return null;
  const out = v
    .map((s) => ({ title: str((s as { title?: unknown })?.title, 100), body: str((s as { body?: unknown })?.body, 2500) }))
    .filter((s): s is { title: string; body: string } => !!s.title && !!s.body);
  return out.length >= 2 ? out.slice(0, 10) : null;
}

async function tryProviders<T>(label: string, attempts: { provider: AiProvider; enabled: boolean; run: () => Promise<T> }[]): Promise<{ provider: AiProvider; value: T } | null> {
  for (const a of attempts) {
    if (!a.enabled) continue;
    try {
      return { provider: a.provider, value: await a.run() };
    } catch (e) {
      console.warn(`[ai] ${label} / ${a.provider} başarısız:`, e instanceof Error ? e.message.slice(0, 200) : e);
    }
  }
  return null;
}

// ───────── Kahve ─────────
export async function coffee(req: CoffeeRequest, profile: AiCtx): Promise<Draft> {
  const base = mockCoffee(req, profile);
  const pr = P.coffeePrompt(req, profile);
  const r = await tryProviders('kahve', [
    { provider: 'openai', enabled: openaiEnabled(), run: () => openaiJson({ ...pr, images: req.images }) },
    { provider: 'gemini', enabled: geminiEnabled(), run: () => geminiJson({ ...pr, images: req.images }) },
  ]);
  if (!r) return base;
  const j = r.value as Record<string, unknown>;
  const sections = sectionsFrom(j.sections);
  if (!sections) return base;
  const symbols = Array.isArray(j.symbols) ? j.symbols.map((s) => str(s, 30)).filter((s): s is string => !!s).slice(0, 8) : base.meta?.symbols;
  return { ...base, title: base.title, summary: str(j.summary, 300) ?? base.summary, sections, provider: r.provider, meta: { ...base.meta, symbols } };
}

// ───────── Tarot ─────────
export async function tarot(req: TarotRequest, profile: AiCtx): Promise<Draft> {
  const base = mockTarot(req, profile);
  const r = await tryProviders('tarot', [{ provider: 'gemini', enabled: geminiEnabled(), run: () => geminiJson(P.tarotPrompt(req, profile)) }]);
  const sections = r && sectionsFrom((r.value as Record<string, unknown>).sections);
  if (!r || !sections) return base;
  return { ...base, summary: str((r.value as Record<string, unknown>).summary, 300) ?? base.summary, sections, provider: r.provider };
}

// ───────── Burç ─────────
export async function horoscope(sign: ZodiacId, profile: AiCtx, period: 'daily' | 'weekly'): Promise<Draft> {
  const dateKey = todayKey();
  const base = mockHoroscope(sign, profile, dateKey, period); // puanlar ve şanslı sayı/renk deterministik
  const r = await tryProviders('burç', [{ provider: 'gemini', enabled: geminiEnabled(), run: () => geminiJson(P.horoscopePrompt(sign, profile, period, dateKey)) }]);
  const sections = r && sectionsFrom((r.value as Record<string, unknown>).sections);
  if (!r || !sections) return base;
  return { ...base, sections, provider: r.provider };
}

// ───────── Doğum Haritası ─────────
export async function natal(profile: AiCtx): Promise<Draft> {
  const base = mockNatal(profile); // Güneş/Ay/Yükselen ve element dağılımı gerçek astronomik hesap — AI yalnızca yorumu zenginleştirir
  const chart = base.meta?.natal;
  if (!chart) return base;
  const r = await tryProviders('doğum haritası', [{ provider: 'gemini', enabled: geminiEnabled(), run: () => geminiJson(P.natalPrompt(profile, chart)) }]);
  const sections = r && sectionsFrom((r.value as Record<string, unknown>).sections);
  if (!r || !sections) return base;
  return { ...base, summary: str((r.value as Record<string, unknown>).summary, 300) ?? base.summary, sections, provider: r.provider };
}

// ───────── El Falı ─────────
export async function palm(req: PalmRequest, profile: AiCtx): Promise<Draft> {
  const base = mockPalm(req, profile);
  const pr = P.palmPrompt(req, profile);
  const r = await tryProviders('el falı', [
    { provider: 'openai', enabled: openaiEnabled(), run: () => openaiJson({ ...pr, images: req.images }) },
    { provider: 'gemini', enabled: geminiEnabled(), run: () => geminiJson({ ...pr, images: req.images }) },
  ]);
  if (!r) return base;
  const j = r.value as Record<string, unknown>;
  const sections = sectionsFrom(j.sections);
  if (!sections) return base;
  return { ...base, summary: str(j.summary, 300) ?? base.summary, sections, provider: r.provider };
}

// ───────── Rüya ─────────
export async function dream(req: DreamRequest, profile: AiCtx): Promise<Draft> {
  const base = mockDream(req, profile);
  const r = await tryProviders('rüya', [{ provider: 'gemini', enabled: geminiEnabled(), run: () => geminiJson(P.dreamPrompt(req, profile)) }]);
  const j = r?.value as Record<string, unknown> | undefined;
  const sections = j && sectionsFrom(j.sections);
  if (!r || !j || !sections) return base;
  const symbols = Array.isArray(j.symbols) ? j.symbols.map((s) => str(s, 30)).filter((s): s is string => !!s).slice(0, 6) : base.meta?.symbols;
  return { ...base, summary: str(j.summary, 300) ?? base.summary, sections, provider: r.provider, meta: { ...base.meta, symbols } };
}

// ───────── Karmik Dönemeç (TAM içerik döner; paywall'u store/route uygular) ─────────
export async function karmic(req: KarmicRequest, profile: AiCtx): Promise<Draft> {
  const full = mockKarmic(req, profile, true);
  const r = await tryProviders('karmik', [{ provider: 'gemini', enabled: geminiEnabled(), run: () => geminiJson(P.karmicPrompt(req, profile)) }]);
  const j = r?.value as Record<string, unknown> | undefined;
  if (!r || !j) return full;

  const debt = str(j.debt, 900);
  const root = str(j.root, 700);
  const lesson = str(j.lesson, 200);
  const turning = str(j.turning_point, 700);
  const quote = str(j.poster_quote, 120);
  const months = Array.isArray(j.months) ? j.months.slice(0, 3) : [];
  const timelineOk = months.length === 3 && months.every((m) => str((m as { text?: unknown })?.text, 600));
  if (!debt || !root || !turning || !quote || !timelineOk) return full;

  const monthLabels = (full.meta?.timeline ?? []).map((t) => t.month);
  const timeline = months.map((m, i) => ({
    month: monthLabels[i] ?? `${i + 1}. Ay`,
    title: str((m as { title?: unknown }).title, 30) ?? ['Yüzleşme', 'Dönemeç', 'Açılış'][i],
    text: str((m as { text?: unknown }).text, 600)!,
  }));
  const [s0, s1, s2, s3, s4] = full.sections;
  return {
    ...full,
    provider: r.provider,
    meta: { ...full.meta, timeline, posterQuote: quote },
    sections: [
      { ...s0, body: `${profile.name}, ${debt}` },
      { ...s1, body: `${root}${lesson ? ` ${lesson}` : ''}` },
      { ...s2, body: timeline.map((m, i) => `${i + 1}. AY — ${m.month} · ${m.title}\n${m.text}`).join('\n\n') },
      { ...s3, body: turning },
      { ...s4, body: `“${quote}”\n\n${s4.body.split('\n\n').slice(1).join('\n\n')}` },
    ],
  };
}

// ───────── Partner ─────────
export async function couple(req: CoupleRequest, profile: AiCtx): Promise<Draft> {
  const base = mockCouple(req, profile); // uyum puanı ve kategoriler deterministik
  const r = await tryProviders('partner', [{
    provider: 'gemini', enabled: geminiEnabled(),
    run: () => geminiJson(P.couplePrompt(req, profile, base.meta?.score ?? 60, base.meta?.scores ?? [])),
  }]);
  const sections = r && sectionsFrom((r.value as Record<string, unknown>).sections);
  if (!r || !sections) return base;
  return { ...base, sections, provider: r.provider };
}

// ───────── Sohbet + ses ─────────
export async function chatReply(
  history: { role: 'user' | 'assistant'; text: string }[], text: string, profile: AiCtx, voice: boolean, turn: number, tone: VoiceTone = 'bilge',
): Promise<{ text: string; provider: AiProvider }> {
  const r = await tryProviders('sohbet', [{
    provider: 'gemini', enabled: geminiEnabled(),
    run: () => geminiChat({ system: P.chatSystem(profile, voice, tone), history: history.slice(-12), user: `<kullanici_metni>${text.replace(/<\/?kullanici_metni>/g, '')}</kullanici_metni>` }),
  }]);
  if (r) return { text: r.value, provider: r.provider };
  const recentReplies = history.filter((h) => h.role === 'assistant').slice(-6).map((h) => h.text);
  return { text: mockChatReply(text, profile, turn, recentReplies, tone), provider: 'mock' };
}

export async function speech(text: string, tone: VoiceTone): Promise<string | undefined> {
  if (!elevenEnabled(tone)) return undefined;
  try {
    return await synthesize(text, tone);
  } catch (e) {
    console.warn('[ai] ElevenLabs başarısız:', e instanceof Error ? e.message.slice(0, 200) : e);
    return undefined; // istemci cihaz TTS'ine düşer
  }
}
