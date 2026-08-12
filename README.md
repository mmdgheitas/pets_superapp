# پت‌شاپ — Pet Marketplace Super-App

A production-minded **multi-sided marketplace** for the Iranian pet-care market: buyers, sellers, and operators share one REST API, a Persian RTL storefront, and a Flutter client.

The Phase-1 goal is a complete, demoable **money loop** — OTP login → catalog → cart → checkout → **ZarinPal** payment → platform commission → order, notification, and chat — without requiring live SMS, payment, or storage credentials.

[Architecture](#architecture) · [Features](#product-surface) · [Stack](#tech-stack) · [Quick start](#quick-start) · [Design notes](#engineering-notes)

```
OTP (KaveNegar)  →  JWT access 15m / refresh 7d
Catalog + cart   →  atomic stock reservation
ZarinPal pay     →  commission snapshot per line item
Cron jobs        →  auto-cancel, reminders, daily GMV report
```

---

## Why this exists

Pet supplies in Iran are still sold through fragmented shops and Instagram pages. پت‌شاپ is a **commission marketplace** that lets independent sellers list food, toys, and care products while the platform owns checkout, settlement math, and trust (OTP identity, seller KYC, product moderation).

This repository is the full vertical slice of that product — not a UI mock, and not an isolated CRUD API.

| Actor | What they can do |
| --- | --- |
| **Customer** | Phone OTP login, browse/search, wishlist, cart, checkout, pay, track orders (10s poll), review, chat with the seller |
| **Seller** | Register a shop, wait for admin approval, publish products, see payouts and a 30-day sales chart |
| **Admin** | Approve/reject/suspend sellers, moderate products, manage categories & banners, inspect payments, answer tickets, read daily reports |

---

## Architecture

```
┌─────────────┐   ┌──────────────┐              ┌─────────────────────────────┐
│  Flutter    │   │  Next.js 15  │    HTTPS     │  Nginx + Let's Encrypt      │
│  app (fa)   │   │  storefront  │ ───────────► │  api.petshop.ir             │
│  Riverpod   │   │  RTL / ISR   │              └──────────────┬──────────────┘
└─────────────┘   └──────────────┘                             │
                                                               ▼
                                                NestJS 11  REST  /api/v1
                                                stateless · horizontally scalable
                     ┌────────────────┬─────────┴────────┬────────────────┐
                     ▼                ▼                  ▼                ▼
                  MySQL 8          Redis 7          KaveNegar SMS     ZarinPal
                  Prisma ORM     OTP · sessions      Firebase FCM     (IDPay reserved)
                                 rate limits         ArvanCloud S3
                                 product cache       + CDN (URLs only)

                     cron (@nestjs/schedule)
                     OTP sweep · unpaid-order auto-cancel + restock
                     payment / abandoned-cart reminders · daily GMV report
```

The API never holds session state in process memory. Refresh tokens, OTP codes, rate-limit counters and hot product lists live in Redis; uploads live in object storage. Adding a second API replica is a deploy, not a rewrite. Kubernetes is the Phase-3 target for the same container.

Deeper write-up: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## Product surface

### Buyer journey

- Iranian mobile OTP (5 digits, 120s TTL, 5 attempts, single-use)
- Home: banners, category tree, featured products (ISR, 60s)
- Catalog: search, category filter, sort (newest / price / best-selling)
- Product detail, reviews (1–5, one per user), wishlist
- Cart with quantity control; checkout against a saved address
- ZarinPal request → redirect → idempotent callback → order `PAID`
- Order history with **10-second polling** (no WebSockets, by design)
- Buyer ↔ seller chat via cursor polling (`?after=`)
- In-app notifications + optional FCM push + email

### Seller & admin

- Seller onboarding with `PENDING → APPROVED | REJECTED | SUSPENDED`
- Product CRUD, image upload, stock, draft/active/rejected
- Seller dashboard: GMV after commission, units sold, fulfillment queue, 30-day Recharts series
- Admin dashboard: users, seller queue, product moderation, banners, tickets, transactions, daily reports
- Per-seller commission rate (default 5%) snapshotted onto every `OrderItem`

### Platform jobs

| Cadence | Job |
| --- | --- |
| every minute | Sweep OTP keys that lost their Redis TTL |
| every 5 minutes | Auto-cancel unpaid orders older than 15 minutes and **restock** |
| hourly | Payment reminders + abandoned-cart nudges (deduped in Redis) |
| 00:05 daily | Upsert `DailyReport` (orders, paid GMV, commission, new users/sellers) |

---

## Tech stack

| Layer | Choice | Why |
| --- | --- | --- |
| API | **NestJS 11**, TypeScript, URI versioning `/api/v1` | Modular domain services, guards, Swagger for free |
| ORM / DB | **Prisma 6** → **MySQL 8.4** (`utf8mb4`) | Relational integrity for orders, money, and trees |
| Cache / sessions | **Redis 7** (ioredis, AOF) | OTP, refresh tokens, throttles, 60s catalog cache |
| Web | **Next.js 15** App Router, React 19, Tailwind, Zustand, RHF + Zod | RTL storefront + seller/admin panels in one app |
| Mobile | **Flutter** 3.27+, Riverpod, go_router, Dio, secure storage | One codebase, fa-IR, encrypted tokens |
| Payments | **ZarinPal** v4 (sandbox + mock); IDPay reserved | Iranian IRR checkout |
| SMS | **KaveNegar** (direct REST, mock driver) | Local OTP delivery |
| Files | **ArvanCloud** S3-compatible + CDN (`UPLOAD_DRIVER=mock\|s3`) | Images never enter MySQL |
| Observability | Winston, Helmet, `/api/v1/health`, Swagger `/api/docs` | Operable from day one |
| Jobs | `@nestjs/schedule` | Phase-1 simplicity; CronJobs later on K8s |
| Infra | Docker Compose (MySQL + Redis + optional API), Nginx TLS | One VM until traffic justifies K8s |

---

## Repository layout

```
pets_superapp/
├── backend/          NestJS API, Prisma schema + migrations, Jest
├── web/              Next.js storefront, seller panel, admin panel
├── mobile/           Flutter client (lib/ is source; pets_app/ has platforms)
├── infra/nginx/      Reverse proxy + TLS notes for api.petshop.ir
├── ci/               GitHub Actions workflow (copy into .github/workflows)
├── docs/             Architecture decisions
├── docker-compose.yml
└── Makefile
```

| Path | Docs |
| --- | --- |
| [`backend/`](backend/README.md) | Module map, auth/checkout/payment flows, test commands |
| [`web/`](web/README.md) | Pages, auth store, Axios refresh interceptor |
| [`mobile/`](mobile/README.md) | Flutter run flags, secure storage, polling interval |
| [`infra/`](infra/README.md) | Compose → VM bootstrap, backups, K8s direction |
| [`ci/`](ci/README.md) | How to enable Actions |

---

## Quick start

Requires **Node 20+**, **Docker**, and npm. No KaveNegar / ZarinPal / S3 / Firebase accounts needed — development defaults use mock drivers.

```bash
# 1. Data plane
docker compose up -d mysql redis

# 2. API  →  http://localhost:3000/api/v1
#            http://localhost:3000/api/docs
cd backend
npm install && npx prisma generate
npm run prisma:migrate -- --name init
npm run prisma:seed
npm run start:dev

# 3. Storefront  →  http://localhost:3001
cd ../web
npm install
npm run dev
```

Or via Make from the repo root: `make infra`, then `make backend-install migrate seed backend` and `make web` in a second terminal.

### Demo accounts

Login with any Iranian-format mobile. In development the OTP is returned as `devCode` on `POST /api/v1/auth/otp/request`.

| Phone | Role after seed |
| --- | --- |
| `09120000000` | **ADMIN** |
| `09121111111` | **SELLER** (`demo-petshop`, already approved) |
| any other `09…` | **CUSTOMER** (created on first verify) |

Checkout is end-to-end offline when `ZARINPAL_MOCK=true` (default in `.env.development`): the payment URL hits the local callback with `Status=OK`, commission is written, and buyer + seller notifications fire.

### Flutter (optional)

```bash
cd mobile
flutter pub get
# Android emulator → host machine is 10.0.2.2
flutter run --dart-define=API_URL=http://10.0.2.2:3000
```

See [`mobile/README.md`](mobile/README.md) for `flutter create` / Firebase notes.

---

## Money, stock, and payments

These are the rules that make the marketplace honest under concurrency.

1. **Never trust the client on price.** Checkout re-reads `product.price` from MySQL.
2. **Atomic reservation.** Stock is decremented with `UPDATE … WHERE stock >= qty` inside a single Prisma transaction. A race fails the whole checkout.
3. **Snapshots, not live rates.** Each `OrderItem` copies title, unit price, commission rate, commission amount, and seller payout at purchase time. Later catalog or commission changes cannot rewrite history.
4. **IRR is an integer.** Amounts are `Decimal(15,0)` rials. No floats. The UI formats تومان with Persian digits.
5. **Idempotent callback.** Replaying the ZarinPal redirect is safe: `markPaid` only transitions `PENDING_PAYMENT → PAID`. Codes `100` and `101` both count as success.
6. **Timeout + restock.** Unpaid orders auto-cancel after `ORDER_PAYMENT_TIMEOUT_MINUTES` (15) and return inventory.
7. **Default commission** is `DEFAULT_COMMISSION_RATE` (5%), overridable per seller.

```
line total          = unitPrice × qty
commissionAmount    = round(line total × rate / 100)
sellerAmount        = line total − commissionAmount
order.total         = Σ line totals + SHIPPING_FEE_IRR
```

---

## Security model

- **Helmet** headers, CORS allow-list, global throttle **120 req / min**
- OTP: bcrypt-hashed in Redis, 120s TTL, 5 tries, **3 requests / 10 min / phone**, Nest throttler on top
- Access JWT **15m**; refresh **7d**, stored as SHA-256 in Redis, rotated and revocable on logout
- Global `ValidationPipe` (`whitelist` + `forbidNonWhitelisted`) + class-validator on every DTO
- Prisma parameterized queries only
- Role guard `CUSTOMER < SELLER < ADMIN` on seller/admin routes
- Uploads via Multer memory → S3; the database stores URLs, never blobs
- `/health` reports Redis independently so a cache outage does not look like a total outage

Mock drivers (`KAVENEGAR_MOCK`, `ZARINPAL_MOCK`, `UPLOAD_DRIVER=mock`, empty SMTP/FCM) mean the whole product is demoable with zero secrets. Flip the flags and drop credentials into `backend/.env.*` when going live — no code change.

---

## HTTP API

Versioned REST only. Interactive docs: `http://localhost:3000/api/docs`.

| Prefix `/api/v1` | Responsibility |
| --- | --- |
| `POST /auth/otp/request` · `verify` · `refresh` · `logout` · `GET /auth/me` | Identity |
| `/users/me` · `/users/me/addresses` · `/users/me/avatar` | Profile |
| `/pets` | Pet profiles (foundation for later services) |
| `/categories` · `/products` · `/products/featured` | Public catalog (Redis-cached lists) |
| `/sellers/register` · `/sellers/me` · `/shops/:slug` | Shops |
| `/cart` · `POST /orders/checkout` · `/orders` | Cart & orders |
| `POST /payments/orders/:id/request` · `GET /payments/callback` | ZarinPal |
| `/wishlist` · `/products/:id/reviews` · `/chats` · `/notifications` | Engagement |
| `/upload/image(s)` | Object storage |
| `/admin/*` | Operator console |
| `GET /health` | Liveness |

Realtime is **polling every 10s** (order status, chat `after` cursor, unread count). That is a product constraint, not a missing feature — it keeps the API stateless and mobile-friendly on unreliable networks.

---

## Tests & CI

```bash
cd backend
npm test           # unit: auth/OTP, checkout + commission, payments, products
npm run test:e2e   # smoke: module graph, validation pipe, role guards (no DB)
```

```bash
make build         # nest build + next build
make test          # unit + e2e
```

A GitHub Actions pipeline (Node 22, MySQL 8.4 + Redis services, typecheck, build, unit tests) lives in [`ci/github-actions-ci.yml`](ci/github-actions-ci.yml). Copy it to `.github/workflows/ci.yml` to activate — see [`ci/README.md`](ci/README.md).

---

## Engineering notes

Decisions that are easy to miss in a file tree, and that I would defend in a design review:

| Decision | Rationale |
| --- | --- |
| REST + polling, no WebSockets | Phase-1 reliability over chat latency; works behind cheap reverse proxies and on flaky mobile networks |
| Stateless API from day one | Sessions in Redis, files in S3 → Compose today, Kubernetes later without a rewrite |
| Money snapshotted on `OrderItem` | Payouts and disputes need an immutable ledger, not “whatever the product costs now” |
| Mock drivers behind env flags | Recruiters and teammates can clone and complete a purchase in five minutes |
| Next.js talks to the same OTP/JWT API as Flutter | One identity model; no next-auth split-brain |
| `bcryptjs` instead of native `bcrypt` | Same API, no Alpine/CI compile tax for hashing 5-digit OTPs |
| fa-IR only | The market is Iran; i18n would be speculative complexity |

Known go-live switches (not missing product work): real `KAVENEGAR_API_KEY`, `ZARINPAL_MERCHANT_ID`, Firebase credentials, and ArvanCloud `S3_*` with `UPLOAD_DRIVER=s3`.

---

## Roadmap

| Phase | Scope |
| --- | --- |
| **1 — this repo** | Auth, catalog, seller KYC, cart/checkout, ZarinPal, admin, chat, reviews, notifications, Compose |
| **2** | Conversion: richer reports, abandoned-cart campaigns, banners, review quality |
| **3** | Kubernetes (stateless API replicas, managed MySQL/Redis, cert-manager, HPA) |
| **4** | Beyond retail — vet booking and records on the existing `Pet` entity |

---

## Environment

Copy [`backend/.env.example`](backend/.env.example). Per-environment files already exist:

| File | Intent |
| --- | --- |
| `backend/.env.development` | Local; mock SMS / payment / upload |
| `backend/.env.test` | Isolated DB + Redis DB 1 |
| `backend/.env.production` | Real drivers; inject secrets at deploy, never commit them |
| `web/.env.example` | Storefront API base URL |

`*.local` files are gitignored and override the committed placeholders.

---

## License

Source is currently `UNLICENSED` (private / portfolio). Ask before reuse.

---

Built as a full-stack marketplace sample: one API, two clients, a real checkout, and the operational details (commission, stock, jobs, mocks) that separate a demo from a product.
