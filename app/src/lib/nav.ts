import { router } from 'expo-router';

/** Yığını temizleyip ana sayfaya (sekmelere) döner; sekmeler ikinci kez açılmaz. */
export function goHome() {
  try {
    if (router.canDismiss()) { router.dismissAll(); return; }
  } catch {
    /* yığın zaten temiz */
  }
  router.replace('/(tabs)');
}

/** Oturum bittiğinde tüm geçmiş ekranları yığından temizleyip giriş ekranına döner. */
export function resetToLogin() {
  try {
    if (router.canDismiss()) router.dismissAll();
  } catch {
    /* yığın zaten temiz */
  }
  router.replace('/login');
}
