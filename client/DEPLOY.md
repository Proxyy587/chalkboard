# Deploy manimotion web (Next.js only)

This app lives in **`client/`**. The Python video worker stays on your VPS — do not deploy it with the web app.

## Vercel (recommended)

1. Import the GitHub repo.
2. **Root Directory** → set to `client` (Project Settings → General).
3. Framework: Next.js (auto).
4. Install / Build leave default (`bun install` / `bun run build` — `postinstall` runs `prisma generate`).
5. Env vars (Production):

| Variable | Notes |
|---|---|
| `DATABASE_URL` | Neon (same DB the worker uses for key validation) |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | `https://your-domain.com` |
| `NEXT_PUBLIC_APP_URL` | same as auth URL |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | OAuth |
| `SECRET_ENCRYPTION_KEY` | **must match** VPS worker |
| `NEXT_PUBLIC_CHALKBOARD_API_URL` | public URL of the VPS worker, e.g. `https://api.yourdomain.com` |

6. Update OAuth redirect URIs to `https://your-domain.com/api/auth/callback/google` (and GitHub).

The web app never imports the Python package. Video jobs go to the VPS via `NEXT_PUBLIC_CHALKBOARD_API_URL` (browser → Next `/api/video/*` proxy → worker, or direct worker URL).

## Local

```bash
cd client
bun install
bunx prisma generate
bun run dev
```

Worker (separate terminal / VPS only):

```bash
# from repo root, on the machine that runs Manim/Remotion
uv run uvicorn main:app --host 0.0.0.0 --port 8000
```
