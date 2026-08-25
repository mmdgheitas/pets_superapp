# How the money works — one-pager

Non-technical view of settlement. Leave this on screen when discussing scope.

```
  Buyer pays (ZarinPal / IRR)
            │
            ▼
  ┌─────────────────────┐
  │  Order PAID         │  prices re-read from DB (never trust client)
  │  stock already held │  atomic reserve at checkout
  └──────────┬──────────┘
             │
             ▼
  For each line item (snapshot at purchase):
             │
             ├─ unitPrice × qty  →  line total
             ├─ commission %     →  platform cut  (default 5%, per-seller override)
             └─ remainder        →  seller payout
             │
             ▼
  ┌──────────────────────────────────────────┐
  │  OrderItem ledger (immutable)            │
  │  title · unit · rate · commission · net  │
  └──────────────────────────────────────────┘
             │
      ┌──────┴──────┐
      ▼             ▼
 Platform        Seller dashboard
 GMV + fees      "درآمد خالص" (after commission)
```

## Rules that build trust (and show up in UI)

| Rule | UI cue |
| --- | --- |
| Server re-prices at checkout | «قیمت نهایی تأیید شد» |
| Stock reserved atomically | low-stock counts, reservation countdown |
| Unpaid → cancel + restock (~15m) | calm countdown on checkout & pending orders |
| Commission snapshotted | seller «شفافیت کمیسیون» card + money-accent GMV |
| Idempotent payment callback | confirmation shows ref + “seller notified” |

## Simple example (5%)

| | IRR | تومان (UI) |
| --- | ---: | ---: |
| Line total | 10٬000٬000 | ۱٬۰۰۰٬۰۰۰ |
| Platform 5% | 500٬000 | ۵۰٬۰۰۰ |
| Seller net | 9٬500٬000 | ۹۵۰٬۰۰۰ |

Amounts are integer rials in the database; the storefront displays تومان with Persian digits.
