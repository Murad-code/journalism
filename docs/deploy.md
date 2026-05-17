# Deploying to production

Quick reference for pushing changes to the live VPS. For first-time VPS setup, see [docker.md](docker.md) and [production.md](production.md).

## Stack at a glance

| What | Where |
|---|---|
| VPS | `77.68.54.239`, deploy dir `/root/app/` |
| Live URL | `https://sadiasinsights.co.uk` |
| Docker image | `muradkamali/journalism:1.0.0` (linux/amd64) |
| Compose file on VPS | `/root/app/docker-compose.yml` |
| SSL | Let's Encrypt, auto-renews, expires 2026-08-15 |
| Database | Postgres 16 in Docker, volume `app_postgres_data` |

---

## Scenario A — Code change only (no schema change)

Use this when you edited components, styles, content logic, or anything that does **not** add/remove Payload collections or fields.

```bash
# 1. Make and test your changes locally (pnpm dev)

# 2. Build and push a new amd64 image
#    Bump the version tag in .env: DOCKER_IMAGE=muradkamali/journalism:1.0.1
scripts/docker-build-amd64.sh --push

# 3. SSH into VPS
ssh root@77.68.54.239

# 4. Pull and restart (postgres stays up — no downtime gap)
cd /root/app
docker compose pull app
docker compose up -d
docker compose logs -f app --tail=30
```

---

## Scenario B — Schema change (added/changed a Payload collection or field)

Migrations **must run before the new image starts**. The app will crash on startup if tables don't match the schema.

### Step 1 — Create and apply the migration locally

```bash
# Generate the migration file
pnpm payload migrate:create --name describe_your_change

# Apply it to your local DB
docker compose up -d postgres
DATABASE_URL=postgres://payload:payload@127.0.0.1:5433/journalism \
  PAYLOAD_SECRET=any-32-char-placeholder \
  pnpm payload migrate

# Regenerate types
pnpm generate:types
```

### Step 2 — Build and push a new image

The build queries the (now-migrated) local DB during `next build`.

```bash
# Bump the version tag in .env: DOCKER_IMAGE=muradkamali/journalism:1.0.X
scripts/docker-build-amd64.sh --push
```

### Step 3 — Apply migration to the production DB via SSH tunnel

The standalone Docker image does not include the Payload CLI, so migrations run from your local machine through an SSH tunnel to the VPS Postgres.

**On the VPS** — temporarily add a host port to postgres in `/root/app/docker-compose.yml`:

```yaml
# Add under the postgres service:
ports:
  - '127.0.0.1:5433:5432'
```

Then restart postgres:

```bash
docker compose restart postgres
```

**Terminal 1 — open tunnel (leave running):**

```bash
ssh -L 15432:127.0.0.1:5433 root@77.68.54.239 -N
```

**Terminal 2 — run the migration:**

```bash
DATABASE_URL=postgres://payload:payload@127.0.0.1:15432/journalism pnpm payload migrate
# Expected: "Migration XXXXXXXX_XXXXXX applied successfully."
```

**On VPS — remove the temp port and restart postgres cleanly:**

```bash
# Remove the ports block from docker-compose.yml, then:
docker compose restart postgres
```

### Step 4 — Deploy the new image

```bash
# On VPS
cd /root/app
docker compose pull app
docker compose up -d
docker compose logs -f app --tail=30
```

---

## Updating the VPS deploy files

If you change [`docker-compose.registry.yml`](../docker-compose.registry.yml) or [`nginx/default.conf`](../nginx/default.conf) in this repo, copy them to the VPS:

```bash
scp docker-compose.registry.yml root@77.68.54.239:/root/app/docker-compose.yml
scp nginx/default.conf root@77.68.54.239:/root/app/nginx/default.conf

# Reload nginx config without downtime (if only nginx/default.conf changed)
ssh root@77.68.54.239 "docker compose -C /root/app exec nginx nginx -s reload"
```

---

## Checking the live site

```bash
ssh root@77.68.54.239

# Service status
docker compose ps

# App logs
docker compose logs -f app --tail=50

# All logs
docker compose logs -f --tail=20

# Test HTTPS
curl -I https://sadiasinsights.co.uk
```

---

## Rolling back to a previous image

```bash
# On VPS
cd /root/app

# Edit docker-compose.yml — change the image tag back to the previous version
# e.g. muradkamali/journalism:1.0.0
nano docker-compose.yml

docker compose pull app
docker compose up -d
```

If the rollback also reverses a schema change, you will need to manually revert the migration in the DB. This is rare — prefer fixing forward.

---

## SSL certificate renewal

Certbot auto-renews. To check or force a renewal manually:

```bash
# On VPS
certbot renew --dry-run    # check it would succeed
certbot renew              # force renew if <30 days remaining
docker compose exec nginx nginx -s reload
```

---

## Backup and restore

```bash
# Manual postgres backup
docker compose exec -T postgres pg_dump -U payload journalism \
  | gzip > ~/backups/journalism_$(date +%Y%m%d_%H%M%S).sql.gz

# Manual media backup
docker run --rm -v app_media_uploads:/data -v ~/backups:/backup alpine \
  tar czf /backup/media_$(date +%Y%m%d).tar.gz -C /data .

# Restore postgres
gunzip < ~/backups/journalism_TIMESTAMP.sql.gz \
  | docker compose exec -T postgres psql -U payload journalism

# Restore media
docker run --rm -v app_media_uploads:/data -v ~/backups:/backup alpine \
  tar xzf /backup/media_TIMESTAMP.tar.gz -C /data
```

Set up automated daily backups (run once on VPS):

```bash
mkdir -p ~/backups
(crontab -l 2>/dev/null; echo "0 3 * * * docker compose -f /root/app/docker-compose.yml exec -T postgres pg_dump -U payload journalism | gzip > /root/backups/journalism_\$(date +\%Y\%m\%d).sql.gz && find /root/backups -name 'journalism_*.sql.gz' -mtime +14 -delete") | crontab -
```
