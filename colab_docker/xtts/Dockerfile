# Self-contained Dockerfile for xtts
# Generated: no base image dependency

ENV DEBIAN_FRONTEND=noninteractive TZ=Etc/UTC
ENV HF_HOME="/workspace/hf_cache" TORCH_HOME="/workspace/torch_cache"

RUN apt-get update && apt-get install -y --no-install-recommends \
    libsndfile1 espeak-ng espeak git wget curl xz-utils tar cmake \
    libgl1-mesa-glx libglib2.0-0 build-essential libass-dev \
    gobject-introspection fonts-dejavu fonts-freefont-ttf \
    && rm -rf /var/lib/apt/lists/*
RUN wget -q https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz && \
    tar -xf ffmpeg-release-amd64-static.tar.xz && \
    mv ffmpeg-*-amd64-static/ffmpeg /usr/bin/ffmpeg && \
    mv ffmpeg-*-amd64-static/ffprobe /usr/bin/ffprobe && \
    rm -rf ffmpeg-release-amd64-static.tar.xz ffmpeg-*-amd64-static

RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir \
    flask requests scipy "numpy<2.0.0" "torch==2.2.1" "torchvision==0.17.1" \
    "torchaudio==2.2.1" accelerate "transformers>=4.46" pillow runpod boto3 \
    "xformers==0.0.25" opencv-python-headless "diffusers>=0.35,<0.36" \
    "sentencepiece>=0.2.0" tiktoken protobuf "einops>=0.8.0" decord \
    open_clip_torch av

WORKDIR /app

RUN apt-get install -y --no-install-recommends rubberband-cli rubberband-ladspa && rm -rf /var/lib/apt/lists/*
RUN pip install coqui-tts edge-tts openai pyrubberband soundfile

COPY app.py /app/app.py
COPY runpod_handler.py /app/
COPY shared/ /app/shared/
CMD ["/opt/conda/bin/python","-u","runpod_handler.py"]
