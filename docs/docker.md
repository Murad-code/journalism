# Docker and VPS deployment

This project runs **Next.js + Payload** behind **Nginx**, with **PostgreSQL** for data and a Docker volume for **uploads** (`public/media`).

## Prerequisites

- Docker Engine 24+ and Docker Compose v2
- Copy [`.env.example`](../.env.example) to `.env` and set secrets (`PAYLOAD_SECRET`, `PREVIEW_SECRET`, etc.)

## Local development (without Docker)

1. Start PostgreSQL locally (or use a hosted instance).
2. Set `DATABASE_URL` to your instance, for example:  
   `postgresql://payload:payload@127.0.0.1:5432/journalism`
3. Set `NEXT_PUBLIC_SERVER_URL=http://localhost:3000` (include the port when using `pnpm dev`).
4. Install and run:

```bash
pnpm install
pnpm dev
```

5. Open `http://localhost:3000/admin` and create the first admin user if the database is empty.

## Run with Docker Compose (production-style)

1. In `.env`, point the app at the compose Postgres service and match credentials:

   - `DATABASE_URL=postgres://payload:payload@postgres:5432/journalism`
   - `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB` should match that URL.
   - `NEXT_PUBLIC_SERVER_URL=http://localhost` (no port: traffic goes through Nginx on **port 80**).

2. Build and start:

```bash
docker compose up --build
```

3. Visit `http://localhost` for the site and `http://localhost/admin` for Payload.

4. **First admin user:** with an empty database, open `/admin` and complete Payload’s first-user registration.

### Volumes

- `postgres_data`: database files.
- `media_uploads`: mounted at `/app/public/media` in the app container so uploads survive restarts.

## Deploy on a VPS (e.g. Hetzner)

1. Install Docker and Docker Compose on the server.
2. Clone the repository and copy `.env` (use strong secrets; set `NEXT_PUBLIC_SERVER_URL` to your public URL, e.g. `https://yourdomain.com`).
3. Open the firewall for **port 80** (and **443** when you add TLS).
4. Run:

```bash
docker compose up -d --build
```

5. Point your domain’s **A record** to the server IP.

### HTTPS (later)

Use Let’s Encrypt (Certbot on the host or an `nginx` sidecar) and extend [`nginx/default.conf`](../nginx/default.conf) with a `listen 443 ssl` server block and certificate paths. Terminate TLS at Nginx and keep talking HTTP to the `app` container on port 3000.

## Notes

- The app image uses Next **standalone** output (`output: 'standalone'` in `next.config.ts`).
- `pnpm build` talks to the database for static generation; ensure `DATABASE_URL` is available at build time for the Docker build, or adjust build args as needed.
