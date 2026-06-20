FROM ai-publisher-base:latest

RUN pip install --no-cache-dir \
    "diffusers>=0.35,<0.36" \
    imageio \
    imageio-ffmpeg \
    decord \
    open_clip_torch \
    "torch>=2.5.0"

COPY app.py /app/app.py
WORKDIR /app
EXPOSE 5000

CMD ["python", "app.py"]
