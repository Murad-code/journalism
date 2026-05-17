# Production state

Live state tracker for the VPS deployment. For deployment instructions see [deploy.md](deploy.md). For build instructions see [docker.md](docker.md).

---

## Deployment status (updated 2026-05-17)

**Site is live at `https://sadiasinsights.co.uk`** — all three containers running, HTTPS working, HTTP→HTTPS redirect confirmed.

### VPS details

| Item | Value |
|---|---|
| IP | `77.68.54.239` |
| Deploy directory | `/root/app/` |
| Compose file | `/root/app/docker-compose.yml` |
| Image | `muradkamali/journalism:1.0.0` (linux/amd64) |
| SSL cert | Let's Encrypt via certbot, expires 2026-08-15, auto-renewal configured |
| Database | Postgres 16 in Docker, volume `app_postgres_data`, migrations applied |
| Media uploads | Docker volume `app_media_uploads` |

### What is confirmed working

- [x] Multi-stage Dockerfile, non-root `nextjs` user (UID 1001)
- [x] `output: 'standalone'` — Dockerfile uses `node server.js`
- [x] All three services running with `restart: unless-stopped`
- [x] Runtime `DATABASE_URL` uses compose service name `postgres:5432`
- [x] Postgres not exposed to internet — internal Docker network only
- [x] App not directly exposed — only reachable through nginx
- [x] Named volumes: `app_postgres_data` and `app_media_uploads` — survive container recreation
- [x] `depends_on: condition: service_healthy` — app waits for healthy postgres
- [x] `.env` is gitignored and not committed
- [x] Nginx: HTTP→HTTPS redirect, correct proxy headers, WebSocket support, 25m upload limit
- [x] Let's Encrypt cert issued, certbot auto-renewal active
- [x] UFW firewall enabled: ports 22, 80, 443 open only
- [x] Full schema migrations applied (`20260415_194243`)
- [x] `www.sadiasinsights.co.uk` — CNAME added, cert expanded, nginx canonical redirect to apex

### Remaining action items

- [ ] **Rebuild image** — current image has `https://www.sadiasinsights.co.uk` baked into the client JS bundle from before the www DNS was confirmed. Runtime env override covers server-side code. Fix by rebuilding with `NEXT_PUBLIC_SERVER_URL=https://sadiasinsights.co.uk` in local `.env` and running `scripts/docker-build-amd64.sh --push`.
- [ ] **Automated backups** — no cron job exists yet. One command to set up: see [deploy.md — backup and restore](deploy.md#backup-and-restore).
- [ ] **Log rotation** — Docker json-file logs will grow unbounded. Add to each service in `/root/app/docker-compose.yml`:
  ```yaml
  logging:
    driver: "json-file"
    options:
      max-size: "10m"
      max-file: "3"
  ```
- [ ] **Off-VPS backups** — volume backups on the same disk don't protect against disk failure. Copy to S3, Backblaze B2, or a second server.

---

## Quick reference (run on VPS)

```bash
cd /root/app

docker compose ps                        # service status
docker compose logs -f app --tail=50     # app logs
docker compose logs -f nginx --tail=20   # nginx logs
docker compose logs -f postgres --tail=20

docker compose restart app               # restart app only
docker compose up -d                     # start/update all services
docker compose pull app                  # pull latest image (before up -d)

docker compose exec postgres psql -U payload journalism   # psql shell

# Test live site
curl -I https://sadiasinsights.co.uk
curl -I http://www.sadiasinsights.co.uk   # should 301 → https://sadiasinsights.co.uk
```
