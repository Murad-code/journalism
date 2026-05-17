#!/usr/bin/env bash
# Build a linux/amd64 image for a VPS (e.g. from Apple Silicon).
# Prerequisites: `docker compose up -d postgres` and `pnpm payload migrate` with
# DATABASE_URL pointing at 127.0.0.1:${POSTGRES_HOST_PORT} (see DOCKER.md).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env"
if [ -f "${ENV_FILE}" ]; then
  # Export vars from .env so PAYLOAD_SECRET, DOCKER_IMAGE, etc. apply to this script.
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
fi

cd "${ROOT_DIR}"

POSTGRES_USER="${POSTGRES_USER:-payload}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-payload}"
POSTGRES_DB="${POSTGRES_DB:-journalism}"
POSTGRES_HOST_PORT="${POSTGRES_HOST_PORT:-5433}"
IMAGE="${DOCKER_IMAGE:-muradkamali/journalism:1.0.0}"
NEXT_PUBLIC_SERVER_URL="${NEXT_PUBLIC_SERVER_URL:-http://localhost:3000}"

# Prefer a dedicated build-only secret so your runtime .env PAYLOAD_SECRET is not required here.
BUILD_SECRET="${PAYLOAD_SECRET_BUILD:-${PAYLOAD_SECRET:-}}"
if [ -z "${BUILD_SECRET}" ] || [ "${#BUILD_SECRET}" -lt 32 ]; then
  echo "Set PAYLOAD_SECRET_BUILD (or PAYLOAD_SECRET) to at least 32 characters for next build (from .env or your shell). Got length: ${#BUILD_SECRET}." >&2
  exit 1
fi

# If POSTGRES_PASSWORD contains @ : / or other URI-reserved characters, encode them in DATABASE_URL.
DATABASE_BUILD_URL="postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@host.docker.internal:${POSTGRES_HOST_PORT}/${POSTGRES_DB}"

LOAD_OR_PUSH=(--load)
if [[ "${1:-}" == "--push" ]]; then
  LOAD_OR_PUSH=(--push)
fi

exec docker buildx build --platform linux/amd64 "${LOAD_OR_PUSH[@]}" \
  --add-host=host.docker.internal:host-gateway \
  --build-arg "DATABASE_URL=${DATABASE_BUILD_URL}" \
  --build-arg "PAYLOAD_SECRET=${BUILD_SECRET}" \
  --build-arg "NEXT_PUBLIC_SERVER_URL=${NEXT_PUBLIC_SERVER_URL}" \
  -t "${IMAGE}" \
  .
