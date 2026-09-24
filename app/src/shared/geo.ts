/**
 * Türkiye'nin 81 il merkezinin yaklaşık koordinatları — doğum haritası hesaplarında
 * (Yükselen burç için yerel enlem/boylam gerekir) kullanılır. Kullanıcı serbest metin
 * girdiği için normalize edilmiş şehir adıyla eşleştirilir; bulunamazsa İstanbul varsayılır
 * (haritanın geri kalanı yine de doğru hesaplanır, yalnızca Yükselen kabaca yaklaşık olur).
 */
export interface GeoPoint {
  lat: number;
  lon: number;
}

const CITIES: Record<string, GeoPoint> = {
  adana: { lat: 37.0, lon: 35.32 }, adiyaman: { lat: 37.76, lon: 38.28 }, afyonkarahisar: { lat: 38.76, lon: 30.54 },
  agri: { lat: 39.72, lon: 43.05 }, amasya: { lat: 40.65, lon: 35.83 }, ankara: { lat: 39.93, lon: 32.86 },
  antalya: { lat: 36.88, lon: 30.7 }, artvin: { lat: 41.18, lon: 41.82 }, aydin: { lat: 37.85, lon: 27.85 },
  balikesir: { lat: 39.65, lon: 27.89 }, bilecik: { lat: 40.15, lon: 29.98 }, bingol: { lat: 38.88, lon: 40.5 },
  bitlis: { lat: 38.4, lon: 42.11 }, bolu: { lat: 40.73, lon: 31.61 }, burdur: { lat: 37.72, lon: 30.29 },
  bursa: { lat: 40.18, lon: 29.06 }, canakkale: { lat: 40.15, lon: 26.41 }, cankiri: { lat: 40.6, lon: 33.62 },
  corum: { lat: 40.55, lon: 34.95 }, denizli: { lat: 37.77, lon: 29.09 }, diyarbakir: { lat: 37.91, lon: 40.24 },
  edirne: { lat: 41.68, lon: 26.56 }, elazig: { lat: 38.68, lon: 39.22 }, erzincan: { lat: 39.75, lon: 39.5 },
  erzurum: { lat: 39.9, lon: 41.27 }, eskisehir: { lat: 39.78, lon: 30.52 }, gaziantep: { lat: 37.07, lon: 37.38 },
  giresun: { lat: 40.91, lon: 38.39 }, gumushane: { lat: 40.46, lon: 39.48 }, hakkari: { lat: 37.58, lon: 43.74 },
  hatay: { lat: 36.2, lon: 36.16 }, isparta: { lat: 37.77, lon: 30.56 }, mersin: { lat: 36.8, lon: 34.63 },
  istanbul: { lat: 41.01, lon: 28.98 }, izmir: { lat: 38.42, lon: 27.14 }, kars: { lat: 40.6, lon: 43.09 },
  kastamonu: { lat: 41.38, lon: 33.78 }, kayseri: { lat: 38.73, lon: 35.49 }, kirklareli: { lat: 41.73, lon: 27.22 },
  kirsehir: { lat: 39.15, lon: 34.16 }, kocaeli: { lat: 40.85, lon: 29.88 }, konya: { lat: 37.87, lon: 32.48 },
  kutahya: { lat: 39.42, lon: 29.99 }, malatya: { lat: 38.36, lon: 38.31 }, manisa: { lat: 38.61, lon: 27.43 },
  kahramanmaras: { lat: 37.57, lon: 36.94 }, mardin: { lat: 37.31, lon: 40.74 }, mugla: { lat: 37.22, lon: 28.36 },
  mus: { lat: 38.94, lon: 41.75 }, nevsehir: { lat: 38.62, lon: 34.71 }, nigde: { lat: 37.97, lon: 34.68 },
  ordu: { lat: 40.98, lon: 37.88 }, rize: { lat: 41.02, lon: 40.52 }, sakarya: { lat: 40.75, lon: 30.4 },
  samsun: { lat: 41.29, lon: 36.33 }, siirt: { lat: 37.93, lon: 41.94 }, sinop: { lat: 42.03, lon: 35.15 },
  sivas: { lat: 39.75, lon: 37.02 }, tekirdag: { lat: 40.98, lon: 27.51 }, tokat: { lat: 40.31, lon: 36.55 },
  trabzon: { lat: 41.0, lon: 39.72 }, tunceli: { lat: 39.11, lon: 39.55 }, sanliurfa: { lat: 37.16, lon: 38.79 },
  usak: { lat: 38.68, lon: 29.41 }, van: { lat: 38.49, lon: 43.38 }, yozgat: { lat: 39.82, lon: 34.8 },
  zonguldak: { lat: 41.46, lon: 31.79 }, aksaray: { lat: 38.37, lon: 34.03 }, bayburt: { lat: 40.26, lon: 40.22 },
  karaman: { lat: 37.18, lon: 33.22 }, kirikkale: { lat: 39.84, lon: 33.51 }, batman: { lat: 37.88, lon: 41.13 },
  sirnak: { lat: 37.52, lon: 42.46 }, bartin: { lat: 41.63, lon: 32.34 }, ardahan: { lat: 41.11, lon: 42.7 },
  igdir: { lat: 39.92, lon: 44.04 }, yalova: { lat: 40.65, lon: 29.28 }, karabuk: { lat: 41.2, lon: 32.63 },
  kilis: { lat: 36.72, lon: 37.12 }, osmaniye: { lat: 37.07, lon: 36.25 }, duzce: { lat: 40.84, lon: 31.16 },
};

/** Aksan/boşluk/büyük-küçük harf farklarını yok sayar: "İstanbul", "istanbul ", "İSTANBUL" hepsi eşleşir. */
function normalize(s: string): string {
  return s
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/[^a-z]/g, '');
}

const LOOKUP: Record<string, GeoPoint> = Object.fromEntries(
  Object.entries(CITIES).map(([k, v]) => [normalize(k), v]),
);

/** Serbest metin şehir adını koordinata çevirir. Bulunamazsa (veya boşsa) İstanbul varsayılan döner. */
export function geocodeTr(place: string | undefined): { point: GeoPoint; matched: boolean } {
  const key = normalize(place ?? '');
  if (!key) return { point: CITIES.istanbul, matched: false };
  // Önce tam eşleşme, sonra kısmi (ör. "Kadıköy, İstanbul" -> istanbul).
  if (LOOKUP[key]) return { point: LOOKUP[key], matched: true };
  for (const [name, point] of Object.entries(LOOKUP)) {
    if (key.includes(name) || name.includes(key)) return { point, matched: true };
  }
  return { point: CITIES.istanbul, matched: false };
}
