# Chalkboard (manim-vid)

AI lecture videos: the user describes a topic, an LLM writes **Manim** code, the pipeline renders video, adds **TTS/captions**, merges with **FFmpeg**, and uploads the final **MP4** to **Cloudflare R2**. A **Next.js** app (`client/`) talks to a **FastAPI** API and shows the returned public URL in a canvas-style player.

## Architecture

| Piece | Role |
|--------|------|
| `main.py` | FastAPI: `POST /generate-lecture`, `GET /jobs/{job_id}`, in-memory jobs + optional cache |
| `worker.py` | Orchestrates LLM → render → narration → audio → merge → `upload_to_r2` |
| `services/` | `llm`, `renderer`, `audio`, `merger`, `storage` (R2/S3-compatible) |
| `client/` | Chalkboard UI: threads, parameters (LLM model), RENDER → poll job → `<video src={R2 URL}>` |

## Requirements

- **Python 3.11+** (recommended), **Node 20+** for the frontend  
- **FFmpeg** on `PATH` (merge step)  
- **Manim** and other Python deps: see `requirements.txt`  
- **Cloudflare R2** (or compatible S3) env vars for uploads — see `services/storage.py`  
- **OpenRouter** (or your LLM provider as wired in `services/llm.py`) via `.env`

## Backend setup

```bash
cd /path/to/manim-vid
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` in the repo root with at least:

- LLM / OpenRouter keys as used by `services/llm.py`
- R2: `R2_BUCKET_NAME`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_BASE_URL`, and `R2_ENDPOINT_URL` or `R2_ACCOUNT_ID` (see `services/storage.py`)

Run the API:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### API (summary)

- **`POST /generate-lecture`** — JSON body: `{ "messages": [{ "role": "user"|"assistant", "content": "..." }], "model": "deepseek/deepseek-v3.2" }`. The server uses the **last user message** as the lecture topic. Returns `{ job_id, status, cached?, video_url? }` (immediate `completed` when cache hits).
- **`GET /jobs/{job_id}`** — `{ job_id, status, video_url?, error?, cached? }` with `status` in `queued` | `processing` | `completed` | `failed`.

CORS is enabled for local Next.js (`localhost` / `127.0.0.1`).

## Frontend setup

```bash
cd client
npm install
```

Create `client/.env.local`:

```bash
NEXT_PUBLIC_CHALKBOARD_API_URL=http://127.0.0.1:8000
```

Point this at wherever `main.py` is served (including production).

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Start a thread from the home screen, pick an **LLM model**, then **RENDER** — the client polls until `video_url` is set and plays it in the canvas.

Other scripts: `npm run build`, `npm run lint`.

## Docker

If you use the repo `Dockerfile`, align build args and env with the same R2 and LLM variables the worker expects.

## License

Add a license file if you distribute this project.
