#!/bin/bash
set -euo pipefail

echo "==> Building web image (using cache)..."
docker compose build web

echo "==> Running database migrations..."
docker compose run --rm migrator

echo "==> Restarting web service..."
docker compose up -d --no-deps web

echo "==> Done. Web service is up."
