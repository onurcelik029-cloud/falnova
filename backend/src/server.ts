import { aiStatus, config } from './config.ts';
import { openDb } from './db.ts';
import { createApp } from './app.ts';
import { createStore } from './store.ts';
import { startDailyReminder } from './dailyReminder.ts';

const db = openDb();
const app = createApp(db);
// createApp kendi Store örneğini kapatır; hatırlatma zamanlayıcısı aynı db üzerinde ayrı (hafif) bir
// Store örneğiyle çalışır — ikisi de aynı SQLite bağlantısını paylaştığından veri tutarlılığı bozulmaz.
startDailyReminder(createStore(db));

app.listen(config.port, () => {
  const s = aiStatus();
  console.log(`FalNova API dinlemede: ${config.publicUrl}`);
  console.log(`  OpenAI (kahve/el falı vision): ${s.openai ? 'açık' : 'anahtar yok → Gemini/mock'}`);
  console.log(`  Gemini (metin/sohbet/doğum haritası): ${s.gemini ? 'açık' : 'anahtar yok → mock'}`);
  console.log(`  ElevenLabs (ses)     : ${s.elevenlabs ? 'açık' : 'anahtar yok → cihaz TTS'}`);
  console.log(`  Ödeme sağlayıcı      : ${s.payments}`);
  console.log(`  Push (Expo)          : günlük hatırlatma ${s.push.reminderEnabled ? `açık (TR ${config.push.reminderHourTR}:00)` : 'kapalı'}, sessiz saatler ${config.push.quietStartHourTR}:00–${config.push.quietEndHourTR}:00`);
});
