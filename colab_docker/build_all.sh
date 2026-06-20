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

# Local registry running check (fatal degil, uyari olarak)
echo "[INFO] Yerel Registry baglantisi test ediliyor (localhost:5000)..."
REGISTRY_UP=false
if curl -s -f http://localhost:5000/v2/ > /dev/null 2>&1; then
  REGISTRY_UP=true
  echo "[OK] Registry calisiyor."
else
  echo "[WARN] Registry localhost:5000 calismiyor. Docker build fallback kullanilacak."
fi
echo "[DEBUG] pwd: $(pwd)"
echo "[DEBUG] listing files:"
ls -la

# Base image zaten Drive'da varsa ve registry'de mevcutsa atla
BASE_IN_DRIVE=0
BASE_IN_REGISTRY=0

if [ -f "$DRIVE_DIR/base.tar.gz" ]; then
  BASE_IN_DRIVE=1
  echo "[INFO] base.tar.gz Drive'da mevcut, registry kontrol ediliyor..."
  if [ "$REGISTRY_UP" = "true" ] && curl -s -f http://localhost:5000/v2/ai-publisher-base/tags/list > /dev/null 2>&1; then
    BASE_IN_REGISTRY=1
  fi
fi

if [ $BASE_IN_DRIVE -eq 1 ] && [ $BASE_IN_REGISTRY -eq 1 ]; then
  echo "✅ Base image Drive'da ve registry'de mevcut. Build atlandi."
  BASE_SKIPPED=true
elif [ $BASE_IN_DRIVE -eq 1 ] && [ $BASE_IN_REGISTRY -eq 0 ]; then
  echo "📥 Base image Drive'da mevcut ama registry'de yok. Docker load yapiliyor..."
  if command -v docker &> /dev/null; then
    docker load -i "$DRIVE_DIR/base.tar.gz"
    # docker push VFS ile cok yavas -> registry kullanma, model Dockerfile'larini yama
    # docker load tag'i localhost:5000/... olarak kaydeder, Dockerfile FROM icin de tag lazim
    docker tag localhost:5000/ai-publisher-base:latest ai-publisher-base:latest 2>/dev/null || true
    echo "✅ Base image Docker'a yuklendi. Registry push atlandi (VFS yavas)."
    BASE_LOADED=true
  else
    echo "⚠️ Docker bulunamadi, Kaniko ile build edilecek..."
    if [ -f "Dockerfile.base" ]; then
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
    fi
  fi
elif [ -f "Dockerfile.base" ]; then

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
  
  # Drive'da varsa atla (incremental build)
  if [ -f "$DRIVE_DIR/$MODEL.tar.gz" ]; then
    echo ""
    echo "======================================================================"
    echo "⏭️ [$IDX/$TOTAL_MODELS] MODEL: $MODEL (Drive'da mevcut, atlandi)"
    echo "======================================================================"
    continue
  fi
  
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
  
  if [ "$BASE_LOADED" = "true" ] && command -v docker &> /dev/null; then
    # Docker mevcut -> docker build ile (registry gerekmez, VFS'den kacinir)
    echo "[FAZ 2/3] Docker ile model imaji insa ediliyor (registry atlandi)..."
    
    docker build -t "ai-publisher-$MODEL:latest" "$MODEL/"
    BUILD_STATUS=$?
    
    if [ $BUILD_STATUS -eq 0 ]; then
      echo "👉 Docker build tamamlandi. Imaj diske aktariliyor..."
      docker save "ai-publisher-$MODEL:latest" -o "$MODEL.tar"
      SAVE_STATUS=$?
    fi
  else
    # Kaniko ile build (registry gerekli)
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
    
    SAVE_STATUS=$BUILD_STATUS
    if [ $BUILD_STATUS -eq 0 ]; then
      echo "👉 Kaniko insa tamamlandi."
    fi
  fi
  
  if [ $BUILD_STATUS -ne 0 ]; then
    echo "❌ Hata: $MODEL imaji insa edilemedi!"
    rm -f "$MODEL.tar"
    continue
  fi
  
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
echo "🎉 Build tamamlandi! Eksik imajlar insa edildi ve Drive'a kaydedildi."
echo "   Drive'da zaten var olan imajlar atlandi (incremental build)."
echo "=========================================="

if command -v docker &> /dev/null; then
  docker system prune -a -f || true
fi
if command -v podman &> /dev/null; then
  podman system prune -a -f || true
fi
