FROM ai-publisher-base:latest

# Install Stable Diffusion specific packages
RUN pip install --no-cache-dir \
    "diffusers>=0.35,<0.36" \
    realesrgan \
    gfpgan \
    basicsr \
    rembg

COPY app.py /app/app.py
WORKDIR /app
EXPOSE 5000

COPY runpod_handler.py /app/
COPY shared/ /app/shared/
CMD ["python", "-u", "runpod_handler.py"]

