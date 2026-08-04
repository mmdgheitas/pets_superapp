# 🐾 Pets SuperApp — Backend (NestJS)

REST API for the Persian-language pet marketplace super-app (Iranian market).

- **NestJS 11** + TypeScript, REST only (no GraphQL/WebSocket — polling, 10s)
- **Prisma** ORM → **MySQL 8** (users, products, orders, payments, sellers…)
- **Redis** → OTP storage (120s TTL), refresh-token sessions, rate-limit counters, 60s hot-list API cache
- **JWT** auth: access `15m` + rotating refresh `7d` (hashed in Redis, revocable)
- **OTP via KaveNegar** (`verify/lookup` or plain SMS)
- **ZarinPal** payments (sandbox + mock modes; IDPay reserved as backup)
- **ArvanCloud Object Storage** (S3-compatible) uploads via Multer memory storage — never in MySQL
- **Swagger** at `/api/docs`, **Winston** logging, **Helmet**, **@nestjs/throttler** rate limiting
- **@nestjs/schedule** jobs: OTP cleanup, auto-cancel unpaid orders, payment/abandoned-cart reminders, daily reports
- **Jest** + **Supertest**: 24 unit tests + 5 smoke e2e tests

## Quick start (local dev)

```bash
cd backend
npm install
npx prisma generate

# 1. Infra (MySQL + Redis) — from the repo root:
docker compose up -d mysql redis

# 2. Env: .env.development ships safe dev defaults with MOCK SMS/payment/upload drivers.
#    Add KaveNegar/ZarinPal/S3 credentials when you have them — no code changes needed.

# 3. Database schema + demo data
npm run prisma:migrate        # creates MySQL schema (first run: --name init)
npm run prisma:seed           # admin (09120000000), demo seller, categories, products, banner

# 4. Run
npm run start:dev
# API:     http://localhost:3000/api/v1
# Swagger: http://localhost:3000/api/docs
```

### Dev-mode login without SMS credits

`KAVENEGAR_MOCK=true` (default in `.env.development`):

```
POST /api/v1/auth/otp/request  { "phone": "09120000000" }
→ { "message": "...", "expiresIn": 120, "devCode": "95431" }   # code returned for dev
POST /api/v1/auth/otp/verify   { "phone": "09120000000", "code": "95431" }
→ { "accessToken": "...", "refreshToken": "...", "user": { "role": "ADMIN", ... } }
```

### Dev-mode checkout without a gateway account

`ZARINPAL_MOCK=true` (set it in `.env.development`): `POST /payments/orders/:id/request`
returns a `paymentUrl` pointing straight at the callback with `Status=OK` —
the whole purchase flow (order → payment → commission → notifications) works offline.

## Module map (`src/modules`)

| Module | Endpoints (prefix `/api/v1`) | Notes |
| --- | --- | --- |
| `auth` | `POST /auth/otp/request`, `POST /auth/otp/verify`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me` | OTP 120s, 5 tries, Redis rate limit 3/10min + throttler |
| `users` | `GET/PATCH /users/me`, `POST /users/me/avatar`, `/users/me/addresses*` | addresses CRUD + default |
| `pets` | `GET/POST /pets`, `PATCH/DELETE /pets/:id` | user’s pets on profile |
| `categories` | public `GET /categories`, `GET /categories/:slug`; admin CRUD | 2-level tree |
| `products` | public list/detail/featured; seller CRUD (`/products`, `/products/mine`) | search/filters/sort, 60s Redis cache |
| `sellers` | `POST /sellers/register`, `/sellers/me`, `/me/dashboard`, `/me/sales-report`, public `shops/:slug` | PENDING→APPROVED via admin |
| `orders` (+cart) | `/cart*`, `POST /orders/checkout`, `GET /orders`, `GET /orders/:id`, `POST /orders/:id/cancel` | atomic stock, per-item commission snapshot |
| `payments` | `POST /payments/orders/:id/request`, public `GET /payments/callback`, `GET /payments/me` | ZarinPal v4, idempotent callback |
| `admin` | dashboard, users, seller approve/reject/suspend, product moderation, banners, payments, commission + daily reports, tickets | `Role.ADMIN` guard |
| `reviews` | `GET/POST /products/:id/reviews` | upsert per user, aggregates recomputed |
| `wishlist` | `GET/POST /wishlist`, `DELETE /wishlist/:productId` | idempotent |
| `chat` | `/chats*`, `GET /chats/:id/messages?after=…` | buyer↔seller, 10s polling via `after` |
| `notifications` | list, unread-count (polling), read/read-all, device-token | in-app + FCM push |
| `upload` | `POST /upload/image(s)` | S3 (ArvanCloud) or mock driver |
| `tasks` | scheduled jobs | every minute / 5 min / hourly / 00:05 daily |

## Key flows

**OTP login** — code bcrypt-hashed into Redis (`otp:{phone}`, TTL 120s), single-use; refresh tokens
sha256-keyed in Redis for instant revocation; rotation on each refresh.

**Checkout** — prices re-read from MySQL (never from client); stock reserved atomically
(`updateMany … stock >= qty`) inside one transaction; commission snapshotted per item from
`seller.commissionRate` (fallback `DEFAULT_COMMISSION_RATE`); cart cleared; unpaid orders
auto-cancel after `ORDER_PAYMENT_TIMEOUT_MINUTES` with stock restock.

**Payment** — `request.json` → `authority` saved → browser redirects to gateway →
`callback` verifies (`code 100/101`) → payment `SUCCESS` + order `PAID`, `soldCount` incremented,
buyer + sellers notified (in-app + FCM + email). Callback is idempotent.

**Chat polling** — clients poll `GET /chats/:id/messages?after=<serverTime of last response>`
every 10s; `serverTime` is included in every response to avoid clock skew.

## Tests

```bash
npm test           # 24 unit tests (auth/OTP, orders+commission, payments, products)
npm run test:e2e   # 5 smoke tests: full module graph + validation + guards (no DB needed)
```

## Conventions per spec

| Rule | Implementation |
| --- | --- |
| Versioned APIs | URI versioning → `/api/v1` |
| class-validator everywhere | Global `ValidationPipe` (whitelist + forbidNonWhitelisted) |
| No images in MySQL | Multer memory → ArvanCloud S3, only URLs persisted |
| OTP expiry 2 min | Redis TTL 120s (cleanup cron sweeps anomalies) |
| Rate limit OTP | Redis counter (3/10min) + `@Throttle(5/10min)` |
| Swagger for every module | `@ApiTags` + decorators on all controllers; UI at `/api/docs` |
| Polling only | `after`-based chat, unread-count, order status endpoints; no WS |

## Deliberate micro-deviations (documented, spec intent preserved)

1. `bcrypt` → **`bcryptjs`** (pure-JS drop-in, same API). Native builds break on some CI/Alpine
   setups; OTP codes/refresh tokens are still bcrypt-hashed.
2. `kavenegar` npm wrapper → **direct vendor REST** (`api.kavenegar.com`) with timeout + mock mode —
   the unofficial wrapper is unmaintained/untyped; identical API surface.
3. Prisma engines download is blocked in some sandboxes: `prisma generate` works normally wherever
   `binaries.prisma.sh` is reachable (dev laptops, CI, Docker build).

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run start:dev` | watch mode |
| `npm run build` / `start:prod` | compile / run `dist` |
| `npm test` / `test:e2e` | unit / smoke |
| `npm run prisma:migrate[:deploy]` | dev / prod migrations |
| `npm run prisma:seed` | demo data |
