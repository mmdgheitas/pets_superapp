# 🐾 Pet Marketplace Platform (پت‌شاپ)

A Persian-language **pet marketplace super-app for the Iranian market** — marketplace MVP
(Phase 1) with the full money loop working: OTP login → browse/search → cart → checkout →
**ZarinPal** payment with automatic platform commission → orders, notifications, chat.

## Monorepo layout

| Path | What | Stack |
| --- | --- | --- |
| [`backend/`](backend/README.md) | REST API `/api/v1` (+ Swagger at `/api/docs`) | NestJS 11 · Prisma · MySQL 8 · Redis 7 · JWT/OTP · Winston |
| [`web/`](web/README.md) | Persian RTL storefront `localhost:3001` | Next.js 15 · TypeScript · Tailwind · shadcn-style UI · Axios · Zustand · RHF+Zod |
| [`mobile/`](mobile/README.md) | Android/iOS app (fa-IR) | Flutter · Riverpod · go_router · Dio · secure storage · FCM |
| [`infra/`](infra/README.md) | Nginx reverse proxy + TLS, deploy notes | Nginx · Let's Encrypt |
| [`docker-compose.yml`](docker-compose.yml) | MySQL 8.4 + Redis 7 (+ API profile) | Docker Compose (K8s in Phase 3+) |
| [`.github/workflows/ci.yml`](.github/workflows/ci.yml) | Build + test + typecheck on every push | GitHub Actions |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System design & decisions | — |

## Quick start (5 minutes, no external accounts needed)

```bash
# 1. Infra
docker compose up -d mysql redis

# 2. Backend (mock SMS/payment/upload drivers by default)
cd backend
npm install && npx prisma generate
npm run prisma:migrate -- --name init
npm run prisma:seed                # admin: 09120000000, demo seller + catalog
npm run start:dev                  # http://localhost:3000/api/v1

# 3. Web storefront
cd ../web
npm install
npm run dev                        # http://localhost:3001
```

Login with any Iranian-format mobile (e.g. `09120000000`) — in dev the OTP comes back in
the API response (`devCode`). Checkout works end-to-end offline via `ZARINPAL_MOCK=true`.

## Phase-1 checklist status

- [x] GitHub repository + branch protections (this repo)
- [x] Docker Compose (MySQL + Redis)
- [x] NestJS initialized with Prisma/MySQL, Swagger, Winston, Helmet, throttler
- [x] Environment variables per environment (`.env.development` / `.test` / `.production`)
- [x] Auth: KaveNegar OTP (120s) + JWT access(15m)/refresh(7d) + OTP rate limiting
- [x] Users & pets & addresses, avatar upload (ArvanCloud S3-compatible)
- [x] Categories tree + products (CRUD, search, filters, Redis-cached lists)
- [x] Seller registration/verification + dashboard + sales report
- [x] Cart & orders (checkout, polling-friendly status, history, auto-cancel)
- [x] Payments: ZarinPal request/verify/callback + auto commission + history
- [x] Admin: users, seller approval, product moderation, categories/banners, transactions, tickets
- [x] Wishlist, polling chat, reviews & ratings, push (FCM) + SMS + email notifications
- [x] Scheduled jobs: OTP cleanup · auto-cancel unpaid · reminders · daily reports
- [x] Jest unit tests (24) + Supertest smoke e2e (5)
- [x] Next.js storefront initialized & verified
- [x] Flutter app source initialized
- [ ] KaveNegar API key → drop into `backend/.env.*` (`KAVENEGAR_API_KEY`, set `KAVENEGAR_MOCK=false`)
- [ ] ZarinPal merchant ID → `ZARINPAL_MERCHANT_ID` (sandbox until go-live)
- [ ] Firebase project → `FIREBASE_*` creds (+ `google-services.json` in mobile)
- [ ] ArvanCloud bucket + CDN → `S3_*` + `UPLOAD_DRIVER=s3`

## Key rules enforced (from the spec)

REST only · versioned `/api/v1` · polling (10s) instead of websockets · class-validator on
all inputs · OTP 120s + rate limited · images never in MySQL (S3 URLs only) · Swagger for
every module · per-environment `.env` · money as integer IRR with per-item commission
snapshots · Phase-1 simplicity over cleverness.
