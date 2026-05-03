import asyncio
import hashlib
import time
import uuid
from collections import defaultdict, deque

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from schema.chat import ChatRequest, JobCreateResponse, JobStatusResponse
from worker import process_topic, DEFAULT_MODEL

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

JOBS: dict[str, dict] = {}
CACHE: dict[str, dict] = {}
CACHE_TTL_SECONDS = 6 * 60 * 60

RATE_LIMIT_COUNT = 10
RATE_LIMIT_WINDOW_SECONDS = 10 * 60
REQUEST_LOG: dict[str, deque] = defaultdict(deque)


def _extract_topic(messages) -> str:
    user_msgs = [m.content for m in messages if m.role.lower() == "user" and m.content.strip()]
    if not user_msgs:
        raise HTTPException(status_code=400, detail="At least one user message is required.")
    return user_msgs[-1].strip()


def _cache_key(topic: str, model: str) -> str:
    return hashlib.sha256(f"{topic}::{model}".encode("utf-8")).hexdigest()


def _rate_limit_or_raise(request: Request):
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    q = REQUEST_LOG[client_ip]
    while q and now - q[0] > RATE_LIMIT_WINDOW_SECONDS:
        q.popleft()
    if len(q) >= RATE_LIMIT_COUNT:
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Please retry later.")
    q.append(now)


def _run_job(job_id: str, topic: str, model: str):
    try:
        JOBS[job_id]["status"] = "processing"
        video_url = process_topic(topic, model=model)
        if not video_url:
            JOBS[job_id]["status"] = "failed"
            JOBS[job_id]["error"] = "Video generation failed."
            return
        JOBS[job_id]["status"] = "completed"
        JOBS[job_id]["video_url"] = video_url
        key = _cache_key(topic, model)
        CACHE[key] = {"video_url": video_url, "created_at": time.time()}
    except Exception as exc:
        JOBS[job_id]["status"] = "failed"
        JOBS[job_id]["error"] = str(exc)


@app.get("/")
async def root():
    return {"message": "Welcome to ChalkBoard API"}


@app.post("/generate-lecture", response_model=JobCreateResponse)
async def generate_chalks(request: ChatRequest, http_request: Request):
    _rate_limit_or_raise(http_request)
    topic = _extract_topic(request.messages)
    model = (request.model or DEFAULT_MODEL).strip() or DEFAULT_MODEL

    key = _cache_key(topic, model)
    hit = CACHE.get(key)
    if hit and time.time() - hit["created_at"] <= CACHE_TTL_SECONDS:
        job_id = str(uuid.uuid4())
        JOBS[job_id] = {
            "status": "completed",
            "video_url": hit["video_url"],
            "error": None,
            "cached": True,
            "created_at": time.time(),
        }
        return JobCreateResponse(job_id=job_id, status="completed", cached=True, video_url=hit["video_url"])

    job_id = str(uuid.uuid4())
    JOBS[job_id] = {
        "status": "queued",
        "video_url": None,
        "error": None,
        "cached": False,
        "created_at": time.time(),
        "topic": topic,
        "model": model,
    }
    asyncio.create_task(asyncio.to_thread(_run_job, job_id, topic, model))
    return JobCreateResponse(job_id=job_id, status="queued", cached=False, video_url=None)


@app.get("/jobs/{job_id}", response_model=JobStatusResponse)
async def get_job_status(job_id: str):
    job = JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    return JobStatusResponse(
        job_id=job_id,
        status=job["status"],
        video_url=job.get("video_url"),
        error=job.get("error"),
        cached=job.get("cached", False),
    )