# ADR-003: FFmpeg Çağrılarının Worker Threads (Coworker Pool) Üzerinden İzole Edilmesi

## Durum
Kabul Edildi (Sprint 6, 12 Haziran 2026)

## Bağlam
`src/services/videoService.ts` video üretim hattının merkezindedir ve ffmpeg/ffprobe çağrılarını doğrudan `child_process.execFile` ile ana event loop üzerinde çalıştırıyordu. Bu yaklaşım:
- **Event Loop Blokajı:** Tek bir video 6 saniyelik mikro parçalara bölünse de 50+ parçalı sahnelerde `ffmpeg` çıktısı parse edilirken ana döngü duruyor; SSE broadcast'leri gecikiyor
- **Timeout Riski:** 30+ saniyelik render işlemlerinde varsayılan Node.js HTTP timeout'ları tetiklenebiliyor
- **Bellek Sızıntısı:** `child_process.execFile` çıktılarını bellekte biriktiren callback pattern'i uzun işlemlerde yığın (heap) baskısı yaratıyor
- **Eşzamanlılık Sorunu:** `ffmpeg` çalışırken Express route'ları donuyor; admin paneli ve SSE yayınları takılıyordu

## Karar
Tüm ffmpeg/ffprobe çağrıları `worker_threads` üzerinden yürütülecek şekilde yeniden tasarlandı:

1. **`runInWorker<T>()` yardımcısı:** `src/services/videoService.ts` içinde tanımlandı. `workerData` ile komut + argüman + zaman aşımı alıyor; mesaj dinleyerek sonuç döndürüyor
2. **`runFFmpeg()` sarmalayıcı:** Tek komut için standartlaştırılmış Promise arayüzü (stdout/stderr döndürür, hata/timeout fırlatır). Varsayılan 30 sn zaman aşımı korundu
3. **`runFFmpegWithFallback` basitleştirildi:** 30+ satırlık manuel Worker yönetimi, basit `runFFmpeg` döngüsüne indirildi
4. **Geliştirme/Üretim Ayrımı:** `.ts` kaynak dosyası dev/test ortamında `eval` ile yüklenir; üretimde derlenmiş `.js` dosyası kullanılır
5. **Tüm `execFile` Çağrıları Taşındı:** `ensurePingSound`, `addCalloutPings`, `generateEndScreenImage`, `applyEndScreen`, `getVideoDuration`, `applyBrandKit` artık `runFFmpeg` üzerinden çalışıyor

## Sonuçlar

### Olumlu Etkiler
- **Ana Thread Serbest:** HTTP istekleri, SSE broadcast'leri ve diğer Express route'ları ffmpeg çalışırken bloke olmuyor
- **Timeout Koruması:** Her worker kendi `SIGKILL` zaman aşımıyla donanımlı; bellek sızıntısı riski minimize edildi
- **Hata İzolasyonu:** Worker çökse bile ana süreç etkilenmiyor; hata yalnızca çağıran Promise'e reject olarak yansıyor
- **Test Edilebilirlik:** 42/42 vitest testi geçti, tüm video yönetimi fonksiyonları worker üzerinden çağrıldığı için yan etki gözlemlenmedi

### Olumsuz Etkiler
- **Worker Başlatma Maliyeti:** Her çağrı yeni bir Worker thread'i açıyor (~30-50 ms); sık çağrılar için bir worker havuzu (`WorkerPool`) sınıfı ileride değerlendirilebilir
- **Dev Ortamında `ts-node` Bağımlılığı:** `eval` yükleyicisi için `ts-node` runtime'da gerekli; bu zaten testlerde kullanıldığı için pratik bir sorun yaratmadı
- **Hata Mesajı Geçişleri:** Worker'da oluşan stderr artık ana sürece `parentPort.postMessage` ile taşınıyor; hata ayıklama için worker loglarını incelemek gerekebilir

### Gelecek Planı
- Worker havuzu (WorkerPool) ile ısınma (warmup) ve bağlantı yeniden kullanımı eklenebilir
- Worker'lar için `perf_hooks` ile her ffmpeg çağrısının süresi ölçülüp metrik toplanabilir
- Çoklu video paralel işleme (örn. 4 ffmpeg aynı anda) için `Promise.all` + Worker havuzu birleştirilebilir
