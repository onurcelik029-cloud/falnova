import { Platform } from 'react-native';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { getItem, setItem } from '@/lib/storage.ts';
import { AMBIENT_AUDIO_DATA_URI } from '@/shared/ambientAudio.generated.ts';

const KEY = 'falnova.ambient.sound';
// Telifsiz, uygulama için üretilmiş 24 saniyelik kusursuz döngü: mum çıtırtısı + yumuşak oda tınısı.
// Web'de (tek dosyalık, taşınabilir yayınlar için) base64 gömülü veri kullanılır; native'de küçük paket
// boyutu ve yerel dosya önbelleği için gerçek ses dosyası (`assets/audio/ambient-candle.mp3`) kullanılır.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const SOURCE = Platform.OS === 'web' ? { uri: AMBIENT_AUDIO_DATA_URI } : require('../../assets/audio/ambient-candle.mp3');

let player: AudioPlayer | null = null;
let current = false;
const listeners = new Set<(on: boolean) => void>();

function ensurePlayer(): AudioPlayer {
  if (!player) {
    player = createAudioPlayer(SOURCE);
    player.loop = true;
    player.volume = 0.32;
  }
  return player;
}

/** Kayıtlı tercihi okur. Varsayılan: kapalı (opt-in). */
export async function getAmbientSound(): Promise<boolean> {
  return (await getItem(KEY)) === '1';
}

export function isAmbientEnabled(): boolean {
  return current;
}

/** Ayar her değiştiğinde (hangi ekrandan tetiklenirse tetiklensin) haberdar olmak için. */
export function onAmbientChange(fn: (on: boolean) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function setAmbientSound(on: boolean): Promise<void> {
  current = on;
  await setItem(KEY, on ? '1' : '0');
  listeners.forEach((fn) => fn(on));
  try {
    if (on) ensurePlayer().play();
    else player?.pause();
  } catch {
    /* tarayıcı otomatik oynatmayı engellemiş olabilir; ilk dokunuşta yeniden denenir */
  }
}

/** Uygulama açılışında kayıtlı tercihi uygular. Kök layout'ta bir kez çağrılır. */
export async function initAmbientSound(): Promise<void> {
  const on = await getAmbientSound();
  current = on;
  if (!on) return;
  try {
    ensurePlayer().play();
  } catch {
    /* otomatik oynatma engeli — retryAmbientOnGesture ile telafi edilir */
  }
}

/** Web'de otomatik oynatma engellendiyse kullanıcının ilk dokunuşunda sessizce tekrar dener. */
export function retryAmbientOnGesture(): void {
  if (current && player && !player.playing) {
    try {
      player.play();
    } catch {
      /* yoksay */
    }
  }
}
