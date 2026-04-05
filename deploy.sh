#!/bin/bash
set -euo pipefail

echo "==> Building web image (using cache)..."
docker compose build web

echo "==> Running database migrations..."
if ! docker compose run --rm migrator; then
  echo ""
  echo "ERROR: Migrations failed. Web service has NOT been restarted."
  echo "Fix the migration issue and re-run deploy.sh."
  exit 1
fi

echo "==> Restarting web service..."
docker compose up -d --no-deps web

echo "==> Checking web service health..."
RETRIES=15
INTERVAL=4
until [ "$RETRIES" -eq 0 ]; do
  STATUS=$(docker compose ps web --format "{{.State}}" 2>/dev/null || echo "unknown")
  if [ "$STATUS" = "running" ]; then
    break
  fi
  echo "   Status: $STATUS — waiting ${INTERVAL}s ($RETRIES retries left)..."
  sleep "$INTERVAL"
  RETRIES=$((RETRIES - 1))
done

if [ "$RETRIES" -eq 0 ]; then
  echo ""
  echo "ERROR: Web service did not reach running state."
  echo "Check logs: docker compose logs web"
  echo "To roll back: git checkout <previous-sha> && bash deploy.sh"
  exit 1
fi

echo "==> Done. Web service is up."
