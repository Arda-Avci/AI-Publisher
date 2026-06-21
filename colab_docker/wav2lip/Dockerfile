FROM ai-publisher-base:latest

# Clone Wav2Lip repository (archive olarak indir, git clone Kaniko'da auth sorunu cikarir)
RUN curl -sL https://github.com/Rudrabha/Wav2Lip/archive/refs/heads/master.tar.gz -o /tmp/wav2lip.tar.gz && \
    mkdir -p /app/Wav2Lip && \
    tar -xzf /tmp/wav2lip.tar.gz -C /tmp/ && \
    mv /tmp/Wav2Lip-master/* /app/Wav2Lip/ && \
    rm -rf /tmp/wav2lip.tar.gz /tmp/Wav2Lip-master

# Install face_recognition and OpenCV dependencies
RUN pip install --no-cache-dir \
    face_recognition \
    face_recognition_models \
    opencv-python-headless \
    librosa

# Fix parse_args() issue in Wav2Lip/inference.py to allow it to be imported as a module
RUN sed -i "s/args = parser.parse_args()/if __name__ == '__main__':\n    args = parser.parse_args()/g" /app/Wav2Lip/inference.py

COPY app.py /app/app.py
WORKDIR /app
EXPOSE 5000

COPY runpod_handler.py /app/
CMD ["python", "-u", "runpod_handler.py"]
