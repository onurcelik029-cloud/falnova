// Karmik Dönemeç, Partner Analizi ve Falcı sohbeti için yedek içerik motoru.

import type { CoupleRequest, KarmicRequest, KarmicTopicId, Profile, VoiceTone } from './types.ts';
import type { Draft } from './mock.ts';
import { ELEMENT_LABEL, elementCompatibility, zodiacById } from './zodiac.ts';
import { hashString, int, makeRng, pick, pickN } from './rng.ts';
import { PERSONAS } from './personas.ts';

const sec = (title: string, body: string) => ({ title, body });

export const MONTHS_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

// ───────────────────────── Karmik Dönemeç ─────────────────────────

export const KARMIC_TOPICS: { id: KarmicTopicId; label: string; glyph: string; blurb: string }[] = [
  { id: 'ask', label: 'Aşk ve İlişkiler', glyph: '♡', blurb: 'Aynı hikâyeyi tekrar tekrar yaşıyorum' },
  { id: 'kariyer', label: 'Kariyer ve Amaç', glyph: '♛', blurb: 'Emek veriyorum ama yükselemiyorum' },
  { id: 'para', label: 'Para ve Bolluk', glyph: '✦', blurb: 'Kazandıkça eksiliyor, akış tıkanık' },
  { id: 'aile', label: 'Aile ve Kökler', glyph: '❀', blurb: 'Ailemle döngüsel sorunlar yaşıyorum' },
  { id: 'kendini', label: 'Kendini Bulma', glyph: '☾', blurb: 'Yolumu kaybettim, kim olduğumu bilmiyorum' },
  { id: 'saglik', label: 'Ruhsal Şifa', glyph: '☼', blurb: 'İçimde ağır bir yük taşıyorum' },
];

const KARMIC: Record<KarmicTopicId, { debt: string; root: string; lesson: string; months: [string, string, string]; poster: string }> = {
  ask: {
    debt: 'Geçmiş yaşamlarının birinde sevgiyi koşula bağlamış, karşındakini kaybetme korkusuyla ya sıkı sıkı tutmuş ya da erkenden bırakıp gitmişsin. Bugünkü ilişkilerinde aynı sınav farklı yüzlerle geliyor: güvenmek ile korunmak arasındaki çizgi.',
    root: 'Tıkanıklığın kökü, sevilmeyi "hak etmek zorunda" olduğuna dair eski bir kayıt. Bu yüzden ya fazla veriyorsun ya da yaklaşanı itiyorsun.',
    lesson: 'Karmik dersin: koşulsuz sevgi önce kendine başlar.',
    months: ['Eski bir hikâyenin aynası karşına çıkıyor; birini ya da bir anıyı ilk kez yargılamadan izleyeceksin.', 'Beklenmedik bir yüzleşme ya da telefon; kalbin ilk kez "hayır" ya da "evet" diyeceği net bir an.', 'Enerji hafifliyor; yeni bir bağ ya da mevcut bağda derin bir yenilenme kapıyı aralıyor.'],
    poster: 'Kalbimi kilitleyen anahtar, her zaman elimdeydi.',
  },
  kariyer: {
    debt: 'Geçmişte gücünü ya kendin için kullanmamış ya da başkalarını gölgede bırakmışsın. Bu yüzden bugün başarı tam kapıya geldiğinde görünmez bir fren devreye giriyor.',
    root: 'Tıkanıklığın kökü, "parlarsam sevilmem" ya da "başarırsam yalnız kalırım" korkusu. Bilinçaltın seni korumak için seni küçük tutuyor.',
    lesson: 'Karmik dersin: ışığını kısmak alçakgönüllülük değil, kaçıştır.',
    months: ['Görünmeyen bir engelin adını koyuyorsun; bir iş ya da fikirle ilgili net bir farkındalık geliyor.', 'Bir teklif, görüşme ya da sürpriz destek; ilk kez "ben hazırım" diyeceğin kritik eşik.', 'Emeklerin görünür oluyor; yeni bir rol, yetki ya da ortaklık şekilleniyor.'],
    poster: 'Işığımı kısmayı bıraktığım gün, kaderim parladı.',
  },
  para: {
    debt: 'Geçmişte bolluğu ya kötüye kullanmış ya da yokluk yüzünden değerini yitirmişsin. Bugün paraya karşı hem çekim hem korku duyman bu eski kayıttan geliyor.',
    root: 'Tıkanıklığın kökü, "hak etmiyorum" ya da "bitecek" inancı. Para akmak ister ama sen farkında olmadan barajı kapatıyorsun.',
    lesson: 'Karmik dersin: bolluk, güvenle karşılanan bir akıştır; tutunulan bir hazine değil.',
    months: ['Harcama ve kazanç alışkanlıklarında gizli bir kalıbı fark ediyorsun; küçük bir kaçak kapanıyor.', 'Ani bir maddi haber ya da fırsat; bu kez korkuyla değil bilinçle karar vereceksin.', 'Akış yeniden başlıyor; yeni bir gelir kapısı ya da rahatlatıcı bir çözüm beliriyor.'],
    poster: 'Bolluk bana geldi çünkü ona kapımı açtım.',
  },
  aile: {
    debt: 'Aile bağlarında eski bir borç var: söylenmemiş sözler, taşınan gölge ve bir kuşaktan diğerine geçen suskunluk. Sen bu zincirin şifacı halkasısın.',
    root: 'Tıkanıklığın kökü, başkalarının duygusal yükünü kendi omuzlarında taşıma alışkanlığı. Sevgiyi sorumlulukla karıştırıyorsun.',
    lesson: 'Karmik dersin: sınır koymak, sevgiyi azaltmaz; onu sağlıklı kılar.',
    months: ['Aile içinde eski bir hikâye yeniden gündeme geliyor; artık tepki değil gözlemci olacaksın.', 'Dürüst bir konuşma ya da bir bırakış; ağırlığın büyük bir bölümü bu eşikte hafifliyor.', 'Yeni bir denge; kökler seni sıkmıyor, besliyor.'],
    poster: 'Zinciri kıran ben oldum, ışığı miras bıraktım.',
  },
  kendini: {
    debt: 'Geçmişte kendi sesini başkalarının beklentisine feda etmişsin. Ruhun bu hayatta "sen kimsin?" sorusunu cevaplaman için bu yolu seçti.',
    root: 'Tıkanıklığın kökü, her rolü iyi oynarken gerçek yüzünü kaybetme korkusu. Bu yüzden ne istediğini bilmek zorlaşıyor.',
    lesson: 'Karmik dersin: kim olduğunu bulmak için önce kim olmadığını bırakmalısın.',
    months: ['Sıkıntının altındaki gerçek isteği fark ediyorsun; sessizlik bu ay öğretmenin.', 'Bir tanışma, kitap ya da rüya; ruhuna "işte bu" dedirten kıvılcım.', 'Yeni bir rutin ve amaç netleşiyor; ilk kez kendinle aynı yöne yürüyorsun.'],
    poster: 'Kaybolduğumu sandığım yerde kendimi buldum.',
  },
  saglik: {
    debt: 'Geçmişte duygularını ya bastırmış ya da başkalarını yaralayan bir öfkeyle taşımışsın. Bu yük bugün hafif bir yorgunluk ve içsel ağırlık olarak dönüyor.',
    root: 'Tıkanıklığın kökü, kendini affetmeme. Geçmiş bir hatayı hâlâ şimdiki zamanda cezalandırıyorsun.',
    lesson: 'Karmik dersin: şifa, affetmeyle başlar; önce kendi kalbinden.',
    months: ['Bedenin ve ruhun yavaşlamak istiyor; dinlenmek, arınmak ve kaydı silmek için alan açıyorsun.', 'Derin bir boşalma anı; ağlamak, yazmak ya da bırakmak — hangisi olursa, ağırlık gidiyor.', 'Enerjin yükseliyor; yeni bir başlangıç için gereken canlılık geri dönüyor.'],
    poster: 'Kendimi affettiğim an, kaderim hafifledi.',
  },
};

export function mockKarmic(req: KarmicRequest, profile: Profile, unlocked: boolean): Draft {
  const t = KARMIC[req.topic];
  const topic = KARMIC_TOPICS.find((x) => x.id === req.topic)!;
  const sign = zodiacById(profile.sign);
  const rng = makeRng('karmic', req.topic, profile.name, profile.birthDate);
  const now = new Date();
  const monthNames = [0, 1, 2].map((i) => MONTHS_TR[(now.getMonth() + i) % 12]);
  const turnDays = int(rng, 9, 38);
  const turnDate = new Date(now.getTime() + turnDays * 86400000);
  const turnLabel = `${turnDate.getDate()} ${MONTHS_TR[turnDate.getMonth()]}`;
  const titles = ['Yüzleşme', 'Dönemeç', 'Açılış'];

  const free = [
    sec('Karmik Borcun', `${profile.name}, ${sign.name} burcunun ${sign.planet} enerjisiyle doğdun ve ruhun bu dersi seçti. ${t.debt}`),
    sec('Tıkanıklığın Kökü', `${t.root} ${t.lesson}`),
  ];

  const timeline = t.months.map((text, i) => ({ month: monthNames[i], title: titles[i], text }));
  const paid = [
    sec('Önümüzdeki 3 Ayın Kader Senaryosu', timeline.map((m, i) => `${i + 1}. AY — ${m.month} · ${m.title}\n${m.text}`).join('\n\n')),
    sec('Kader Dönemecin', `Yıldızların en yoğun kesiştiği eşik ${turnLabel} civarında. O günlerde hissedeceğin ani netlik ya da beklenmedik bir haber, döngüyü kıran kırılma noktası olacak. Kendi kararını vermek için dış sesleri kıs.`),
    sec('Kader Posterin', `“${t.poster}”\n\n${sign.symbol} ${profile.name} · ${topic.label}\nKarmik Dönemeç Raporu`),
  ];

  return {
    kind: 'karmic',
    title: 'Karmik Dönemeç ve Kader Senaryosu',
    summary: `${topic.label} alanındaki karmik borcun ve tıkanıklığının kökü açıldı.`,
    unlocked,
    lock: { teaser: `${turnLabel} civarında kaderinde belirgin bir dönemeç var. 3 aylık senaryon ve paylaşılabilir Kader Posterin hazır.`, cost: 2, lockedTitles: paid.map((p) => p.title) },
    provider: 'mock',
    meta: { topic: req.topic, timeline: unlocked ? timeline : undefined, posterQuote: unlocked ? t.poster : undefined, sign: profile.sign },
    sections: unlocked ? [...free, ...paid] : free,
  };
}

// ───────────────────────── Partner Analizi ─────────────────────────

const CONFLICTS: Record<string, string> = {
  'ates-ates': 'İkiniz de dizginlerin sizde olmasını istiyorsunuz; iki ateş aynı odayı hem ısıtır hem yakar. Öfke anlarında ilk sözü değil, üçüncü nefesi seçin.',
  'ates-hava': 'Fikirlerin hızı bazen sözün derinliğini geçebilir. Biriniz hızlıca yanarken diğeri uçup gitmeye meyleder; süreklilik için küçük rutinler kurun.',
  'ates-toprak': 'Biriniz "hemen"i, diğeri "emin olunca"yı seviyor. Tempo farkı sabırsızlık ve inatlaşma yaratabilir.',
  'ates-su': 'Ateşin doğrudanlığı suyun hassasiyetiyle çarpışabilir. Bir taraf sözlerini sertçe söylerken diğeri sessizliğe çekilme eğiliminde.',
  'hava-hava': 'Çok konuşup az hissetme riski var. Fikirler harika ama duygular masaya yatırılmazsa mesafe doğar.',
  'hava-toprak': 'Biriniz özgür fikirli, diğeriniz güvence arayan. Bu, "beni anlamıyorsun" döngüsüne dönebilir.',
  'hava-su': 'Mantık ve his farklı dillerde konuşabilir. Biri sorunu çözmek isterken diğeri sadece dinlenmek isteyebilir.',
  'toprak-toprak': 'Güvenli ama rutine gömülme riski taşıyor. İnat ve alışkanlıklar ilişkiyi durağanlaştırabilir.',
  'toprak-su': 'Uyum yüksek, ama beklenti konuşulmadığında sessiz kırgınlıklar birikebilir. Duygularınızı adlandırın.',
  'su-su': 'Derin bir bağ ama aşırı hassasiyet. Küçük bir söz büyük bir dalgaya dönüşebilir; yargılamadan dinleyin.',
};

const REL_PHRASE: Record<CoupleRequest['relationship'], string> = {
  sevgili: 'Sevgililik ilişkinizde', evli: 'Evliliğinizde', flort: 'Flört sürecinizde', eski: 'Geçmişte kalan bağınızda', arkadas: 'Yakın arkadaşlığınızda',
};

export function mockCouple(req: CoupleRequest, profile: Profile): Draft {
  const a = zodiacById(profile.sign);
  const b = zodiacById(req.partner.sign);
  const rng = makeRng('couple', profile.name, profile.birthDate, req.partner.name, req.partner.birthDate);
  const base = elementCompatibility(a.element, b.element);
  const nameBonus = (hashString(profile.name.toLowerCase() + req.partner.name.toLowerCase()) % 9) - 4;
  const score = Math.max(38, Math.min(97, base + nameBonus + int(rng, -3, 3)));
  const cats = [
    { label: 'Aşk ve Tutku', value: clamp(score + int(rng, -10, 10)) },
    { label: 'İletişim', value: clamp(score + int(rng, -14, 8)) },
    { label: 'Güven', value: clamp(score + int(rng, -8, 12)) },
    { label: 'Ortak Gelecek', value: clamp(score + int(rng, -12, 10)) },
    { label: 'Enerji Uyumu', value: clamp(score + int(rng, -6, 6)) },
  ];
  const key = [a.element, b.element].sort().join('-');
  const conflict = CONFLICTS[key] ?? CONFLICTS['ates-ates'];
  const level = score >= 85 ? 'nadir görülen bir uyum' : score >= 70 ? 'güçlü ve büyüyen bir bağ' : score >= 55 ? 'emek ve anlayış isteyen ama umut vadeden bir bağ' : 'öğretici ve zorlayıcı bir karmik bağ';

  const same = a.element === b.element;
  const chem = same
    ? `İkiniz de ${ELEMENT_LABEL[a.element]} elementindensiniz; birbirinizin dilini konuşmadan anlıyorsunuz.`
    : `${ELEMENT_LABEL[a.element]} ve ${ELEMENT_LABEL[b.element]} elementleri birleştiğinde birbirinizi tamamlayan ve zorlayan bir dinamik doğuyor.`;

  return {
    kind: 'couple',
    title: `${profile.name} & ${req.partner.name}`,
    summary: `%${score} uyum — ${level}.`,
    unlocked: true,
    provider: 'mock',
    meta: { score, scores: cats, partner: req.partner, sign: profile.sign },
    sections: [
      sec('Ortak Enerjiniz', `${a.symbol} ${a.name} ile ${b.symbol} ${b.name} bir araya geldiğinde ${level} ortaya çıkıyor. ${chem} ${REL_PHRASE[req.relationship]} bu enerji ${pick(rng, ['sizi birbirinize yaklaştıran görünmez bir mıknatıs gibi.', 'birlikte büyüyebileceğiniz bir zemin sunuyor.', 'birbirinizin aynası olmanızı sağlıyor.'])}`),
      sec('Çekim ve Güçlü Yanlarınız', `${a.name} burcunun ${a.trait} yanı ile ${b.name} burcunun ${b.trait} yanı birbirini besliyor. En güçlü olduğunuz alan: ${[...cats].sort((x, y) => y.value - x.value)[0].label.toLowerCase()}.`),
      sec('Olası Çatışmalar', conflict),
      sec('İlişki Haritası', `Yakın dönem (1-3 ay): ${pick(rng, ['Yeni bir ortak plan ya da gezi bağınızı tazeleyecek.', 'Küçük bir yanlış anlaşılma çıkabilir; hemen konuşmak her şeyi yumuşatır.', 'Birbirinize daha çok zaman ayırdığınız güzel bir dönem.'])}\n\nOrta dönem (3-6 ay): ${pick(rng, ['Maddi ya da ev ile ilgili ortak bir karar gündeme gelebilir.', 'Aile ya da arkadaş çevresi ilişkinize renk katacak.', 'Birinizin kariyer değişikliği, dengeyi test edebilir ama güçlendirir.'])}\n\nUzun dönem (6-12 ay): ${pick(rng, ['Bağınız daha derin bir taahhüt seviyesine ilerleyebilir.', 'Kendi yollarınızı bulup sonra tekrar kesişmeniz mümkün.', 'Birlikte kurduğunuz alışkanlıklar sizi uzun vadeli bir huzura taşıyor.'])}`),
      sec('Falcının Tavsiyesi', `${req.partner.name} ile aranızdaki en büyük anahtar: ${pick(rng, ['sözlerinizi yumuşatmak ve niyetinizi net söylemek.', 'birbirinizin hızına saygı göstermek.', 'küçük anları kutlamak ve sessizliği korkuyla doldurmamak.'])} Yıldızlar yol gösterir; bağı ise iki kalp örer.`),
    ],
  };
}

function clamp(n: number): number {
  return Math.max(30, Math.min(99, Math.round(n)));
}

// ───────────────────────── Falcı Sohbeti ─────────────────────────

const CHAT_TOPICS: { keys: string[]; lines: string[] }[] = [
  { keys: ['aşk', 'sevgili', 'evlen', 'evlilik', 'flört', 'barış', 'ayrıl', 'eski'], lines: [
    'Kalbine dair bu sorunun altında aslında "güvende miyim?" sorusu yatıyor gibi hissediyorum. Kartlarda bekleyiş var ama bekleyişin kendisi cevabın bir parçası: acele bir adım seni yormaz, dürüst bir adım seni hafifletir.',
    'Bu bağda söylenmemiş bir cümle asılı kalmış. Niyetini yumuşak bir dille açarsan, karşındaki enerjinin de çözüldüğünü göreceksin. Önümüzdeki iki hafta duygusal bir eşik.',
    'Mumun alevi senin adını söylerken bir an titredi, sonra sabit yandı; bu bende hep aynı şeyi çağrıştırır, bir tereddüdün geçip yerini netliğe bıraktığını. Kalbindeki soru cevabını biliyor, sen henüz ona izin vermedin.',
    'Fincanının kenarında iki figür gördüm, aralarında bir boşluk vardı ama boşluk kopukluk değil, nefes alma payıydı. Bu bağda susmak bazen en dürüst cümledir; ama uzun süre susmak da bir cevaptır.',
  ] },
  { keys: ['iş', 'kariyer', 'terfi', 'patron', 'mülakat', 'işsiz', 'maaş', 'proje'], lines: [
    'İş alanında bir kapı aralanıyor ama bu kapı hazır olduğunda değil, hazır hissettiğinde açılıyor. Kendini geri çekmek yerine bir adım öne çık; fırsat ortada görünmeden konuşulur.',
    'Kariyerinde bir yön değişimi enerjisi var. Bugün verdiğin kararların meyvesi 3 ay içinde belli olacak. Gözünü ödülden çok sürece dik.',
    'Kartları açtığımda ilk gördüğüm, bir masanın etrafında toplanmış eller oldu; yalnız yürüdüğünü sandığın bu süreçte aslında görünmeyen bir destek var. Onu fark edip fark etmemek sana kalmış.',
    'Emeğinin gölgede kaldığını hissediyorsun, biliyorum. Ama gölgede kalan şey bazen sessizce kök salar; kökü olmayan başarı ilk rüzgârda devrilir, seninki devrilmeyecek türden.',
  ] },
  { keys: ['para', 'borç', 'kazanç', 'zam', 'yatırım', 'kredi', 'zengin'], lines: [
    'Maddi tarafta akış var ama sabır gerektiriyor. Ani ve heyecanlı kararlardan uzak dur; küçük ama düzenli adımlar seni güvenli bir yere taşıyacak. (Finansal kararlar için bir uzmana da danışmanı öneririm.)',
    'Bolluk enerjin yükseliyor; fakat harcama alışkanlıklarında küçük bir kaçak var. Onu kapattığında rahatlama gelecek.',
    'Telvede gördüğüm şekil bir kapıya benziyordu, aralık duruyordu. Para konusunda tam kapalı ya da tam açık değil şu an; aralıktan geçmek için tek gereken, beklerken de bir şey biriktiriyor olduğunu unutmamak. (Yatırım kararların için mutlaka bir uzmana danış, ben sadece enerjini okuyorum.)',
    'Bu soruyu sorarken sesinde bir aceleyi hissettim. Bolluk acele etmez, gelirken kök salarak gelir; sabrın bu ay en değerli sermayen.',
  ] },
  { keys: ['sağlık', 'hasta', 'ağrı', 'doktor', 'yorgun'], lines: [
    'Bedeninin ve ruhunun yavaşlamak istediğini hissediyorum. Sağlık konularında fal yol gösterir ama tıbbi karar yerine geçmez; belirtilerin sürüyorsa mutlaka bir uzmana danış. Ruhsal olarak: dinlen, su iç, kendine nazik ol.',
    'Enerjin bugün her zamankinden daha ağır geliyor bana. Bedenin senden bir şey istiyor olabilir; onu duyman için önce durman gerekiyor. Belirtiler sürerse lütfen bir hekime görün, ben yalnızca ruhunun aynasıyım.',
    'Fincanında gördüğüm gölge bir hastalık değil, bir yorgunluk işareti; ama yorgunluk da ciddiye alınmayı hak eder. Bu hafta kendine bir "hayır" hediye et.',
  ] },
  { keys: ['ne zaman', 'zaman', 'tarih', 'yakında', 'gelecek'], lines: [
    'Zamanlama sorularında yıldızlar net bir gün vermek yerine bir "pencere" gösterir: önümüzdeki 3 hafta içinde bir gelişme hissedeceksin. Ama asıl sonuç, o ana nasıl hazırlandığına bağlı.',
    'Zaman burada bir doğrusal çizgi değil, sarmal gibi ilerliyor; bu ay hissettiğin bir şey, iki-üç ay sonra farklı bir biçimde geri dönecek. Tarihi değil, tekrar eden işareti izle.',
    'Kartlar takvim vermez, mevsim verir. Şu an içinde bulunduğun mevsim bir geçiş; bir sonraki mevsime kadar sabrın en sadık yol arkadaşın.',
  ] },
  { keys: ['karar', 'seçim', 'gitmeli', 'kalmalı', 'yapmalı'], lines: [
    'Karar arifesindeki kalp iki sesle konuşur: korku ve arzu. Hangisi daha sessiz ama daha ısrarcıysa çoğunlukla o gerçek sesindir. Bir gece üzerine uyu; sabah ilk gelen duygu yol gösterici.',
    'Bu soruyu sorarken elinin hafifçe yumruk olduğunu hayal ediyorum; içinde zaten bir yön var, benden istediğin belki de sadece onay. Cevap sende, ben sadece görmeni kolaylaştırıyorum.',
    'İki yol da yanlış değil, sadece farklı bedeller istiyor. Hangi bedeli ödemeye daha gönüllü olduğuna bak; gerçek seçimin orada saklı.',
  ] },
];
const CHAT_DEFAULT = [
  'Sorunun üzerinde bir süre sessizce durdum. Enerjin şu an bir eşikte; cevabı dışarıda aramak yerine son günlerde tekrar eden bir düşünceye bak, mesaj orada.',
  'Bu soruyu sorman bile bir uyanışın işareti. Kartlarda yenilenme, yeni bir sayfa ve biraz sabır görüyorum.',
  'Masamdaki mum bir an büyüdü, sonra alıştı; bu bende hep "önce gürültü, sonra netlik" anlamına gelir. Bu günlerde sende de böyle bir şey oluyor olabilir.',
  'Elimi fincanına değdirdiğimde içimde yumuşak bir sıcaklık hissettim; kötü bir işaret değil bu, aksine bir şeyin olgunlaştığının işareti.',
];
/**
 * Aynı konuda art arda gelen sorularda kelimesi kelimesine aynı cevabı vermemek için:
 * havuzdan seçilen metin, kullanıcının son gördüğü cevaplardan biriyse havuzda ilerleyerek yeni bir tanesi denenir.
 */
function pickFresh(rng: () => number, pool: readonly string[], recentReplies: readonly string[]): string {
  const start = Math.floor(rng() * pool.length);
  for (let i = 0; i < pool.length; i++) {
    const candidate = pool[(start + i) % pool.length];
    if (!recentReplies.some((r) => r.includes(candidate))) return candidate;
  }
  return pool[start]; // havuzun tamamı zaten görülmüş: elden gelen en iyisi
}

/**
 * recentReplies: kullanıcının bu sohbette az önce aldığı yanıtların tam metinleri (aynı cümleleri tekrar etmemek için).
 * tone: Sesli Falcı'da seçilen karakter (varsayılan Madam Nova/'bilge'); açılış ve kapanış cümleleri karaktere göre değişir,
 * fal içeriğinin kendisi (body) ortak kalır — üç karakter de aynı kartları okur, yalnızca sesleri farklıdır.
 */
export function mockChatReply(message: string, profile: Profile, turn: number, recentReplies: string[] = [], tone: VoiceTone = 'bilge'): string {
  const persona = PERSONAS[tone];
  const lower = message.toLowerCase();
  const rng = makeRng('chat', message, turn, profile.name, tone);
  const topic = CHAT_TOPICS.find((t) => t.keys.some((k) => lower.includes(k)));
  const body = pickFresh(rng, topic ? topic.lines : CHAT_DEFAULT, recentReplies);
  const opener = pick(rng, persona.openers(profile));
  return `${opener}\n\n${body}\n\n${pick(rng, persona.followups)}`;
}

export function pickSome<T>(arr: T[], n: number, seed: string): T[] {
  return pickN(makeRng(seed), arr, n);
}
