# Auth (Better Auth + Neon)

manimotion auth — email/password and GitHub.

## Tables
| Table | Purpose |
|-------|---------|
| `user` | Better Auth users |
| `session` / `account` / `verification` | Better Auth |
| `api_keys` | Hashed chalk_* keys → `user_id` |
| `storage_integrations` | Encrypted bucket creds → `user_id` |
| `generation_quotas` | Guest IP + free daily video limits |

When a user calls the video API with `x-api-key: chalk_live_sk_v1_…`, the worker hashes the key, looks up `api_keys`, and gets `user_id` from the same Neon database.

## Auth methods
- Email & password
- **GitHub** OAuth (requires `user:email` scope)

## OAuth redirect URIs

| Provider | Local | Production |
|----------|-------|------------|
| GitHub | `http://localhost:3000/api/auth/callback/github` | `https://YOUR_DOMAIN/api/auth/callback/github` |

Set `BETTER_AUTH_URL` to match the domain (avoids `redirect_uri_mismatch`).

```env
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
BETTER_AUTH_URL=http://localhost:3000
OWNER_EMAILS=you@example.com
```

GitHub only activates when both client id and secret are set.

## Setup
```bash
cd client
cp .env.example .env
# Set DATABASE_URL (Neon), BETTER_AUTH_SECRET, BETTER_AUTH_URL
# Add GitHub OAuth credentials

bun install
bun run db:push
bun run dev
```

Open `/sign-up` → GitHub / email → Settings → API keys.

## Worker `.env` (repo root)
```env
DATABASE_URL=<same Neon URL as client>
SECRET_ENCRYPTION_KEY=<same as client>
```

## Pages
- `/sign-in` · `/sign-up`
- `/api/auth/*` — Better Auth handler (includes `/callback/github`)
- `/settings` — gated by session
