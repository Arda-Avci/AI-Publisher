FROM python:3.11-slim

ARG HF_TOKEN
ENV HF_TOKEN=${HF_TOKEN}

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PYTHONIOENCODING=UTF-8 \
    # Playwright / browser deps
    PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium \
    CHROME_BIN=/usr/bin/chromium

WORKDIR /app

# Install system dependencies: Chromium, browser drivers, libs
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget curl gnupg ca-certificates \
    chromium chromium-sandbox \
    libglib2.0-0 libnss3 libnspr4 libdbus-1-3 \
    libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 \
    libxrandr2 libgbm1 libpango-1.0-0 libcairo2 \
    libasound2 libatspi2.0-0 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install browser-use SDK + playwright
RUN pip install --no-cache-dir \
    browser-use-sdk \
    playwright \
    && playwright install chromium --with-deps \
    && playwright install-deps chromium

# Copy Flask app
COPY app.py /app/
ENV FLASK_RUN_HOST=0.0.0.0
ENV FLASK_RUN_PORT=5000
EXPOSE 5000 9222
