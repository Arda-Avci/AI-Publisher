FROM ai-publisher-base:latest

# Clone MuseTalk repository
RUN git clone https://github.com/TencentGameMate/MuseTalk.git /app/MuseTalk

# Install dependencies for MuseTalk
RUN pip install --no-cache-dir \
    opencv-python-headless \
    omegaconf \
    einops \
    diffusers \
    librosa

COPY app.py /app/app.py
WORKDIR /app
EXPOSE 5005

CMD ["python", "app.py"]
