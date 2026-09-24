import { Platform, Share } from 'react-native';
import type { RefObject } from 'react';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

export type ShareOutcome = 'shared' | 'downloaded' | 'text' | 'failed';

/** Basit metin paylaşımı (davet linki, kod vb.). Görsel gerekmeyen paylaşımlar için. */
export async function shareText(message: string): Promise<'shared' | 'copied' | 'failed'> {
  try {
    if (Platform.OS === 'web') {
      const g = globalThis as any;
      if (g.navigator?.share) { await g.navigator.share({ text: message }); return 'shared'; }
      if (g.navigator?.clipboard?.writeText) { await g.navigator.clipboard.writeText(message); return 'copied'; }
    }
    await Share.share({ message });
    return 'shared';
  } catch {
    return 'failed';
  }
}

/** Kader Posterini görsele çevirip paylaşır (Instagram/WhatsApp hikâyesi için). */
export async function sharePoster(ref: RefObject<unknown>, text: string): Promise<ShareOutcome> {
  try {
    const uri = await captureRef(ref as never, { format: 'png', quality: 1, result: Platform.OS === 'web' ? 'data-uri' : 'tmpfile' });
    if (Platform.OS === 'web') {
      const g = globalThis as any;
      const blob = await (await fetch(uri)).blob();
      const file = new g.File([blob], 'falnova-kader-posteri.png', { type: 'image/png' });
      if (g.navigator?.canShare?.({ files: [file] })) {
        await g.navigator.share({ files: [file], text });
        return 'shared';
      }
      const a = g.document.createElement('a');
      a.href = uri;
      a.download = 'falnova-kader-posteri.png';
      g.document.body.appendChild(a);
      a.click();
      a.remove();
      return 'downloaded';
    }
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Kader Posterini paylaş' });
      return 'shared';
    }
  } catch {
    /* görsel alınamazsa metin paylaşımına düş */
  }
  try {
    await Share.share({ message: text });
    return 'text';
  } catch {
    return 'failed';
  }
}
