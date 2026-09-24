// Yasal metinler. ŞABLON: yayına çıkmadan önce bir avukat tarafından incelenmeli ve şirket bilgileri doldurulmalıdır.
// Köşeli parantezli alanlar [ ... ] gerçek bilgilerle değiştirilecek yer tutuculardır.

export const COMPANY = {
  brand: 'FalNova',
  legalName: '[Şirket Ünvanı]',
  address: '[Adres]',
  mersis: '[MERSİS No]',
  email: '[Destek e-posta adresi]',
  kep: '[KEP adresi]',
  verbis: '[VERBİS sicil no]',
};

export const LEGAL_UPDATED = '21 Eylül 2026';

export interface LegalSection { h?: string; p: string[] }
export interface LegalDoc {
  id: string;
  title: string;
  short: string;
  icon: 'shield' | 'scroll' | 'book' | 'gem' | 'eye' | 'user';
  sections: LegalSection[];
}

const controller = `Veri sorumlusu: ${COMPANY.legalName} (“${COMPANY.brand}”)\nAdres: ${COMPANY.address}\nMERSİS: ${COMPANY.mersis} · VERBİS: ${COMPANY.verbis}\nİletişim: ${COMPANY.email} · KEP: ${COMPANY.kep}`;

export const LEGAL_DOCS: LegalDoc[] = [
  // ───────────────────────── KVKK AYDINLATMA ─────────────────────────
  {
    id: 'aydinlatma',
    title: 'KVKK Aydınlatma Metni',
    short: 'Kişisel verilerin nasıl işlendiği',
    icon: 'shield',
    sections: [
      {
        p: [
          '6698 sayılı Kişisel Verilerin Korunması Kanunu’nun (“KVKK”) 10. maddesi uyarınca, kişisel verilerinizin hangi amaçlarla işlendiğini, kimlere aktarıldığını ve haklarınızı bu metinle açıklıyoruz.',
        ],
      },
      { h: '1. Veri Sorumlusu', p: [controller] },
      {
        h: '2. İşlenen Kişisel Veriler',
        p: [
          '• Hesap bilgileri: ad, e-posta adresi, şifrenizin geri döndürülemez özeti (şifrenin kendisi saklanmaz).',
          '• Profil bilgileri: doğum tarihi, doğum saati ve yeri (isteğe bağlı), burcunuz.',
          '• Partner analizi: sizin girdiğiniz partner adı, doğum tarihi ve burcu. Başka bir kişiye ait bilgiyi girerken bunu paylaşma hakkınızın bulunduğunu kabul edersiniz.',
          '• Fal içerikleri: fincan ve tabak fotoğrafları, yazdığınız soru, rüya ve not metinleri, seçtiğiniz tarot kartları, falcı sohbetindeki mesajlarınız ve size üretilen yorumlar.',
          '• İşlem bilgileri: satın alma kaydı (paket, tutar, tarih, durum) ve kredi hareketleriniz. Kart bilgileriniz bizde tutulmaz; ödeme kuruluşu veya mağaza tarafından işlenir.',
          '• Kişiselleştirme: isteğe bağlı olarak seçtiğiniz odak konusu, günlük ritüel kayıtlarınız (gün ve seri sayısı) ve son okumalarınızın kısa özeti (tür, tarih, çıkan semboller). “Nova’nın notu” ve yorumların kişiselleştirilmesi için kullanılır; odak konusunu Profil bölümünden istediğiniz zaman kaldırabilirsiniz.',
          '• Teknik veriler: IP adresi, cihaz ve tarayıcı türü, oturum ve hata kayıtları.',
          'Özel nitelikli kişisel veri (sağlık, din, siyasi görüş vb.) istemiyoruz. Fotoğraf ve metinlerinize bu tür bilgileri ya da yüzünüzün göründüğü görüntüleri eklememenizi öneririz.',
        ],
      },
      {
        h: '3. İşleme Amaçları ve Hukuki Sebepler',
        p: [
          '• Üyeliğin oluşturulması, fal ve yorumların hazırlanması, kredi ve cüzdanın yönetilmesi, hizmetin sunulması: sözleşmenin kurulması ve ifası (KVKK m. 5/2-c).',
          '• Ödeme, fatura, muhasebe ve saklama yükümlülükleri: hukuki yükümlülük (m. 5/2-ç).',
          '• Bilgi güvenliği, hata ve kötüye kullanımın önlenmesi, hizmetin iyileştirilmesi: meşru menfaat (m. 5/2-f).',
          '• Yurt dışına aktarım ve tercih ederseniz bildirim gönderimi: açık rızanız (m. 5/1, m. 9).',
        ],
      },
      {
        h: '4. Yorumların Hazırlanması ve Yurt Dışına Aktarım',
        p: [
          'Fal yorumları, yapay zekâ destekli sistemlerle hazırlanır. Yorumun üretilebilmesi için fincan ve tabak fotoğraflarınız, yazdığınız soru, rüya ve sohbet metinleri, adınız, doğum tarihiniz ve burcunuz, yurt dışında yerleşik yapay zekâ ve ses sentezi hizmet sağlayıcılarına iletilir.',
          'Fotoğraflar sunucularımızda saklanmaz; yalnızca yorumun üretildiği istek sırasında hizmet sağlayıcıya iletilir. Sesli yanıt dosyaları en fazla bir saat sonra silinir. Hizmet sağlayıcıların kendi saklama süreleri ve koşulları, bizimle yaptıkları sözleşmelere tabidir.',
          'Bu aktarım, KVKK m. 9 kapsamında Açık Rıza Metni’ne dayanır. Rızanızı istediğiniz zaman geri alabilirsiniz; bu durumda fotoğraf ve metin gönderimi gerektiren bölümler kullanılamaz.',
        ],
      },
      {
        h: '5. Verilerin Aktarıldığı Taraflar',
        p: [
          '• Yapay zekâ ve ses sentezi hizmet sağlayıcıları (yurt dışı): yorumların üretilmesi.',
          '• Ödeme kuruluşları ve uygulama mağazaları: ödemenin alınması ve doğrulanması.',
          '• Barındırma ve altyapı sağlayıcıları: verilerin güvenli biçimde saklanması.',
          '• Yetkili kamu kurum ve kuruluşları: yasal talep olması halinde, mevzuatın öngördüğü ölçüde.',
          'Kişisel verilerinizi satmayız ve reklam amacıyla üçüncü taraflarla paylaşmayız.',
        ],
      },
      {
        h: '6. Toplama Yöntemi',
        p: ['Verileriniz uygulama üzerinden, elektronik ortamda, sizin girdiğiniz bilgiler ve cihazınızın otomatik ilettiği teknik veriler yoluyla toplanır.'],
      },
      {
        h: '7. Saklama Süresi',
        p: [
          'Hesap ve fal geçmişiniz, hesabınız açık olduğu sürece saklanır. Hesabınızı sildiğinizde bu veriler kalıcı olarak silinir. Ödeme kayıtları, ilgili mevzuatın öngördüğü süre boyunca ödeme kuruluşunda saklanır.',
        ],
      },
      {
        h: '8. Haklarınız (KVKK m. 11)',
        p: [
          '• Kişisel verilerinizin işlenip işlenmediğini öğrenme ve bilgi talep etme,',
          '• İşleme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme,',
          '• Yurt içinde veya yurt dışında aktarıldığı tarafları bilme,',
          '• Eksik veya yanlış işlenmişse düzeltilmesini isteme,',
          '• Silinmesini veya yok edilmesini isteme ve bunun aktarılan taraflara bildirilmesini talep etme,',
          '• Otomatik sistemlerle analiz edilmesi sonucu aleyhinize bir sonuç çıkmasına itiraz etme,',
          '• Kanuna aykırı işleme nedeniyle zarara uğramanız halinde zararın giderilmesini talep etme.',
        ],
      },
      {
        h: '9. Başvuru',
        p: [
          `Uygulamada Profil > Yasal > “Hesabımı ve Verilerimi Sil” ile verilerinizi anında silebilirsiniz. Diğer taleplerinizi ${COMPANY.email} adresine veya yukarıdaki KEP adresine iletebilirsiniz. Başvurunuz, niteliğine göre en geç otuz gün içinde sonuçlandırılır.`,
        ],
      },
    ],
  },

  // ───────────────────────── GİZLİLİK POLİTİKASI ─────────────────────────
  {
    id: 'gizlilik',
    title: 'Gizlilik Politikası',
    short: 'Verilerini nasıl koruduğumuz',
    icon: 'eye',
    sections: [
      {
        p: [
          `${COMPANY.brand}, mahremiyetinize saygı duyar. Bu politika, hangi bilgileri topladığımızı, neden topladığımızı ve nasıl koruduğumuzu özetler. Ayrıntılı hukuki açıklama için KVKK Aydınlatma Metni’ne bakabilirsiniz.`,
        ],
      },
      {
        h: 'Topladığımız bilgiler',
        p: ['Hesap bilgilerin (ad, e-posta), doğum bilgilerin, fal için gönderdiğin fotoğraf ve metinler, kredi ve satın alma kayıtların, teknik kayıtlar.'],
      },
      {
        h: 'Neden kullanırız',
        p: [
          'Yorumlarını hazırlamak, cüzdanını yönetmek, hesabını güvende tutmak ve hizmeti iyileştirmek için. Yorumların hazırlanmasında yapay zekâ destekli sistemler kullanılır; bu nedenle fotoğraf ve metinlerin bu sistemleri sağlayan hizmet sağlayıcılara iletilir (Aydınlatma Metni, madde 4).',
        ],
      },
      {
        h: 'Paylaşım',
        p: ['Bilgilerini satmayız, reklam için paylaşmayız. Yalnızca hizmetin çalışması için gereken altyapı, ödeme ve yorum üretimi sağlayıcılarıyla, gerektiği kadarıyla paylaşırız.'],
      },
      {
        h: 'Güvenlik',
        p: [
          'Bağlantılar şifreli (TLS) kurulur, şifreler geri döndürülemez biçimde saklanır, kilitli içerikler sunucuda korunur. Hiçbir sistem tamamen risksiz değildir; bir ihlal olması halinde mevzuatın öngördüğü bildirimleri yaparız.',
        ],
      },
      {
        h: 'Yaş sınırı',
        p: ['Hizmet 18 yaş ve üzeri kullanıcılar içindir. 18 yaşından küçüklerin verilerini bilerek toplamayız.'],
      },
      {
        h: 'Kontrol sende',
        p: ['Profilini düzenleyebilir, fal geçmişindeki kayıtları tek tek silebilir veya hesabını tüm verileriyle birlikte kalıcı olarak kaldırabilirsin.'],
      },
      {
        h: 'Değişiklikler',
        p: ['Bu politikada önemli bir değişiklik olursa uygulama içinde duyururuz. Sorularınız için: ' + COMPANY.email],
      },
    ],
  },

  // ───────────────────────── KULLANIM KOŞULLARI ─────────────────────────
  {
    id: 'kosullar',
    title: 'Kullanım Koşulları',
    short: 'Hizmetin kuralları ve niteliği',
    icon: 'scroll',
    sections: [
      {
        p: [`${COMPANY.brand}’ı kullanarak bu koşulları kabul etmiş olursun. Lütfen dikkatle oku.`],
      },
      {
        h: '1. Hizmetin niteliği',
        p: [
          'Kahve falı, tarot, burç, rüya tabiri, karmik rapor ve partner analizi gibi içerikler yalnızca eğlence ve kişisel farkındalık amacıyla sunulur. Gelecek hakkında kesin bilgi vermez; tıbbi, psikolojik, hukuki, mali veya başka bir profesyonel tavsiye yerine geçmez. Kararlarını yorumlara dayandırmamalısın.',
          'Yorumlar yapay zekâ destekli sistemlerle hazırlanır. “Madam Nova”, uygulamanın dijital falcı karakteridir; sohbet ve sesli yanıtlar otomatik sistemle üretilir, gerçek bir kişi tarafından yazılmaz veya söylenmez.',
          'Bazı yorumlar (ör. kahve falı) birkaç dakikalık bir hazırlanma süresinin ardından açılır. Bu bekleme, deneyimin bir parçası olarak bilerek uygulanır; hazır olana dek yorum gösterilmez. Bekleme için ek ücret alınmaz ve süreyi ücretle atlama seçeneği sunulmaz.',
          'Kendine zarar verme veya kriz belirtisi içeren bir mesaj yazarsan fal yorumu yapılmaz, kredin düşmez ve sana destek bilgisi gösterilir.',
        ],
      },
      {
        h: '2. Hesap ve yaş',
        p: [
          'Hizmeti kullanmak için 18 yaşını doldurmuş olmalısın. Hesap bilgilerinin doğruluğundan ve hesabının güvenliğinden sen sorumlusun. Şüpheli bir kullanım fark edersen bize bildir.',
        ],
      },
      {
        h: '3. Kredi ve soru hakları',
        p: [
          'Krediler ve soru hakları, uygulama içindeki hizmetlerde kullanılan dijital kullanım haklarıdır; para değildir, nakde çevrilemez ve başkasına devredilemez. Hangi hizmetin kaç kredi harcadığı ilgili ekranda gösterilir. Teknik bir hata nedeniyle yorum üretilemezse harcanan kredi hesabına iade edilir.',
          'Günlük ritüel serisi ve ilk alışveriş gibi kampanyalarla verilen krediler de aynı nitelikte dijital kullanım haklarıdır; kampanya koşulları ilgili ekranda yazılıdır. Bir günde çok kredi harcadığını fark edersek sana mola önerisi gösterebiliriz.',
          'Satın alma ve iade koşulları için Mesafeli Satış ve İade Koşulları’na bak.',
        ],
      },
      {
        h: '4. Kullanım kuralları',
        p: [
          '• Başkasına ait kişisel bilgiyi, o kişinin haberi olmadan girmemelisin.',
          '• Hukuka aykırı, tehdit veya taciz içeren, müstehcen içerik göndermemelisin.',
          '• Hizmeti otomatik araçlarla kötüye kullanmamalı, güvenlik önlemlerini aşmaya çalışmamalısın.',
          '• Ürettiğimiz içerikleri (poster dahil) kişisel amaçla paylaşabilirsin; ticari amaçla çoğaltamazsın.',
        ],
      },
      {
        h: '5. Fikri mülkiyet',
        p: [`Uygulamanın tasarımı, yazılımı, markası ve içerik motoru ${COMPANY.legalName}’e aittir. Sana üretilen yorumları kişisel kullanımın için kullanabilirsin.`],
      },
      {
        h: '6. Sorumluluğun sınırı',
        p: [
          'Hizmet “olduğu gibi” sunulur. Yorumların doğruluğu, belirli bir sonuca ulaşacağın veya kesintisiz çalışacağı konusunda garanti verilmez. Kanunun izin verdiği ölçüde, yorumlara dayanarak alınan kararlardan doğan zararlardan sorumlu değiliz. Tüketici olarak kanundan doğan haklarına halel gelmez.',
        ],
      },
      {
        h: '7. Askıya alma ve fesih',
        p: ['Koşulları ihlal eden hesapları uyarıp askıya alabilir veya kapatabiliriz. Hesabını dilediğin zaman kendin silebilirsin.'],
      },
      {
        h: '8. Uygulanacak hukuk',
        p: ['Bu koşullara Türk hukuku uygulanır. Tüketici uyuşmazlıklarında Tüketici Hakem Heyetleri ve Tüketici Mahkemeleri yetkilidir.'],
      },
      { h: '9. İletişim', p: [`${COMPANY.legalName} · ${COMPANY.address} · ${COMPANY.email}`] },
    ],
  },

  // ───────────────────────── AÇIK RIZA ─────────────────────────
  {
    id: 'riza',
    title: 'Açık Rıza Metni',
    short: 'Fotoğraf ve metinlerin işlenmesi, yurt dışı aktarım',
    icon: 'user',
    sections: [
      {
        p: [
          `${COMPANY.legalName} tarafından hazırlanan KVKK Aydınlatma Metni’ni okudum ve anladım. Aşağıdaki konuda, özgür irademle ve yalnızca bu konuyla sınırlı olarak açık rıza veriyorum.`,
        ],
      },
      {
        h: 'Rıza konusu',
        p: [
          'Fal ve yorumlarımın hazırlanabilmesi amacıyla; yüklediğim fincan ve tabak fotoğraflarının, yazdığım soru, rüya ve sohbet metinlerinin, adımın, doğum tarihimin ve burcumun, yurt dışında yerleşik yapay zekâ ve ses sentezi hizmet sağlayıcılarına iletilmesine ve bu kapsamda işlenmesine.',
        ],
      },
      {
        h: 'Bilmen gerekenler',
        p: [
          '• Aktarım, yalnızca yorum üretimi amacıyla ve gerektiği kadar yapılır.',
          '• Fotoğraflar sunucularımızda saklanmaz; sesli yanıt dosyaları en fazla bir saat sonra silinir.',
          '• Yorumun kişiselleştirilmesi için son okumalarının kısa bir özeti (tür, zaman, çıkan semboller) ve seçtiysen odak konun da aynı sağlayıcılara iletilir.',
          '• Bu rıza, Kahve Falı ve yapay zekâ destekli diğer bölümlerin kullanımı için gereklidir. Rıza vermezsen bu bölümleri kullanamazsın; uygulamanın kalan kısmı etkilenmez.',
        ],
      },
      {
        h: 'Rızanın geri alınması',
        p: [
          `Rızanı dilediğin zaman geri alabilirsin: Profil > Yasal bölümünden hesabını silerek veya ${COMPANY.email} adresine yazarak. Geri alma, o âna kadar yapılan işlemlerin hukuka uygunluğunu etkilemez.`,
        ],
      },
    ],
  },

  // ───────────────────────── MESAFELİ SATIŞ ─────────────────────────
  {
    id: 'satis',
    title: 'Mesafeli Satış ve İade',
    short: 'Kredi paketleri, ödeme ve iade koşulları',
    icon: 'gem',
    sections: [
      {
        p: ['6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği kapsamında bilgilendirme.'],
      },
      { h: '1. Satıcı', p: [`${COMPANY.legalName} · ${COMPANY.address} · MERSİS ${COMPANY.mersis} · ${COMPANY.email}`] },
      {
        h: '2. Ürün',
        p: [
          'Kredi ve soru paketleri: uygulama içinde fal hizmetlerinde kullanılan dijital kullanım haklarıdır. Paketin içeriği ve fiyatı satın alma ekranında gösterilir; fiyatlara KDV dahildir.',
        ],
      },
      {
        h: '3. Ödeme ve teslim',
        p: [
          'Ödeme, satın alma anında seçtiğin yöntemle (uygulama mağazası veya ödeme kuruluşu) alınır. Ödeme onaylandığında paket anında hesabına tanımlanır. Kart bilgilerin bizde tutulmaz.',
        ],
      },
      {
        h: '4. Cayma hakkı',
        p: [
          'Kredi paketleri, elektronik ortamda anında ifa edilen hizmetler ve tüketiciye anında teslim edilen gayrimaddi mallar niteliğindedir. Mesafeli Sözleşmeler Yönetmeliği m. 15/1-(ğ) uyarınca, ifaya onayınla başlanan bu tür satışlarda cayma hakkı kullanılamaz. Satın alma öncesinde bu bilgilendirmeyi okuduğunu ve onayladığını kabul edersin.',
        ],
      },
      {
        h: '5. Hata ve mükerrer ödeme',
        p: [
          `Ödemen alındığı halde paket hesabına tanımlanmadıysa, aynı ödeme birden fazla kez çekildiyse veya hizmet teknik nedenle sunulamadıysa ${COMPANY.email} adresine yaz; inceleyip düzeltir veya iade ederiz.`,
          'Uygulama mağazası üzerinden yapılan satın almalarda iade süreci ilgili mağazanın kurallarına da tabidir.',
        ],
      },
      {
        h: '6. Başvuru yolları',
        p: ['Şikâyetlerini önce bize iletebilirsin. Çözülemeyen uyuşmazlıklarda, parasal sınırlarına göre Tüketici Hakem Heyetleri veya Tüketici Mahkemeleri’ne başvurabilirsin.'],
      },
    ],
  },

  // ───────────────────────── ÇEREZ / YEREL DEPO ─────────────────────────
  {
    id: 'cerez',
    title: 'Çerez ve Yerel Depolama',
    short: 'Cihazında tutulan bilgiler',
    icon: 'book',
    sections: [
      {
        p: [
          'Uygulama, oturumunu açık tutmak ve tercihlerini hatırlamak için cihazının veya tarayıcının yerel depolama alanını kullanır. Bunlar hizmetin çalışması için zorunludur.',
          'Hazır olunca haber vermemiz için izin verirsen cihazında bir bildirim zamanlanır; bu izni cihaz ayarlarından her zaman kapatabilirsin.',
          'Şu anda reklam, profil çıkarma veya üçüncü taraf izleme amaçlı çerez ya da benzeri teknolojiler kullanmıyoruz. Bu durum değişirse önceden bilgilendirir ve gerekiyorsa onayını alırız.',
          'Tarayıcı verilerini temizlediğinde veya çıkış yaptığında oturum bilgin cihazdan silinir.',
        ],
      },
    ],
  },
];

export const legalDoc = (id: string) => LEGAL_DOCS.find((d) => d.id === id);
