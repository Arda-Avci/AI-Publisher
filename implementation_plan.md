# Tam Kapsamlı i18n Uyumluluğu ve FFmpeg Coworker Pool Entegrasyonu Planı

Bu plan, sistemin baştan aşağıya çoklu dil (i18n) destekli hale getirilmesini ve FFmpeg işlemlerinin Node.js ana event loop'unu meşgul etmesini önlemek amacıyla dinamik bir "Coworker Pool" (işçi havuzu) yapısına geçirilmesini kapsamaktadır.

## User Review Required
> [!IMPORTANT]
> Mevcut kod tabanında i18n için hem `src/messages` hem de `src/locales` dizinleri bulunuyor. Plan gereği `src/messages` silinip tüm veriler `src/locales` altında birleştirilecek. Ayrıca, backend'deki FFmpeg komutları tamamen `worker_threads` (işçi iş parçacıkları) üzerinden çalıştırılacaktır. Bu değişikliklerin kapsamlı olduğunu unutmayınız.

## Open Questions
> [!WARNING]
> FFmpeg işlemleri (özellikle video parçalama, efekt bindirme) `videoService.ts` içindeki `runFFmpegWithFallback` adlı fonksiyonda yoğunlaşıyor. Bu fonksiyon, şu anda Node.js altında asenkron (execFile ile) çalışsa da, bunu tamamen bir Worker'a (işçi parçacığına) taşıyıp ana Event Loop'un rahatlatılmasını sağlayacağız. Bu taşıma işleminde Worker başına ayrı bir timeout mekanizması (örn: 30 sn) olmasını onaylıyor musunuz? (Şimdilik varsayılan olarak eklendi).

## Proposed Changes

### i18n (Uluslararasılaştırma) Standardizasyonu
- Tüm diller (Türkçe ve İngilizce) için tek bir doğru kaynak (`src/locales/`) kullanılacak. `src/messages/` dizinindeki json verileri `src/locales/tr.json` ile birleştirilecek.
- Express `i18n.ts` middleware'i, sadece `tr` dilini dayatmak yerine `req.session.lang` (veya çerez üzerinden) kullanıcı tercihine bakacak, boş ise **varsayılan olarak Türkçe ('tr')** seçecek.
- Frontend'deki `useLanguage` hook'u güncellenerek seçilen dilin backend'e (`/api/v1/set-language`) bildirilmesi sağlanacak.

### FFmpeg Coworker Pool (İşçi Havuzu)
- **`src/workers/ffmpeg-pool-worker.ts`**: Yeni, evrensel bir FFmpeg Worker dosyası oluşturulacak. Bu dosya sadece `cmd` ve `args` parametrelerini alıp FFmpeg'i çalıştıracak, başarılı olursa parent porta mesaj dönecek.
- **`src/services/videoService.ts`**: `runFFmpegWithFallback` fonksiyonu refaktör edilerek, komutları `execFile` yerine yeni yarattığımız `ffmpeg-pool-worker` aracılığıyla çalıştıracak. Böylece ana thread'deki bellek yükü ve işlem blokajları sıfırlanacak.

---

### Dosya Bazlı Değişiklikler

#### [MODIFY] [i18n.ts](file:///c:/Users/Damla/Proje/AI-Publisher/src/middleware/i18n.ts)
`req.session.lang` üzerinden dil tercihi okuması sağlanacak. Çeviriler `src/locales` klasöründen okunacak.

#### [MODIFY] [server.ts](file:///c:/Users/Damla/Proje/AI-Publisher/src/server.ts)
Dili değiştiren ve session'a kaydeden `/api/v1/set-language` endpoint'i eklenecek.

#### [MODIFY] [useLanguage.ts](file:///c:/Users/Damla/Proje/AI-Publisher/src/hooks/useLanguage.ts)
Dil değiştiğinde sadece `localStorage` değil, backend `/api/v1/set-language` endpoint'ine de istek atılacak.

#### [NEW] [ffmpeg-pool-worker.ts](file:///c:/Users/Damla/Proje/AI-Publisher/src/workers/ffmpeg-pool-worker.ts)
FFmpeg süreçlerini izole eden genel maksatlı işçi thread dosyası.

#### [MODIFY] [videoService.ts](file:///c:/Users/Damla/Proje/AI-Publisher/src/services/videoService.ts)
Mevcut `execFile` mantığı kaldırılarak, işlemlerin Promise sarmalayıcısıyla `ffmpeg-pool-worker`'a postalanması sağlanacak.

## Verification Plan

### Automated Tests
- TypeScript derleme işlemi (`npm run check:types`) ile herhangi bir tip uyuşmazlığı kontrol edilecek.

### Manual Verification
- Arayüzden dil değiştirilip sayfa yenilendiğinde çevirilerin hem arayüzde hem de loglarda o dilde çıkması teyit edilecek.
- Video üretimi (veya demo özgünleştirme) başlatılarak FFmpeg işlemlerinin başarıyla worker thread üzerinden tamamlandığı konsol loglarından doğrulanacak.
