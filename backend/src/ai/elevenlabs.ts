// ElevenLabs Text-to-Speech — mistik sesli falcı.
import { mkdirSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { config } from '../config.ts';
import { ProviderError, postJson } from './http.ts';

export const elevenEnabled = (tone: string) => !!config.eleven.key && !!config.eleven.voices[tone];

const TONE_SETTINGS: Record<string, { stability: number; similarity_boost: number; style: number }> = {
  bilge: { stability: 0.55, similarity_boost: 0.8, style: 0.25 },
  gizemli: { stability: 0.4, similarity_boost: 0.85, style: 0.5 },
  fisilti: { stability: 0.7, similarity_boost: 0.7, style: 0.15 },
};

/** Metni sese çevirir, geçici dosya olarak kaydeder ve herkese açık URL döndürür. */
export async function synthesize(text: string, tone: string): Promise<string> {
  const voice = config.eleven.voices[tone];
  if (!config.eleven.key || !voice) throw new ProviderError('ElevenLabs yapılandırılmadı');
  const res = await postJson(
    `${config.eleven.baseUrl}/text-to-speech/${encodeURIComponent(voice)}?output_format=mp3_44100_128`,
    { 'xi-api-key': config.eleven.key, Accept: 'audio/mpeg' },
    { text: text.slice(0, 1500), model_id: config.eleven.model, voice_settings: { ...(TONE_SETTINGS[tone] ?? TONE_SETTINGS.bilge), use_speaker_boost: true } },
    60000,
  );
  const buf = Buffer.from(await res.arrayBuffer());
  mkdirSync(config.audioDir, { recursive: true });
  const name = `${randomUUID()}.mp3`;
  writeFileSync(join(config.audioDir, name), buf);
  cleanup();
  return `${config.publicUrl}/audio/${name}`;
}

/** 1 saatten eski ses dosyalarını siler. */
function cleanup() {
  try {
    const cutoff = Date.now() - 3600_000;
    for (const f of readdirSync(config.audioDir)) {
      const p = join(config.audioDir, f);
      if (statSync(p).mtimeMs < cutoff) unlinkSync(p);
    }
  } catch { /* yoksay */ }
}
