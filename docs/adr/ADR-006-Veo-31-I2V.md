# ADR-006: Veo 3.1 Image-to-Video Entegrasyonu

## Status
Kabul Edildi

## Baglam
Mevcut video pipeline acik kaynak modellerle (CogVideoX, Wan, LTX) calisiyor. Kullanici
Google Veo 3.1 I2V API'sini opsiyonel modelType olarak eklemek istiyor. Veo 3.1 ticari
bir API (Vertex AI), bu nedenle:

- Pipeline akisi degismiyor: prompt+image → Veo → video output
- Model tipi mevcut 23 modelin yanina ekleniyor
- API anahtari `.env`'den okunuyor
- Kredi maliyeti API fiyatlandirmasina gore belirleniyor (digerlerinden yuksek)

## Karar
1. `src/services/veo31.ts` — Google Vertex AI Veo 3.1 API client'i
   - `generateVideo(prompt, imageUrl)` → polling → `{ videoUrl, duration }`
   - REST API (Vertex AI) uzerinden calisir
   - Istek basina 30sn timeout, 5dk polling
2. Mevcut modelType pattern'ine eklenir:
   - `production_template = 'veo31'` → `modelType = 'Veo-31'`
   - creditService.ts MODEL_COSTS'a eklenir
   - dashboard select, locales, validation guncellenir
3. RunPod uzerinden degil, **direkt Vertex AI API** cagrisi yapilir
   - `.env`'de `GOOGLE_VEO_API_KEY` ve `GOOGLE_VEO_LOCATION` degiskenleri
   - Vertex AI SDK veya REST kullanilir

## Sonuclar
### Olumlu
- Google'in en iyi video modeline erisim
- Mevcut pipeline ile uyumlu (sadece yeni bir modelType)
- Hizli implementasyon (API wrapper + config)

### Olumsuz
- API ucretli (dakika basina ~$0.40)
- Vertex AI bagimliligi (Google cloud hesabi gerekir)
- API rate limit ve quota yonetimi gerekir
