# Next.js Integration — Clarity Video API

Base URL (example): `http://20.219.8.173:8000`

## Auth (`CLARITY_API_KEY`)

This is **not** a third-party key. It is a secret **you invent**.

On the VPS `.env`:

```env
CLARITY_API_KEY=some-long-random-string
```

Generate one:

```bash
openssl rand -hex 32
```

If unset, the API is open (no key required).  
If set, send header: `x-api-key: <value>`

---

## Endpoints

### `GET /health`
```bash
curl http://20.219.8.173:8000/health
```

Returns `r2_ready: true/false` so you can verify R2 env vars are loaded.
Also returns `storage: { clarity_env, keep_local_outputs, work_root }` — on VPS you want `clarity_env: "vps"` and `keep_local_outputs: false` so local renders are deleted after R2 upload.

### `POST /video/request`
```bash
curl -X POST http://20.219.8.173:8000/video/request \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_KEY" \
  -d '{
    "prompt": "Explain the product rule",
    "model": "deepseek/deepseek-v3.2",
    "engine": "auto"
  }'
```

`duration` is optional (15–120). If omitted, the router picks a natural length (~25–90s).

### `GET /video/status/{job_id}`
```bash
curl http://20.219.8.173:8000/video/status/JOB_ID
```

On failure, `error` now contains the real reason (Manim traceback / R2 missing env / etc).

On success, `video_url` is a **Cloudflare R2 public URL** like:
`https://pub-xxxx.r2.dev/videos/<job_id>/<timestamp>_final.mp4`

---

## Next.js setup

### `.env` (Next.js app)
```env
CLARITY_API_URL=http://20.219.8.173:8000
CLARITY_API_KEY=your-random-key
```

Keep the key **server-side only** (no `NEXT_PUBLIC_`).

### `app/api/video/route.ts`
```ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (process.env.CLARITY_API_KEY) headers["x-api-key"] = process.env.CLARITY_API_KEY;

  const payload: Record<string, unknown> = {
    prompt: body.prompt,
    model: body.model || "deepseek/deepseek-v3.2",
    engine: body.engine || "auto",
  };
  // Only pass duration when the client set one — otherwise router chooses freely.
  if (body.duration != null) payload.duration = body.duration;

  const res = await fetch(`${process.env.CLARITY_API_URL}/video/request`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  return NextResponse.json(await res.json(), { status: res.status });
}
```

### `app/api/video/[jobId]/route.ts`
```ts
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const headers: Record<string, string> = {};
  if (process.env.CLARITY_API_KEY) headers["x-api-key"] = process.env.CLARITY_API_KEY;

  const res = await fetch(`${process.env.CLARITY_API_URL}/video/status/${jobId}`, {
    headers,
    cache: "no-store",
  });
  return NextResponse.json(await res.json(), { status: res.status });
}
```

### Client poller
```ts
export async function generateClarityVideo(prompt: string) {
  const create = await fetch("/api/video", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  }).then((r) => r.json());

  if (create.video_url) return create.video_url;

  for (let i = 0; i < 120; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const status = await fetch(`/api/video/${create.job_id}`).then((r) => r.json());
    if (status.status === "completed") return status.video_url;
    if (status.status === "failed") throw new Error(status.error || "failed");
  }
  throw new Error("Timed out");
}
```

---

## VPS R2 checklist

On the VPS `.env` make sure:

```env
R2_ACCOUNT_ID=...
R2_BUCKET_NAME=manim-video
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
AWS_ENDPOINT_URL_S3=https://ACCOUNT_ID.r2.cloudflarestorage.com
R2_PUBLIC_BASE_URL=https://pub-xxxx.r2.dev
```

Endpoint must **not** include `/manim-video` at the end.

After updating env:

```bash
cd ~/chalkboard
docker compose up -d --build
curl http://127.0.0.1:8000/health
# expect "r2_ready": true
```

Check logs while a job runs:

```bash
docker compose logs -f clarity-video
```

Look for: `☁️ Uploading ...` and `☁️ Public URL: https://...`
