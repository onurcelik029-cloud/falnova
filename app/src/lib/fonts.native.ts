// iOS / Android: yazı tiplerini paketten yükler. Yüklenemezse sistem yazısıyla devam eder.
import { useEffect, useState } from 'react';
import { useFonts } from 'expo-font';
import {
  CormorantGaramond_500Medium, CormorantGaramond_600SemiBold, CormorantGaramond_700Bold,
} from '@expo-google-fonts/cormorant-garamond';
import { Jost_400Regular, Jost_500Medium, Jost_600SemiBold } from '@expo-google-fonts/jost';

export function useAppFonts(): boolean {
  const [loaded, error] = useFonts({
    CormorantGaramond_500Medium, CormorantGaramond_600SemiBold, CormorantGaramond_700Bold,
    Jost_400Regular, Jost_500Medium, Jost_600SemiBold,
  });
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 4000);
    return () => clearTimeout(t);
  }, []);
  return loaded || !!error || timedOut;
}

