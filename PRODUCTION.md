# Production Deployment Notes

Working doc tracking the current state of the VPS deployment and what still needs to be done.
Build/push workflow lives in [DOCKER.md](DOCKER.md). Env var reference lives in [.env.example](.env.example).

---

## Deployment status (updated 2026-05-17)

**Site is live at `https://sadiasinsights.co.uk`** — all three containers running, HTTPS working, HTTP→HTTPS redirect confirmed.

### VPS details
- **IP**: `77.68.54.239`
- **Deploy directory**: `/root/app/`
- **Compose file**: `/root/app/docker-compose.yml`
- **Image**: `muradkamali/journalism:1.0.0` (linux/amd64)
- **SSL cert**: Let's Encrypt via certbot, expires 2026-08-15, auto-renewal configured
- **Database**: Postgres 16 in Docker, volume `app_postgres_data`, migrations applied

### What is solid

- [x] Multi-stage Dockerfile, non-root `nextjs` user (UID 1001)
- [x] `output: 'standalone'` — Dockerfile uses `node server.js`
- [x] All three services running with `restart: unless-stopped`
- [x] Runtime `DATABASE_URL` uses compose service name `postgres:5432`
- [x] Postgres not exposed to internet — internal Docker network only
- [x] App not directly exposed — only reachable through nginx
- [x] Named volumes: `app_postgres_data` and `app_media_uploads` — survive container recreation
- [x] `depends_on: condition: service_healthy` — app waits for healthy postgres
- [x] `.env` is gitignored, not committed
- [x] Nginx: HTTP→HTTPS redirect, correct proxy headers, WebSocket support, 25m upload limit
- [x] Let's Encrypt cert issued, certbot auto-renewal active
- [x] UFW firewall enabled: ports 22, 80, 443 open only
- [x] Full schema migrations applied (`20260415_194243`)

### Remaining gaps (ordered by priority)

- [ ] **Rebuild image with correct `NEXT_PUBLIC_SERVER_URL`** — current image has `https://www.sadiasinsights.co.uk` baked into the client bundle (runtime env override covers server-side code but not client JS). Rebuild when convenient using `scripts/docker-build-amd64.sh --push` with `NEXT_PUBLIC_SERVER_URL=https://sadiasinsights.co.uk` in local `.env`.
- [ ] **No automated backups** — see backup cron command in [DEPLOY.md](DEPLOY.md#backup-and-restore)
- [x] **`www` subdomain** — CNAME added, cert expanded, nginx updated with canonical redirect
- [ ] **Local `.env` has short `PAYLOAD_SECRET`** — only matters for local dev, but regenerate before any future local → production sync
- [ ] **No log rotation** — Docker json-file logs will grow unbounded. Add `logging: driver: json-file, options: max-size: 10m, max-file: "3"` to each service in compose.
- [ ] **Off-VPS backups** — local volume backups don't protect against disk failure. Copy to S3/Backblaze/remote server.
- [ ] **`X-Forwarded-Proto` header wrong if SSL terminates upstream** — nginx currently sends `$scheme` which is always `http` at nginx level (see SSL section)
- [ ] **No automated backups** — postgres and media volumes need a cron backup
- [ ] **No log rotation** — default Docker json-file driver will grow unbounded on a long-running VPS
- [ ] **`POSTGRES_PASSWORD` defaults to `payload`** — change before production
- [ ] **`DOCKER_IMAGE` must be set in VPS `.env`** — required by `docker-compose.registry.yml`
- [ ] **Off-VPS backup destination** — local backup files don't help if disk fails

---

## Deployment checklist

Work through these in order. Tick as you go.

### Phase 1 — Secrets and config (local machine)

- [ ] Generate a production `PAYLOAD_SECRET`:
  ```bash
  openssl rand -base64 48
  ```
  Store in your password manager. Never reuse across environments.

- [ ] Decide on your production domain and set `NEXT_PUBLIC_SERVER_URL` in your build environment.
  This value is **baked into the Docker image at build time** — changing it after the build requires a rebuild.
  Example: `https://yourdomain.com` (no trailing slash).

- [ ] Rebuild the image with correct production values (see [DOCKER.md](DOCKER.md)):
  ```bash
  # In .env, set:
  #   NEXT_PUBLIC_SERVER_URL=https://yourdomain.com
  #   PAYLOAD_SECRET=<new 48-char secret>
  #   DOCKER_IMAGE=youruser/journalism:1.0.0
  scripts/docker-build-amd64.sh --push
  ```

### Phase 2 — VPS preparation

- [ ] Verify Docker and Docker Compose are installed:
  ```bash
  docker --version
  docker compose version
  ```

- [ ] Verify Docker daemon starts on boot:
  ```bash
  sudo systemctl is-enabled docker
  # If not enabled:
  sudo systemctl enable docker
  ```

- [ ] Create deployment directory and copy files from local machine:
  ```bash
  # Run from your local machine:
  ssh user@YOUR_VPS_IP "mkdir -p ~/journalism"
  scp docker-compose.registry.yml user@YOUR_VPS_IP:~/journalism/
  scp -r nginx/ user@YOUR_VPS_IP:~/journalism/
  ```

- [ ] Create the production `.env` **on the VPS** (do not copy from local — local has dev values):
  ```bash
  # SSH into VPS, then:
  nano ~/journalism/.env
  ```

  Minimum required content:
  ```dotenv
  # Runtime secrets
  PAYLOAD_SECRET=<generated above, ≥32 chars>
  DATABASE_URL=postgres://appuser:STRONG_PASSWORD@postgres:5432/journalism

  # Baked into image — must match what was used during docker build
  NEXT_PUBLIC_SERVER_URL=https://yourdomain.com

  # Postgres container config (must match DATABASE_URL credentials above)
  POSTGRES_USER=appuser
  POSTGRES_PASSWORD=STRONG_PASSWORD
  POSTGRES_DB=journalism
  POSTGRES_HOST_PORT=5433

  # Image to pull
  DOCKER_IMAGE=youruser/journalism:1.0.0

  # Optional
  PREVIEW_SECRET=<random string>
  CRON_SECRET=<random string>
  ```

  Lock down permissions:
  ```bash
  chmod 600 ~/journalism/.env
  ```

### Phase 3 — SSL (decide which scenario applies)

**→ Skip to the scenario that matches your setup. Only do one.**

#### Scenario A — VPS provider manages SSL (Hetzner LB, DigitalOcean LB, etc.)

Your provider terminates HTTPS and forwards HTTP to your VPS on port 80.
It will send `X-Forwarded-Proto: https` to nginx, but nginx currently overwrites it with `$scheme` (which is `http`).

Fix in `nginx/default.conf` — change the `X-Forwarded-Proto` line:
```nginx
# Before:
proxy_set_header X-Forwarded-Proto $scheme;
# After:
proxy_set_header X-Forwarded-Proto $http_x_forwarded_proto;
```

No other nginx changes needed. Port 443 does not need to be exposed from the nginx container.

- [ ] Apply the `X-Forwarded-Proto` fix above
- [ ] Confirm provider LB is configured to forward to `YOUR_VPS_IP:80`

#### Scenario B — Nginx manages SSL directly (Let's Encrypt / certbot)

- [ ] On the VPS host, install certbot and obtain a certificate:
  ```bash
  sudo apt install certbot
  sudo certbot certonly --standalone -d yourdomain.com
  # Certs land at /etc/letsencrypt/live/yourdomain.com/
  ```

- [ ] Update `docker-compose.registry.yml` nginx service to expose 443 and mount certs:
  ```yaml
  nginx:
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - ./nginx/default.conf:/etc/nginx/conf.d/default.conf:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
      - /var/lib/letsencrypt:/var/lib/letsencrypt:ro
  ```

- [ ] Replace `nginx/default.conf` with the HTTPS version:
  ```nginx
  map $http_upgrade $connection_upgrade {
      default upgrade;
      '' close;
  }

  upstream app_upstream {
      server app:3000;
      keepalive 32;
  }

  server {
      listen 80;
      server_name yourdomain.com;
      return 301 https://$host$request_uri;
  }

  server {
      listen 443 ssl;
      server_name yourdomain.com;

      ssl_certificate     /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
      ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
      ssl_protocols       TLSv1.2 TLSv1.3;
      ssl_prefer_server_ciphers on;

      client_max_body_size 25m;

      location / {
          proxy_pass http://app_upstream;
          proxy_http_version 1.1;
          proxy_set_header Host $host;
          proxy_set_header X-Real-IP $remote_addr;
          proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
          proxy_set_header X-Forwarded-Proto $scheme;
          proxy_set_header Upgrade $http_upgrade;
          proxy_set_header Connection $connection_upgrade;
      }
  }
  ```

- [ ] Set up certbot auto-renewal on the host:
  ```bash
  # Add to host crontab (crontab -e):
  0 3 * * 1 certbot renew --quiet && docker compose -f ~/journalism/docker-compose.registry.yml exec nginx nginx -s reload
  ```

#### Scenario C — Cloudflare proxy

- [ ] Same `X-Forwarded-Proto` fix as Scenario A:
  ```nginx
  proxy_set_header X-Forwarded-Proto $http_x_forwarded_proto;
  ```
- [ ] In Cloudflare dashboard: set SSL/TLS mode to **Full** (not Flexible)
- [ ] DNS A record points to your VPS IP, Proxy status: Proxied (orange cloud)

### Phase 4 — First deploy

Run on the VPS:

```bash
cd ~/journalism

# Pull the image
docker compose -f docker-compose.registry.yml pull

# Start postgres only, wait for healthy
docker compose -f docker-compose.registry.yml up -d postgres
docker compose -f docker-compose.registry.yml ps
# postgres should show "(healthy)" before continuing

# Run migrations against the production DB (REQUIRED before starting app)
docker compose -f docker-compose.registry.yml run --rm \
  -e DATABASE_URL=postgres://appuser:STRONG_PASSWORD@postgres:5432/journalism \
  app node_modules/.bin/payload migrate

# Start everything
docker compose -f docker-compose.registry.yml up -d

# Watch logs
docker compose -f docker-compose.registry.yml logs -f app
docker compose -f docker-compose.registry.yml logs -f nginx
```

- [ ] Postgres healthy before starting app
- [ ] Migrations ran without errors
- [ ] App logs show no DB connection errors
- [ ] Site loads at `https://yourdomain.com`
- [ ] Payload admin accessible at `https://yourdomain.com/admin`

### Phase 5 — Verify persistence

```bash
# Volumes exist
docker volume ls | grep journalism

# Restart app and verify it reconnects (does not re-run migrations)
docker compose -f docker-compose.registry.yml restart app
docker compose -f docker-compose.registry.yml logs -f app
```

- [ ] `journalism_postgres_data` volume present
- [ ] `journalism_media_uploads` volume present
- [ ] App reconnects after restart without errors

### Phase 6 — Backups

- [ ] Create backup directory on VPS:
  ```bash
  mkdir -p ~/backups
  ```

- [ ] Test a manual postgres backup:
  ```bash
  docker compose -f ~/journalism/docker-compose.registry.yml exec -T postgres \
    pg_dump -U appuser journalism | gzip > ~/backups/journalism_$(date +%Y%m%d_%H%M%S).sql.gz
  ls -lh ~/backups/
  ```

- [ ] Test a manual media backup:
  ```bash
  docker run --rm \
    -v journalism_media_uploads:/data \
    -v ~/backups:/backup \
    alpine tar czf /backup/media_$(date +%Y%m%d).tar.gz -C /data .
  ```

- [ ] Add automated daily backup cron (`crontab -e` on VPS):
  ```bash
  # Postgres — daily at 3:00am, keep 14 days
  0 3 * * * docker compose -f /home/YOUR_USER/journalism/docker-compose.registry.yml exec -T postgres pg_dump -U appuser journalism | gzip > /home/YOUR_USER/backups/journalism_$(date +\%Y\%m\%d).sql.gz && find /home/YOUR_USER/backups -name "journalism_*.sql.gz" -mtime +14 -delete

  # Media — daily at 3:30am, keep 14 days
  30 3 * * * docker run --rm -v journalism_media_uploads:/data -v /home/YOUR_USER/backups:/backup alpine tar czf /backup/media_$(date +\%Y\%m\%d).tar.gz -C /data . && find /home/YOUR_USER/backups -name "media_*.tar.gz" -mtime +14 -delete
  ```

- [ ] (Later) Copy backups off-VPS to S3, Backblaze B2, or a second server

### Phase 7 — Log rotation (optional but recommended)

Add to each service in `docker-compose.registry.yml` to prevent disk fill:
```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

- [ ] Added to postgres service
- [ ] Added to app service
- [ ] Added to nginx service

---

## Updating to a new image version

When you push a new image tag:

```bash
cd ~/journalism

# 1. If schema changed: run migrations first
docker compose -f docker-compose.registry.yml run --rm \
  -e DATABASE_URL=postgres://appuser:STRONG_PASSWORD@postgres:5432/journalism \
  app node_modules/.bin/payload migrate

# 2. Update DOCKER_IMAGE in .env to new tag, then:
docker compose -f docker-compose.registry.yml pull
docker compose -f docker-compose.registry.yml up -d   # rolling restart, postgres stays up

# 3. Check logs
docker compose -f docker-compose.registry.yml logs -f app
```

**Rule**: always run migrations before starting the new image if schema changed.
If no schema changes, skip step 1.

---

## Restore from backup

```bash
# Restore postgres
gunzip < ~/backups/journalism_TIMESTAMP.sql.gz | \
  docker compose -f ~/journalism/docker-compose.registry.yml exec -T postgres \
  psql -U appuser journalism

# Restore media
docker run --rm \
  -v journalism_media_uploads:/data \
  -v ~/backups:/backup \
  alpine tar xzf /backup/media_TIMESTAMP.tar.gz -C /data
```

---

## Quick reference commands

```bash
# All from ~/journalism on the VPS
alias dc='docker compose -f docker-compose.registry.yml'

dc ps                        # service status
dc logs -f app               # app logs
dc logs -f nginx             # nginx logs
dc logs -f postgres          # postgres logs
dc restart app               # restart app only
dc up -d                     # start/update all services
dc pull                      # pull latest image
dc exec postgres psql -U appuser journalism   # psql shell
```
