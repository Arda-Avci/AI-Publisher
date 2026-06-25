# iyzico Ödeme Entegrasyonu — Yapılacaklar

## ✅ Tamamlananlar (25 Haziran 2026)

- [x] **Aşama 1:** `.env` iyzico değişkenleri eklendi, `subscriptions` DB tablosu oluşturuldu
- [x] **Aşama 2:** Webhook idempotency (`isTokenProcessed`) — token bazlı tekrar işleme engeli
- [x] **Aşama 3:** `GET /api/v1/subscriptions/status` + `POST /api/v1/subscriptions/cancel` (iyzico + local iptal)
- [x] **Aşama 4:** 5 paket kartı (basic/pro/enterprise/sub_silver/sub_gold), abonelik durum göstergesi, iptal butonu
- [x] **TypeScript:** 0 hata, **Lint:** 0 hata, **Test:** 27/27 pass

## 🔧 .env Konfigürasyonu

```env
# iyzico API (sandbox → production)
IYZICO_API_KEY=sandbox-...     # iyzico merchant panel'den al
IYZICO_SECRET_KEY=sandbox-...  # iyzico merchant panel'den al
IYZICO_BASE_URL=https://sandbox-api.iyzipay.com

# Abonelik plan kodları (iyzico merchant panel'de oluştur)
IYZICO_PLAN_SILVER=sandbox-silver-plan
IYZICO_PLAN_GOLD=sandbox-gold-plan

# Webhook callback için PUBLIC_URL (localtunnel/ngrok/domain)
PUBLIC_URL=http://localhost:3010
```

## ✅ Manuel Test Adımları

### 1. iyzico Merchant Panel Kurulumu
- [ ] Sandbox hesap oluştur: https://sandbox-merchant.iyzipay.com
- [ ] API Anahtarları (API Key + Secret Key) al
- [ ] Abonelik planları oluştur:
  - `silver-plan`: 299 TL/ay, aylık 300 kredi
  - `gold-plan`: 799 TL/ay, aylık 1000 kredi

### 2. Backend Test
- [ ] `.env`'ye iyzico sandbox anahtarlarını ekle (`IYZICO_API_KEY`, `IYZICO_SECRET_KEY`)
- [ ] Sunucuyu başlat: `npm run dev`
- [ ] Sandbox test kartıyla checkout dene:
  ```
  POST /api/v1/payments/checkout
  Body: { "packageId": "pro" }
  ```
- [ ] Webhook callback URL'inin PUBLIC_URL üzerinden erişilebilir olduğunu doğrula (ngrok/localtunnel gerekli)
  ```
  POST /api/v1/payments/webhook?userId=1&credits=250&isSub=false
  Body: { "token": "..." }
  ```

### 3. Frontend Test
- [ ] Dashboard'da kredi rozetine tıkla → modal açılmalı
- [ ] 5 kart görünmeli: Başlangıç (50) / Profesyonel (250) / Kurumsal (1000) / Gümüş Abonelik / Altın Abonelik
- [ ] Herhangi bir pakete tıkla → iyzico iframe yüklenmeli
- [ ] Abonelik durumu gösterilmeli (aktifse "İptal Et" butonu, değilse "aktif abonelik yok" mesajı)
- [ ] iyzico sandbox kartıyla ödeme dene:
  - Kart no: `5528790000000008`
  - Son kullanma: `12/26`
  - CVV: `123`
  - 3D Secure: varsa `112233` onay kodu
- [ ] Ödeme başarılı → toast "Ödeme başarılı!" → kredi rozeti güncellenmeli
- [ ] Ödeme başarısız → toast "Ödeme başarısız oldu."
- [ ] Abonelik iptal testi: "İptal Et" → confirm → abonelik iptal bildirimi

### 4. iyzico Test Kartları (Sandbox)
| Kart No | Marka | Tip | 3D |
|---------|-------|-----|-----|
| 5528790000000008 | MasterCard | Kredi | Destekler |
| 4157920000000001 | Visa | Kredi | Destekler |
| 4546710000000005 | Visa | Kredi | Desteklemez |
| 5456160000000004 | MasterCard | Kredi | Desteklemez |

### 5. Production Geçiş
- [ ] Production API anahtarlarını `.env`'ye ekle
- [ ] IYZICO_BASE_URL=https://api.iyzipay.com
- [ ] Gerçek abonelik plan kodlarını gir
- [ ] PUBLIC_URL'i production domain'i ile değiştir
- [ ] Canlı kartla test et

## 🔜 Gelecek İyileştirmeler
- [ ] Kredi blokajı: render başlangıcında `deductCredits`, iptalde `refundCredits`
- [ ] Kredi yetmezse proje formunu kilitle
- [ ] Ödeme geçmişi sayfası (tüm işlem geçmişi)
- [ ] Abonelik yenileme cron job (expired → status='expired')
