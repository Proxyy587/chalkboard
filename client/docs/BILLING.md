# Billing & Dodo Payments (manimotion)

## Pricing (launch)

| Plan | Price | Renders | Notes |
|------|-------|---------|--------|
| Free | $0 | 3 / day | API OK · fast models · watermark · 720p |
| Hobby | $9/mo | 40 / month | GPT-4o / Sonnet · 1080p · no watermark |
| Pro | $19/mo | 80 / month | Opus-class models · priority queue |

## Why plan stays Free after paying

Almost always one of:

1. **Webhook not configured / wrong events** in Dodo dashboard  
2. **Webhook signing secret** on Vercel ≠ dashboard secret  
3. **Testing on localhost** — Dodo cannot POST to `localhost` (use production URL or ngrok)  
4. **Return URL host ≠ where you’re logged in** (cookie mismatch)

Plan unlock is: **webhook** (primary) + **`POST /api/billing/reconcile`** (fallback on billing page).

## Dodo webhook checklist (do this)

1. Open [Dodo Dashboard](https://app.dodopayments.com) → **Developer → Webhooks** → **Add Webhook**
2. Endpoint URL (must be public HTTPS):
   ```
   https://manimotion.dev/api/webhooks/dodo
   ```
3. **Select these events** (not optional — only selected events fire):
   - `subscription.active`
   - `subscription.renewed`
   - `subscription.updated`
   - `subscription.plan_changed` (if listed)
   - `subscription.cancelled`
   - `subscription.expired`
   - `subscription.failed`
   - `payment.succeeded`
4. Copy the **Signing Secret** → Vercel + `client/.env`:
   ```env
   DODO_PAYMENTS_WEBHOOK_KEY=whsec_...
   ```
5. Same **test vs live** mode as your API key (`DODO_PAYMENTS_ENVIRONMENT`)
6. After save, use Dodo “Send test event” if available, or buy again and watch Vercel function logs for `[dodo webhook] event`

### Local testing

| Piece | Value |
|-------|--------|
| App | `http://localhost:3000` |
| `DODO_PAYMENTS_RETURN_URL` | `http://localhost:3000/settings/billing?checkout=success` |
| Webhook URL | ngrok → `https://YOUR_NGROK/api/webhooks/dodo` **or** keep production webhook and rely on **Refresh plan** reconcile |

## Env (Vercel + local)

```env
DODO_PAYMENTS_API_KEY=...
DODO_PAYMENTS_WEBHOOK_KEY=whsec_...
DODO_PAYMENTS_ENVIRONMENT=test_mode
DODO_PAYMENTS_RETURN_URL=https://manimotion.dev/settings/billing?checkout=success
DODO_PRODUCT_HOBBY=pdt_...
DODO_PRODUCT_PRO=pdt_...
NEXT_PUBLIC_APP_URL=https://manimotion.dev
BETTER_AUTH_URL=https://manimotion.dev
```

For local checkout returns, temporarily set `DODO_PAYMENTS_RETURN_URL` to localhost (above).

## App routes

| Route | Role |
|-------|------|
| `/pricing` | Public pricing |
| `/settings/billing` | Plan + **Refresh plan** (reconcile) |
| `POST /api/billing/checkout` | Start checkout (auth) |
| `POST /api/billing/reconcile` | Pull active sub/payment from Dodo by customer/email |
| `GET /api/portal` | Customer portal |
| `POST /api/webhooks/dodo` | Activate / cancel from Dodo events |

## After a successful purchase

1. You should land on `/settings/billing?checkout=success`
2. Page auto-calls reconcile a few times
3. If still Free → click **Refresh plan**
4. If still Free → fix webhook checklist above, then Refresh again
