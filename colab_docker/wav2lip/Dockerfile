FROM ai-publisher-base:latest

# Clone Wav2Lip repository
RUN git clone https://github.com/Rudrabha/Wav2Lip.git /app/Wav2Lip

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

CMD ["python", "app.py"]
