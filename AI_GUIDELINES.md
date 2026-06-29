# 🤖 AI_GUIDELINES.md — Gelişmiş Yapay Zeka Çalışma ve Token Optimizasyon Kuralları

## 📋 Dosya Bilgisi
| Alan | Değer |
| :--- | :--- |
| Versiyon | 2.0.0 |
| Durum | Katı Değişmez Yönetmelik |
| Kapsam | Tüm LLM Ajanları (Cursor, Claude Code, Windsurf) |

---

## 1. Bilişsel Hiyerarşi ve Bağlam Önbelleğe Alma (Context Caching)
Model attention (dikkat) havuzunun dağılmasını önlemek ve girdi token maliyetlerini %90 oranında düşürmek için tüm konuşma akışı **Statikten Dinamiğe** deterministik hiyerarşiye uymak zorundadır. Bağlam yapısı asla bozulmamalıdır:
1. **System Prompt & Katı Kurallar** (Asla değişmez - %100 Önbellek)
2. **Veritabanı Şemaları & API Kontratları** (Sabit Referans - %100 Önbellek)
3. **Proje Yapı Kuralları (`AI_GUIDELINES.md`)** (Sabit Referans)
4. **Mevcut Durum / Canlı Hafıza (`Memory_Bank.md`)** (Sadece her adım sonunda güncellenir)
5. **Kullanıcı Girdisi ve Dinamik Hata Logları** (En sonda yer alır - Önbelleğe alınmaz)

---

## 2. Diferansiyel Kod Üretimi (Unified Diff Zorunluluğu)
* **Katı Kural:** 50 satırı geçen hiçbir kod dosyasını baştan aşağı yeniden yazma. Çıktı token tüketimini minimumda tutmak ve üretim hızını artırmak için yalnızca `Git Unified Diff` formatında çıktı üret.
* **diff.md Loglama:** Her büyük değişiklik (50+ satır) sonrası unified diff `diff.md` dosyasına yazılır. Amaç: git diff'e gerek kalmadan en son değişiklikleri tek dosyada görmek.
* **Biçimlendirme Formatı:**
```diff
@@ -24,4 +24,5 @@ src/services/modelPromptBuilder.ts
 function OrderService() {
 -   const data = db.getOrders();
 +   const data = await db.getOrdersCached();
    return data;
 }
```
* **diff.md Dosya Yapısı:**
  ```
  # Diff Log — 2026-06-29
  
  ## commit <hash>
  @@ -satır,satır +satır,satır @@ dosya.ts
   ...
  ```
* **Temizlik:** `diff.md` birikmeye devam eder. Eski girişler silinmez, üzerine yeni girişler eklenir.