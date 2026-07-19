import asyncio
import hashlib
import os
import time
import uuid
from collections import defaultdict, deque

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

from schema.chat import (
    ChatRequest,
    JobCreateResponse,
    JobStatusResponse,
    VideoRequest,
)
from services.llm import DEFAULT_MODEL
from worker import process_topic_async

load_dotenv()

app = FastAPI(title="Clarity Video Service", version="1.0.0")

_allowed = os.getenv("ALLOWED_ORIGINS", "*")
_origins = [o.strip() for o in _allowed.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins if _origins != ["*"] else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

JOBS: dict[str, dict] = {}
CACHE: dict[str, dict] = {}
CACHE_TTL_SECONDS = int(os.getenv("CACHE_TTL_SECONDS", str(6 * 60 * 60)))
RATE_LIMIT_COUNT = int(os.getenv("RATE_LIMIT_COUNT", "20"))
RATE_LIMIT_WINDOW_SECONDS = int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", str(10 * 60)))
REQUEST_LOG: dict[str, deque] = defaultdict(deque)
API_KEY = os.getenv("CLARITY_API_KEY", "").strip()


def _require_api_key(request: Request):
    if not API_KEY:
        return
    provided = request.headers.get("x-api-key") or request.headers.get("authorization", "").removeprefix("Bearer ").strip()
    if provided != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing API key.")


def _extract_topic(messages) -> str:
    user_msgs = [m.content for m in messages if m.role.lower() == "user" and m.content.strip()]
    if not user_msgs:
        raise HTTPException(status_code=400, detail="At least one user message is required.")
    return user_msgs[-1].strip()


def _cache_key(topic: str, model: str, engine: str, duration: int) -> str:
    raw = f"{topic}::{model}::{engine}::{duration}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _rate_limit_or_raise(request: Request):
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    q = REQUEST_LOG[client_ip]
    while q and now - q[0] > RATE_LIMIT_WINDOW_SECONDS:
        q.popleft()
    if len(q) >= RATE_LIMIT_COUNT:
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Please retry later.")
    q.append(now)


def _run_job(job_id: str, topic: str, model: str, engine: str, duration: int):
    def status_cb(status: str, extra: dict):
        JOBS[job_id]["status"] = status
        if extra:
            JOBS[job_id].update(extra)

    try:
        JOBS[job_id]["status"] = "processing"
        result = asyncio.run(
            process_topic_async(
                topic=topic,
                model=model,
                engine=engine,
                duration=duration,
                job_id=job_id,
                status_cb=status_cb,
            )
        )
        if not result or not result.get("ok") or not result.get("video_url"):
            JOBS[job_id]["status"] = "failed"
            JOBS[job_id]["error"] = (result or {}).get("error") or "Video generation failed."
            JOBS[job_id]["engine"] = (result or {}).get("engine")
            return

        JOBS[job_id]["status"] = "completed"
        JOBS[job_id]["video_url"] = result["video_url"]
        JOBS[job_id]["engine"] = result.get("engine")
        JOBS[job_id]["duration"] = result.get("duration")
        JOBS[job_id]["error"] = None
        if result.get("warning"):
            JOBS[job_id]["warning"] = result["warning"]
        key = _cache_key(topic, model, engine, duration)
        CACHE[key] = {
            "video_url": result["video_url"],
            "engine": result.get("engine"),
            "duration": result.get("duration"),
            "created_at": time.time(),
        }
    except Exception as exc:
        JOBS[job_id]["status"] = "failed"
        JOBS[job_id]["error"] = str(exc)


def _enqueue(topic: str, model: str, engine: str, duration: int) -> JobCreateResponse:
    model = (model or DEFAULT_MODEL).strip() or DEFAULT_MODEL
    engine = (engine or "auto").strip().lower() or "auto"
    duration = int(duration or 60)

    key = _cache_key(topic, model, engine, duration)
    hit = CACHE.get(key)
    if hit and time.time() - hit["created_at"] <= CACHE_TTL_SECONDS:
        job_id = str(uuid.uuid4())
        JOBS[job_id] = {
            "status": "completed",
            "video_url": hit["video_url"],
            "engine": hit.get("engine"),
            "duration": hit.get("duration"),
            "error": None,
            "cached": True,
            "created_at": time.time(),
        }
        return JobCreateResponse(
            job_id=job_id,
            status="completed",
            cached=True,
            video_url=hit["video_url"],
            engine=hit.get("engine"),
        )

    job_id = str(uuid.uuid4())
    JOBS[job_id] = {
        "status": "queued",
        "video_url": None,
        "error": None,
        "cached": False,
        "created_at": time.time(),
        "topic": topic,
        "model": model,
        "engine": engine,
        "duration": duration,
    }
    asyncio.create_task(asyncio.to_thread(_run_job, job_id, topic, model, engine, duration))
    return JobCreateResponse(job_id=job_id, status="queued", cached=False, video_url=None, engine=None)


@app.get("/")
async def root():
    return {
        "service": "Clarity Video API",
        "docs": "/docs",
        "health": "/health",
        "endpoints": {
            "POST /video/request": "Create a video job (recommended)",
            "GET /video/status/{job_id}": "Poll job status",
            "POST /generate-lecture": "Legacy chalkboard endpoint",
            "GET /jobs/{job_id}": "Legacy job status",
        },
    }


@app.get("/health")
async def health():
    from services.storage import r2_config_status

    r2 = r2_config_status()
    return {
        "status": "ok",
        "service": "clarity-video",
        "r2_ready": r2["ready"],
        "r2": r2,
    }


@app.post("/video/request", response_model=JobCreateResponse)
async def request_video(req: VideoRequest, http_request: Request):
    _require_api_key(http_request)
    _rate_limit_or_raise(http_request)
    return _enqueue(
        topic=req.prompt.strip(),
        model=req.model or DEFAULT_MODEL,
        engine=req.engine or "auto",
        duration=req.duration or 60,
    )


@app.get("/video/status/{job_id}", response_model=JobStatusResponse)
async def video_status(job_id: str):
    job = JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    return JobStatusResponse(
        job_id=job_id,
        status=job["status"],
        video_url=job.get("video_url"),
        error=job.get("error"),
        cached=job.get("cached", False),
        engine=job.get("engine"),
        duration=job.get("duration"),
    )


@app.post("/generate-lecture", response_model=JobCreateResponse)
async def generate_chalks(request: ChatRequest, http_request: Request):
    """Backward-compatible chalkboard endpoint."""
    _require_api_key(http_request)
    _rate_limit_or_raise(http_request)
    topic = _extract_topic(request.messages)
    return _enqueue(
        topic=topic,
        model=request.model or DEFAULT_MODEL,
        engine=request.engine or "auto",
        duration=request.duration or 60,
    )


@app.get("/jobs/{job_id}", response_model=JobStatusResponse)
async def get_job_status(job_id: str):
    return await video_status(job_id)
