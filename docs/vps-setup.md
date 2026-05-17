# First-time VPS setup

One-time steps to provision a fresh Ubuntu VPS and get it ready to run the Docker stack. Once complete, follow [docker.md](docker.md) to deploy the application for the first time, then [deploy.md](deploy.md) for all future updates.

**Prerequisites:**
- A fresh Ubuntu 22.04 or 24.04 VPS (minimum 1 GB RAM, 10 GB disk)
- Root SSH access (`ssh root@YOUR_VPS_IP`)
- A domain with DNS control (see Step 3)
- Docker Hub credentials (for pulling the image)

---

## Step 1 — Update the system

```bash
ssh root@YOUR_VPS_IP
apt update && apt upgrade -y
```

---

## Step 2 — Install Docker

```bash
curl -fsSL https://get.docker.com | sh
```

Docker 24+ ships with the Compose plugin — no separate install needed. Verify both are present:

```bash
docker --version
docker compose version
```

---

## Step 3 — Configure UFW firewall

```bash
ufw allow 22    # SSH
ufw allow 80    # HTTP (also required for Let's Encrypt renewal)
ufw allow 443   # HTTPS
ufw enable
ufw status
```

Only ports 22, 80, and 443 should be open. Postgres never needs an internet-facing port — it stays on the Docker internal network.

---

## Step 4 — Point your domain at the VPS

In your DNS control panel, create:

| Record | Name | Value |
|---|---|---|
| A | `@` (apex domain) | `YOUR_VPS_IP` |
| A or CNAME | `www` | `YOUR_VPS_IP` (or apex domain) |

DNS propagation can take a few minutes to several hours. Verify before proceeding:

```bash
dig +short yourdomain.com       # should return YOUR_VPS_IP
dig +short www.yourdomain.com   # should return YOUR_VPS_IP
```

**Do not proceed to Step 5 until DNS resolves correctly.** Let's Encrypt validates ownership via an HTTP request to your domain — if DNS isn't pointing at your VPS, certbot will fail.

---

## Step 5 — Issue the SSL certificate

The stack is not running yet so port 80 is free. Install certbot and get the cert:

```bash
apt install -y certbot

certbot certonly --standalone \
  -d yourdomain.com \
  -d www.yourdomain.com
```

Certbot saves certs to `/etc/letsencrypt/live/yourdomain.com/`. The nginx config mounts this directory read-only — no manual copying needed.

Auto-renewal is configured automatically. Test it:

```bash
certbot renew --dry-run
```

> If you ever need to renew while the stack is running, nginx holds port 80. Stop nginx first, renew, then restart:
> ```bash
> docker compose -f /root/app/docker-compose.yml stop nginx
> certbot renew
> docker compose -f /root/app/docker-compose.yml start nginx
> ```

---

## Step 6 — Create the deploy directory

```bash
mkdir -p /root/app/nginx
```

---

## Step 7 — Copy deploy files from your local machine

Run these from the project root on your Mac:

```bash
scp docker-compose.registry.yml root@YOUR_VPS_IP:/root/app/docker-compose.yml
scp nginx/default.conf root@YOUR_VPS_IP:/root/app/nginx/default.conf
```

---

## Step 8 — Create the production `.env` on the VPS

```bash
nano /root/app/.env
```

Minimum required values:

```env
# Payload secrets — generate with: openssl rand -base64 48
PAYLOAD_SECRET=<at least 32 chars — app crashes on startup if shorter>
PREVIEW_SECRET=<openssl rand -base64 32>
CRON_SECRET=<openssl rand -base64 32>

# Postgres credentials (must match what is used during migrations)
POSTGRES_USER=payload
POSTGRES_PASSWORD=<strong random password>
POSTGRES_DB=journalism

# Docker image tag to pull
DOCKER_IMAGE=muradkamali/journalism:1.0.0

# Public site URL — must match what was baked into the image at build time
NEXT_PUBLIC_SERVER_URL=https://yourdomain.com
```

Generate secrets on the VPS:

```bash
openssl rand -base64 48   # PAYLOAD_SECRET
openssl rand -base64 32   # PREVIEW_SECRET, CRON_SECRET
```

`DATABASE_URL` is set directly in `docker-compose.yml` using the compose service name (`postgres:5432`), so it does not need to be in `.env`.

---

## Step 9 — Log in to Docker Hub

```bash
docker login
```

---

## Step 10 — Deploy the application for the first time

Follow [docker.md — Running the image on a VPS](docker.md#running-the-image-on-a-vps-pull-and-deploy) to:

1. Pull the image (`docker compose pull`)
2. Apply database migrations via SSH tunnel — **required before first start** (the app crashes without them)
3. Start the full stack (`docker compose up -d`)

Once running, check everything is healthy:

```bash
docker compose ps
docker compose logs -f app --tail=50
curl -I https://yourdomain.com
```

---

## Optional: harden SSH (recommended)

Disable password authentication to block SSH brute-force attempts. First confirm your public key is on the server:

```bash
# On your local machine
ssh-copy-id root@YOUR_VPS_IP
```

Then on the VPS, edit `/etc/ssh/sshd_config`:

```
PasswordAuthentication no
```

Reload SSH:

```bash
systemctl reload sshd
```

**Verify key-based login works in a second terminal before closing your current session** — if the key isn't set up correctly you will lock yourself out.

---

## Optional: set up automated database backups

Once the stack is running, set up a daily cron that keeps 14 backups (run once on VPS):

```bash
mkdir -p ~/backups
(crontab -l 2>/dev/null; echo "0 3 * * * docker compose -f /root/app/docker-compose.yml exec -T postgres pg_dump -U payload journalism | gzip > /root/backups/journalism_\$(date +\%Y\%m\%d).sql.gz && find /root/backups -name 'journalism_*.sql.gz' -mtime +14 -delete") | crontab -
```

This runs at 03:00 UTC daily. For restore commands and off-VPS backup options, see [deploy.md — Backup and restore](deploy.md#backup-and-restore).
