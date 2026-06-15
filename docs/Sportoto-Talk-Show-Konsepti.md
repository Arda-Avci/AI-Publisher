# Büyük Resim: "Top Yuvarlak AI" Talk-Show Konsepti (Sportoto Entegrasyonu)

Bu doküman, sistemin sadece bir video klonlama aracı olmasının ötesine geçerek, 2026 Dünya Kupası başta olmak üzere küresel spor ve viral içerik pazarını domine edecek özgün formatın konsept planlamasıdır. 

İleride geliştirilecek olan bu otonom talk-show sistemi, birden fazla YZ modelinin farklı "persona"lara bürünerek birbiriyle tartıştığı ve analiz yaptığı bir medya fabrikasına dönüşecektir.

## 1. Görsel Mimari: Pixar Animasyon Estetiği
Karakterler insan formunda, büyük pürüzsüz gözlere ve dinamik mimiklere sahip **Pixar tarzında** modellenecektir. 
**Gerekçe:** Bu estetik, algoritmaların (Wav2Lip/Magiclight) dudak senkronizasyonunu (lip-sync) en pürüzsüz, hatasız ve doğal ("uncanny valley" hissi yaratmadan) işlediği formattır.

## 2. Multimodal Çoklu Ajan Kadrosu
Program, sadece tek bir zekanın değil, farklı uzmanlıklara (farklı LLM modellerine) sahip çoklu ajanların birbiriyle konuştuğu bir masa formatında tasarlanmıştır:

- 🎙️ **Sunucu (Meta-Orchestrator):** Masanın tam ortasında oturan, programı açan/kapatan, ajanlara söz hakkı veren ve aralarındaki veri trafiğini yöneten karizmatik lider.
- 📊 **Maç Yorumcusu (Gemini):** Tamamen rasyonel verilere, maç içi xG (gol beklentisi) istatistiklerine ve taktiksel saha haritalarına odaklanan entelektüel analist.
- ⚽ **Eski Futbolcu (Claude):** İstatistikleri umursamayan; daha çok saha içi stresi, derbi psikolojisini, soyunma odası havasını ve tribün baskısını yorumlayan deneyimli "eski toprak".
- 🎲 **Kumarbaz (DeepSeek):** Sportoto ve global bahis piyasası verilerine hakim, oran hareketlerini anlık takip eden ve "Kelly Kriteri" gibi istatistiksel modellerle gizli *Value* (değerli bahis) anomalilerini kovalayan siber-kapüşonlu dahi.
- 📡 **DataScout (Siber Keşif Subayı):** Uydulardan anlık hava durumunu çeken, sakatlık geçmişi matrislerini ve ham futbolcu istihbaratını (flight radar, antrenman sızıntıları vb.) masaya seren fütüristik gözcü android.

## İleriki Yol Haritası (Roadmap) Entegrasyonu
Bu sistem geliştirildiğinde; mevcut iş kuyruğu (queue.ts) tek bir "sunucu" videosu üretmek yerine, prompt zincirleriyle 5 ajanın repliklerini ayrı ayrı üretecek ve FFmpeg miksajı bu karakterleri bölünmüş ekranlarda veya ardışık sahnelerde (multi-cam) konuşturacak şekilde evrilecektir.
