# Pets SuperApp — Web Storefront (Next.js)

Persian (RTL) storefront for the pet marketplace. Stack per spec: **Next.js (App Router) +
TypeScript + Tailwind + shadcn-style UI + Axios + Zustand + react-hook-form + Zod** (Recharts
reserved for the admin/seller dashboards in Phase 2).

## Quick start

```bash
npm install
npm run dev        # http://localhost:3001 (API expected on :3000)
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
