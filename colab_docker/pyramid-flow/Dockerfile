FROM ai-publisher-base:latest

RUN pip install --no-cache-dir \
    "diffusers>=0.35,<0.36" \
    "transformers>=4.39.3" \
    "accelerate>=0.30.0" \
    "einops" \
    "ftfy" \
    "opencv-python-headless==4.10.0.84" \
    "imageio==2.33.1" \
    "imageio-ffmpeg==0.5.1" \
    "sentencepiece" \
    "timm==0.6.12" \
    "tiktoken" \
    "scikit-image"

COPY app.py /app/app.py
WORKDIR /app
EXPOSE 5000

CMD ["python", "app.py"]
