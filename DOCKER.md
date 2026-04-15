# Docker: build and publish

This project’s `next build` talks to Postgres (static generation queries collections). The database must already have Payload’s schema applied **before** you build the image.

See also [`.env.example`](.env.example) for environment variable names.

## Prerequisites

- Docker and Docker Compose
- `pnpm` on your machine (for migrations from the host)
- A `PAYLOAD_SECRET` value with **at least 32 characters** (any placeholder is fine for local migrate/build)

## Repeatable workflow (local build → Docker Hub)

Replace `yourdockerhubuser/journalism`, tag, and URLs/passwords with your own.

### 1. Start Postgres (Compose)

```bash
docker compose up -d postgres
```

Wait until the container is healthy (Compose shows `healthy` for `postgres`).

### 2. Apply migrations against the Compose database

Postgres is published on the host at **`127.0.0.1`** and port **`POSTGRES_HOST_PORT`** (default **`5433`** — see [`docker-compose.yml`](docker-compose.yml)). Use the same user, password, and database name as in compose (defaults: `payload` / `payload` / `journalism`).

```bash
export DATABASE_URL='postgres://payload:payload@127.0.0.1:5433/journalism'
export PAYLOAD_SECRET='your-placeholder-secret-at-least-32-chars-long'

pnpm payload migrate
```

If you changed `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, or `POSTGRES_HOST_PORT`, adjust `DATABASE_URL` accordingly.

### 3. Build the application image

`next build` must reach Postgres on **`127.0.0.1:5432`** from inside the build environment. The reliable approach on many setups is to attach the build to the **running Postgres container’s network** and use legacy Docker build (BuildKit often does not support `network: service:postgres` in Compose).

```bash
PG=$(docker compose ps -q postgres)

DOCKER_BUILDKIT=0 docker build --network=container:$PG \
  --build-arg DATABASE_URL='postgres://payload:payload@127.0.0.1:5432/journalism' \
  --build-arg PAYLOAD_SECRET='your-placeholder-secret-at-least-32-chars-long' \
  --build-arg NEXT_PUBLIC_SERVER_URL='https://your-production-domain.com' \
  -t yourdockerhubuser/journalism:1.0.0 \
  .
```

Notes:

- **`127.0.0.1:5432`** in `DATABASE_URL` here is correct: the build uses Postgres’s network namespace, where Postgres listens on port **5432**. The **`5433`** port is only for connections from your host (step 2).
- **`NEXT_PUBLIC_SERVER_URL`** should be your real public site URL; it is largely fixed at **build** time (see below).
- The **`PAYLOAD_SECRET`** build-arg is only for the build step; use a **different**, strong secret on the VPS at runtime.

### 4. Push to Docker Hub

```bash
docker login
docker push yourdockerhubuser/journalism:1.0.0
```

## After you change application code

1. Pull latest changes, install deps if needed (`pnpm install`).
2. If you **did not** change Payload collections/fields: repeat steps **1 → 2 → 3 → 4** (step 2 is quick if there are no new migrations).
3. If you **did** change the schema: create a migration, commit it, apply it, then build:

   ```bash
   pnpm payload migrate:create --name short_description_of_change
   pnpm payload migrate   # with DATABASE_URL pointing at your local Compose Postgres, as in step 2
   ```

   Then run steps **3** and **4** again.

## Running the image on a VPS

- Set **`DATABASE_URL`** and **`PAYLOAD_SECRET`** (and any other secrets from [`.env.example`](.env.example)) when you run the container — they are **runtime** values and should not be committed.
- **`NEXT_PUBLIC_SERVER_URL`** should match what you used at **image build** time, unless you intentionally rebuild the image with a new public URL.

## Optional: `docker compose build app`

If your Docker version supports Compose’s `build.network: service:postgres`, you can try:

```bash
docker compose up -d postgres
docker compose build app
```

If the build fails with a message that BuildKit does not support that network mode, use the **`DOCKER_BUILDKIT=0 docker build ...`** flow in step 3 instead.
