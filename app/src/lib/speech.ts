import { Platform } from 'react-native';
import * as Speech from 'expo-speech';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import type { VoiceTone } from '@/shared/types.ts';

export const TONES: { id: VoiceTone; label: string; glyph: string; pitch: number; rate: number }[] = [
  { id: 'bilge', label: 'Bilge Kadın', glyph: '☾', pitch: 0.9, rate: 0.9 },
  { id: 'gizemli', label: 'Gizemli Ses', glyph: '✦', pitch: 0.6, rate: 0.85 },
  { id: 'fisilti', label: 'Fısıltı', glyph: '✧', pitch: 1.15, rate: 0.8 },
];

let player: AudioPlayer | null = null;

export function stopSpeaking() {
  try { Speech.stop(); } catch { /* yoksay */ }
  try { player?.pause(); player?.remove(); } catch { /* yoksay */ }
  player = null;
}

/** Sunucudan ElevenLabs sesi geldiyse onu çalar; yoksa cihazın Türkçe TTS'ini kullanır. */
export function speak(text: string, tone: VoiceTone, audioUrl?: string, onDone?: () => void) {
  stopSpeaking();
  if (audioUrl) {
    try {
      player = createAudioPlayer({ uri: audioUrl });
      player.addListener('playbackStatusUpdate', (st) => { if (st.didJustFinish) onDone?.(); });
      player.play();
      return;
    } catch { /* cihaz TTS'e düş */ }
  }
  const t = TONES.find((x) => x.id === tone) ?? TONES[0];
  Speech.speak(text, { language: 'tr-TR', pitch: t.pitch, rate: t.rate, onDone, onStopped: onDone, onError: onDone });
}

/** Web'de tarayıcı ses tanıma (Chrome/Safari). Yoksa null. */
export function createRecognizer(onResult: (text: string) => void, onEnd: () => void): { start: () => void; stop: () => void } | null {
  if (Platform.OS !== 'web') return null;
  const g = globalThis as any;
  const SR = g.SpeechRecognition ?? g.webkitSpeechRecognition;
  if (!SR) return null;
  const rec = new SR();
  rec.lang = 'tr-TR';
  rec.interimResults = true;
  rec.onresult = (e: any) => onResult(Array.from(e.results).map((r: any) => r[0].transcript).join(' '));
  rec.onend = onEnd;
  rec.onerror = onEnd;
  return { start: () => rec.start(), stop: () => rec.stop() };
}
