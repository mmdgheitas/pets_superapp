# Infrastructure

Phase 1–2: **Docker Compose** on a single ArvanCloud VM. Phase 3+: Kubernetes.

## Components

- `nginx/api.conf` — reverse proxy `api.petshop.ir` → `api:3000` with Let's Encrypt TLS.
- `/docker-compose.yml` — MySQL 8.4 + Redis 7 (+ API with the `app` profile).
- `/backend/Dockerfile` — multi-stage production build of the API.

## Production bootstrap (ArvanCloud VM)

```bash
# 1. Install Docker + Compose plugin
curl -fsSL https://get.docker.com | sh

# 2. Clone and configure secrets
git clone https://github.com/mmdgheitas/pets_superapp.git && cd pets_superapp
cp backend/.env.example backend/.env.production
$EDITOR backend/.env.production        # real secrets: DB, JWT, KaveNegar, ZarinPal, S3, FCM, SMTP
# IMPORTANT: backend/.env.production MUST NOT be committed with real secrets in a public repo;
# provide it via CI secrets / VM provisioning in practice.

# 3. Database + cache
docker compose up -d mysql redis

# 4. API (builds, runs `prisma migrate deploy`, launches)
docker compose --profile app up -d --build

# 5. Nginx + TLS
sudo cp infra/nginx/api.conf /etc/nginx/sites-available/api.conf
sudo ln -s /etc/nginx/sites-available/api.conf /etc/nginx/sites-enabled/
sudo certbot --nginx -d api.petshop.ir
sudo nginx -t && sudo systemctl reload nginx

# 6. Seed demo data (optional)
docker exec pets-api npx ts-node prisma/seed.ts
```

## Environments

| File                     | Purpose                                     |
| ------------------------ | ------------------------------------------- |
| `backend/.env.development` | local dev (mock SMS/payment/upload drivers) |
| `backend/.env.test`        | test DB/Redis DB 1, mock drivers            |
| `backend/.env.production`  | real drivers; secrets injected at deploy    |

## Backups (Phase 1, simple)

```bash
# nightly MySQL dump via cron
0 3 * * * docker exec pets-mysql sh -c 'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" pets_superapp' | gzip > /backups/pets-$(date +\%F).sql.gz
```

## Kubernetes (Phase 3+)

Planned layout: Deployments (api ×N replicas), StatefulSet or managed MySQL/Redis,
Ingress-Nginx + cert-manager, HPA on CPU, CronJobs mirroring `TasksService` schedules.
The `api` container is already stateless (sessions/OTP in Redis, files in object storage)
so it is K8s-ready by design.
