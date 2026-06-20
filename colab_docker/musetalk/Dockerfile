FROM ai-publisher-base:latest

# Clone MuseTalk repository (archive olarak indir, git clone Kaniko'da auth sorunu cikarir)
# Onceki refs/heads/main URL'i gzip olmayan yanit donebiliyor -> ana sayfa URL'i daha guvenilir
RUN curl -sL https://github.com/TencentGameMate/MuseTalk/archive/main.tar.gz -o /tmp/musetalk.tar.gz && \
    if ! gzip -t /tmp/musetalk.tar.gz 2>/dev/null; then \
      echo "Gecersiz gzip, zip olarak tek deneniyor..."; \
      curl -sL https://github.com/TencentGameMate/MuseTalk/archive/main.zip -o /tmp/musetalk.zip && \
      mkdir -p /app/MuseTalk && \
      unzip -q /tmp/musetalk.zip -d /tmp/ && \
      mv /tmp/MuseTalk-main/* /app/MuseTalk/ && \
      rm -rf /tmp/musetalk.zip /tmp/MuseTalk-main; \
    else \
      mkdir -p /app/MuseTalk && \
      tar -xzf /tmp/musetalk.tar.gz -C /tmp/ && \
      mv /tmp/MuseTalk-main/* /app/MuseTalk/ && \
      rm -rf /tmp/musetalk.tar.gz /tmp/MuseTalk-main; \
    fi

# Install MuseTalk-specific dependencies
RUN pip install --no-cache-dir \
    opencv-python-headless \
    omegaconf \
    einops \
    diffusers \
    librosa \
    trimesh \
    pytorch3d 2>/dev/null || true

# Download MuseTalk model weights (required for inference)
RUN mkdir -p /app/MuseTalk/models && \
    cd /app/MuseTalk && \
    pip install --no-cache-dir huggingface_hub && \
    python -c "from huggingface_hub import snapshot_download; snapshot_download('TencentGameMate/MuseTalk', local_dir='models', ignore_patterns=['*.git*', 'docs/*'])" 2>/dev/null || \
    echo "[WARN] MuseTalk model weights will be downloaded at runtime"

COPY app.py /app/app.py
WORKDIR /app
EXPOSE 5000

CMD ["python", "app.py"]
