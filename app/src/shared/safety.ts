// Hassas konu koruması. Kriz belirtisi içeren metinde fal yorumu yapılmaz, kredi düşmez,
// şefkatli bir destek mesajı ve acil yönlendirme gösterilir.

const norm = (s: string) =>
  s.toLocaleLowerCase('tr-TR').replace(/[’'`´]/g, '').replace(/\s+/g, ' ');

const CRISIS = [
  /intihar/, /kendimi öldür/, /kendimi asa/, /kendime zarar/, /kendimi kes/, /canıma kıy/, /canima kiy/,
  /ölmek istiyorum/, /olmek istiyorum/, /yaşamak istemiyorum/, /yasamak istemiyorum/, /hayatıma son/, /hayatima son/,
  /kendimi bitir/, /ölsem daha iyi/, /olsem daha iyi/, /artık dayanamıyorum/, /bileklerimi/, /kendimi atmak/, /ilaç içip/,
];

/** Kriz belirtisi (kendine zarar / intihar) var mı? */
export function detectCrisis(text: string): boolean {
  const t = norm(text);
  return CRISIS.some((r) => r.test(t));
}

const MEDICAL = [/hamile/, /kanser/, /tümör|tumor/, /teşhis|teshis/, /ilaç|ilac/, /ameliyat/, /hastalığ|hastalig/];
const DEATH = [/ne zaman öl|ne zaman olec|ne zaman olur/, /ölecek mi|olecek mi/, /ölüm tarih|olum tarih/];
const FINANCE = [/borsa/, /kripto/, /bahis/, /iddaa/, /kaça satayım|hangi hisse/];

export type SensitiveKind = 'medical' | 'death' | 'finance';

/** Fal dışı uzmanlık gerektiren konular: yorum yapılır ama yumuşak bir not eklenir. */
export function detectSensitive(text: string): SensitiveKind | null {
  const t = norm(text);
  if (DEATH.some((r) => r.test(t))) return 'death';
  if (MEDICAL.some((r) => r.test(t))) return 'medical';
  if (FINANCE.some((r) => r.test(t))) return 'finance';
  return null;
}

export const SENSITIVE_NOTE: Record<SensitiveKind, string> = {
  medical: 'Sağlıkla ilgili sorularda fal yol gösterici değildir; bir sağlık uzmanına danışmak en doğrusudur.',
  death: 'Ölüm ya da felaket gibi konularda fal bir şey söyleyemez ve söylememelidir; kesin bir şey bilmek kimsenin elinde değil.',
  finance: 'Para ve yatırım kararlarında fal bir rehber değildir; kararını verilerle ve gerekirse bir uzmanla vermeni öneririm.',
};

export const SUPPORT_MESSAGE =
  'Yazdıkların beni düşündürdü ve şu an falın önüne geçmesi gereken bir şey var: sen. ' +
  'Böyle hissediyorsan yalnız olmak zorunda değilsin. Güvendiğin biriyle, bir arkadaşınla ya da yakınınla hemen konuşmanı çok isterim. ' +
  'Kendine zarar verme düşüncesi varsa ya da bir tehlike hissediyorsan lütfen 112 Acil Çağrı Merkezi\'ni ara veya en yakın acile git. ' +
  'Bu mesaj için kredin düşmedi; hazır olduğunda buradayım.';

export const SUPPORT_CODE = 'SAFETY';
