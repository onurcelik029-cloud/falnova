export interface TarotCard {
  id: number;
  name: string;
  glyph: string;
  keyword: string;
  up: string;
  rev: string;
}

export const TAROT: TarotCard[] = [
  { id: 0, name: 'Deli', glyph: '☀', keyword: 'yeni başlangıç', up: 'Uçurumun kenarında bile gülümseyen bir yürek: yeni bir yola çıkmanın, riske güvenle adım atmanın zamanı geldi.', rev: 'Düşünmeden atılan adımlar seni yoruyor olabilir; heyecanını dizginleyip yolun haritasına bir kez daha bak.' },
  { id: 1, name: 'Büyücü', glyph: '✦', keyword: 'irade ve yaratım', up: 'Elindeki tüm araçlar hazır. Niyetin net olduğunda evren senin dilinden anlıyor; harekete geçmek için bekleme.', rev: 'Yeteneğini tam kullanmıyor ya da enerjini dağıtıyor olabilirsin. Odak, sihrin ilk şartı.' },
  { id: 2, name: 'Başrahibe', glyph: '☾', keyword: 'sezgi ve sır', up: 'Cevap dışarıda değil, içinde. Sessizliğe kulak ver; sezgin bugün mantığından daha isabetli konuşuyor.', rev: 'Bastırdığın bir his ya da söylenmemiş bir gerçek var. Perde aralanmadan huzur gelmeyecek.' },
  { id: 3, name: 'İmparatoriçe', glyph: '❀', keyword: 'bereket ve şefkat', up: 'Bolluk, üretkenlik ve sevgi kapını çalıyor. Kendine ve sevdiklerine cömert davranmanın karşılığını göreceksin.', rev: 'Başkalarına verirken kendini ihmal ediyorsun. Önce kendi kaseni doldur.' },
  { id: 4, name: 'İmparator', glyph: '♛', keyword: 'düzen ve otorite', up: 'Sağlam bir yapı kurmak için gereken güç sende. Sınırlarını çiz, planını disipline et; kalıcı başarı buradan doğar.', rev: 'Katılık ya da kontrol ihtiyacı ilişkilerini ve işini zorluyor olabilir. Esnemek zayıflık değil.' },
  { id: 5, name: 'Başrahip', glyph: '✠', keyword: 'bilgelik ve gelenek', up: 'Güvendiğin bir akıl hocasından ya da köklü bir değerden ışık alacaksın. Öğrenmeye açık ol.', rev: 'Ezberlerin seni kısıtlıyor. Kendi doğrunu bulmak için kalıpların dışına çık.' },
  { id: 6, name: 'Âşıklar', glyph: '♡', keyword: 'aşk ve seçim', up: 'Kalbin ile aklın aynı yöne bakıyor. Önemli bir bağ ya da dürüst bir seçim seni bekliyor.', rev: 'Uyumsuzluk ya da kararsızlık var. Kalbinin gerçekten neyi istediğini kendine itiraf et.' },
  { id: 7, name: 'Savaş Arabası', glyph: '➤', keyword: 'zafer ve yön', up: 'Zıt kuvvetleri dizginleyip hedefe ilerliyorsun. Kararlılığın bu dönemde kapıları açar.', rev: 'Yönünü kaybettin ya da kontrolü kaçırıyorsun. Hızı azalt, dümeni yeniden tut.' },
  { id: 8, name: 'Güç', glyph: '♌', keyword: 'sabır ve yürek gücü', up: 'Gerçek güç, nazik olabilmektir. Sabrın ve şefkatin en zor kapıyı bile açacak.', rev: 'Kendine olan güvenin sarsılmış. Korkunu bastırmak yerine onunla dost ol.' },
  { id: 9, name: 'Ermiş', glyph: '☆', keyword: 'iç yolculuk', up: 'Geri çekilip kendi ışığını yakma zamanı. Yalnızlık bu kez ceza değil, öğretmen.', rev: 'Fazla içine kapanmak seni hayattan koparıyor. Bir fener de başkasına uzat.' },
  { id: 10, name: 'Kader Çarkı', glyph: '☸', keyword: 'dönüm noktası', up: 'Çark senin lehine dönüyor. Beklenmedik bir fırsat ya da şanslı bir tesadüf kapıda.', rev: 'Geçici bir talihsizlik dönemi; ama çark durmaz. Direnmek yerine akışı öğren.' },
  { id: 11, name: 'Adalet', glyph: '⚖', keyword: 'denge ve hakikat', up: 'Ektiğini biçeceğin, dürüstlüğün ödüllendirileceği bir dönem. Kararların net ve adil olsun.', rev: 'Bir haksızlık ya da kendini kandırma hâli var. Terazinin iki kefesine de dürüstçe bak.' },
  { id: 12, name: 'Asılan Adam', glyph: '⟁', keyword: 'bakış değişimi', up: 'Beklemek de bir eylemdir. Durumu ters yüz edip bakınca çözüm görünür hâle gelecek.', rev: 'Gereksiz bir fedakârlık ya da erteleme döngüsündesin. Artık bırakma vakti.' },
  { id: 13, name: 'Ölüm', glyph: '☽', keyword: 'dönüşüm', up: 'Bir dönem kapanıyor; korkma, bu gerçek bir ölüm değil, kabuk değiştirme. Yeni olan için yer açılıyor.', rev: 'Değişime direniyorsun. Eskiye tutunmak acıyı uzatıyor.' },
  { id: 14, name: 'Denge', glyph: '≈', keyword: 'ölçü ve uyum', up: 'Zıtlıkları harmanlıyorsun. Sabır ve ölçülülükle iyileşme ve huzur geliyor.', rev: 'Aşırılık bir yerden sızıyor: iş, ilişki ya da alışkanlık. Ölçüyü yeniden bul.' },
  { id: 15, name: 'Şeytan', glyph: '⛧', keyword: 'bağımlılık ve gölge', up: 'Seni bağlayan zincirin anahtarı hep sendeydi. Bir alışkanlık ya da bağımlı ilişkiyle yüzleşme vakti.', rev: 'Zincirler gevşiyor. Özgürlüğe giden kapı aralandı, cesaretle geç.' },
  { id: 16, name: 'Kule', glyph: '⚡', keyword: 'ani sarsılma', up: 'Sahte temeller yıkılıyor. Sarsıcı ama arındırıcı bir gerçek; enkaz kalkınca yerine sağlamı kurulacak.', rev: 'Kaçınılmaz bir yıkımı erteliyor olabilirsin. Yavaş yıkılmak yerine bilinçli bırak.' },
  { id: 17, name: 'Yıldız', glyph: '★', keyword: 'umut ve şifa', up: 'Fırtına geçti, gökyüzü açıldı. Umut, ilham ve şifa dönemi başlıyor; dileklerin duyuluyor.', rev: 'Umudunu kaybetmeye yakınsın ama ışık hâlâ orada. Küçük bir inanç kıvılcımı yeter.' },
  { id: 18, name: 'Ay', glyph: '☾', keyword: 'yanılsama ve rüya', up: 'Her şey göründüğü gibi değil. Korkuların ve rüyaların sana mesaj taşıyor; acele karar verme.', rev: 'Sis dağılıyor, gizli kalan bir şey ortaya çıkıyor. Kaygıların ölçüsünü yeniden tart.' },
  { id: 19, name: 'Güneş', glyph: '☼', keyword: 'neşe ve başarı', up: 'Parlak bir dönem: başarı, neşe ve canlılık. Saklanma, ışığını paylaş.', rev: 'Mutluluk var ama bir gölgeyle örtülü. Sabret, bulutlar geçici.' },
  { id: 20, name: 'Mahşer', glyph: '♪', keyword: 'çağrı ve arınma', up: 'İç sesin seni daha yüksek bir amaca çağırıyor. Geçmişi affet, yeniden doğ.', rev: 'Kendini yargılamaktan yorulmuşsun. Ders çıkar ve bırak.' },
  { id: 21, name: 'Dünya', glyph: '◎', keyword: 'tamamlanma', up: 'Bir döngü mükemmel biçimde tamamlanıyor. Emeklerinin meyvesi geliyor; yeni bir tura hazırsın.', rev: 'Bitişe çok az kaldı; son adımı atmaktan çekiniyorsun. Tamamla ve ilerle.' },
];

export function tarotById(id: number): TarotCard {
  return TAROT.find((c) => c.id === id) ?? TAROT[0];
}

export const SPREADS: Record<'three' | 'one' | 'love', { label: string; positions: string[]; desc: string }> = {
  one: { label: 'Günün Kartı', positions: ['Bugünün Mesajı'], desc: 'Tek kart, net bir mesaj.' },
  three: { label: 'Geçmiş · Şimdi · Gelecek', positions: ['Geçmiş', 'Şimdi', 'Gelecek'], desc: 'Zamanın üç kapısı, üç kart.' },
  love: { label: 'Aşk Açılımı', positions: ['Sen', 'Karşındaki', 'Bağınızın Kaderi'], desc: 'Kalbin ve bağın haritası.' },
};
