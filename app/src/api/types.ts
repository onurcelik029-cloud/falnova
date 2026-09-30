import type { DailyState } from '@/shared/daily.ts';
import type { WordPuzzle } from '@/shared/wordgame.ts';
import type {
  ChatMessage, CoffeeRequest, CoupleRequest, CreditPackage, DreamRequest, FortuneResult,
  IapVerifyRequest, KarmicRequest, PalmRequest, Profile, ReferralInfo, TarotRequest, TransactionRecord, User, VoiceTone, Wallet, ZodiacId,
} from '@/shared/types.ts';

export class ApiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export interface Session {
  user: User;
  wallet: Wallet;
}

export interface AskResult {
  reply: ChatMessage;
  wallet: Wallet;
  /** Sesli modda: oynatılabilir ses (data URI ya da URL). Demoda tarayıcı/cihaz TTS kullanılır. */
  audioUrl?: string;
}

export interface FortuneResponse {
  fortune: FortuneResult;
  wallet: Wallet;
}

export interface HomeInfo {
  /** "Nova'nın notu": kayıtlı gerçek geçmişe dayanır; yoksa null. */
  note: string | null;
  daily: DailyState;
}

export interface Offers {
  /** İlk başarılı satın alımda eklenecek hediye kredi (0 = kullanıldı). */
  firstPurchaseBonus: number;
  /** Bugün harcanan kredi. */
  spentToday: number;
}

export interface Api {
  mode: 'demo' | 'live';

  restore(): Promise<Session | null>;
  register(email: string, password: string, profile: Profile, refCode?: string): Promise<Session>;
  login(email: string, password: string): Promise<Session>;
  guest(profile: Profile, refCode?: string): Promise<Session>;
  logout(): Promise<void>;
  /** Hesabı ve bağlı tüm verileri kalıcı olarak siler (KVKK md. 11). */
  deleteAccount(): Promise<void>;
  updateProfile(profile: Profile): Promise<Session>;
  /** Açık rızayı kaydeder (yurt dışı aktarım + yapay zekâ ile işleme). Sunucu kaydı tutar. */
  recordConsent(): Promise<Session>;
  /** Açık rızayı geri alır; yeni AI okuması yapılamaz, geçmiş erişilebilir kalır. */
  revokeConsent(): Promise<Session>;

  /** Expo push jetonunu sunucuya kaydeder ("okuma hazır" ve günlük ritüel hatırlatması için). */
  registerPushToken(token: string, platform: 'ios' | 'android' | 'web'): Promise<void>;
  /** Bu cihazın jetonunu siler (ör. çıkış yaparken — artık bu hesaba bildirim gitmesin). */
  unregisterPushToken(token: string): Promise<void>;

  coffee(req: CoffeeRequest): Promise<FortuneResponse>;
  tarot(req: TarotRequest): Promise<FortuneResponse>;
  horoscope(sign: ZodiacId, period: 'daily' | 'weekly'): Promise<FortuneResponse>;
  dream(req: DreamRequest): Promise<FortuneResponse>;
  karmic(req: KarmicRequest): Promise<FortuneResponse>;
  karmicUnlock(fortuneId: string): Promise<FortuneResponse>;
  couple(req: CoupleRequest): Promise<FortuneResponse>;
  /** Doğum haritası: ücretsiz, Güneş/Ay/Yükselen değişmediği sürece önbellekten döner. */
  natal(): Promise<FortuneResponse>;
  palm(req: PalmRequest): Promise<FortuneResponse>;

  chatHistory(): Promise<ChatMessage[]>;
  chatAsk(text: string, opts?: { voice?: boolean; tone?: VoiceTone }): Promise<AskResult>;

  home(): Promise<HomeInfo>;
  /** Günlük ritüeli açar (günde bir kez). 7. ardışık günde 1 kredi verir. */
  claimDaily(): Promise<{ daily: DailyState; wallet: Wallet }>;

  wallet(): Promise<Wallet>;
  offers(): Promise<Offers>;
  /** Arkadaşını Davet Et: kendi kodu, davet istatistikleri. */
  referral(): Promise<ReferralInfo>;
  packages(): Promise<CreditPackage[]>;
  checkout(packageId: string): Promise<{ wallet: Wallet; transaction: TransactionRecord; checkoutUrl?: string }>;
  /** Mağaza içi satın alma (App Store/Google Play) makbuzunu sunucuda doğrular ve bakiyeyi yükler. */
  iapVerify(req: IapVerifyRequest): Promise<{ wallet: Wallet; transaction: TransactionRecord }>;
  transactions(): Promise<TransactionRecord[]>;

  history(): Promise<FortuneResult[]>;
  fortune(id: string): Promise<FortuneResult | null>;
  removeFortune(id: string): Promise<void>;

  /** Nova'nın Sözcük Bulmacası: yeni bir deneme başlatır (bulmacayı üretir). */
  gameStart(): Promise<{ attemptId: string; puzzle: WordPuzzle }>;
  /** Denemeyi kapatır; tüm kelimeler doğru bulunduysa (ve günlük tavan aşılmadıysa) kredi verir. */
  gameFinish(attemptId: string, foundWords: string[]): Promise<{ rewarded: boolean; alreadyMaxedToday: boolean; wallet: Wallet }>;
  /** Bir reklam izlendiğini bildirir; her birkaç izlemede bir (günlük tavana kadar) kredi verir. */
  adWatch(): Promise<{ watched: number; rewarded: boolean; nextCreditIn: number; wallet: Wallet }>;
}
