# ⚠️ CUDA 11.7/11.8 GEREKTİRİR — Mevcut base (CUDA 12.x) ile uyumsuz
# Ayrı CUDA 11.x base + PyTorch3D source build + torch-ngp C ext gerekli
# Referans: github.com/yerfor/GeneFacePlusPlus
FROM ai-publisher-base:latest

RUN apt-get update && apt-get install -y \
    ffmpeg libasound2-dev portaudio19-dev libgl1 && \
    rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir \
    decord \
    einops \
    "kornia==0.5.0" \
    face_alignment \
    "librosa==0.9.2" \
    mediapipe \
    "numpy<2" \
    opencv-python-headless \
    scipy

COPY app.py /app/app.py
WORKDIR /app
EXPOSE 5000
CMD ["python", "app.py"]
