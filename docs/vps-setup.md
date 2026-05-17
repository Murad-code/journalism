# First-time VPS setup

Complete guide to provision a fresh Ubuntu VPS and get the application running from scratch. Every configuration file is included as a paste-ready code block. No files need to be copied from the local repo — everything is created directly on the server.

Once done, see [deploy.md](deploy.md) for all future deployments (code changes, schema changes, rollbacks).

---

## Sensitive values — replace before running

Every `YOUR_*` placeholder below maps to one of these:

| Placeholder | What it is | How to get it |
|---|---|---|
| `YOUR_VPS_IP` | VPS public IP address | VPS control panel |
| `YOUR_DOMAIN` | Apex domain without www, e.g. `sadiasinsights.co.uk` | Domain registrar |
| `YOUR_PAYLOAD_SECRET` | Payload signing secret — **must be ≥32 characters** | `openssl rand -base64 48` |
| `YOUR_PREVIEW_SECRET` | Draft preview auth token | `openssl rand -base64 32` |
| `YOUR_CRON_SECRET` | Scheduled publish auth token | `openssl rand -base64 32` |
| `YOUR_POSTGRES_PASSWORD` | Postgres password | `openssl rand -base64 32` |
| `YOUR_DOCKER_IMAGE` | Full image name and tag, e.g. `muradkamali/journalism:1.0.0` | Docker Hub after building |

---

## Prerequisites

- Fresh Ubuntu 22.04 or 24.04 VPS — minimum 1 GB RAM, 10 GB disk
- Root SSH access
- Domain with DNS control (Step 5)
- Docker image already built and pushed to Docker Hub (see [docker.md](docker.md))
- Local project repo on your Mac (needed for the migration step only — Step 13)

---

## Step 1 — SSH into the server

```bash
ssh root@YOUR_VPS_IP
```

All commands from here through Step 14 run **on the VPS** unless the step says otherwise.

---

## Step 2 — Update the system

```bash
apt update && apt upgrade -y
```

---

## Step 3 — Install Docker

```bash
curl -fsSL https://get.docker.com | sh
```

Docker 24+ ships with the Compose plugin — no separate install needed. Verify:

```bash
docker --version
docker compose version
```

---

## Step 4 — Configure UFW firewall

```bash
ufw allow 22    # SSH
ufw allow 80    # HTTP — also needed for Let's Encrypt renewal
ufw allow 443   # HTTPS
ufw enable
ufw status
```

Postgres never needs an internet-facing port — it stays on Docker's internal network only.

---

## Step 5 — Point your domain at the VPS

In your DNS control panel, add these records:

| Type | Name | Value |
|---|---|---|
| A | `@` (apex) | `YOUR_VPS_IP` |
| A or CNAME | `www` | `YOUR_VPS_IP` (or the apex domain) |

Wait for DNS to propagate before continuing. Verify it resolves:

```bash
dig +short YOUR_DOMAIN
dig +short www.YOUR_DOMAIN
# Both must return YOUR_VPS_IP before proceeding
```

**Do not proceed to Step 6 until both return the correct IP.** Let's Encrypt validates domain ownership via an HTTP request — if DNS isn't pointing at your VPS, certbot will fail.

---

## Step 6 — Create the deploy directory

```bash
mkdir -p /root/app/nginx
```

---

## Step 7 — Create the nginx config

**Sensitive values:** `YOUR_DOMAIN` — replace all 6 occurrences before running.

File location: `/root/app/nginx/default.conf`

```bash
cat > /root/app/nginx/default.conf << 'NGINXEOF'
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}

# Redirect all HTTP traffic to HTTPS on the canonical apex domain.
server {
    listen 80;
    server_name YOUR_DOMAIN www.YOUR_DOMAIN;
    return 301 https://YOUR_DOMAIN$request_uri;
}

# HTTPS — serve the app. www requests are caught by the redirect above.
server {
    listen 443 ssl;
    server_name YOUR_DOMAIN www.YOUR_DOMAIN;

    ssl_certificate     /etc/letsencrypt/live/YOUR_DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/YOUR_DOMAIN/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    client_max_body_size 25m;

    location / {
        proxy_pass http://app:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
    }
}
NGINXEOF
```

---

## Step 8 — Issue the SSL certificate

The stack is not started yet, so port 80 is free. Install certbot and get the cert:

**Sensitive values:** `YOUR_DOMAIN`

```bash
apt install -y certbot

certbot certonly --standalone \
  -d YOUR_DOMAIN \
  -d www.YOUR_DOMAIN
```

Certbot saves certs to `/etc/letsencrypt/live/YOUR_DOMAIN/`. The nginx config mounts this path automatically — no manual copying needed.

Confirm the cert was issued:

```bash
certbot certificates
# Should list YOUR_DOMAIN with an expiry date roughly 90 days out
```

Test auto-renewal (certbot configures this automatically):

```bash
certbot renew --dry-run
```

> **Future renewals while the stack is running:** nginx holds port 80, so stop it before renewing:
> ```bash
> docker compose -f /root/app/docker-compose.yml stop nginx
> certbot renew
> docker compose -f /root/app/docker-compose.yml start nginx
> ```

---

## Step 9 — Create docker-compose.yml

**Sensitive values:** `YOUR_DOMAIN` — replace before running.

File location: `/root/app/docker-compose.yml`

```bash
cat > /root/app/docker-compose.yml << 'COMPOSEEOF'
services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-payload}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-payload}
      POSTGRES_DB: ${POSTGRES_DB:-journalism}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U "$$POSTGRES_USER" -d "$$POSTGRES_DB"']
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - internal

  app:
    image: ${DOCKER_IMAGE}
    platform: linux/amd64
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    env_file:
      - .env
    environment:
      # Hardcoded to use the internal postgres service name — always takes priority over .env
      DATABASE_URL: postgres://${POSTGRES_USER:-payload}:${POSTGRES_PASSWORD:-payload}@postgres:5432/${POSTGRES_DB:-journalism}
      NODE_ENV: production
      NEXT_PUBLIC_SERVER_URL: https://YOUR_DOMAIN
    volumes:
      - media_uploads:/app/public/media
    expose:
      - '3000'
    networks:
      - internal

  nginx:
    image: nginx:1.27-alpine
    restart: unless-stopped
    depends_on:
      - app
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - ./nginx/default.conf:/etc/nginx/conf.d/default.conf:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
    networks:
      - internal

volumes:
  postgres_data:
  media_uploads:

networks:
  internal:
COMPOSEEOF
```

> `DATABASE_URL` is set here using the internal Docker service name (`postgres:5432`) so the app can always reach the database. The `${POSTGRES_USER}` and `${POSTGRES_PASSWORD}` values are read from `.env` at runtime.

---

## Step 10 — Generate secrets

Run these commands on the VPS to generate your secrets. Copy each output — you will paste them into the `.env` in the next step.

```bash
echo "PAYLOAD_SECRET:"  && openssl rand -base64 48
echo "PREVIEW_SECRET:"  && openssl rand -base64 32
echo "CRON_SECRET:"     && openssl rand -base64 32
echo "POSTGRES_PASSWORD:" && openssl rand -base64 32
```

---

## Step 11 — Create the production `.env`

**All values in this block are sensitive.** Replace every `YOUR_*` placeholder with the real values you generated in Step 10.

File location: `/root/app/.env`

```bash
cat > /root/app/.env << 'ENVEOF'
PAYLOAD_SECRET=YOUR_PAYLOAD_SECRET
PREVIEW_SECRET=YOUR_PREVIEW_SECRET
CRON_SECRET=YOUR_CRON_SECRET

POSTGRES_USER=payload
POSTGRES_PASSWORD=YOUR_POSTGRES_PASSWORD
POSTGRES_DB=journalism

DOCKER_IMAGE=YOUR_DOCKER_IMAGE
NEXT_PUBLIC_SERVER_URL=https://YOUR_DOMAIN
ENVEOF
```

Verify the file looks right (secrets will be visible — do not share this output):

```bash
cat /root/app/.env
```

> `PAYLOAD_SECRET` must be at least 32 characters. The app crashes on startup if it is shorter.
> `DATABASE_URL` is intentionally absent — it is set inside `docker-compose.yml` using the internal service name.

---

## Step 12 — Log in to Docker Hub and pull the image

**Sensitive values:** your Docker Hub username and password (entered interactively when prompted).

```bash
docker login

cd /root/app
docker compose pull
```

---

## Step 13 — Apply database migrations

The standalone Docker image does not include the Payload CLI, so migrations run from your **local Mac** through an SSH tunnel to the VPS Postgres. The app will crash on startup if this step is skipped.

### On the VPS — start postgres and temporarily expose it

```bash
cd /root/app
docker compose up -d postgres
```

Edit `docker-compose.yml` to add a host port to the postgres service. Open the file:

```bash
nano /root/app/docker-compose.yml
```

Find the `postgres:` service block and add a `ports:` entry directly under `networks:` (same indentation level as the other top-level fields in that service):

```yaml
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    ...
    networks:
      - internal
    ports:                          # ← add this
      - '127.0.0.1:5433:5432'      # ← and this (only visible to localhost)
```

Save and restart postgres:

```bash
docker compose restart postgres
```

### On your local Mac — Terminal 1 (leave this running)

**Sensitive values:** `YOUR_VPS_IP`

```bash
ssh -L 15432:127.0.0.1:5433 root@YOUR_VPS_IP -N
```

This tunnels your local port 15432 through SSH to the VPS Postgres.

### On your local Mac — Terminal 2

**Sensitive values:** `YOUR_POSTGRES_PASSWORD`, `YOUR_PAYLOAD_SECRET`

From the project root:

```bash
DATABASE_URL=postgres://payload:YOUR_POSTGRES_PASSWORD@127.0.0.1:15432/journalism \
  PAYLOAD_SECRET=YOUR_PAYLOAD_SECRET \
  pnpm payload migrate
```

Expected output: `Migration 20260415_194243 applied successfully.`

### On the VPS — remove the temporary port

Edit `docker-compose.yml` again and remove the two `ports:` lines you added, then restart postgres cleanly:

```bash
nano /root/app/docker-compose.yml
# remove the ports block from the postgres service

docker compose restart postgres
```

---

## Step 14 — Start the full stack

```bash
cd /root/app
docker compose up -d
docker compose ps
```

All three services (`postgres`, `app`, `nginx`) should show as `running (healthy)` or `running`.

---

## Step 15 — Verify the deployment

```bash
# Watch app startup logs — wait for "Ready" or "Listening on port 3000"
docker compose logs app --tail=50

# Test HTTP → HTTPS redirect
curl -I http://YOUR_DOMAIN
# Expected: HTTP/1.1 301, Location: https://YOUR_DOMAIN/

# Test HTTPS
curl -I https://YOUR_DOMAIN
# Expected: HTTP/2 200, x-powered-by: Next.js

# Test www → apex redirect
curl -I http://www.YOUR_DOMAIN
# Expected: HTTP/1.1 301, Location: https://YOUR_DOMAIN/
```

Visit `https://YOUR_DOMAIN/admin` in your browser to create the first admin user.

---

## Optional: harden SSH

Disable password authentication to block SSH brute-force attacks. First confirm your public key is already on the server — run this from your **local Mac**:

```bash
ssh-copy-id root@YOUR_VPS_IP
```

Then on the VPS, edit the SSH daemon config:

```bash
nano /etc/ssh/sshd_config
```

Find and change (or add) this line:

```
PasswordAuthentication no
```

Reload SSH:

```bash
systemctl reload sshd
```

**Open a second terminal and verify key-based login works before closing your current session.** If the key is not set up correctly, you will lock yourself out of the server.

---

## Optional: automated daily database backups

Run once on the VPS after the stack is healthy:

```bash
mkdir -p ~/backups

(crontab -l 2>/dev/null; echo "0 3 * * * docker compose -f /root/app/docker-compose.yml exec -T postgres pg_dump -U payload journalism | gzip > /root/backups/journalism_\$(date +\%Y\%m\%d).sql.gz && find /root/backups -name 'journalism_*.sql.gz' -mtime +14 -delete") | crontab -
```

Runs at 03:00 UTC daily and keeps 14 days of backups. For restore commands and off-VPS backup options see [deploy.md — Backup and restore](deploy.md#backup-and-restore).
