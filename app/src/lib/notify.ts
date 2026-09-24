// "Hazır olunca haber ver" — web sürümü. Tarayıcı bildirimi yalnızca sekme/uygulama açıkken çalışır;
// kalıcı arka plan bildirimi mobil uygulamada (notify.native.ts) yerel zamanlanmış bildirimle yapılır.

type Perm = 'granted' | 'denied' | 'default' | 'unsupported';

interface WebNotification { permission: string; requestPermission: () => Promise<string> }
const N = (): (WebNotification & (new (title: string, opts?: { body?: string }) => unknown)) | null => {
  const g = globalThis as { Notification?: unknown };
  return (g.Notification as never) ?? null;
};

const timers = new Map<string, ReturnType<typeof setTimeout>>();

export function notifyPermission(): Perm {
  const n = N();
  if (!n) return 'unsupported';
  return (n.permission as Perm) ?? 'default';
}

/** Kullanıcı bir düğmeye bastığında çağrılmalıdır. */
export async function requestNotifyPermission(): Promise<Perm> {
  const n = N();
  if (!n) return 'unsupported';
  try {
    return ((await n.requestPermission()) as Perm) ?? 'default';
  } catch {
    return 'denied';
  }
}

/** `inMs` sonra bildirim gösterir (izin varsa). Aynı anahtar tekrar zamanlanırsa öncekini iptal eder. */
export async function scheduleReady(key: string, title: string, body: string, inMs: number): Promise<void> {
  await cancelReady(key);
  if (notifyPermission() !== 'granted') return;
  timers.set(key, setTimeout(() => {
    timers.delete(key);
    try {
      // Sekme açık ve görünürse uygulama içi bildirim yeterli.
      const doc = (globalThis as { document?: { visibilityState?: string } }).document;
      if (doc?.visibilityState === 'visible') return;
      const n = N();
      if (n) new n(title, { body });
    } catch {
      /* yoksay */
    }
  }, Math.max(0, inMs)));
}

export async function cancelReady(key: string): Promise<void> {
  const t = timers.get(key);
  if (t) clearTimeout(t);
  timers.delete(key);
}

/** Bu platformda uygulama kapalıyken de bildirim gelir mi? */
export const backgroundCapable = false;

/** Web'de Expo push jetonu yoktur (tarayıcı Notification API yeterli — yukarıya bakın). */
export async function getExpoPushToken(): Promise<{ token: string; platform: 'ios' | 'android' | 'web' } | null> {
  return null;
}
