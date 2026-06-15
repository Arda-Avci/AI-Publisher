# AI_PUBLISHER_API_KEY Entegrasyon Düzeltmesi

## Durum
✅ Tamamlandı (14 Haziran 2026)

## Bağlam
AI Publisher ile Sportoto arasındaki API entegrasyonu eksikti. Her iki projede de ortak API anahtarı tanımlı değildi, bu nedenle Sportoto'nun `/discussion/weekly/{week}/publish` endpoint'ine AI Publisher'dan gelen istekler 403 hatası alıyordu.

## Sorun Tespiti

| Proje | Eksik Değişken | Kullanım Yeri |
|-------|---------------|---------------|
| AI Publisher `.env` | `SPORTOTO_API_KEY` | `sportotoBridge.ts:30` → `?api_key=` query param |
| AI Publisher `.env` | `SPORTOTO_API_URL` | `sportotoBridge.ts:29` → base URL (fallback: `http://localhost:8000/api/v1`) |
| Sportoto `.env` | `AI_PUBLISHER_API_KEY` | `predictions.py:547` → `getattr(settings, "AI_PUBLISHER_API_KEY", None)` |
| Sportoto `.env` | `AI_PUBLISHER_BASE_URL` | `config.py:107` — tanımlı ama kullanılmıyor (callback için rezerve) |

## İletişim Akışı

```
AI Publisher                              Sportoto
  │                                          │
  │  GET /discussion/weekly/{week}/publish   │
  │  ?api_key=JtACImapj...                   │
  │ ──────────────────────────────────────►   │
  │                                          │── validate api_key == AI_PUBLISHER_API_KEY
  │                                          │
  │  { title, utterances[], ... }            │
  │ ◄──────────────────────────────────────  │
```

- `sportotoBridge.ts` → `api_key` query param gönderir
- `predictions.py` → `AI_PUBLISHER_API_KEY` ile karşılaştırır
- Alternatif: admin JWT (browser'dan manuel tetikleme)

## Yapılan Değişiklikler

### 1. AI Publisher `.env` (sonuna eklendi)
```env
# Sportoto Entegrasyonu
SPORTOTO_API_URL=http://localhost:8000/api/v1
SPORTOTO_API_KEY=JtACImapj9ucwG1FErx2Bg8kvzKPQiZV
```

### 2. AI Publisher `.env.example` (sonuna eklendi)
```env
# Sportoto Entegrasyonu
SPORTOTO_API_URL=http://localhost:8000/api/v1
SPORTOTO_API_KEY=your_sportoto_api_key_here
```

### 3. Sportoto `.env` (Telegram bölümünden sonra eklendi)
```env
# AI Publisher Entegrasyonu
AI_PUBLISHER_API_KEY=JtACImapj9ucwG1FErx2Bg8kvzKPQiZV
AI_PUBLISHER_BASE_URL=http://localhost:3016
```

### 4. Sportoto `.env.example` (sonuna eklendi)
```env
# AI Publisher Entegrasyonu
AI_PUBLISHER_API_KEY=your_ai_publisher_api_key_here
AI_PUBLISHER_BASE_URL=http://localhost:3016
```

### 5. Sportoto `predictions.py` — hata mesajı iyileştirme (satır 552-558)
- `AI_PUBLISHER_API_KEY` boşsa log warning basar
- Hata mesajı API key'in tanımlı olup olmamasına göre değişir

### 6. AI Publisher `sportotoBridge.ts` — hata mesajı iyileştirme (satır 38-40)
- `SPORTOTO_API_KEY` boşsa log warning basar

## Kullanılan Anahtar
```
AI_PUBLISHER_API_KEY / SPORTOTO_API_KEY = JtACImapj9ucwG1FErx2Bg8kvzKPQiZV
```
32 karakter alfanumerik, her iki `.env` dosyasında aynı değer kullanıldı.

## Doğrulama

| Kontrol | Durum |
|---------|-------|
| AI Publisher `.env`'de SPORTOTO_API_KEY tanımlı | ✅ |
| AI Publisher `.env`'de SPORTOTO_API_URL tanımlı | ✅ |
| AI Publisher `.env.example` güncellendi | ✅ |
| Sportoto `.env`'de AI_PUBLISHER_API_KEY tanımlı | ✅ |
| Sportoto `.env`'de AI_PUBLISHER_BASE_URL tanımlı | ✅ |
| Sportoto `.env.example` güncellendi | ✅ |
| Anahtarlar eşleşiyor | ✅ |
| predictions.py warning + hata mesajı iyileştirildi | ✅ |
| sportotoBridge.ts warning eklendi | ✅ |

## Önceden Var Olan Bug (Bu işle ilgili değil)
`predictions.py` satır 518-528 (`generate_weekly_discussion` fonksiyonu):
`try:` bloğu `except` bloklarından kopuk — `return discussion` satır 528'de `try` içinde ama satır 586'daki `except ValueError` fonksiyon dışında kalmış.
Bu bug `@app.post` endpoint'inde, `@router.get` endpoint'i (`get_weekly_discussion_publish`) etkilenmez.
