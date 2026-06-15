# Faz 3: Split Screen & Color Suite

**Süre:** Hafta 3-4
**Bağımlılık:** Track 3A ← 2A, Track 3B/3C bağımsız (Grup 1'de paralel başlar)
**Kapsam:** Job-2 (Split Screen + MuseTalk), Job-4 (Cut & Color Agent)
**Paralel Track:** 3

---

## Track 3A — Task State Machine + Rollback

**Referans:** WeiMeng (modüler multi-agent workflow, PostgreSQL state management, rollback)

### Yapılacaklar
- [ ] Queue'ya formal state machine ekle: pending→planning→fetching→generating→composing→publishing
- [ ] Her state için hata/rollback handler
- [ ] DB'de task state log tablosu
- [ ] Task graph visualizer (dashboard)
- [ ] İş bazında retry policy (max retry, exponential backoff)
- [ ] Dead letter queue (başarısız işleri bekleme)

### Yeni Dosyalar
```
src/services/taskManager/
├── stateMachine.ts          (state machine)
├── taskLogger.ts            (state loglama)
├── retryPolicy.ts           (yeniden deneme)
├── deadLetter.ts            (başarısız iş yönetimi)
└── types.ts
```

### Mevcut Dosyalar
- `src/queue.ts` — **genişletilir** (state machine entegre olur)
- `src/db.ts` — yeni tablo/tip eklenir
- `src/views/dashboardScripts.ts` — visualizer UI

### Değişiklik Seviyesi: Minor (mevcut yapıyı formalize eder)

---

## Track 3B — A/B Split Screen + MuseTalk Avatar (Job-2)

**Referans:** SaarD00/AI-Youtube-Shorts-Generator, mevcut Faz C, MuseTalk self-hosted

### Yapılacaklar
- [ ] **FFmpeg vstack:** Üstte AI video + altta Minecraft/ASMR layout (Job-2.1)
- [ ] **MuseTalk avatar bindirme:** HeyGen/Tavus yerine Colab'da self-hosted MuseTalk (Job-2.2)
- [ ] Mevcut Wav2Lip + MuseTalk kombinasyonu lip-sync
- [ ] **Seçilebilir split oranları:** 70/30, 50/50, 60/40 (Job-2.3)
- [ ] **Dashboard preview:** Split config UI (Job-2.4)
- [ ] xfade transition ile geçişler
- [ ] Silence removal (boşlukları otomatik kırp)

### Mevcut Altyapı
| Bileşen | Durum | İhtiyaç |
|---|---|---|
| FFmpeg vstack | ❌ Yeni | Sıfırdan yazılacak |
| MuseTalk Colab | ❌ Yeni | Pipeline kurulumu |
| Wav2Lip | ✅ Mevcut | Zaten entegre |
| Split oranları UI | ❌ Yeni | Frontend |
| Dashboard preview | ❌ Yeni | Frontend |

### Yeni Dosyalar
```
src/services/splitScreen/
├── splitRenderer.ts         (vstack layout)
├── avatarInjector.ts        (MuseTalk overlay)
├── silenceRemover.ts        (boşluk kırpma)
└── types.ts
colab_server.py              (MuseTalk lazy-load endpoint)
```

### Mevcut Dosyalar
- `src/services/videoService.ts` — split screen filtresi eklenir
- `client/src/components/ClipperPanel.tsx` — split config UI
- `client/src/components/ProjectForm.tsx` — split mode checkbox'ı

### Değişiklik Seviyesi: Patch (planlanmış özelliğin tamamlanması)

---

## Track 3C — Cut & Color Agent (Job-4)

**Referans:** auto-editor, mevcut `src/services/colorGrader.ts`

### Yapılacaklar
- [ ] **Sessizlik/Hareketsizlik Kesici:** Konuşma boşluklarını ve hareketsiz kareleri FFmpeg ile otonom kırp (Job-4.1)
- [ ] **Doğal Dil Renklendirme:** "sıcak sinematik tonlar", "neon mor" gibi komutlarla `colorbalance`/`eq` ayarla (Job-4.2)
- [ ] **Dinamik LUT:** `.cube` dosyalarını yükle ve uygula (Job-4.3)
- [ ] **Renk Önizleme:** AI asistan panelinden canlı önizleme (Job-4.4)

### Mevcut Altyapı
| Bileşen | Durum | İhtiyaç |
|---|---|---|
| `colorGrader.ts` | ✅ Mevcut | Queue/UI bağla |
| `chatToEdit.ts` | ✅ Mevcut | 14 opsiyon var |
| FFmpeg eq/colorbalance | ✅ Mevcut | Queue wrapper |
| LUT .cube yükleme | ❌ Yeni | Colab endpoint |
| Renk önizleme UI | ❌ Yeni | Frontend |

### Yeni Dosyalar
```
src/services/silenceCutter/
├── silenceDetector.ts       (FFmpeg silences + motion)
├── autoCutter.ts            (kesme + birleştirme)
└── types.ts
```

### Mevcut Dosyalar
- `src/services/colorGrader.ts` — queue bağlanır, LUT endpoint eklenir
- `src/services/chatToEdit.ts` — NL color intent genişletilir
- `client/src/components/ColorGraderPanel.tsx` — zaten var, canlı önizleme eklenir

### Değişiklik Seviyesi: Patch (mevcut servislerin bağlanması)
