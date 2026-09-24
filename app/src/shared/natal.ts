// Doğum haritası: Güneş, Ay ve Yükselen burç + element dağılımı.
// Güneş burcu zaten mevcut takvim kuralıyla hesaplanıyor (zodiac.ts). Ay ve Yükselen için
// gerçek astronomik hesap kullanılır (günlük ay evresindeki "gerçek astronomik hesap" ilkesiyle
// tutarlı): Ay'ın ekliptik boylamı (Van Flandern–Pulkkinen 1979 düşük hassasiyetli formülü,
// ~0.3-1° doğrulukta — burç dilimi için fazlasıyla yeterli) ve doğum yeri/saatine göre yerel
// yıldız zamanından türetilen Yükselen burç. Doğum saati bilinmiyorsa Yükselen gösterilmez
// (yaklaşık bir değer göstermek yanıltıcı olur — Yükselen ~4 dakikada 1° kayar).

import type { Element, Profile, ZodiacId } from './types.ts';
import { ZODIAC } from './zodiac.ts';
import { geocodeTr } from './geo.ts';

const DEG = Math.PI / 180;
const OBLIQUITY = 23.4367 * DEG; // ekliptik eğikliği (yaklaşık, modern dönem için yeterli)

function mod360(x: number): number {
  return ((x % 360) + 360) % 360;
}

/** Türkiye saatiyle (UTC+3 varsayımı — uygulamanın geri kalanıyla tutarlı) girilen doğum an'ının Julian Day'i. */
function julianDay(iso: string, hhmm: string | undefined): number {
  const [y, mo, d] = iso.split('-').map(Number);
  const [hh, mm] = (hhmm ?? '12:00').split(':').map(Number);
  // Yerel (UTC+3) saati UTC'ye çevir.
  const utcMs = Date.UTC(y, mo - 1, d, (hh ?? 12) - 3, mm ?? 0);
  return utcMs / 86_400_000 + 2440587.5;
}

/** Ay'ın ekliptik boylamı (derece, 0-360). Van Flandern–Pulkkinen (1979) düşük hassasiyetli formülü. */
function moonEclipticLongitude(jd: number): number {
  const T = (jd - 2451545.0) / 36525;
  const terms: [number, number, number][] = [
    // [genlik(derece), hız(derece/yy), faz(derece)]
    [6.29, 477198.85, 134.9],
    [-1.27, 413335.38, 259.2],
    [0.66, 890534.23, 235.7],
    [0.21, 954397.7, 269.9],
    [-0.19, 35999.05, 357.5],
    [-0.11, 966404.05, 186.6],
  ];
  let lon = 218.32 + 481267.883 * T;
  for (const [amp, speed, phase] of terms) lon += amp * Math.sin(mod360(speed * T + phase) * DEG);
  return mod360(lon);
}

/** Greenwich Ortalama Yıldız Zamanı (derece). */
function gmstDegrees(jd: number): number {
  const d = jd - 2451545.0;
  return mod360(280.46061837 + 360.98564736629 * d);
}

/** Yerel yıldız zamanına (RAMC) göre Yükselen burcun ekliptik boylamı (derece, 0-360). */
function ascendantLongitude(jd: number, latDeg: number, lonEastDeg: number): number {
  const ramc = mod360(gmstDegrees(jd) + lonEastDeg) * DEG;
  const lat = latDeg * DEG;
  const y = -Math.cos(ramc);
  const x = Math.sin(ramc) * Math.cos(OBLIQUITY) + Math.tan(lat) * Math.sin(OBLIQUITY);
  return mod360(Math.atan2(y, x) / DEG);
}

/** Ekliptik boylamı (0-360, 0 = Koç başlangıcı) burca çevirir. */
function signFromLongitude(lonDeg: number): ZodiacId {
  const idx = Math.floor(mod360(lonDeg) / 30) % 12;
  return ZODIAC[idx].id;
}

export interface NatalChart {
  sun: ZodiacId;
  moon: ZodiacId;
  /** Doğum saati girilmemişse null (yaklaşık göstermek yanıltıcı olur). */
  ascendant: ZodiacId | null;
  /** Şehir eşleşti mi (eşleşmediyse İstanbul varsayıldı — Yükselen kabaca yaklaşıktır). */
  placeMatched: boolean;
  /** Güneş + Ay + (varsa) Yükselen arasındaki element dağılımı. */
  elements: Record<Element, number>;
  dominantElement: Element | null;
}

export function computeNatalChart(profile: Profile): NatalChart {
  const jd = julianDay(profile.birthDate, profile.birthTime);
  const moon = signFromLongitude(moonEclipticLongitude(jd));
  const { point, matched } = geocodeTr(profile.birthPlace);
  const ascendant = profile.birthTime ? signFromLongitude(ascendantLongitude(jd, point.lat, point.lon)) : null;

  const elements: Record<Element, number> = { ates: 0, toprak: 0, hava: 0, su: 0 };
  const points: ZodiacId[] = [profile.sign, moon, ...(ascendant ? [ascendant] : [])];
  for (const id of points) elements[ZODIAC.find((z) => z.id === id)!.element]++;
  const dominantElement = (Object.entries(elements) as [Element, number][])
    .sort((a, b) => b[1] - a[1])[0];

  return {
    sun: profile.sign,
    moon,
    ascendant,
    placeMatched: profile.birthTime ? matched : false,
    elements,
    dominantElement: dominantElement && dominantElement[1] > 0 ? dominantElement[0] : null,
  };
}
