# Clarity Public API — Roadmap

## Phase 1 — Quality (current)
- [x] Beat-sheet planning with narration per beat
- [x] Audio-before-render pipeline for sync
- [x] Manim medium quality default
- [x] VPS ephemeral storage + R2 upload
- [x] Prompt engineering docs + agent skill

## Phase 2 — Public beta
- [ ] API keys per user (not single `CLARITY_API_KEY`)
- [ ] Rate limits per key / tier
- [ ] Job webhooks (`POST` callback URL on complete)
- [ ] OpenAPI docs polish + SDK snippet generator
- [ ] Status: `queued | planning | generating_audio | rendering | uploading | completed | failed`

## Phase 3 — Bring your own R2
Request shape (proposed):
```json
{
  "prompt": "Explain eigenvectors",
  "storage": {
    "provider": "r2",
    "bucket": "user-bucket",
    "access_key_id": "...",
    "secret_access_key": "...",
    "endpoint_url": "https://....r2.cloudflarestorage.com",
    "public_base_url": "https://cdn.user.com"
  }
}
```
- Encrypt credentials at rest
- Never log secrets
- Validate bucket write before accepting job

## Phase 4 — Pricing
Suggested metered dimensions:
| Metric | Unit |
|--------|------|
| Video rendered | per minute of output |
| LLM tokens | planner + code + narration |
| Storage | GB-month on R2 (pass-through) |

Tiers (example):
- **Free**: 3 videos/day, 45s max, watermark optional
- **Pro**: 50 videos/month, 120s max, own R2
- **Team**: pooled quota, webhooks, priority queue

Billing integration options: Stripe metered billing, LemonSqueezy, or Cloudflare Workers paid tier proxy.

## Phase 5 — Scale
- Redis job queue (replace in-memory `JOBS`)
- Dedicated render workers (Manim CPU-heavy)
- Model routing by tier (faster/cheaper models on free)
