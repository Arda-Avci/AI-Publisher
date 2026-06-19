#!/bin/bash

# Target directory on Google Drive
DRIVE_DIR="/content/drive/MyDrive/Colab Notebooks/docker/images"
mkdir -p "$DRIVE_DIR"

# Get absolute path of kaniko to prevent command not found errors
KANIKO_BIN="kaniko"
if [ -f "/usr/local/bin/kaniko" ]; then
  KANIKO_BIN="/usr/local/bin/kaniko"
elif [ -f "/kaniko/executor" ]; then
  KANIKO_BIN="/kaniko/executor"
fi

echo "=========================================="
echo "🚀 FAZ 1: Base Docker Imajı Insa Ediliyor (Kaniko)"
echo "=========================================="
START_TIME=$SECONDS

# Local registry running check
echo "[INFO] Yerel Registry baglantisi test ediliyor (localhost:5000)..."
curl -s -f http://localhost:5000/v2/ > /dev/null
if [ $? -ne 0 ]; then
  echo "❌ Hata: Yerel registry localhost:5000 adresinde calismiyor!"
  exit 1
fi
echo "[DEBUG] pwd: $(pwd)"
echo "[DEBUG] listing files:"
ls -la

if [ -f "Dockerfile.base" ]; then

  echo "[INFO] Dockerfile.base bulundu. Kaniko ile insa basliyor..."
  
  $KANIKO_BIN --context=. \
         --dockerfile=Dockerfile.base \
         --destination=localhost:5000/ai-publisher-base:latest \
         --tarPath=base.tar \
         --whitelist-var-run=false \
         --ignore-var-run \
         --snapshot-mode=redo
  
  if [ $? -eq 0 ]; then
    DURATION=$((SECONDS - START_TIME))
    echo "✅ Base Docker Imajı basariyla olusturuldu."
    echo "[INFO] Insa Suresi: ${DURATION}s"
    
    # Sıkıştırma ve Drive'a yazma
    echo "[INFO] Base imaji Drive'a kopyalaniyor..."
    if command -v pigz &> /dev/null; then
      pigz -c base.tar > "$DRIVE_DIR/base.tar.gz"
    else
      gzip -c base.tar > "$DRIVE_DIR/base.tar.gz"
    fi
    rm -f base.tar
    echo "✅ Base imaji Drive'a kaydedildi."
  else
    echo "❌ Base Docker Imajı insa edilirken hata olustu!"
    exit 1
  fi
else
  echo "❌ Dockerfile.base bulunamadi!"
  exit 1
fi

MODELS=("cogvideox" "wan" "ltx" "hunyuan" "xtts" "audioldm2" "wav2lip" "musetalk" "whisper" "stablediffusion" "kokorotts" "svd" "animatediff" "wan25" "f5tts" "lora-trainer")
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
  echo "[FAZ 1/4] Klasor ve Dockerfile dogrulaniyor..."
  if [ ! -d "$MODEL" ]; then
    echo "❌ Hata: '$MODEL' dizini bulunamadi!"
    continue
  fi
  if [ ! -f "$MODEL/Dockerfile" ]; then
    echo "❌ Hata: '$MODEL/Dockerfile' bulunamadi!"
    continue
  fi
  echo "👉 Dogrulama basarili."
  
  # Faz 2: Dockerfile FROM satırını localhost registry'ye yönlendirme
  echo "[FAZ 2/4] Dockerfile local registry icin yamalaniyor..."
  sed -i 's|FROM ai-publisher-base:latest|FROM localhost:5000/ai-publisher-base:latest|g' "$MODEL/Dockerfile"
  
  # Faz 3: Kaniko Build
  echo "[FAZ 3/4] Kaniko ile model imaji insa ediliyor..."
  
  $KANIKO_BIN --context="$MODEL/" \
         --dockerfile="$MODEL/Dockerfile" \
         --destination="localhost:5000/ai-publisher-$MODEL:latest" \
         --tarPath="$MODEL.tar" \
         --insecure \
         --skip-tls-verify \
         --whitelist-var-run=false \
         --ignore-var-run \
         --snapshot-mode=redo
  
  BUILD_STATUS=$?
  
  # Dockerfile'ı eski haline geri döndür
  sed -i 's|FROM localhost:5000/ai-publisher-base:latest|FROM ai-publisher-base:latest|g' "$MODEL/Dockerfile"
  
  if [ $BUILD_STATUS -ne 0 ]; then
    echo "❌ Hata: $MODEL imaji insa edilemedi!"
    rm -f "$MODEL.tar"
    continue
  fi
  echo "👉 Insa tamamlandi."
  
  # Faz 4: Sıkıştırma ve Drive'a yazma
  echo "[FAZ 4/4] Imaj sıkıştırılıp Drive'a kaydediliyor..."
  SAVE_START=$SECONDS
  
  if command -v pigz &> /dev/null; then
    pigz -c "$MODEL.tar" > "$DRIVE_DIR/$MODEL.tar.gz"
  else
    gzip -c "$MODEL.tar" > "$DRIVE_DIR/$MODEL.tar.gz"
  fi
  
  SAVE_STATUS=$?
  rm -f "$MODEL.tar"
  
  if [ $SAVE_STATUS -ne 0 ]; then
    echo "❌ Hata: $MODEL imaji kaydedilirken sıkıştırma sorunu oluştu!"
    continue
  fi
  
  SAVE_DURATION=$((SECONDS - SAVE_START))
  echo "✅ Basarili! $MODEL.tar.gz Google Drive'a eklendi."
  
  # Local Registry repository ve gecici dosyalari silerek diskte yer acma
  echo "[INFO] Registry deposu ve disk temizligi yapiliyor ($MODEL)..."
  rm -rf "/var/lib/registry/docker/registry/v2/repositories/ai-publisher-$MODEL" || true
  
  if command -v docker &> /dev/null; then
    docker system prune -f || true
  fi
  if command -v podman &> /dev/null; then
    podman system prune -f || true
  fi
  
  MODEL_DURATION=$((SECONDS - MODEL_START))
  echo "⏱️ Toplam Islem Suresi ($MODEL): ${MODEL_DURATION}s"
done

echo ""
echo "=========================================="
echo "🎉 Tum Docker imajlari insa edildi ve Google Drive'a kaydedildi!"
echo "=========================================="

if command -v docker &> /dev/null; then
  docker system prune -a -f || true
fi
if command -v podman &> /dev/null; then
  podman system prune -a -f || true
fi
