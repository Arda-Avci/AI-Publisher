# Kullanıcının Proje Geliştirme Sürecindeki Promptları ve Talimatları

Bu dosya, projeyi geliştirirken verdiğim temel mimari kararların, sistem tasarım kurallarının ve yapay zekaya (Cursor/IDE) verdiğim çalışma direktiflerinin (promptlarımın) kalıcı kaydıdır.

## 1. Veri Gerçekliği ve Hata Yönetimi Kuralları
- "Mock data kesinlikle yok, tekrar tekrar söylüyorum, tüm işlemler gerçek sonuçlarla yapılacak."
- "Hayır, gerçek işlem yapacağız, hatayı yakalayıp çözmemiz gerekiyor, daha önce iki kere söyledim yapmadın; append_extract.ts dosyasını düzelterek devam et."
- "Youtube api keyimiz var, onu kullanalım, hata dönerse api keysiz methoda fallback yapalım."

## 2. Arayüz (UI) ve Dil Kuralları (i18n)
- "Start Production butonunun altına RabbitMq kuyruğunu gösteren bir alan koyalım otomatik scroll yapsın, otomatik güncellensin (her adımda)."
- "Sayfayı Türkçeye çevir, tüm alt sayfalar ile birlikte (benim ingilizce olsun talebim olmamıştı)."
- "Kodda hardcoded metin kalmasın hepsi yer tutucular ile değiştirilsin, tüm yer tutucuların en.json ve tr.json dosyalarında karşılığı olduğunu doğrula."
- "Agentic yapı kullan, tüm promptlarımı prompts.md ye kaydet."

## 3. Otonom İş Akışı ve Özgünleştirme Mantığı
- "Mantık hatan var, birincisi fırsatlar hunisinden video bulunup özgünleştir dediğimizde ilgili video ve transcripti birlikte indirilmeli, transcript istenen dile çevirilmeli, sonrasında yeni video için ilgili promptlar otomatik olarak ilgili alanlara yazılmalı, kullanıcı yeni metni değiştirebilmeli (metin için bir alan eklenebilir)."
- "İlgili videodan çıkartılan ilk frame ve videoda yeni üretim süreci için colab sunucusuna gönderilmeli."
- "Kullanıcı tüm kontrollerini ve değişikliklerini yapıp production onayı verdiğinde iş kuyruğa atılmalı ve colab sunucusu otomatik olarak başlatılmalı (önce bağlantı kontrolü yapılmalı ve bağlantı sağlanamıyorsa bilgi verilmeli, bağlantı sağlandıktan sonra colab sunucu başlatılıp çalıştığı doğrulanmalı, bir hata oluşursa colab bize bildirim göndersin)."
- "Video üretimi için gerekli olan tüm materyal ve prompt bilgisi colab sunucusuna gönderilmeli."

## 4. RabbitMQ Paralel Kuyruk ve Colab Yaşam Döngüsü
- "Kuyruk bittiğinde kapatılmalı ama bu da paralel kuyruk işlemeyi gerektirir, birinci iş colaba gönderildiğinde ikinci işteki video bizim tarafımızda işleme alınmış olmalı, colab birinci işi bitirir bitirmez hemen kuyruktaki ikinci işe (onaylanmış işe) geçmemiz gerekir, bu süreç kuyruktaki tüm işler için tekrarlanacak, kuyruk bitiminde colab kapatılacak."
- "Colab ilk start sırasında kullanıcıya durumla ilgili bilgi verilecek. Her aşamada durumla ilgili bilgi verilecek."

## 5. Video Sonuçları ve Yeniden Deneme (Retry) Döngüsü
- "Colab tarafından indirilen nihai video ilgili işe eklenmeli ve kullanıcı oynatıp beğenmezse yeniden dene butonuna basarak tüm bilgilerin forma otomatik olarak yüklenmesini sağlayacak, prompt yada metin yada görselleri değiştirip tekrar kuyruğa atabilecek."
- "Mevcut kuyruğu silelim, bu yapı temiz bir kuyrukla başlasın."
- "Yapılacaklarda hangi aşamadayız bana her adımda türkçe bilgilendirme dön."