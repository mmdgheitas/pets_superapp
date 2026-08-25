# پت‌شاپ — Brand sheet

One-page identity for demos and reskins. Tokens live in `web/src/app/globals.css`.

## Positioning

> Not a shop template with a pet logo — a real Iranian marketplace (sellers, commission, payment, trust) that already feels inhabited.

**Axis:** Warm & trustworthy (customer) ⟷ Serious & operational (seller/admin).  
Storefront ~80/20 warm · Seller ~40/60 ops · Admin near-monochrome triage.

## Brand anchor

| Token | Role | HSL (approx) | Hex feel |
| --- | --- | --- | --- |
| `--primary` | Deep teal | `174 62% 28%` | `#1f6f68` |
| `--primary-hover` | Teal pressed | `174 64% 22%` | darker teal |
| Canvas | Cream / sand | `36 40% 97%` | warm off-white |
| `--money` | GMV / payouts only | `152 58% 32%` | green money accent |

**Do not** use purple as brand. **Do not** use `--money` for non-financial chrome.

## Three skins (`data-skin`)

| Skin | Where | Feel |
| --- | --- | --- |
| `customer` | Root layout (default) | Cream canvas, full teal, soft cards |
| `seller` | `/seller/*` | Cool slate neutrals, desaturated teal, money pops |
| `admin` | `/admin/*` | Charcoal primary, status hues for queues |

## Status hues (admin triage — fixed, exclusive)

| Status | Token |
| --- | --- |
| PENDING | `--status-pending` (amber) |
| APPROVED | `--status-approved` (green) |
| REJECTED | `--status-rejected` (red) |
| SUSPENDED | `--status-suspended` (slate) |

## Typography

- **UI:** Vazirmatn (CDN) — labels, prices, tables.
- **Display:** same family with `.font-display` / tighter tracking on heroes.
- **Digits:** Persian (`۰–۹`) on customer money & dates via `formatToman` / `toPersianDigits`.
- **Tabular nums:** `.num-tabular` on all money columns.
- Body line-height ~1.7 for Persian density.

## Spacing & radius

- Radius base: `--radius` ≈ 0.875rem  
- Cards: `rounded-xl` + `shadow-card`  
- Hero / large panels: `rounded-2xl`

## Motion

- Card hover: 2px lift + soft shadow (not bounce-spam)
- Cart badge: single `cart-bounce` on count change
- Countdown bars: linear width, never red panic until &lt; 2 min
- Page enter: `animate-fade-up`

## Icon style

Lucide outline, 1.5–2px optical weight, paired with semantic color fills on trust tiles only.

## Pitch screens (trust journey)

1. Home — craft + warmth  
2. Payment confirmation — money loop real  
3. Seller dashboard — marketplace + commission math  
4. Admin seller queue — trust/moderation  
5. Orders timeline — alive product without WebSockets  

See also: [`MONEY_FLOW.md`](./MONEY_FLOW.md).
