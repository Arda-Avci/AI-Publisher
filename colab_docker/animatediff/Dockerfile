FROM ai-publisher-base:latest

# Install AnimateDiff specific dependencies
RUN pip install --no-cache-dir \
    "diffusers>=0.29.0" \
    decord \
    open_clip_torch

COPY app.py /app/app.py
WORKDIR /app
EXPOSE 5000

CMD ["python", "app.py"]
