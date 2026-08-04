# Architecture — Pet Marketplace Platform

Persian-language (RTL) pet marketplace super-app for the Iranian market.
**Phase 1 goal:** ship a working product, make money, get real feedback.

## System overview

```
┌──────────┐   ┌──────────┐          ┌─────────────────────────────┐
│ Flutter  │   │ Next.js  │  HTTPS   │  Nginx (TLS, Let's Encrypt) │
│ app (fa) │   │ web (fa) │ ───────► │        api.petshop.ir       │
└──────────┘   └──────────┘          └──────────────┬──────────────┘
                                                    ▼
                                     NestJS REST API  `/api/v1`
                                     (stateless, horizontal-ready)
                          ┌───────────────┬─────────┴────────┬────────────────┐
                          ▼               ▼                  ▼                ▼
                       MySQL 8         Redis 7         KaveNegar SMS      ZarinPal
                    (Prisma ORM)  OTP/sessions/cache  Firebase FCM       (IDPay backup)
                          ▲               ▲          ArvanCloud S3
                          │               │          + CDN (uploads)
                     cron jobs (@nestjs/schedule):
                     OTP cleanup · auto-cancel unpaid orders ·
                     payment/abandoned-cart reminders · daily reports
```

## Technology choices (per project spec)

- **Mobile:** Flutter + Riverpod + go_router + Dio, secure storage for tokens, Firebase messaging.
- **Web:** Next.js (App Router, TypeScript), Tailwind + shadcn/ui, Axios, Zustand, react-hook-form + Zod.
- **Backend:** NestJS + Prisma + MySQL, Redis, JWT (access 15m / refresh 7d), KaveNegar OTP.
- **Realtime:** polling only (10s) — order status, chat messages (`after` cursor), unread counts.
- **Payments:** ZarinPal primary (IRR), platform commission auto-computed per order item.
- **Files:** ArvanCloud Object Storage (S3-compatible) + CDN; DB stores URLs only.

## Design decisions

1. **Stateless API.** Sessions (refresh tokens), OTP codes, rate limits and hot caches all live in
   Redis; uploads in object storage — any API instance can die/scale without data loss. This makes
   the Phase-3 move from Compose to Kubernetes a redeploy, not a rewrite.
2. **Money is snapshotted.** `OrderItem` copies the price, commission rate, commission amount and
   seller payout at checkout. Later price/commission changes never mutate history — clean payouts
   and reports.
3. **Atomic stock reservation.** Checkout decrements stock inside a DB transaction with
   `WHERE stock >= qty`; unpaid orders auto-cancel and restock. No overselling under concurrency.
4. **Idempotent payment callback.** Replay/window-refresh of the ZarinPal redirect is safe:
   verified payments are terminal, `markPaid` only transitions `PENDING_PAYMENT → PAID`.
5. **Graceful degradation.** Redis/MySQL outages surface as 503/500 on affected endpoints only
   (`/health` reports component state); SMS, e-mail, push and gateway each have mock drivers so the
   whole product is demoable offline with zero credentials.
6. **UTC everywhere; IRR integers.** `Decimal(15,0)` columns for rial amounts (no floats for money).

## Security

- Helmet headers, CORS allow-list, global rate limit (120 req/min) + tighter OTP throttles.
- OTP: 5-digit, bcrypt-hashed in Redis, 120s TTL, 5 attempts, single use, per-phone rate limit.
- Refresh tokens stored only as SHA-256 hashes in Redis; rotation invalidates the previous token.
- class-validator + whitelist everywhere; Prisma parametrised queries (no SQL injection surface).
- Roles guard: `CUSTOMER < SELLER < ADMIN` on dedicated admin/seller routes.

## Phase fit

| Phase | Scope this repo covers |
| --- | --- |
| 1 (MVP) | auth/profile/pets, categories, products, seller panel (API), cart/checkout, ZarinPal, admin (API), wishlist/chat/reviews/notifications, Compose deploy |
| 2 | conversion/retention features build on: daily reports, abandoned-cart reminders, reviews, banners, seller dashboard |
| 3 | K8s migration of the stateless API; analytics on `DailyReport`; i18n kept out for now (fa-IR only) |
| 4 | ecosystem (services beyond marketplace) — schema already has `Pet` entity for profiles/records |
