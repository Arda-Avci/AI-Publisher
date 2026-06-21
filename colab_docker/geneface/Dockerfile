# ⚠️ CUDA 11.8 GEREKTİRİR — Mevcut base (CUDA 12.x) ile uyumsuz
# Stage 1: Derleme Aşaması (Build Stage)
FROM pytorch/pytorch:2.1.2-cuda11.8-cudnn8-devel AS builder

RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    ffmpeg \
    cmake \
    git \
    wget \
    curl \
    build-essential \
    libasound2-dev \
    portaudio19-dev \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir \
    flask \
    requests \
    decord \
    einops \
    "kornia==0.5.0" \
    face_alignment \
    "librosa==0.9.2" \
    mediapipe \
    "numpy<2.0.0" \
    opencv-python-headless \
    scipy \
    ninja

# PyTorch3D derlemesi (v0.7.6 sürümü PyTorch 2.1 ile uyumludur)
RUN pip install "git+https://github.com/facebookresearch/pytorch3d.git@v0.7.6"

# Stage 2: Çalışma Aşaması (Runtime Stage)
FROM pytorch/pytorch:2.1.2-cuda11.8-cudnn8-runtime

RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    ffmpeg \
    libasound2 \
    portaudio19-dev \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Kurulu Python ortamını ve derlenen tekerlekleri builder'dan kopyala
COPY --from=builder /opt/conda /opt/conda

COPY app.py /app/app.py
WORKDIR /app
EXPOSE 5000
COPY runpod_handler.py /app/
CMD ["python", "-u", "runpod_handler.py"]
