# ADR-002: Frontend Bileşen Mimarisi — Monolitik App.tsx'in Modüler Bileşenlere Ayrılması

## Durum
Kabul Edildi (Sprint 5, 12 Haziran 2026)

## Bağlam
`client/src/App.tsx` 1208 satıra ulaşmış, React bileşen tabanlı mimariye ters düşen monolitik bir yapıya dönüşmüştü. Tüm uygulama durumu (auth, form, sahne yönetimi, SSE progress, meta düzenleme, galeri, tema, dil) tek bir dosyada toplanmıştı. Bu durum:
- Bakım zorluğu: 1200+ satırlık tek dosyada değişiklik yapmak riskli hale gelmişti
- Yeniden kullanılabilirlik: Tüm UI parçaları birbirine sıkı sıkıya bağlıydı; küçük bir form alanını test etmek için tüm App'i render etmek gerekiyordu
- Type güvenliği: Tek dosyada pek çok `any` türü kullanımı yaygınlaşmıştı
- Code review: Büyük dosyalarda PR review zorlaşıyor, merge conflict sıklığı artıyordu

## Karar
`App.tsx` dört fonksiyonel alana karşılık gelen bileşene bölündü:
- `Header` — Navbar (tema, dil, karanlık mod, fırsatlar/grup sohbeti kısayolları, kredi göstergesi, çıkış)
- `ProjectForm` — Sol kenar çubuğu (master prompt, üretim şablonu, TTS, 6 özellik checkbox, 4 platform seçici)
- `StudioPanel` — Orta panel (tab bar, video önizleme, Timeline, Fırsatlar Hunisi, Grup Sohbeti placeholder)
- `GalleryPanel` — Sağ kenar çubuğu (progress tracker, meta editör, galeri)

Paylaşılan tipler `client/src/types.ts` dosyasına taşındı; `Scene` ve `OpportunityVideo` zaten kendi bileşenlerinde (`Timeline.tsx`, `Opportunities.tsx`) tanımlı olduğu için `import type` ile doğrudan oradan çekildi (DRY).

`verbatimModuleSyntax: true` gereği tüm tip import'ları `import type` ile güncellendi; mevcut bileşenlerdeki kullanılmayan `lucide-react` import'ları temizlendi.

## Sonuçlar

### Olumlu Etkiler
- **Dosya Boyutları:** `App.tsx` 1208 satırdan ~500 satıra indi; her bileşen 100-250 satır aralığında
- **Test Edilebilirlik:** Her bileşen prop'ları üzerinden izole şekilde test edilebilir hale geldi
- **Type Güvenliği:** `tsc --noEmit` sıfır hata; `verbatimModuleSyntax` zorlaması sayesinde yanlışlıkla `import` ile gelen tipler engellendi
- **Okunabilirlik:** Yeni geliştirici tek bir bileşeni okuyup o alanın tüm davranışını anlayabilir
- **Paralel Geliştirme:** Dört geliştirici farklı bileşenlerde aynı anda çalışabilir (merge conflict azalır)

### Olumsuz Etkiler
- **Prop Drilling:** Bazı callback'ler (`onUseAsPrompt`, `onSelectScene`) kök `App`'ten iki seviye aşağıya aktarılıyor; ileride Context API veya Zustand ile hafifletilebilir
- **İlk Yükleme Maliyeti:** Bileşen sayısı arttıkça Vite bundle ayrıştırması biraz daha fazla HTTP isteği üretebilir (ağ yavaşsa fark edilir)

### Gelecek Planı
- Eğer prop derinliği 3+ seviyeye çıkarsa, ortak state için `useReducer` veya Zustand mağazasına geçiş değerlendirilecek
- Storybook veya Histoire ile bileşen kataloğu kurulup görsel regression testleri eklenebilir
