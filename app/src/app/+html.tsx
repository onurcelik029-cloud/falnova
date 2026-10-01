import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

/**
 * Web için kök HTML belgesi (yalnızca statik dışa aktarımda/Node ortamında çalışır, native'i etkilemez).
 *
 * `translate="no"` + `google: notranslate` meta etiketi: tarayıcının otomatik çeviri özelliği (ör. Chrome'un
 * "Bu sayfayı çevir" önerisi), sık güncellenen küçük metin parçacıklarından oluşan ızgara tabanlı ekranlarda
 * (ör. Sözcük Bulmacası harf ızgarası) React'in DOM güncellemeleriyle çakışıp harflerin üzerine yabancı
 * kelimeler ("BEN", "BENCE" gibi) yapıştırarak ekranı bozabiliyor. Sayfayı çeviriye kapatmak bunu önler.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="tr" translate="no">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="google" content="notranslate" />
        <meta httpEquiv="Content-Language" content="tr" />
        <title>FalNova</title>

        {/* react-native-web'in önerdiği stil sıfırlaması: https://necolas.github.io/react-native-web/docs/setup/#root-element */}
        <ScrollViewStyleReset />

        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>{children}</body>
    </html>
  );
}
