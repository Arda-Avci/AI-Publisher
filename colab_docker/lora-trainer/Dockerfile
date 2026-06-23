FROM ai-publisher-base:latest

RUN pip install --no-cache-dir \
    "torch>=2.5.0" \
    "diffusers>=0.35,<0.36" \
    "peft>=0.12.0" \
    "accelerate>=0.33.0" \
    "transformers>=4.44.0" \
    "bitsandbytes>=0.43.0" \
    pillow \
    open_clip_torch \
    requests

COPY app.py /app/app.py
WORKDIR /app
EXPOSE 5000

COPY runpod_handler.py /app/
COPY shared/ /app/shared/
CMD ["python", "-u", "runpod_handler.py"]

