# Docker: build and publish

This project's `next build` talks to Postgres (static generation queries collections). The database must already have Payload's schema applied **before** you build the image.

See also [`.env.example`](../.env.example) for environment variable names.

## Prerequisites

- Docker and Docker Compose
- `pnpm` on your machine (for migrations from the host)
- A `PAYLOAD_SECRET` value with **at least 32 characters** (any placeholder is fine for local migrate/build)

Replace **`yourdockerhubuser/journalism`**, domain, and passwords in the snippets below with your own.

---

## Step-by-step: local image build and push

Run every command **from the project repository root**, in order.

### Step 1 — Start Postgres

```bash
docker compose up -d postgres
```

Wait until Postgres is ready. Check that the service is **healthy** (may take a few seconds):

```bash
docker compose ps
```

### Step 2 — Clear Payload "dev push" rows (non-interactive Docker builds)

`docker build` has **no keyboard**. If this database was ever used with **`pnpm dev`**, Payload may store a row in **`payload_migrations`** with **`batch = -1`**. During the image build, Payload would then ask for confirmation on stdin and the build **hangs**.

Run this **every time** before you build an image against this database (safe if there are no such rows):

```bash
docker compose exec -T postgres psql -U payload -d journalism -c "DELETE FROM payload_migrations WHERE batch = -1;"
```

If you changed **`POSTGRES_USER`** or **`POSTGRES_DB`** in `.env` or [`docker-compose.yml`](../docker-compose.yml), change **`-U payload`** and **`-d journalism`** to match.

The [`Dockerfile`](../Dockerfile) also pipes **`y`** into `pnpm run build` as a fallback. Prefer running the **`DELETE`** above when this database holds data you care about; Payload warns that migrating after a dev push can imply **data loss**.

### Step 3 — Apply migrations from your host

Postgres is exposed on the host at **`127.0.0.1`** and port **`POSTGRES_HOST_PORT`** (default **`5433`**). Defaults match Compose: user **`payload`**, password **`payload`**, database **`journalism`**.

```bash
export DATABASE_URL='postgres://payload:payload@127.0.0.1:5433/journalism'
export PAYLOAD_SECRET='your-placeholder-secret-at-least-32-characters-long'

pnpm payload migrate
```

If you changed **`POSTGRES_USER`**, **`POSTGRES_PASSWORD`**, **`POSTGRES_DB`**, or **`POSTGRES_HOST_PORT`**, update **`DATABASE_URL`** accordingly.

### Step 4 — Make the amd64 build script executable (once per clone)

```bash
chmod +x scripts/docker-build-amd64.sh
```

### Step 5 — Build the `linux/amd64` image

Postgres from Step 1 must still be running. The build container reaches it via **`host.docker.internal`** on port **`5433`** (host-mapped port).

Put **`PAYLOAD_SECRET`** (≥ 32 chars), **`DOCKER_IMAGE`**, and **`NEXT_PUBLIC_SERVER_URL`** in the project **`.env`**, **or** export them in the shell before running the script. The script loads **`.env`** automatically when the file exists.

**5a — Build and load into local Docker** (then you push manually in Step 6):

```bash
export NEXT_PUBLIC_SERVER_URL='https://your-production-domain.com'
./scripts/docker-build-amd64.sh
```

**5b — Or build and push in one step** (skip Step 6 if this succeeds):

```bash
export NEXT_PUBLIC_SERVER_URL='https://your-production-domain.com'
./scripts/docker-build-amd64.sh --push
```

`--push` requires **`docker login`** and registry permissions.

**5c — Or raw Buildx** (same as the script; no `.env` loading):

```bash
docker buildx build --platform linux/amd64 --load \
  --add-host=host.docker.internal:host-gateway \
  --build-arg DATABASE_URL='postgres://payload:payload@host.docker.internal:5433/journalism' \
  --build-arg PAYLOAD_SECRET='your-placeholder-secret-at-least-32-characters-long' \
  --build-arg NEXT_PUBLIC_SERVER_URL='https://your-production-domain.com' \
  -t yourdockerhubuser/journalism:1.0.0 \
  .
```

Use the same **`POSTGRES_*`** credentials in **`DATABASE_URL`** as in Compose. If **`POSTGRES_HOST_PORT`** is not **`5433`**, change the port in **`host.docker.internal:PORT`**. **`--add-host=host.docker.internal:host-gateway`** is needed on Linux and is harmless on Docker Desktop.

### Step 6 — Push to the registry (only if you used `--load` in Step 5)

If you ran **`./scripts/docker-build-amd64.sh`** without **`--push`**, or used **`docker buildx build … --load`**, push the tag you built:

```bash
docker login
docker push yourdockerhubuser/journalism:1.0.0
```

Match **`yourdockerhubuser/journalism:1.0.0`** to the **`-t`** / **`DOCKER_IMAGE`** value you used when building.

---

## After you change application code

1. Pull latest changes; run **`pnpm install`** if dependencies changed.
2. If you **did not** change Payload collections/fields: repeat **Steps 1 → 6** from [Step-by-step](#step-by-step-local-image-build-and-push) (Steps 2–3 are quick when there are no new migrations).
3. If you **did** change the schema: create and apply a migration, then build again:

   ```bash
   pnpm payload migrate:create --name short_description_of_change
   export DATABASE_URL='postgres://payload:payload@127.0.0.1:5433/journalism'
   export PAYLOAD_SECRET='your-placeholder-secret-at-least-32-characters-long'
   pnpm payload migrate
   ```

   Then repeat **Steps 2** (optional but safe), **5**, and **6** (or **5b** only).

## Running the image on a VPS (pull and deploy)

These steps assume an **`linux/amd64`** image is already in a registry (for example after [Step 5](#step-5--build-the-linuxamd64-image) / **Step 6**). You need **Docker** and **Docker Compose** on the server.

### VPS Step 1 — Copy what the stack needs onto the server

Either **clone the repo** on the VPS, or copy at least:

- [`docker-compose.registry.yml`](../docker-compose.registry.yml) → save as `docker-compose.yml` in the deploy directory
- The [`nginx/`](../nginx/) directory (same paths relative to the compose file)
- A production **`.env`** file (create on the server; never commit it)

### VPS Step 2 — Log in to your container registry

```bash
docker login
```

Use the same registry you pushed to (for example Docker Hub).

### VPS Step 3 — Create `.env` on the server

From [`.env.example`](../.env.example), set at least:

- **`PAYLOAD_SECRET`** — at least 32 characters; use a **new** strong value for production (`openssl rand -base64 48`).
- **`PREVIEW_SECRET`**, **`CRON_SECRET`**, and any other keys your app uses in production.

You do **not** need a host-style **`DATABASE_URL`** in `.env` for Compose: [`docker-compose.registry.yml`](../docker-compose.registry.yml) sets the in-network URL to the **`postgres`** service automatically. Optional: keep **`POSTGRES_USER`**, **`POSTGRES_PASSWORD`**, **`POSTGRES_DB`** aligned with what you use below.

### VPS Step 4 — Point Compose at your image tag

Use the same tag you pushed (example: **`yourdockerhubuser/journalism:1.0.0`**):

```bash
export DOCKER_IMAGE='yourdockerhubuser/journalism:1.0.0'
```

You can also put **`DOCKER_IMAGE=...`** in `.env` instead of exporting.

### VPS Step 5 — Pull the image

From the directory that contains **`docker-compose.yml`** (copied from `docker-compose.registry.yml`) and **`nginx/`**:

```bash
docker compose pull
```

### VPS Step 6 — (Optional) Clear dev-push markers if you restored a dev database

Only if this Postgres data came from a machine where **`pnpm dev`** ran against it:

```bash
docker compose up -d postgres
docker compose exec -T postgres psql -U payload -d journalism -c "DELETE FROM payload_migrations WHERE batch = -1;"
```

Adjust **`-U`** / **`-d`** if your **`POSTGRES_*`** values differ. Skip this on a **brand-new** empty volume.

### VPS Step 7 — Apply migrations on the VPS (required before first start)

Payload does **not** auto-run migrations on startup. You must apply them manually before starting the app for the first time, and again after any schema change.

The standalone Docker image does not include the Payload CLI, so migrations run from **your local machine** through an SSH tunnel.

**On the VPS** — temporarily expose Postgres to localhost:

```bash
# Edit docker-compose.yml to add this under the postgres service temporarily:
#   ports:
#     - '127.0.0.1:5433:5432'
docker compose up -d postgres
```

**On your local Mac — Tab 1** (leave running):

```bash
ssh -L 15432:127.0.0.1:5433 root@YOUR_VPS_IP -N
```

**On your local Mac — Tab 2:**

```bash
cd /path/to/this/repo
DATABASE_URL=postgres://payload:payload@127.0.0.1:15432/journalism pnpm payload migrate
```

You should see: `Migration 20260415_194243 applied successfully.`

After migrations succeed, remove the `ports:` block from the postgres service and proceed to VPS Step 8.

See **[deploy.md](deploy.md)** for the full ongoing deployment workflow including future schema changes.

### VPS Step 8 — Start Postgres, app, and nginx

```bash
docker compose up -d
docker compose ps
```

The app is served over HTTPS on port 443 via nginx (see [`nginx/default.conf`](../nginx/default.conf)).

**`NEXT_PUBLIC_SERVER_URL`** is fixed at **image build** time and also overridden at runtime in [`docker-compose.registry.yml`](../docker-compose.registry.yml). If your public URL changes, rebuild the image with the new URL, push, pull, and restart.

---

## Alternative: legacy `docker build` (native image arch)

Uses the Postgres container's **`127.0.0.1:5432`**. Does **not** use BuildKit, so **`--platform linux/amd64`** cross-build from an ARM Mac may be unreliable; prefer **Step 5** for amd64 VPS images from Apple Silicon.

```bash
docker compose up -d postgres
```

Complete Steps **2** and **3** above, then:

```bash
PG=$(docker compose ps -q postgres)

DOCKER_BUILDKIT=0 docker build --network=container:$PG \
  --build-arg DATABASE_URL='postgres://payload:payload@127.0.0.1:5432/journalism' \
  --build-arg PAYLOAD_SECRET='your-placeholder-secret-at-least-32-characters-long' \
  --build-arg NEXT_PUBLIC_SERVER_URL='https://your-production-domain.com' \
  -t yourdockerhubuser/journalism:1.0.0 \
  .
```

## Optional: `docker compose build app`

If your Docker version supports Compose's **`build.network: service:postgres`**, you can try:

```bash
docker compose up -d postgres
docker compose build app
```

If the build fails because BuildKit does not support that network mode, use **Step 5** (Buildx + **`host.docker.internal`**) or the **Alternative** section above instead.

## Fresh database only for builds (optional)

To remove **all** Postgres data and start clean (**irreversible**):

```bash
docker compose down -v
```

Then start again from **Step 1**. You will not have **`batch = -1`** rows until you run **`pnpm dev`** against that database again.
