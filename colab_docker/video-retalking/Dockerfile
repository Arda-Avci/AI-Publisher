# ⚠️ CUDA 11.8 GEREKTİRİR — Mevcut base (CUDA 12.x) ile uyumsuz
FROM pytorch/pytorch:2.1.2-cuda11.8-cudnn8-devel

RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    ffmpeg \
    cmake \
    git \
    wget \
    curl \
    build-essential \
    libasound2-dev \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir \
    flask \
    requests \
    basicsr==1.4.2 \
    kornia==0.5.1 \
    face-alignment==1.3.4 \
    ninja==1.10.2.3 \
    einops==0.4.1 \
    facexlib==0.2.5 \
    librosa==0.9.2 \
    "numpy<2.0.0" \
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
