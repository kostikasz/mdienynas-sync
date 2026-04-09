#!/bin/bash
set -euo pipefail

echo "==> Building web image (using cache)..."
docker compose build web

echo "==> Running database migrations..."
docker compose run --rm web npm run migrate

echo "==> Stopping old app containers..."
docker compose stop web keycloak keycloak-db || true

echo "==> Restarting web service..."
docker compose up -d app-db web

echo "==> Done. Web service is up."
