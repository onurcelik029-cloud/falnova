// Yapay zekâ anahtarı olmadığında (demo modu) kullanılan içerik motoru.
// Aynı fonksiyonlar backend'de de "provider: mock" yedeği olarak çalışır.

import type {
  CoffeeRequest, DreamRequest, Element, FortuneResult, PalmRequest, Profile, TarotRequest, TarotCardDraw,
} from './types.ts';
import { ELEMENT_LABEL, zodiacById } from './zodiac.ts';
import { SPREADS, tarotById } from './tarot.ts';
import { int, makeRng, pick, pickN, todayKey } from './rng.ts';
import { computeNatalChart } from './natal.ts';

export type Draft = Omit<FortuneResult, 'id' | 'createdAt'>;

const sec = (title: string, body: string) => ({ title, body });

// ───────────────────────── Kahve Falı ─────────────────────────

const COFFEE_SYMBOLS: { name: string; meaning: string }[] = [
  { name: 'Kuş', meaning: 'uzaktan gelecek güzel bir haber; bir mesaj ya da telefon yakında yüzünü güldürecek' },
  { name: 'Yol', meaning: 'yeni bir yolculuk ya da hayatında açılacak taze bir sayfa; bu yol seni ferahlatacak' },
  { name: 'Balık', meaning: 'bereket ve maddi rahatlama; emeklerinin karşılığı su gibi akıp gelecek' },
  { name: 'Yüzük', meaning: 'bağlılık, söz ya da önemli bir birliktelik; kalbi ilgilendiren ciddi bir gelişme' },
  { name: 'Kalp', meaning: 'karşılık bulan bir duygu; eski ya da yeni, ama içten bir sevgi' },
  { name: 'Yılan', meaning: 'seni izleyen bir göz; her sözü söyleyene güvenme, ama korkma — uyanık olman yeter' },
  { name: 'Göz', meaning: 'nazar ve koruma; çevrende seni kıskanan var ama sevenlerin kalkanın' },
  { name: 'Anahtar', meaning: 'uzun süredir kilitli duran bir kapı aralanıyor; çözüm sandığından yakın' },
  { name: 'Hilal', meaning: 'sezgilerinin kuvvetlenmesi; rüyalar ve iç sesin bu dönem doğruyu söylüyor' },
  { name: 'Ağaç', meaning: 'aile bağları, kökler ve sağlam bir gelecek; uzun ömürlü bir kazanım' },
  { name: 'Dağ', meaning: 'önünde bir engel var ama tırmanacak gücün de var; zirvede manzara seni bekliyor' },
  { name: 'At', meaning: 'hızlı gelişmeler ve haberler; durağan işler bir anda hareketlenecek' },
  { name: 'Merdiven', meaning: 'iş ya da statü yükselişi; adım adım ama sağlam ilerleyeceksin' },
  { name: 'Kelebek', meaning: 'dönüşüm; bir huyundan, bir düşüncenden ya da bir ilişkiden hafifleyeceksin' },
  { name: 'Çiçek', meaning: 'sevinç, davet ve güzel sürprizler; yakında bir kutlamanın parçası olabilirsin' },
  { name: 'Köprü', meaning: 'iki taraf arasında barış; küs olduğun biriyle yeniden köprü kurulabilir' },
];

export function mockCoffee(req: CoffeeRequest, profile: Profile): Draft {
  const sign = zodiacById(profile.sign);
  const seed = req.images.map((s) => s.length + s.slice(-24)).join('#') + profile.name + (req.question ?? '');
  const rng = makeRng('coffee', seed, todayKey());
  const symbols = pickN(rng, COFFEE_SYMBOLS, 5);
  const [near, mid, deep, plate, extra] = symbols;
  const q = req.question?.trim();

  const intro = pick(rng, [
    'fincanın telvesi yumuşak ve akıcı bir desen bırakmış; bu, son günlerde içinde biriken düğümün çözülmeye başladığını gösteriyor.',
    'telve fincanın kenarına doğru yükselmiş; bu, dışarıya söyleyemediğin şeylerin artık kendine yol aradığını anlatıyor.',
    'fincanın içinde güçlü bir ışık-gölge dengesi var; bu dönem hem kapanan hem açılan kapıların döneminde olduğunu fısıldıyor.',
  ]);

  const isDeep = req.depth === 'deep';
  const [s5, s6] = pickN(rng, COFFEE_SYMBOLS.filter((x) => !symbols.includes(x)), 2);
  const focusLine = profile.focus
    ? ({ ask: 'gönül alanında', kariyer: 'iş ve amaç alanında', para: 'para akışında', aile: 'aile bağlarında', kendini: 'kendi yolunu bulma yolculuğunda', saglik: 'içsel dinlenme ve şifa alanında' })[profile.focus]
    : 'hayatının bu döneminde';
  const deepSections = isDeep ? [
    sec('Gönül Alanı', `Fincanın sağ tarafında ${s5.name.toLowerCase()} beliriyor: ${s5.meaning}. Bu işaret ${focusLine}, ${near.name.toLowerCase()} ile birleşince duygularını ertelemeden ifade etmenin sana iyi geleceğini söylüyor.`),
    sec('İş ve Para', `Sol tarafta ${s6.name.toLowerCase()} var: ${s6.meaning}. Bu, maddi konularda aceleyle değil, adım adım ilerlediğinde kazanacağını gösteriyor. ${deep.name} dipte durduğu için kalıcı bir kazanım sabırla geliyor.`),
    sec('Önümüzdeki 30 Gün', `İlk hafta ${near.name.toLowerCase()} temasıyla küçük bir haber ya da fark ediş, ikinci hafta ${mid.name.toLowerCase()} etrafında bir karar anı görünüyor. Üçüncü hafta sakin, son hafta ise ${plate.name.toLowerCase()} işaretiyle toparlanma ve netlik getiriyor. Bunlar yönlendirme niteliğindedir; kararlar her zaman sende.`),
  ] : [];
  const all = [
    sec('Fincanın Genel Enerjisi', `Sevgili ${profile.name}, ${intro} ${sign.name} burcunun yöneticisi ${sign.planet} bu fincanda görünmez bir imza bırakmış.`),
    sec(`Kenar: ${near.name}`, `Fincanın kenarı yakın geleceği anlatır. Burada beliren ${near.name.toLowerCase()} işareti, ${near.meaning}. Bu, önümüzdeki günlerde fark edeceğin bir gelişme.`),
    sec(`Orta: ${mid.name}`, `Fincanın ortası şimdiki hâlini gösterir. ${mid.name} sembolü, ${mid.meaning}. Şu an içinde bulunduğun durumu doğru okuduğunu, sadece kendine biraz daha güvenmen gerektiğini söylüyor.`),
    sec(`Dip: ${deep.name}`, `Dip, derinlerdeki kalıcı mesajdır. ${deep.name} figürü, ${deep.meaning}. Bu, sadece haftalık değil, bu yılın büyük teması olabilir.`),
    sec(`Tabak: ${plate.name}`, `Tabaktaki izler fincanın kısa vadeli özetidir. ${plate.name} işareti ${plate.meaning}. Ayrıca tabağın kenarındaki ${extra.name.toLowerCase()} şekli, ${extra.meaning}.`),
    ...deepSections,
    sec(q ? 'Sorduğun Soruya Fincanın Cevabı' : 'Falcının Tavsiyesi',
      q
        ? `"${q}" diye sormuştun. Telve net konuşuyor: acele etme ama vazgeçme de. ${near.name} ve ${mid.name} birlikte, cevabın sabırla ama açık kalpli davranırsan lehine döneceğini söylüyor.`
        : `Bu hafta içgüdülerini dinle, şüphelendiğin yerde bir soru daha sor. ${near.name} yakında yüzünü güldürecek; ona hazır ol.`),
  ];

  return {
    kind: 'coffee',
    title: isDeep ? 'Derin Kahve Okuması' : 'Kahve Falın',
    summary: `${near.name}, ${mid.name} ve ${deep.name} fincanının başrolünde. ${sign.name} burcunun ${sign.trait} enerjisi telveye işlemiş.`,
    unlocked: true,
    provider: 'mock',
    meta: { symbols: symbols.map((s) => s.name), sign: profile.sign, deep: isDeep },
    sections: all,
  };
}

// ───────────────────────── Tarot ─────────────────────────

export function mockTarot(req: TarotRequest, profile: Profile): Draft {
  const spread = SPREADS[req.spread];
  const rng = makeRng('tarot', req.cardIds.join(','), req.question ?? '', profile.name);
  const cards: TarotCardDraw[] = req.cardIds.slice(0, spread.positions.length).map((id, i) => ({
    id,
    name: tarotById(id).name,
    reversed: req.reversedFlags[i] ?? false,
    position: spread.positions[i],
  }));

  const sections = cards.map((c) => {
    const info = tarotById(c.id);
    const text = c.reversed ? info.rev : info.up;
    return sec(`${c.position} — ${c.name}${c.reversed ? ' (Ters)' : ''}`, `${info.keyword.toUpperCase()}. ${text}`);
  });

  const reversedCount = cards.filter((c) => c.reversed).length;
  const tone = reversedCount === 0
    ? 'Kartların çoğu düz geldi; yol açık ve enerjin seninle.'
    : reversedCount === cards.length
      ? 'Bütün kartlar ters geldi; içe dönme ve yavaşlama çağrısı bu.'
      : 'Düz ve ters kartların karışımı, hayatındaki iki farklı akımı gösteriyor.';

  const closing = pick(rng, [
    'Kartlar kaderi mühürlemez, yalnızca ışığı gösterir. Yolu sen çizersin.',
    'Bugün çektiğin bu açılım, bir haritadır; pusulayı yine sen tutuyorsun.',
    'Kartların fısıltısı net: korkma, ilerle; ama önce içine bak.',
  ]);
  sections.push(sec('Açılımın Bütünü', `${tone} ${req.question ? `Sorduğun "${req.question}" sorusu için ana tavsiye: ${tarotById(cards[cards.length - 1].id).keyword} temasına odaklan. ` : ''}${closing}`));

  return {
    kind: 'tarot',
    title: spread.label,
    summary: cards.map((c) => `${c.name}${c.reversed ? ' (ters)' : ''}`).join(' · '),
    unlocked: true,
    provider: 'mock',
    meta: { cards, sign: profile.sign },
    sections,
  };
}

// ───────────────────────── Günlük Burç ─────────────────────────

const H_GENERAL = [
  'Gökyüzü bugün senden sabır ve açık bir zihin istiyor. Küçük ayrıntılarda saklı büyük fırsatlar var.',
  'Ay enerjisi hislerini yükseltiyor; bugün sezgilerin mantığından bir adım önde gidebilir.',
  'Gezegenlerin dizilimi seni harekete geçirmek istiyor. Ertelediğin bir işi bugün tamamlamak içini rahatlatacak.',
  'Bugün çevrendekilerle iletişimin ön planda. Söyleyeceğin bir söz, bir kapıyı açabilir ya da kapatabilir; özenle seç.',
  'Uzun zamandır beklediğin bir cevap, beklenmedik bir kaynaktan gelebilir. Kulaklarını ve kalbini açık tut.',
];
const H_LOVE = [
  'Duygusal alanda içten bir söz ya da küçük bir jest her şeyi yumuşatır. Birine güvendiğini göstermekten çekinme.',
  'Yalnızsan, bir tanışıklık sürpriz biçimde ilgini çekebilir. İlişkin varsa ortak bir plan bağınızı tazeleyecek.',
  'Eski bir konuyu açmak için doğru zaman değil; bugün anın tadını çıkar, sevgini sakin yollarla göster.',
  'Kalbin bugün hassas. Beklentini net söylersen yanlış anlaşılmalar ortadan kalkar.',
];
const H_CAREER = [
  'İş tarafında önünde net bir hedef var. Planına sadık kal; mütevazı bir kazanç ya da olumlu geri bildirim yolda.',
  'Maddi konularda ani harcamalardan kaçın. Küçük bir tasarruf, günün sonunda güven verecek.',
  'Ekip çalışması bugün seni öne çıkarır. Fikirlerini paylaş, başkalarının önerilerine de alan bırak.',
  'Bir teklif ya da fırsat gelirse hemen evet deme; ayrıntıları oku, sonra kararını ver.',
];
const H_HEALTH = [
  'Bedenin su ve hareket istiyor. Kısa bir yürüyüş zihnini de yeniler.',
  'Enerjin dalgalı; öğleden sonra kendine kısa bir mola ver, derin nefes al.',
  'Uyku düzenine özen göster. Ekrandan uzaklaşıp akşamı yavaş geçirmek sana iyi gelecek.',
];
const H_TIP = [
  'Bugünün mantrası: "Her şey zamanında ve en doğru biçimde gelişiyor."',
  'Bir şükran listesi yaz; üç güzel şeyin adını koymak enerjini yükseltir.',
  'Telefonunu bir saat kapatıp kendi sesini dinle; cevap orada.',
  'Bugün birine içten bir teşekkür et; evren cömertliği sever.',
];
const COLORS = ['Mor', 'Altın', 'Lacivert', 'Zümrüt yeşili', 'Gül kurusu', 'Bordo', 'Turkuaz', 'Gümüş'];

export function mockHoroscope(signId: Profile['sign'], profile: Profile, dateKey = todayKey(), period: 'daily' | 'weekly' = 'daily'): Draft {
  const z = zodiacById(signId);
  const rng = makeRng('horo', signId, dateKey, period);
  const scores = [
    { label: 'Aşk', value: int(rng, 55, 98) },
    { label: 'Para', value: int(rng, 50, 96) },
    { label: 'Enerji', value: int(rng, 52, 99) },
    { label: 'Şans', value: int(rng, 48, 97) },
  ];
  const lucky = int(rng, 1, 99);
  const color = pick(rng, COLORS);
  const lead = period === 'weekly' ? 'Bu haftanın' : 'Bugünün';
  return {
    kind: 'horoscope',
    title: `${z.name} ${period === 'weekly' ? 'Haftalık' : 'Günlük'} Rehber`,
    summary: `${z.symbol} ${z.name} · ${ELEMENT_LABEL[z.element]} elementi · Yönetici gezegen ${z.planet}`,
    unlocked: true,
    provider: 'mock',
    meta: { scores, luckyNumber: lucky, luckyColor: color, sign: signId },
    sections: [
      sec(`${lead} Genel Enerjisi`, `${pick(rng, H_GENERAL)} ${z.planet} etkisiyle ${z.trait} yanın öne çıkıyor.`),
      sec('Aşk ve İlişkiler', pick(rng, H_LOVE)),
      sec('Kariyer ve Para', pick(rng, H_CAREER)),
      sec('Sağlık ve Enerji', pick(rng, H_HEALTH)),
      sec('Günün Tavsiyesi', `${pick(rng, H_TIP)} Şanslı sayın ${lucky}, şanslı rengin ${color.toLowerCase()}.`),
    ],
  };
}

// ───────────────────────── Rüya Tabiri ─────────────────────────

interface DreamSymbol { keys: string[]; name: string; mystic: string; psych: string }

const DREAM_SYMBOLS: DreamSymbol[] = [
  { keys: ['su', 'deniz', 'nehir', 'göl', 'yağmur', 'dalga'], name: 'Su', mystic: 'Su, kadim kaynaklarda duyguların, bereketin ve arınmanın simgesidir. Berrak su huzur ve rızık; bulanık su ise karışık duygular işaret eder.', psych: 'Suyun hâli bilinçaltındaki duygu durumunu yansıtır: dalgalı su bastırılmış duyguları, durgun su iç dengeyi anlatır.' },
  { keys: ['uç', 'uçmak', 'uçuyor', 'havada'], name: 'Uçmak', mystic: 'Uçmak, ruhun sınırlarını aşma isteğini ve yakın zamanda gelebilecek özgürlüğü müjdeler.', psych: 'Kontrol ve özgürlük arzusunun ifadesidir; günlük yüklerden kurtulma ihtiyacına işaret edebilir.' },
  { keys: ['düş', 'düşmek', 'uçurum', 'yüksekten'], name: 'Düşmek', mystic: 'Düşme, kontrolü bırakma ve yeni bir aşamaya inişin işaretidir; bazen "ayaklarını yere bas" uyarısı taşır.', psych: 'Güvensizlik, başarısızlık kaygısı ya da bir konuda kontrolü kaybetme hissiyle bağlantılıdır.' },
  { keys: ['diş', 'dişim', 'dişler'], name: 'Diş', mystic: 'Diş, geleneksel yorumlarda aile bağlarını ve yaşam enerjisini temsil eder; bir değişimin habercisidir.', psych: 'Dişle ilgili rüyalar sıklıkla konuşma kaygısı, imaj endişesi ve kayıp korkusuyla ilişkilidir.' },
  { keys: ['yılan', 'yılanlar'], name: 'Yılan', mystic: 'Yılan hem uyanışı hem de dikkat gerektiren bir gölgeyi simgeler; dönüşüm ve bilgelik sembolüdür.', psych: 'Bastırılmış korkuların ya da güçlü bir dönüşüm ihtiyacının sembolü olabilir.' },
  { keys: ['ev', 'oda', 'kapı', 'bina'], name: 'Ev', mystic: 'Ev, ruhun kendisidir. Odalar hayatın farklı alanlarını, açılan kapılar yeni fırsatları gösterir.', psych: 'Benlik, güvenlik ve aidiyet duygusuyla ilgilidir; keşfedilmemiş odalar kullanılmamış potansiyele işaret eder.' },
  { keys: ['ölüm', 'öldü', 'cenaze', 'ölmek'], name: 'Ölüm', mystic: 'Rüyada ölüm çoğunlukla gerçek bir son değil, bir dönemin kapanışını ve yeniden doğuşu müjdeler.', psych: 'Değişim, kayıp ve bitişlerle yüzleşme sürecinin doğal bir bilinçaltı imgesidir.' },
  { keys: ['para', 'altın', 'hazine', 'cüzdan'], name: 'Para', mystic: 'Para ve altın, değer verdiğin şeylerin ve bereketin işaretidir; bulmak fırsat, kaybetmek uyarıdır.', psych: 'Öz değer, güvence ihtiyacı ya da emeğinin karşılığını görme arzusuyla ilgilidir.' },
  { keys: ['at', 'atlar', 'binmek'], name: 'At', mystic: 'At, güç, hız ve özgürlüğün simgesidir; beyaz at müjde, siyah at ise güçlü bir sınavdır.', psych: 'Tutku, içgüdüler ve hedefe doğru ilerleme isteği ile bağlantılıdır.' },
  { keys: ['bebek', 'çocuk', 'hamile', 'hamilelik'], name: 'Bebek', mystic: 'Bebek yeni bir başlangıç, saf bir umut ve doğmakta olan bir projenin işaretidir.', psych: 'İçindeki savunmasız yanı ya da yeni bir yaratım isteğini yansıtır.' },
  { keys: ['kaç', 'kovalan', 'kovalıyor', 'peşimde'], name: 'Kovalanmak', mystic: 'Kovalanmak, yüzleşmekten kaçtığın bir gerçeğe ya da duygusal bir yüke işaret eder.', psych: 'Kaygı ve kaçınma davranışının klasik rüya imgesidir; kaçtığın şeyi adlandırmak rahatlatır.' },
  { keys: ['sınav', 'okul', 'ders'], name: 'Sınav', mystic: 'Sınav, hayatın sana sunduğu bir dersi ve olgunlaşma çağrısını simgeler.', psych: 'Performans kaygısı ve yeterlilik korkusunun tipik rüya kılığıdır.' },
  { keys: ['ateş', 'yangın', 'alev'], name: 'Ateş', mystic: 'Ateş dönüşümün ve arınmanın elementidir; yakıcı olduğunda öfkeye, ısıtıcı olduğunda tutkuya işaret eder.', psych: 'Yoğun duygular, öfke ya da güçlü bir yaratıcı enerji taşıyor olabilirsin.' },
  { keys: ['kedi', 'köpek', 'hayvan', 'kuş'], name: 'Hayvan', mystic: 'Hayvanlar rüyada ruh rehberi gibidir; her biri hayatındaki bir ilişkiye ya da içgüdüye işaret eder.', psych: 'İçgüdüsel yanlarınla ve sezgisel ihtiyaçlarınla temas kuruyorsun.' },
  { keys: ['eski sevgili', 'sevgilim', 'eşim', 'öpüş', 'aşk'], name: 'Sevgili', mystic: 'Rüyada sevgili görmek, kalbindeki çözülmemiş bir konunun ya da yeni bir bağa açıklığın işaretidir.', psych: 'Duygusal ihtiyaçlar, geçmişle barış ya da yakınlık arzusu üzerine çalışan bilinçaltı sürecidir.' },
];

export function mockDream(req: DreamRequest, profile: Profile): Draft {
  const text = req.text.toLowerCase();
  const rng = makeRng('dream', req.text, profile.name);
  const found = DREAM_SYMBOLS.filter((s) => s.keys.some((k) => text.includes(k))).slice(0, 3);
  const symbols = found.length ? found : pickN(rng, DREAM_SYMBOLS, 2);
  const fallback = !found.length;
  const names = symbols.map((s) => s.name);

  const themes = [
    'içindeki değişim ihtiyacının',
    'sezgilerinin sana bir mesaj taşıdığının',
    'uzun süredir ertelediğin bir duygunun',
    'yeni bir dönemin eşiğinde olduğunun',
  ];

  return {
    kind: 'dream',
    title: 'Rüya Tabirin',
    summary: `Rüyanın ana sembolleri: ${names.join(', ')}.`,
    unlocked: true,
    provider: 'mock',
    meta: { symbols: names, sign: profile.sign },
    sections: [
      sec('Rüyanın Özeti', `Sevgili ${profile.name}, anlattığın rüya ${pick(rng, themes)} işareti gibi duruyor.${fallback ? ' Rüyanda net bir sembol yakalayamasam da atmosferi ve tonu okudum.' : ''}`),
      ...symbols.map((s) => sec(`Sembol: ${s.name}`, `${s.mystic}`)),
      sec('Psikolojik Yorum', symbols.map((s) => s.psych).join(' ')),
      sec('Sana Mesaj', `${pick(rng, [
        'Rüyaların bilinçaltının mektubudur; bu mektubu bugün bir deftere yaz, üç gün sonra tekrar oku.',
        'Bu rüya seni korkutmak için değil, hazırlamak için geldi. Sakin kal ve içindeki sese güven.',
        'Uyanınca hatırladığın ilk duygu rüyanın gerçek mesajıdır; o duyguyu dikkate al.',
      ])} (Rüya yorumları yol göstericidir, kesin bir gelecek bilgisi değildir.)`),
    ],
  };
}

// ───────────────────────── Doğum Haritası ─────────────────────────

const SUN_TPL = [
  (t: string) => `${t} yönün kim olduğunun özünde parlıyor; başkaları seni ilk bu yanınla tanır.`,
  (t: string) => `Hayata ${t} bir tavırla adım atıyorsun — bu senin özünde taşıdığın, değişmeyen ışığın.`,
  (t: string) => `Özündeki güneş ${t}; irade gösterdiğinde herkes bunu hisseder.`,
];
const MOON_TPL = [
  (t: string) => `İçindeki çocuk ${t}; güvende hissettiğinde en çok bu yanın açığa çıkar.`,
  (t: string) => `Yalnızken, ya da en savunmasız anında, ${t} bir iç dünyaya dönüyorsun.`,
  (t: string) => `Duygularını ${t} bir dille işliyorsun — bu senin gizli, en gerçek halin.`,
];
const ASC_TPL = [
  (t: string) => `Yeni tanışanlar seni önce ${t} biri olarak görür — bu dışa yansıyan ilk maskendir.`,
  (t: string) => `Hayata açılan kapın ${t}; ilk izlenimin hep bu yönden kurulur.`,
  (t: string) => `Karşındaki insan seninle tanıştığında ${t} bir enerjiyle karşılaşır.`,
];
const ELEMENT_SYNTHESIS: Record<Element, string> = {
  ates: 'Haritanda ateş baskın: harekete geçmek, cesaret ve tutku senin doğal dilin. Enerjini beklemeden kullanmalısın, yoksa içinde birikir.',
  toprak: 'Haritanda toprak baskın: somutluk, sabır ve güvenilirlik senin gücün. Yavaş ama sağlam adımların seni her zaman hedefe ulaştırır.',
  hava: 'Haritanda hava baskın: fikirler, iletişim ve bağlantılar seni besliyor. Düşüncelerini paylaştıkça hafifler, içine kapandıkça yorulursun.',
  su: 'Haritanda su baskın: sezgi, duygu ve derinlik senin pusulanın. Hissettiklerine güvendiğinde asla yanılmazsın.',
};

export function mockNatal(profile: Profile): Draft {
  const chart = computeNatalChart(profile);
  const sun = zodiacById(chart.sun);
  const moon = zodiacById(chart.moon);
  const asc = chart.ascendant ? zodiacById(chart.ascendant) : null;
  const rng = makeRng('natal', profile.name, profile.birthDate, profile.birthTime ?? '', profile.birthPlace ?? '');

  const sections = [
    sec(`Güneş: ${sun.name}`, pick(rng, SUN_TPL)(sun.trait)),
    sec(`Ay: ${moon.name}`, pick(rng, MOON_TPL)(moon.trait)),
  ];
  if (asc) {
    sections.push(sec(`Yükselen: ${asc.name}`, pick(rng, ASC_TPL)(asc.trait)));
  } else {
    sections.push(sec('Yükselen: bilinmiyor', 'Yükselen burcun doğum saatine göre değişir — yaklaşık 4 dakikada 1° kayar. Profilinden doğum saatini eklersen bu bölüm de açılır; tahmini bir değer göstermek yanıltıcı olur, o yüzden boş bıraktık.'));
  }
  if (chart.dominantElement) {
    sections.push(sec('Bütünsel Portre', ELEMENT_SYNTHESIS[chart.dominantElement]));
  }
  if (chart.ascendant && !chart.placeMatched) {
    sections.push(sec('Küçük Bir Not', 'Doğum yerini tam eşleştiremedik; Yükselen hesabı İstanbul koordinatlarıyla yapıldı, gerçek doğum yerine göre birkaç derece kayabilir.'));
  }

  return {
    kind: 'natal',
    title: 'Doğum Haritan',
    summary: `Güneş ${sun.name} · Ay ${moon.name}${asc ? ` · Yükselen ${asc.name}` : ''}`,
    unlocked: true,
    provider: 'mock',
    meta: { sign: profile.sign, natal: chart },
    sections,
  };
}

// ───────────────────────── El Falı ─────────────────────────

const PALM_LINES: { name: string; meanings: string[] }[] = [
  { name: 'Yaşam Çizgisi', meanings: [
    'Derin ve kesintisiz uzanıyor; bu, sağlam bir hayat enerjisi ve zorluklar karşısında dayanıklılık işaretidir.',
    'Avuç içinde geniş bir kavis çiziyor; yaşama açık, deneyimlere doymayan bir ruh taşıdığını gösteriyor.',
    'İnce ama net; enerjini kalabalık değil, seçtiğin birkaç alana yoğunlaştırdığını anlatıyor.',
  ] },
  { name: 'Kalp Çizgisi', meanings: [
    'Yükselerek işaret parmağına doğru uzanıyor; sevdiğinde bütün kalbinle, çekinmeden sevdiğini gösteriyor.',
    'Düz ve uzun bir çizgi; duygularını göstermeden önce iyice tarttığını, ama bir kez verdiğinde asla geri almadığını anlatıyor.',
    'Hafif kırılma noktaları var; geçmişte kalpte iz bırakan bir dönem olmuş, ama çizgi yeniden toparlanıp devam ediyor.',
  ] },
  { name: 'Akıl Çizgisi', meanings: [
    'Kalp çizgisinden net bir aralıkla ayrılıyor; duygu ile mantığı ayrı tutabilen, dengeli bir zihin işareti.',
    'Hafifçe aşağı, avuç içinin merkezine doğru kıvrılıyor; sezgisel ve yaratıcı bir düşünce biçimin var.',
    'Uzun ve kararlı; bir konuya karar verdiğinde kolay kolay vazgeçmeyen, sabırlı bir zihindir.',
  ] },
  { name: 'Kader Çizgisi', meanings: [
    'Bilekten yukarı doğru net bir çizgiyle yükseliyor; hayatının erken bir döneminde kendi yolunu bulmuşsun ya da bulmak üzeresin.',
    'Orta parmağa doğru güçlenerek ilerliyor; önündeki dönemde emeklerinin karşılığını göreceğin bir yükseliş var.',
    'Belirgin ama kesintili; kaderini kendi ellerinle, iniş çıkışlarla birlikte örüyorsun — bu bir eksiklik değil, bir güç.',
  ] },
];

export function mockPalm(req: PalmRequest, profile: Profile): Draft {
  const seed = req.images.map((s) => s.length + s.slice(-24)).join('#') + profile.name;
  const rng = makeRng('palm', seed, todayKey());
  const lines = PALM_LINES.map((l) => ({ name: l.name, meaning: pick(rng, l.meanings) }));
  const q = req.question?.trim();

  return {
    kind: 'palm',
    title: 'El Falın',
    summary: `${profile.name}, avuç içindeki dört ana çizgi okundu.`,
    unlocked: true,
    provider: 'mock',
    meta: { sign: profile.sign, palmLines: lines },
    sections: [
      sec('İlk Bakış', `Sevgili ${profile.name}, avuç içindeki çizgiler net ve okunaklı — bu genelde berrak bir dönemden geçtiğinin işareti.${q ? ` Sorduğun "${q}" sorusunu da çizgilerin ışığında değerlendirdim.` : ''}`),
      ...lines.map((l) => sec(l.name, l.meaning)),
      sec('Bütünsel Yorum', `${pick(rng, [
        'Çizgilerin bir bütün olarak anlattığı şey: temkinli ama cesur, hisseden ama kararlı bir karakter.',
        'Elindeki dengeler gösteriyor ki hem kalbinle hem aklınla hareket edebiliyorsun — bu nadir bir uyum.',
        'Avucun, geçmişte sağlam durduğunu, önünde de sağlam durmaya devam edeceğini anlatıyor.',
      ])} (El falı yol göstericidir, kesin bir gelecek bilgisi değildir.)`),
    ],
  };
}
