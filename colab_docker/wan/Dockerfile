FROM ai-publisher-base:latest

# Install Wan 2.1 specific video generation dependencies
RUN pip install --no-cache-dir \
    "diffusers>=0.35,<0.36" \
    decord \
    open_clip_torch

COPY app.py /app/app.py
WORKDIR /app
EXPOSE 5000

COPY runpod_handler.py /app/
COPY shared/ /app/shared/
CMD ["python", "-u", "runpod_handler.py"]

