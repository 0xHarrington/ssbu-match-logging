# Stage 1 — build the React frontend
FROM node:22-bookworm-slim AS frontend
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2 — Python runtime serving API + built frontend
FROM python:3.12-slim
WORKDIR /app/backend

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/app.py backend/vision.py backend/characters.json ./
COPY --from=frontend /build/dist ./static

# Match data lives on a mounted volume, never in the image
ENV DATA_DIR=/data \
    FLASK_DEBUG=0 \
    PORT=8080

EXPOSE 8080

# Single worker: the CSV store is process-local (in-process write lock).
# Do not raise workers until the data layer moves to SQLite/Postgres.
CMD ["sh", "-c", "gunicorn --workers 1 --threads 8 --timeout 60 --bind 0.0.0.0:${PORT:-8080} app:app"]
