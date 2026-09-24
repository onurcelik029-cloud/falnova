// Günlük ritüel hatırlatması: sunucu, günde bir kez (varsayılan Türkiye saatiyle 19:00), bugünün
// ritüelini henüz açmamış ve push jetonu kayıtlı kullanıcılara nazik bir hatırlatma gönderir.
// Sessiz saatlere uyar (bkz. push.ts — 19:00 zaten varsayılan sessiz aralığın dışında olsa da, sunucu
// saati/kullanıcı saati farkı ya da özelleştirilmiş bir aralık için ek bir güvence olarak kontrol edilir).
// Tek sunuculu SQLite dağıtımı için basit bir in-process zamanlayıcı yeterlidir (bkz. README "Ölçek" —
// çok sunuculu kuruluma geçerken bu iş de merkezi bir zamanlayıcıya/kuyruğa taşınmalı, yoksa her sunucu
// aynı kullanıcıya ayrı ayrı bildirim gönderebilir).
import { dayKeyTR } from '../../app/src/shared/daily.ts';
import { config } from './config.ts';
import { sendPush } from './push.ts';
import type { Store } from './store.ts';

const trHour = (d: Date): number => new Date(d.getTime() + 3 * 3600_000).getUTCHours();

/**
 * Test edilebilir çekirdek: verilen "şu an" için hatırlatmanın gönderilmesi gerekip gerekmediğine karar
 * verir. Gönderirse gönderilen gün anahtarını döner (çağıran taraf `lastSentDay`'i buna günceller),
 * göndermezse null döner.
 */
export async function runDailyReminderCheck(store: Store, now: Date, lastSentDay: string | null): Promise<string | null> {
  if (!config.push.reminderEnabled) return null;
  if (trHour(now) !== config.push.reminderHourTR) return null;
  const today = dayKeyTR(now);
  if (lastSentDay === today) return null;
  const targets = store.usersAwaitingDailyRitual(today);
  for (const uid of targets) {
    await sendPush(store, uid, {
      title: 'Bugünün mesajı seni bekliyor',
      body: 'Nova bugün senin için bir cümle bıraktı. Açmak için dokun.',
      data: { kind: 'daily' },
    }, { now });
  }
  return today;
}

/** Her dakika kontrol eder; yapılandırılan saate gelindiğinde (ve bugün için henüz gönderilmediyse) hatırlatmayı yollar. */
export function startDailyReminder(store: Store, intervalMs = 60_000): ReturnType<typeof setInterval> {
  let lastSentDay: string | null = null;
  const timer = setInterval(() => {
    runDailyReminderCheck(store, new Date(), lastSentDay)
      .then((sentDay) => { if (sentDay) lastSentDay = sentDay; })
      .catch(() => undefined); // bildirim asla kritik yol değildir
  }, intervalMs);
  timer.unref(); // sunucu zaten HTTP dinleyicisiyle canlı kalır; bu zamanlayıcı tek başına süreci/testleri tutmasın
  return timer;
}
