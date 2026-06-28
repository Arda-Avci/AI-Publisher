FROM ai-publisher-base:latest
RUN /opt/conda/bin/pip install --no-cache-dir "numpy<2.0.0" realesrgan flask gunicorn
COPY app.py /app/app.py
WORKDIR /app
EXPOSE 5000
CMD ["/opt/conda/bin/python", "-u", "app.py"]
