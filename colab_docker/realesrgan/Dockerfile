FROM ai-publisher-base:latest
RUN /opt/conda/bin/pip install --no-cache-dir realesrgan flask gunicorn
RUN python -c "from realesrgan import RealESRGANer; from basicsr.archs.rrdbnet_arch import RRDBNet; print('Real-ESRGAN ready')"
COPY app.py /app/app.py
WORKDIR /app
EXPOSE 5000
CMD ["/opt/conda/bin/python", "-u", "app.py"]
