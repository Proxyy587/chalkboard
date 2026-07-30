# Billing & Dodo Payments (manimotion)

## Pricing (launch)

| Plan | Price | Renders | Notes |
|------|-------|---------|--------|
| Free | $0 | 3 / day | Watermark, 720p, your OpenRouter key |
| Hobby | $9/mo | 80 / month | 1080p, no watermark, commercial |
| Pro | $19/mo | 400 / month | API keys, higher concurrency |

Later: BYOK OpenRouter for power users (you only meter renders).

Sell **renders**, not opaque credits.

## Your setup checklist (Dodo)

1. Create account at [app.dodopayments.com](https://app.dodopayments.com) (test mode first).
2. **Business / KYC** as required by Dodo (Merchant of Record).
3. Create two **subscription** products:
   - Hobby — $9 / month → copy `product_id` → `DODO_PRODUCT_HOBBY`
   - Pro — $19 / month → copy `product_id` → `DODO_PRODUCT_PRO`
4. **Developers → API keys** → copy test API key → `DODO_PAYMENTS_API_KEY`
5. **Webhooks** → URL:
   ```
   https://manimotion.dev/api/webhooks/dodo
   ```
   (local: use [ngrok](https://ngrok.com) → same path)
   Copy signing secret → `DODO_PAYMENTS_WEBHOOK_KEY`
6. Set on Vercel (and `client/.env`):
   ```env
   DODO_PAYMENTS_API_KEY=...
   DODO_PAYMENTS_WEBHOOK_KEY=...
   DODO_PAYMENTS_ENVIRONMENT=test_mode
   DODO_PAYMENTS_RETURN_URL=https://manimotion.dev/settings/billing?checkout=success
   DODO_PRODUCT_HOBBY=pdt_...
   DODO_PRODUCT_PRO=pdt_...
   ```
7. Push Prisma schema (`user` billing columns):
   ```bash
   cd client && bunx prisma db push
   ```
8. Test: open `/pricing` → Upgrade → complete test card → webhook should set plan.

## App routes

| Route | Role |
|-------|------|
| `/pricing` | Public pricing |
| `/settings/billing` | Current plan + portal |
| `POST /api/billing/checkout` | Start checkout (auth) |
| `GET /api/portal` | Dodo customer portal |
| `POST /api/webhooks/dodo` | Activate / cancel plans |

## Cost control principle

Free = capped daily renders on **your** OpenRouter key.  
Paid = monthly render quota.  
Optional later = user brings OpenRouter key → AI cost ≈ $0 to you.
