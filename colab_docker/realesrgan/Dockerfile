FROM ai-publisher-base:latest

ARG HF_TOKEN
ENV HF_TOKEN=${HF_TOKEN}
RUN /opt/conda/bin/pip install --no-cache-dir --force-reinstall "numpy<2.0.0" && /opt/conda/bin/pip install --no-cache-dir realesrgan flask gunicorn
COPY app.py /app/app.py
WORKDIR /app
EXPOSE 5000
CMD ["/opt/conda/bin/python", "-u", "app.py"]
