FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    UV_LINK_MODE=copy

WORKDIR /app

# System packages required by Manim + ffmpeg subtitle burn-in.
RUN apt-get update && apt-get install -y --no-install-recommends \
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
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Use uv for deterministic dependency installation from lockfile.
RUN pip install --no-cache-dir uv

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

# Copy source after deps for better Docker layer caching.
COPY . .

# Put venv binaries first (manim, python, etc.)
ENV PATH="/app/.venv/bin:$PATH"

# API server default for cloud hosting.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
