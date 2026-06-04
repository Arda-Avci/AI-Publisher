# ADR-001: TTS (Seslendirme) Motoru Olarak VoxCPM ve XTTS-v2 Değerlendirmesi

## Durum
Değerlendiriliyor / Ertelendi (Gelecek Yol Haritasına Eklendi)

## Bağlam
Projede seslendirme (TTS) ve ses klonlama işlemleri için şu an `coqui/XTTS-v2` modelini kullanmaktayız. Google Colab ücretsiz T4 GPU limitleri (15GB VRAM, 12.67GB RAM) dahilinde video üretimi (ModelScope) ve ses efektleri (AudioLDM2) modelleriyle birlikte çalıştığı için bellek yönetimi kritik önem taşımaktadır. 

OpenBMB tarafından sunulan, 48kHz stüdyo kalitesinde ve doğal dil tarifleriyle ses üretebilen yeni nesil `VoxCPM` (VoxCPM2) modelinin projeye entegre edilip edilmeyeceği değerlendirilmiştir.

## Karar
Mevcut ücretsiz tünelleme ve Google Colab T4 GPU altyapısında **`coqui/XTTS-v2` modeli ile devam edilmesine**, `VoxCPM2` modelinin ise **Gelecek Yol Haritasında (Premium / Dedicated GPU Planı)** konumlandırılmasına karar verilmiştir.

## Sonuçlar

### Olumlu Etkiler (Mevcut Durum Korunduğunda)
- **Kararlılık:** XTTS-v2 düşük bellek tüketimi (~3-4 GB VRAM) sayesinde ModelScope T2V ile yan yana sorunsuz çalışmakta, Out-of-Memory (OOM) çökmelerine yol açmamaktadır.
- **Dil Uyumu:** Türkçe ses klonlama performansı test edilmiş ve doğrulanmıştır.

### Olumsuz Etkiler (VoxCPM2'ye Geçilmediğinde)
- **Ses Kalitesi:** 48kHz stüdyo kalitesinden mahrum kalınmakta, 24kHz ses çıkışıyla devam edilmektedir.
- **Özellik Eksikliği:** Kullanıcının metin promptuyla (örn. "yaşlı sesli bir adam") sıfırdan yapay zekayla ses karakteri tasarlayabilmesi özelliği (Creative Voice Design) şu aşamada sunulamamaktadır.

### Gelecek Planı
Dedicated GPU sunucularına geçildiğinde (RTX 4090 veya A10G gibi minimum 24GB VRAM'e sahip donanımlarla), VoxCPM2 modeli "Ultra Ses Kalitesi" ve "Yapay Zeka Karakter Tasarımı" başlıkları altında Premium üyelik özelliği olarak entegre edilecektir.
