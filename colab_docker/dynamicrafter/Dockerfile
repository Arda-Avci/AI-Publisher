FROM ai-publisher-base:latest

RUN pip install --no-cache-dir \
    decord==0.6.0 \
    einops==0.3.0 \
    imageio==2.9.0 \
    "numpy==1.24.2" \
    omegaconf==2.1.1 \
    opencv-python-headless \
    pytorch_lightning==1.9.3 \
    "transformers>=4.25.1" \
    moviepy \
    av \
    xformers \
    "open_clip_torch==2.22.0" \
    kornia \
    timm

COPY app.py /app/app.py
WORKDIR /app
EXPOSE 5000

CMD ["python", "app.py"]
