# Production deploy — Vercel (web) + VPS (worker)

manimotion splits into two machines:

| Piece | Where | What it does |
|--------|--------|----------------|
| **Next.js** (`client/`) | **Vercel** | Auth, API keys, encrypted storage settings, docs, demo UI |
| **Python worker** | **VPS** (Docker) | Render videos, decrypt saved storage, upload MP4s |

They share the **same Neon `DATABASE_URL`** and the **same `SECRET_ENCRYPTION_KEY`**.

---

## 0. One-time secrets (generate once, reuse)

```bash
# Auth
openssl rand -base64 32   # → BETTER_AUTH_SECRET

# Encrypts user bucket credentials in Postgres (MUST match Vercel + VPS)
openssl rand -base64 48   # → SECRET_ENCRYPTION_KEY

# Owner / open-demo master key (platform R2 only)
openssl rand -hex 32      # → CLARITY_API_KEY
```

Keep these in a password manager. Never commit them.

---

## 1. Database (Neon)

1. Create a Neon project.
2. Copy the connection string → `DATABASE_URL`.
3. From your laptop:

```bash
cd client
# put DATABASE_URL in client/.env
bunx prisma db push
```

Same `DATABASE_URL` goes on **Vercel** and the **VPS**.

---

## 2. Vercel (Next.js)

### Critical: Root Directory

Vercel must build **`client/`**, not the repo root (root `package.json` has no `next` → “No Next.js version detected”).

1. Project → **Settings** → **General** → **Root Directory**
2. **Edit** → set to `client` → **Save**
3. **Deployments** → latest → **⋯** → **Redeploy**

Root `vercel.json` also sets `"rootDirectory": "client"`. If the dashboard still shows blank/`.`, force `client` manually — that setting is what fixes the error.

### Import / settings

1. Import the GitHub repo.
2. Framework Preset = **Next.js**
3. Root Directory = **`client`**
4. Install = `bun install` · Build = `bun run build` · Output = leave default
5. **Environment variables (Production)**:

| Variable | Required | Notes |
|----------|----------|--------|
| `DATABASE_URL` | yes | Neon (same as VPS) |
| `BETTER_AUTH_SECRET` | yes | from step 0 |
| `BETTER_AUTH_URL` | yes | `https://your-domain.com` |
| `NEXT_PUBLIC_APP_URL` | yes | same as auth URL |
| `SECRET_ENCRYPTION_KEY` | yes | **identical** to VPS |
| `NEXT_PUBLIC_CHALKBOARD_API_URL` | yes | `https://api.manimotion.dev` |
| `CLARITY_API_KEY` | yes | **identical** to VPS (demo proxy only; never expose to browser) |
| `OWNER_EMAILS` | recommended | comma-separated → unlimited website + OWNER API keys |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | if GitHub login | |

6. OAuth redirect: `https://your-domain.com/api/auth/callback/github`.
7. Deploy. Confirm the site loads.

Still seeing **“No Next.js version detected”**? Root Directory is not `client` — fix and redeploy.

**Do not** put platform R2 secrets on Vercel. Those stay on the VPS.

---

## 3. VPS (video worker)

### Specs
- Ubuntu 22.04+, **4 GB RAM / 2 vCPU** minimum (8 GB better).
- Docker + Docker Compose.

### Install Docker
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# re-login
```

### App + `.env`
```bash
git clone https://github.com/YOUR_USER/manim-vid.git
cd manim-vid
nano .env
```

**VPS `.env` (minimum):**

```env
OPENROUTER_API_KEY=sk-or-...

# Platform R2 (master key / open demo only)
R2_ACCOUNT_ID=...
R2_BUCKET_NAME=manim-video
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_PUBLIC_BASE_URL=https://pub-xxxx.r2.dev
AWS_ENDPOINT_URL_S3=https://ACCOUNT_ID.r2.cloudflarestorage.com

CLARITY_API_KEY=...          # same as Vercel
DATABASE_URL=...             # same Neon as Vercel
SECRET_ENCRYPTION_KEY=...    # same as Vercel

CLARITY_ENV=vps
KEEP_LOCAL_OUTPUTS=false
ALLOWED_ORIGINS=https://your-domain.com
MANIM_QUALITY=medium
```

### Run
```bash
docker compose up -d --build
docker logs -f clarity-video
curl http://127.0.0.1:8000/health
```

### HTTPS (Nginx)
Point `api.manimotion.dev` → `127.0.0.1:8000` with long timeouts (renders take minutes):

```nginx
server {
    listen 80;
    server_name api.manimotion.dev;
    client_max_body_size 20m;
    proxy_read_timeout 600s;
    proxy_send_timeout 600s;
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo certbot --nginx -d api.yourdomain.com
```

Then set Vercel `NEXT_PUBLIC_CHALKBOARD_API_URL=https://api.yourdomain.com`.

### Redeploy worker
```bash
cd ~/manim-vid && git pull && docker compose up -d --build
```

---

## 4. Storage encryption (how it stays safe)

```
User saves bucket in Settings
  → Next encrypts with SECRET_ENCRYPTION_KEY (AES-256-GCM)
  → only ciphertext stored in Neon (storage_integrations.encrypted_config)
  → list/get APIs return name/provider/bucket — never secrets

Job with chalk_* key
  → worker loads row from Neon
  → decrypts in memory
  → uploads MP4
  → discards plaintext
```

**Checklist**
- [ ] Same `SECRET_ENCRYPTION_KEY` on Vercel and VPS
- [ ] Same `DATABASE_URL` on both
- [ ] Never log decrypted credentials
- [ ] Rotate key = users must re-add storage (old ciphertext becomes unreadable)

---

## 5. Go-live smoke test

1. Open `https://your-domain.com` → generate a demo lecture (uses master key + platform R2).
2. Sign in → Settings → API keys → create key → “Use in this browser”.
3. Settings → Storage → add your R2/S3 → connection test passes.
4. From a script:

```bash
curl -sS -X POST "$MANIMOTION_API/video/request" \
  -H "Content-Type: application/json" \
  -H "x-api-key: chalk_live_sk_v1_..." \
  -d '{"prompt":"Explain Bayes theorem"}'
```

(No `storage` needed if a bucket is saved.)

5. Poll `/video/status/{job_id}` until `video_url` appears on **your** CDN.

---

## 6. Security before public traffic

- [ ] `ALLOWED_ORIGINS` = your Vercel domain only (not `*`)
- [ ] `CLARITY_API_KEY` never in client JS / public docs for end users
- [ ] OAuth apps locked to production redirect URIs
- [ ] Rate limits / OpenRouter spend monitored
- [ ] `.env` not in git; rotate anything that ever leaked

---

## Local vs prod

| | Local | Prod |
|--|--------|------|
| Web | `cd client && bun run dev` | Vercel |
| Worker | `uv run uvicorn main:app --port 8000` | Docker on VPS |
| `CLARITY_ENV` | `local` | `vps` |
| Storage | same Neon + encryption key | same |

Worker-only deep dive (Docker failures, engines): see root `DEPLOY.md`.
