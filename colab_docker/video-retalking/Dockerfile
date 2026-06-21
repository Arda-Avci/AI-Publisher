# ⚠️ CUDA 11.1 GEREKTİRİR — Mevcut base (CUDA 12.x) ile uyumsuz
# Ayrı bir CUDA 11.x base imaj gerekli: pytorch/pytorch:1.9.0-cuda11.1-cudnn8-runtime
FROM ai-publisher-base:latest

RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir \
    basicsr==1.4.2 \
    kornia==0.5.1 \
    face-alignment==1.3.4 \
    ninja==1.10.2.3 \
    einops==0.4.1 \
    facexlib==0.2.5 \
    librosa==0.9.2 \
    "numpy==1.23.4" \
    opencv-python-headless \
    scipy

RUN curl -sL https://github.com/OpenTalker/video-retalking/archive/refs/heads/main.tar.gz -o /tmp/video-retalking.tar.gz && \
    mkdir -p /app/video-retalking && \
    tar -xzf /tmp/video-retalking.tar.gz -C /tmp/ && \
    mv /tmp/video-retalking-main/* /app/video-retalking/ && \
    rm -rf /tmp/video-retalking.tar.gz /tmp/video-retalking-main

COPY app.py /app/app.py
WORKDIR /app
EXPOSE 5000
CMD ["python", "app.py"]
