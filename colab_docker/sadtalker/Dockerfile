FROM ai-publisher-base:latest

RUN pip install --no-cache-dir dlib-bin==19.24.1 && \
    pip install --no-cache-dir face-recognition-models Click Pillow && \
    pip install --no-cache-dir --no-deps face_recognition && \
    pip install --no-cache-dir \
    scipy \
    opencv-python-headless \
    numba \
    gfpgan

RUN mkdir -p /app/checkpoints && \
    wget -q https://github.com/OpenTalker/SadTalker/releases/download/v0.0.1/mapping_00229-model_dict-general_474.pth -O /app/checkpoints/mapping_00229.pth && \
    wget -q https://github.com/OpenTalker/SadTalker/releases/download/v0.0.1/mapping_00109-model_dict-general_470.pth -O /app/checkpoints/mapping_00109.pth && \
    wget -q https://github.com/OpenTalker/SadTalker/releases/download/v0.0.1/SadTalker_V0.0.1_256.safetensors -O /app/checkpoints/SadTalker_V0.0.1_256.safetensors

COPY app.py /app/app.py
WORKDIR /app
EXPOSE 5000
COPY runpod_handler.py /app/
COPY shared/ /app/shared/
CMD ["python", "-u", "runpod_handler.py"]

