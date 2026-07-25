# API Keys & Storage (Client)

User-facing settings for manimotion: create API keys and connect your own storage.

## Setup

```bash
cd client
cp .env.example .env
# Set DATABASE_URL (Neon), BETTER_AUTH_SECRET, BETTER_AUTH_URL, SECRET_ENCRYPTION_KEY

bun install
bun run db:push   # push Better Auth + api_keys schema to Neon
bun run dev
```

Open `/sign-up` → create account → **Settings** → API keys / storage.

Auth details: see [AUTH.md](./AUTH.md).

## Security model

| Data | Storage |
|------|---------|
| API key plaintext | Shown **once** at creation, never stored |
| API key hash | SHA-256 in `api_keys.key_hash` |
| S3/R2 secrets | AES-256-GCM in `storage_integrations.encrypted_config` |

The Python worker uses the same `DATABASE_URL` and `SECRET_ENCRYPTION_KEY` to validate keys and upload to user buckets.

## API key format

```
chalk_live_sk_v1_<random>
```

Use header: `x-api-key: chalk_live_sk_v1_...`

## Plans & credits (schema ready)

`ApiKeyPlan`: FREE, STUDENT, PRO, CREATOR, ENTERPRISE  
`credits` / `creditLimit` columns exist — **not enforced yet** on FREE.

## Storage providers

- Cloudflare R2
- AWS S3
- MinIO / custom S3-compatible
- Backblaze B2 (S3 API)
- UploadThing (adapter in client; worker fallback uses default R2 for now)

## Upload to your bucket via API

Three ways (first match wins):

1. **Inline credentials** in the request body (never stored — only for that job)
2. **`storage.integration_id`** — id from Settings → Storage
3. **Default saved integration** on your account (if you use a `chalk_*` API key)

### Saved integration

```bash
curl -X POST http://localhost:8000/video/request \
  -H "x-api-key: chalk_live_sk_v1_..." \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Explain the product rule",
    "storage": { "integration_id": "clxxxxxxxx" }
  }'
```

### Inline Cloudflare R2 (per request)

```json
{
  "prompt": "Explain eigenvectors",
  "storage": {
    "inline": {
      "provider": "r2",
      "bucket": "my-videos",
      "access_key_id": "...",
      "secret_access_key": "...",
      "account_id": "your-cloudflare-account-id",
      "public_url": "https://pub-xxxx.r2.dev"
    }
  }
}
```

### Inline AWS S3 / MinIO

```json
{
  "storage": {
    "inline": {
      "provider": "s3",
      "bucket": "my-bucket",
      "access_key_id": "...",
      "secret_access_key": "...",
      "region": "us-east-1",
      "public_url": "https://cdn.example.com"
    }
  }
}
```

From the Next.js app (proxy): `POST /api/video/request` with header `x-api-key`.

## Worker env (root `.env`)

```env
DATABASE_URL=postgresql://...
SECRET_ENCRYPTION_KEY=same-as-client
CLARITY_API_KEY=optional-legacy-admin-key
```

User `chalk_*` keys are validated against Postgres. Legacy `CLARITY_API_KEY` still works for admin/dev.
