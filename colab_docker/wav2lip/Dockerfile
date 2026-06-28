FROM ai-publisher-base:latest

# Clone Wav2Lip repository (archive olarak indir, git clone Kaniko'da auth sorunu cikarir)
RUN curl -sL https://github.com/Rudrabha/Wav2Lip/archive/refs/heads/master.tar.gz -o /tmp/wav2lip.tar.gz && \
    mkdir -p /app/Wav2Lip && \
    tar -xzf /tmp/wav2lip.tar.gz -C /tmp/ && \
    mv /tmp/Wav2Lip-master/* /app/Wav2Lip/ && \
    rm -rf /tmp/wav2lip.tar.gz /tmp/Wav2Lip-master

# Install face_recognition and OpenCV dependencies
RUN /opt/conda/bin/pip install --no-cache-dir \
    face_recognition \
    face_recognition_models \
    opencv-python-headless \
    librosa

# Fix parse_args() issue in Wav2Lip/inference.py to allow it to be imported as a module
RUN sed -i "s/args = parser.parse_args()/if __name__ == '__main__':\n    args = parser.parse_args()/g" /app/Wav2Lip/inference.py

# Build-time weight download (Wav2Lip GAN + visual quality checkpoints)
# COPY download_weights.sh /tmp/download_weights.sh
# RUN chmod +x /tmp/download_weights.sh && \
#     mkdir -p /workspace/models/Wav2Lip/checkpoints && \
#     python -c "import os, shutil; from huggingface_hub import hf_hub_download; os.makedirs('/workspace/models/Wav2Lip/checkpoints', exist_ok=True); [shutil.copy(hf_hub_download(repo_id='Rudrabha/Wav2Lip', filename=f, cache_dir='/workspace/models/hf_cache'), f'/workspace/models/Wav2Lip/checkpoints/{f}') for f in ['wav2lip.pth', 'wav2lip_gan.pth', 'visual_quality_disc.pth']]"

COPY app.py /app/app.py
WORKDIR /app
EXPOSE 5000

COPY runpod_handler.py /app/
COPY shared/ /app/shared/
CMD ["/opt/conda/bin/python", "-u", "runpod_handler.py"]
