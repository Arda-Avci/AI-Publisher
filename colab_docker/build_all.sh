#!/bin/bash

# Target directory on Google Drive
DRIVE_DIR="/content/drive/MyDrive/Colab Notebooks/docker/images"
mkdir -p "$DRIVE_DIR"

echo "=========================================="
echo "🚀 FAZ 1: Base Docker Imajı Insa Ediliyor"
echo "=========================================="
START_TIME=$SECONDS

if [ -f "Dockerfile.base" ]; then
  echo "[INFO] Dockerfile.base bulundu. Insa basliyor..."
  docker build -t ai-publisher-base:latest -f Dockerfile.base .
  
  if [ $? -eq 0 ]; then
    DURATION=$((SECONDS - START_TIME))
    SIZE=$(docker images --format "{{.Size}}" ai-publisher-base:latest)
    echo "✅ Base Docker Imajı basariyla olusturuldu."
    echo "[INFO] Imaj Boyutu: $SIZE"
    echo "[INFO] Insa Suresi: ${DURATION}s"
  else
    echo "❌ Base Docker Imajı insa edilirken hata olustu!"
    exit 1
  fi
else
  echo "❌ Dockerfile.base bulunamadi!"
  exit 1
fi

MODELS=("cogvideox" "wan" "ltx" "hunyuan" "xtts" "audioldm2" "wav2lip" "musetalk" "whisper" "stablediffusion" "kokorotts")
TOTAL_MODELS=${#MODELS[@]}

for i in "${!MODELS[@]}"; do
  MODEL="${MODELS[$i]}"
  IDX=$((i + 1))
  
  echo ""
  echo "======================================================================"
  echo "📦 [$IDX/$TOTAL_MODELS] MODEL: $MODEL"
  echo "======================================================================"
  
  MODEL_START=$SECONDS
  
  # Faz 1: Klasör ve Dockerfile Doğrulama
  echo "[FAZ 1/5] Klasor ve Dockerfile dogrulaniyor..."
  if [ ! -d "$MODEL" ]; then
    echo "❌ Hata: '$MODEL' dizini bulunamadi!"
    continue
  fi
  if [ ! -f "$MODEL/Dockerfile" ]; then
    echo "❌ Hata: '$MODEL/Dockerfile' bulunamadi!"
    continue
  fi
  echo "👉 Dogrulama basarili."
  
  # Faz 2: Docker Build Baslatma
  echo "[FAZ 2/5] Docker imaji insa ediliyor (ai-publisher-$MODEL:latest)..."
  docker build -t "ai-publisher-$MODEL:latest" -f "$MODEL/Dockerfile" "$MODEL/"
  
  if [ $? -ne 0 ]; then
    echo "❌ Hata: $MODEL imaji insa edilemedi!"
    continue
  fi
  echo "👉 Insa tamamlandi."
  
  # Faz 3: Imaj Boyutu Olcumu
  echo "[FAZ 3/5] Imaj boyutu hesaplaniyor..."
  IMG_SIZE=$(docker images --format "{{.Size}}" "ai-publisher-$MODEL:latest")
  echo "👉 Imaj basariyla kaydedildi. Local Boyut: $IMG_SIZE"
  
  # Faz 4: Google Drive'a Kaydetme ve Sikistirma (Gzip/Pigz)
  echo "[FAZ 4/5] Imaj Google Drive'a tar.gz olarak kaydediliyor..."
  echo "[INFO] Hedef Dosya: $DRIVE_DIR/$MODEL.tar.gz"
  SAVE_START=$SECONDS
  
  if command -v pigz &> /dev/null; then
    echo "[INFO] pigz (paralel gzip) bulundu. Cok cekirdekli hizli sikistirma baslatiliyor..."
    docker save "ai-publisher-$MODEL:latest" | pigz > "$DRIVE_DIR/$MODEL.tar.gz"
  else
    echo "[INFO] gzip kullaniliyor (pigz bulunamadi)..."
    docker save "ai-publisher-$MODEL:latest" | gzip > "$DRIVE_DIR/$MODEL.tar.gz"
  fi
  
  if [ $? -ne 0 ]; then
    echo "❌ Hata: $MODEL imaji Google Drive'a kaydedilirken sikinti olustu!"
    continue
  fi
  SAVE_DURATION=$((SECONDS - SAVE_START))
  echo "👉 Sikistirma ve kaydetme tamamlandi. Suresi: ${SAVE_DURATION}s"
  
  # Faz 5: Google Drive Dogrulamasi
  echo "[FAZ 5/5] Google Drive dosyasi dogrulaniyor..."
  if [ -f "$DRIVE_DIR/$MODEL.tar.gz" ]; then
    FILE_SIZE=$(du -h "$DRIVE_DIR/$MODEL.tar.gz" | cut -f1)
    echo "✅ Basarili! $MODEL.tar.gz Google Drive'a eklendi."
    echo "[INFO] Drive Dosya Boyutu: $FILE_SIZE"
    
    # Disk temizliği: Yerel docker imajını silelim ki Colab diski dolmasın
    echo "[INFO] Disk alani kazanmak icin yerel imaj temizleniyor..."
    docker rmi "ai-publisher-$MODEL:latest"
    docker image prune -f
  else
    echo "❌ Hata: Olusturulan dosya Google Drive'da bulunamadi!"
  fi
  
  MODEL_DURATION=$((SECONDS - MODEL_START))
  echo "⏱️ Toplam Islem Suresi ($MODEL): ${MODEL_DURATION}s"
done

echo ""
echo "=========================================="
echo "🎉 Tum Docker imajlari insa edildi ve Google Drive'a kaydedildi!"
echo "=========================================="

