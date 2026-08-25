# Pets SuperApp — Web Storefront (Next.js)

Persian (RTL) storefront for the pet marketplace. Stack per spec: **Next.js (App Router) +
TypeScript + Tailwind + shadcn-style UI + Axios + Zustand + react-hook-form + Zod** (Recharts
reserved for the admin/seller dashboards in Phase 2).

## Quick start

```bash
npm install
npm run dev        # http://localhost:3001 — mock data by default (no backend needed)
```

### Mock mode (default)

With `NEXT_PUBLIC_USE_MOCK=true` (see `.env.local` / `.env.example`) the storefront serves
catalog, auth, cart, checkout, seller and admin flows from in-memory data under
`src/lib/mock/`. No NestJS / MySQL / Redis required.

| Phone | Role | OTP |
| --- | --- | --- |
| `09120000000` | ADMIN | `12345` |
| `09121111111` | SELLER (approved shop) | `12345` |
| `09123333333` | CUSTOMER (seeded cart history) | `12345` |
| any other `09…` | CUSTOMER (created on first login) | `12345` |

```bash
npm run dev:mock   # force mock
npm run dev:api    # hit a real API at NEXT_PUBLIC_API_URL (default :3000)
```

### Real API

```bash
# terminal 1 — backend
cd ../backend && npm run start:dev

# terminal 2
NEXT_PUBLIC_USE_MOCK=false npm run dev
```

Pages: home (banners + categories + featured, ISR 60s), `/products` (search/filter/sort,
server-rendered), `/products/[slug]`, OTP `/login`, `/cart`, `/checkout`, `/orders`
(10-second status polling per the no-websocket rule), `/payment/result` (gateway
callback target), `/profile` (+ addresses).

Auth: OTP flow → JWT access (15m) + refresh (7d) in a persisted Zustand store; the Axios
interceptor attaches the access token and silently rotates it on 401.

> Note: the spec listed `next-auth`; Phase 1 uses the backend's OTP+JWT flow directly
> (simpler, single source of truth shared with the Flutter app). No functionality is lost —
> if next-auth sessions become necessary later (e.g. SSR-only admin), add a
> CredentialsProvider adapter on top of the same endpoints.
