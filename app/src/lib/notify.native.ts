// "Hazır olunca haber ver" — mobil sürüm: yerel zamanlanmış bildirim; uygulama kapalıyken de gelir.
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

type Perm = 'granted' | 'denied' | 'default' | 'unsupported';

const ids = new Map<string, string>();
let ready = false;

async function setup() {
  if (ready) return;
  ready = true;
  try {
    Notifications.setNotificationHandler({
      // Uygulama açıkken sistem bildirimi yerine uygulama içi bildirim gösterilir (çift bildirim olmasın).
      handleNotification: async () => ({ shouldShowBanner: false, shouldShowList: false, shouldPlaySound: false, shouldSetBadge: false }),
    });
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('fal', { name: 'Fal hazır bildirimleri', importance: Notifications.AndroidImportance.DEFAULT });
    }
  } catch {
    /* bildirim modülü yoksa (ör. bazı test ortamları) sessizce geç */
  }
}

let cached: Perm = 'default';

export function notifyPermission(): Perm {
  return cached;
}

export async function requestNotifyPermission(): Promise<Perm> {
  try {
    await setup();
    const cur = await Notifications.getPermissionsAsync();
    if (cur.granted) return (cached = 'granted');
    const res = await Notifications.requestPermissionsAsync();
    return (cached = res.granted ? 'granted' : 'denied');
  } catch {
    return (cached = 'unsupported');
  }
}

export async function scheduleReady(key: string, title: string, body: string, inMs: number): Promise<void> {
  await cancelReady(key);
  try {
    await setup();
    const cur = await Notifications.getPermissionsAsync();
    cached = cur.granted ? 'granted' : cached;
    if (!cur.granted) return;
    const id = await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: Math.max(1, Math.round(inMs / 1000)), repeats: false, channelId: 'fal' },
    });
    ids.set(key, id);
  } catch {
    /* zamanlanamadıysa uygulama içi bildirim yine çalışır */
  }
}

export async function cancelReady(key: string): Promise<void> {
  const id = ids.get(key);
  ids.delete(key);
  if (!id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    /* yoksay */
  }
}

export const backgroundCapable = true;

/**
 * Sunucudan push gönderilebilmesi için Expo push jetonu. İzin verilmediyse (henüz istenmedi ya da
 * reddedildi) ya da fiziksel/derlenmiş bir cihaz değilse (simülatör, Expo Go'da EAS proje kimliği yoksa)
 * sessizce null döner — bu isteğe bağlı bir katmandır, hiçbir akışı bloklamaz.
 */
export async function getExpoPushToken(): Promise<{ token: string; platform: 'ios' | 'android' | 'web' } | null> {
  try {
    await setup();
    const cur = await Notifications.getPermissionsAsync();
    if (!cur.granted) return null;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    const { data } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    return { token: data, platform: Platform.OS === 'ios' ? 'ios' : 'android' };
  } catch {
    return null;
  }
}
