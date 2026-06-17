FROM ai-publisher-base:latest

# Install Wan 2.1 specific video generation dependencies
RUN pip install --no-cache-dir \
    diffusers>=0.35,<0.36 \
    imageio \
    imageio-ffmpeg \
    decord \
    open_clip_torch

COPY app.py /app/app.py
WORKDIR /app
EXPOSE 5008

CMD ["python", "app.py"]
