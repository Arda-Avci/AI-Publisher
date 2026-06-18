FROM ai-publisher-base:latest

# Clone MuseTalk repository
RUN git clone https://github.com/TencentGameMate/MuseTalk.git /app/MuseTalk

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
