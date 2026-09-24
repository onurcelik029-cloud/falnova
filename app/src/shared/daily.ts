// Günlük ritüel: günde bir kez açılan kısa mesaj + ay evresi + 7 günlük seri ödülü.
// Mesajlar sabit havuzdan seçilir (yapay zekâ maliyeti yok); ay evresi gerçek astronomik hesaptır.

import type { Profile } from './types.ts';
import { makeRng, pick } from './rng.ts';
import { zodiacById } from './zodiac.ts';

export const STREAK_CYCLE = 7;
export const STREAK_REWARD_CREDITS = 1;

/** Türkiye saatine (UTC+3, yaz saati yok) göre gün anahtarı: YYYY-MM-DD. */
export function dayKeyTR(d: Date = new Date()): string {
  return new Date(d.getTime() + 3 * 3600_000).toISOString().slice(0, 10);
}

export function addDays(key: string, n: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export interface MoonInfo {
  name: string;
  /** 0 (yeni ay) … 1 (dolunay) aydınlık oranı */
  illumination: number;
  /** 0..1: sinodik döngüdeki konum */
  phase: number;
}

const SYNODIC = 29.530588853;
const NEW_MOON_REF = Date.UTC(2000, 0, 6, 18, 14); // bilinen yeni ay

/** Verilen günün (öğlen UTC) ay evresi. */
export function moonPhase(dayKey: string): MoonInfo {
  const [y, m, d] = dayKey.split('-').map(Number);
  const days = (Date.UTC(y, m - 1, d, 12) - NEW_MOON_REF) / 86_400_000;
  const phase = (((days % SYNODIC) + SYNODIC) % SYNODIC) / SYNODIC;
  const illumination = (1 - Math.cos(phase * Math.PI * 2)) / 2;
  const names = ['Yeni Ay', 'Hilal (büyüyen)', 'İlk Dördün', 'Şişkin Ay (büyüyen)', 'Dolunay', 'Şişkin Ay (küçülen)', 'Son Dördün', 'Hilal (küçülen)'];
  const name = names[Math.floor(((phase + 1 / 16) % 1) * 8)];
  return { name, illumination, phase };
}

export interface DailyState {
  day: string;
  /** Bugünkü ritüel açıldı mı? */
  claimed: boolean;
  /** Ardışık gün sayısı (bugün açıldıysa bugün dahil). */
  streak: number;
  /** 7 günlük döngüde kaçıncı gündeyiz (0 = henüz başlamadı, 1..7) */
  cycleDay: number;
  message?: string;
  moon: MoonInfo;
  /** Bugün açılışta kazanılan kredi (varsa) */
  reward?: number;
}

/** Önceki açılış gününe göre yeni seri. */
export function nextStreak(prevDay: string | null, prevStreak: number, today: string): number {
  if (!prevDay) return 1;
  if (prevDay === today) return prevStreak;
  return prevDay === addDays(today, -1) ? prevStreak + 1 : 1;
}

export const rewardForStreak = (streak: number): number =>
  streak > 0 && streak % STREAK_CYCLE === 0 ? STREAK_REWARD_CREDITS : 0;

export const cycleDayOf = (streak: number): number => (streak <= 0 ? 0 : ((streak - 1) % STREAK_CYCLE) + 1);

const BY_ELEMENT: Record<string, string[]> = {
  ates: [
    'Bugün içindeki kıvılcımı büyütmek için büyük bir adım gerekmiyor; küçük ama net bir adım yeter.',
    'Aceleyle söylenen söz bugün ağır gelebilir. Bir nefes bekle, sonra konuş.',
    'Cesaretin yerinde. Bugün ertelediğin tek bir işi bitirmek, içini şaşırtıcı ölçüde hafifletir.',
  ],
  toprak: [
    'Bugün sağlam basan ayaklar kazanır. Sıradan bir işi özenle yapmak seni beklenmedik bir yere taşır.',
    'Emeğinin karşılığı görünür olmaya başlıyor; sabrını bırakma.',
    'Bugün birine güven verecek küçük bir söz ya da iş, uzun süre hatırlanacak.',
  ],
  hava: [
    'Zihnin çok hızlı; bugün bir düşünceyi yazıya dökmek onu berraklaştırır.',
    'Bir konuşma bugün sandığından daha çok kapı açabilir. Dinlemek konuşmaktan değerli.',
    'Merakın seni bir yere götürüyor; bugün bir soruyu sonuna kadar takip et.',
  ],
  su: [
    'Duyguların bugün ince bir pusula. Neye içinin çekildiğine dikkat et, neyden kaçtığına da.',
    'Bugün kendine yumuşak davranmak zayıflık değil; yol arkadaşlığı.',
    'İçinden geçen bir şeyi birine anlatmak, onu yarıya indirir.',
  ],
};

const BY_MOON: Record<string, string> = {
  'Yeni Ay': 'Yeni ay: bir niyet koymak için sessiz bir gün.',
  'Hilal (büyüyen)': 'Büyüyen hilal: başlattığın şeye küçük bir dokunuş ekle.',
  'İlk Dördün': 'İlk dördün: bir engel çıkarsa vazgeçme, yönünü ayarla.',
  'Şişkin Ay (büyüyen)': 'Ay doluya yaklaşıyor: son düzlükte incelik önemli.',
  Dolunay: 'Dolunay: bir şeyin sonuçlandığı, duyguların yükseldiği bir gün.',
  'Şişkin Ay (küçülen)': 'Ay küçülmeye başladı: bırakmak için uygun bir zaman.',
  'Son Dördün': 'Son dördün: eski bir yükü bırakmayı düşün.',
  'Hilal (küçülen)': 'Küçülen hilal: dinlen, yeni döngüye hazırlan.',
};

/** Günün mesajı: aynı kişi için aynı gün hep aynıdır. */
export function dailyMessage(profile: Profile, day: string, moon: MoonInfo = moonPhase(day)): string {
  const z = zodiacById(profile.sign);
  const rng = makeRng('daily', profile.sign, profile.name, day);
  const line = pick(rng, BY_ELEMENT[z.element]);
  return `${profile.name}, ${line[0].toLocaleLowerCase('tr-TR')}${line.slice(1)} ${BY_MOON[moon.name]}`;
}

/** Bugünün durumunu, önceki açılış bilgisiyle birlikte üretir (kaydetmeden). */
export function dailyStateFor(
  profile: Profile, today: string, last: { day: string; streak: number } | null, claimedToday: boolean,
): DailyState {
  const moon = moonPhase(today);
  if (claimedToday && last) {
    return { day: today, claimed: true, streak: last.streak, cycleDay: cycleDayOf(last.streak), message: dailyMessage(profile, today, moon), moon };
  }
  // Açılmadıysa: dün açıldıysa seri korunuyor (gösterim için), değilse 0.
  const alive = last && (last.day === addDays(today, -1)) ? last.streak : 0;
  return { day: today, claimed: false, streak: alive, cycleDay: cycleDayOf(alive), moon };
}
