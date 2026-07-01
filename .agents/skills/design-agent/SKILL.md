---
name: design-agent
description: "Mevcut projenin sayfalarını analiz ederek dark luxury ve premium standartlarda alternatif tasarımlar üreten ve bunları işlevsel koda zarar vermeden uyarlayan tasarım ajanı."
---

# Tasarım Ajanı (Design Agent) Yönergeleri

Bu beceri (skill), AI-Publisher projesindeki tüm kullanıcı arayüzlerinin "dark luxury" ve "editorial" tasarım standartlarına uygun şekilde modernleştirilmesini, benzer premium web sitelerinin sayfa düzenlerinin araştırılmasını, alternatif tasarımlar üretilmesini ve onay sonrası entegrasyonunu yönetir.

---

## 🎨 Tasarım Standartları & Görsel Kimlik

Tasarım yaparken daima `Tasarım_Standartlari.md` kurallarına sadık kalınmalıdır:

1. **Tema Altyapısı ve Renk Paleti:**
   - **Tema Uyumluluğu:** Ajan, projenin mevcut CSS değişkenlerini (`var(--background)`, `var(--foreground)`, `var(--card)`, `var(--primary)`, `var(--border)` vb.) kullanmalı ve korumalıdır. Böylece kullanıcı dilediğinde temayı değiştirebilmelidir.
   - **Default Tema Üzerinde Değişiklik:** Ajan, default tema renkleri üzerinde premium değişiklikler yaparken, bu değişiklikleri CSS değişkenlerini scoped olarak ezerek veya esnek değişken eşlemeleriyle uygulamalıdır.
   - **Kullanıcının Değiştiremeyeceği Sabit Premium Alanlar:** Altın rengi vurgular (örn: `#D4AF37`, `#C5A880`), ince şeritler, premium marka logoları, özel kenarlık çizgileri (`border-top` gold line) ve özel hover efektleri gibi alanlar, kullanıcının tema değişikliklerinden etkilenmeyecek şekilde sabit renk kodlarıyla korunmalıdır. Tasarım bu altın detaylarla boğulmamalıdır!


2. **Tipografi (Editorial):**
   - **Başlıklar:** `Cormorant Garamond` (Zarif, şık, editorial, tırnaklı yazı tipi)
   - **Gövde Metinleri & Butonlar:** `Manrope` (Temiz, okunabilir, modern tırnaksız yazı tipi)
   - **Buton ve Etiketler:** Uppercase ve hafif artırılmış letter-spacing (`letter-spacing: 0.05em` veya `0.1em`).

3. **Görsel Tercihler:**
   - Jenerik AI çıktısı gibi görünen aşırı gradient, glow (parlama), yoğun glassmorphism ve aşırı yuvarlatılmış köşelerden kaçınılmalıdır.
   - Tasarımlar sakin, nefes alan (yeterli white-space), minimalist ve pahalı hissettirmelidir.
   - Masaüstünde sinematik ve derinlikli bir deneyim sunulmalı, mobilde ise Premium görünüm korunarak sadeleştirilmiş responsive düzen uygulanmalıdır.
   - Mikro animasyonlar, yumuşak scroll reveal (kaydırarak ortaya çıkma) efektleri ve yumuşak geçişler (`transition: all 0.3s ease`) kullanılmalı, ancak site animasyona boğulmamalıdır.

---

## 🔄 Çalışma Adımları

Tasarım Ajanı her sayfa için şu 4 aşamalı döngüyü takip eder:

### 1. Aşama: Sayfa Analizi
- Hedef sayfanın (örn: `LandingPage.tsx`) kod yapısı, mevcut JSX elementleri ve ilişkili CSS kuralları taranır.
- Sayfanın üstlendiği fonksiyonlar (state, handler, form submit, api çağrıları) listelenir.
- **KURAL:** Fonksiyonel çalışan JS/TS koduna (React state, effect ve methodlar) kesinlikle dokunulmayacak, sadece stil ve HTML/JSX yerleşimi modifiye edilecektir.

### 2. Aşama: İnternet Araştırması ve İlham
- Benzer SaaS, AI Video ve yaratıcı stüdyo projelerinin (örn: Runway, Sora, ElevenLabs, Midjourney, Figma veya üst düzey portföy siteleri) sayfa düzenleri, trendleri ve geçiş efektleri araştırılır.
- Premium web tasarım trendlerinden ilham alınarak tasarım notları çıkarılır.

### 3. Aşama: Alternatif Tasarım Önerileri Hazırlama
- Analiz ve araştırmalar ışığında en az **2 farklı alternatif tasarım teklifi** hazırlanır.
- Teklifler `design_proposals.md` veya ilgili sayfanın teklif dosyasında şu formatta sunulur:
  - **Alternatif A (Örn: Sinematik & Video Odaklı Minimalizm):** Ayrıntılı layout, tipografi detayları, animasyonlar ve CSS yapısı.
  - **Alternatif B (Örn: Editorial Grid & Derinlik):** Farklı bir yerleşim düzeni, kart yapıları ve geçiş stilleri.
- Tasarım mockup'ları veya planları şematik olarak gösterilir.

### 4. Aşama: Onay ve Uygulama
- Kullanıcı alternatiflerden birini seçip onay verdiğinde, `apply_design.js` veya manuel yöntemle onaylanan tasarımın TSX ve CSS dosyaları güncellenir.
- Uygulama sonrası `npm run check:types` ile tip güvenliği ve uygulamanın derlenebilirliği doğrulanır.

---

## ⚠️ Kritik Kurallar ve Sınırlar

- **ASLA MOCK KULLANMA:** Tasarımlarda gerçek veri yapılarını, API isteklerini ve dinamik özellikleri mock'lamayın. Mevcut çalışan backend entegrasyonu aynen korunmalıdır.
- **RESPONSIVE ZORUNLULUĞU:** Tüm tasarımlar mobil öncelikli veya en azından mobil cihazlarda kırılmayacak şekilde (`@media`) esnek tasarlanmalıdır.
- **KORUNAN ALANLAR:** Bileşenlerin içerdiği `onClick`, `onChange`, `onSubmit`, `useRef`, `useContext` ve API hook'ları gibi işlevsel tetikleyiciler değiştirilmemeli, isimleri korunmalıdır.
- **CSS AD ALANLARI (NAMESPACE):** Global çakışmaları önlemek için her sayfa tasarımında o sayfaya özel CSS sınıfları (Örn: `.premium-landing-hero`, `.premium-login-card`) türetilmeli ve global `index.css` dosyasında sadece bu sayfaya has scoped veya namespace kuralları yazılmalıdır.
