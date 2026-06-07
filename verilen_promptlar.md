# Kullanıcı Tarafından Verilen Promptlar (Talimatlar)

Bu dosya, geliştirme süreci boyunca yapay zekaya (Cursor/IDE) verilen tüm talimatların (promptların) eksiksiz ve kronolojik bir kaydıdır. Bundan sonraki tüm komutlar da buraya eklenecektir.

1. "Hayır, gerçek işlem yapacağız, hatayı yakalayıp çözmemiz gerekiyor, daha önce iki kere söyledim yapmadın; append_extract.ts dosyasını düzelterek devam et"
2. "mock data kesinlikle yok, tekrar tekrar söylüyorum, tüm işlemler gerçek sonuçlarla yapılacak"
3. "Youtube api keyimiz var, onu kullanalım, hata dönerse api keysiz methoda fallback yapalım"
4. "Start Production butonunun altına RabbitMq kuyruğunu gösteren bir alan koyalım otomatik scroll yapsın, otomatik güncellensin (her adımda), sayfayı Türkçeye çevir, tüm alt sayfalar ile birlikte (benim ingilizce olsun talebim olmamıştı)"
5. "codda hardcoded metin kalmasın hepsi yer tutucular ile değiştirilsin, tüm yer tutucuların en.json ve tr.json dosyalarında karşılığı olduğunu doğrula, agentic yapı kullan, tüm promptlarımı prompts.md ye kaydet, append_extract.ts dosyasını düzelterek başla"
6. "Bu hataları giderelim, neden api key hatası alıyoruz açıkla..."
7. "Mantık hatan var, birincisi fırsatlar hunisinden video bulunup özgünleştir dediğimizde ilgili video ve transcripti birlikte indirilmeli, transcript istenen dile çevirilmeli, sonrasında yeni video için ilgili promptlar otomatik olarak ilgili alanlara yazılmalı, kullanıcı yeni metni değiştirebilmeli (metin için bir alan eklenebilir), ilgili videodan çıkartılan ilk frame ve videoda yeni üretim süreci için colab sunucusuna gönderilmeli, kullanıcı tüm kontrollerini ve değişikliklerini yapıp production onayı verdiğinde iş kuyruğa atılmalı ve colab sunucusu otomatik olarak başlatılmalı (önce bağlantı kontrolü yapılmalı ve bağlantı sağlanamıyorsa bilgi verilmeli, bağlantı sağlandıktan sonra colab sunucu başlatılıp çalıştığı doğrulanmalı, bir hata oluşursa colab bize bildirim göndersin, video üretimi için gerekli olan tüm materyal ve prompt bilgisi colab sunucusuna gönderilmeli (bu aşamada tip uyuşmazlığı vb olmaması için gerekiyorsa colab..."
8. "promptlarımı kaydederek başla"
9. "kuyruk bittiğinde kapatılmalı ama bu da paralel kuyruk işlemeyi gerektirir, birinci iş colaba gönderildiğinde ikinci işteki video bizim tarafımızda işleme alınmış olmalı, colab birinci işi bitirir bitirmez hemen kuyruktaki ikinci işe (onaylanmış işe) geçmemiz gerekir, bu süreç kuyruktaki tüm işler için tekrarlanacak, kuyruk bitiminde colab kapatılacak. Colab ilk start sırasında kullanıcıya durumla ilgili bilgi verilecek. Her aşamada durumla ilgili bilgi verilecek."
10. "Colab tarafından indirilen nihai video ilgili işe eklenmeli ve kullanıcı oynatıp beğenmezse yeniden dene butonuna basarak tüm bilgilerin forma otomatik olarak yüklenmesini sağlayacak, prompt yada metin yada görselleri değiştirip tekrar kuyruğa atabilecek. Mevcut kuyruğu silelim, bu yapı temiz bir kuyrukla başlasın"
11. "bu amaçla sayfaya video previewer da eklenmeli"
12. "tüm promptlarımı kaydet, yapılacaklarda hangi aşamadayız bana her adımda türkçe bilgilendirme dön"
13. "promptlarımı kaydet, nesini anlamadın bu cümlenin"
14. "sunucu şuan çalışmıyor gibi görünüyor, bu arada bu uygulamanın portunu 3016 olarak sabitleyelim, başka bir proje 3010 portundan çalışıyor, çakışma olmasın, tüm gerekli değişiklikleri yapıp, sunucuyu başlat"
15. "sana verdiğim tüm promptlarımı verilen_promptlar.md dosyası oluşturup o dosyaya kaydet, hepsini ve eksiksiz, bundan sonraki her prompt için de bu işlemi yap."
16. "transkripti youtubedan alamıyorsak, kendimiz videodan üretelim"
17. "git push yapalım, hover modalı videonun üst tarafında görüntülensin"
18. "4 emin misin? (1)"

19. "sqlite veri tabanı bağımlılığı kalmış olmasın, tüm işlemler için postgresql + redis + rabbitmq mantığı kullanılmalı, tüm kodu agentic yapı ile kontrol et"