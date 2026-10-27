# Pinned python:3.13-slim image by multi-arch manifest digest
# Queried from Docker Hub: https://hub.docker.com/v2/repositories/library/python/tags/3.13-slim
FROM python:3.13-slim@sha256:7c61056e61ac89e852de05f3dc6fa51a6dd2181797bceed46aa725dd7cb2cd3b

# Set standard environment variables (no secrets in ARG/ENV)
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/app/.venv/bin:$PATH"

WORKDIR /app

# Create unprivileged system user and group (non-root)
RUN groupadd -g 10001 appuser && \
    useradd -u 10001 -g appuser -s /bin/sh -m appuser

# Install pinned uv binary for reproducible dependency installation
RUN pip install --no-cache-dir uv==0.12.8

# Copy lockfile and project configuration
COPY pyproject.toml uv.lock ./

# Install locked production dependencies into /app/.venv
RUN uv sync --frozen --no-dev --no-install-project

# Copy application source code and migration scripts
COPY app/ ./app/
COPY alembic.ini ./
COPY migrations/ ./migrations/

# Ensure application files are owned by unprivileged appuser
RUN chown -R appuser:appuser /app

# Run as non-root user
USER appuser

EXPOSE 8000

# Start production server
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
