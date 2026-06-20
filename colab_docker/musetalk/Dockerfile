FROM ai-publisher-base:latest

# Clone MuseTalk repository (archive olarak indir, git clone Kaniko'da auth sorunu cikarir)
# Once main/master branch farki olabiliyor -> once main dene, olmazsa master
RUN curl -sL --retry 3 https://github.com/TencentGameMate/MuseTalk/archive/main.tar.gz -o /tmp/musetalk.tar.gz; \
    if ! gzip -t /tmp/musetalk.tar.gz 2>/dev/null; then \
      echo "[WARN] main branch tar.gz gecersiz, master deneniyor..."; \
      curl -sL --retry 3 https://github.com/TencentGameMate/MuseTalk/archive/master.tar.gz -o /tmp/musetalk.tar.gz; \
    fi; \
    if gzip -t /tmp/musetalk.tar.gz 2>/dev/null; then \
      echo "[OK] Gecerli tar.gz, ayiklamiyor..."; \
      mkdir -p /app/MuseTalk && \
      tar -xzf /tmp/musetalk.tar.gz -C /tmp/ && \
      if [ -d /tmp/MuseTalk-main ]; then \
        mv /tmp/MuseTalk-main/* /app/MuseTalk/; \
      elif [ -d /tmp/MuseTalk-master ]; then \
        mv /tmp/MuseTalk-master/* /app/MuseTalk/; \
      fi && \
      rm -rf /tmp/musetalk.tar.gz /tmp/MuseTalk-main /tmp/MuseTalk-master; \
    else \
      echo "[WARN] tar.gz hala gecersiz, HTML yaniti:"; \
      cat /tmp/musetalk.tar.gz | head -c 500; \
      echo ""; \
      echo "[INFO] zip deneniyor..."; \
      curl -sL --retry 3 https://github.com/TencentGameMate/MuseTalk/archive/master.zip -o /tmp/musetalk.zip; \
      mkdir -p /app/MuseTalk && \
      unzip -q /tmp/musetalk.zip -d /tmp/ && \
      mv /tmp/MuseTalk-master/* /app/MuseTalk/ && \
      rm -rf /tmp/musetalk.zip /tmp/MuseTalk-master; \
    fi && \
    ls -la /app/MuseTalk/

# Install MuseTalk-specific dependencies (pytorch3d conda-only, hata verir -> skip)
RUN pip install --no-cache-dir \
    opencv-python-headless \
    omegaconf \
    einops \
    diffusers \
    librosa \
    trimesh
RUN pip install --no-cache-dir pytorch3d 2>/dev/null || true

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
