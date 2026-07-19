FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    UV_LINK_MODE=copy \
    PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    CHROME_BIN=/usr/bin/chromium

WORKDIR /app

# System deps: Manim + ffmpeg + Chromium (Remotion)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    ffmpeg \
    libass9 \
    libass-dev \
    libcairo2 \
    libcairo2-dev \
    libpango-1.0-0 \
    libpango1.0-dev \
    pkg-config \
    texlive-latex-base \
    texlive-latex-extra \
    texlive-fonts-recommended \
    dvisvgm \
    ghostscript \
    fonts-liberation \
    fonts-dejavu-core \
    chromium \
    && rm -rf /var/lib/apt/lists/*

# Node.js 20 for Remotion
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# Python deps via uv
RUN pip install --no-cache-dir uv
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

# Remotion deps
COPY remotion-src/package.json remotion-src/
RUN cd remotion-src && npm install --omit=dev

# App source
COPY . .
RUN mkdir -p outputs remotion-src/src/compositions

ENV PATH="/app/.venv/bin:$PATH"

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
