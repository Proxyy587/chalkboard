import asyncio
import os
from typing import Optional

from router import route_prompt
from services.audio import generate_audio_with_captions
from services.llm import (
    DEFAULT_MODEL,
    generate_manim_code,
    generate_narration_script,
    generate_remotion_code,
    generate_visual_plan,
)
from services.merger import merge_video_audio_captions
from services.remotion_renderer import render_remotion
from services.renderer import get_media_duration, render_video
from services.storage import upload_to_r2

OUTPUT_DIR = "outputs"


def log(msg: str):
    print(msg, flush=True)


async def _run_manim_pipeline(
    topic: str,
    model: str,
    visual_plan: str,
    duration: int,
    complexity: str,
    max_attempts: int = 4,
) -> Optional[str]:
    last_error = None
    previous_code = None
    for attempt in range(1, max_attempts + 1):
        log(f"\n🧠 Manim attempt {attempt}/{max_attempts}")
        code = generate_manim_code(
            topic=topic,
            model=model,
            visual_plan=visual_plan,
            duration=duration,
            complexity=complexity,
            error=last_error,
            previous_code=previous_code,
            log=log,
        )
        previous_code = code
        video, err = render_video(code, output_dir=OUTPUT_DIR, log=log)
        if video:
            return video
        last_error = err
        log("🔁 Manim render failed — retrying with error context...")
    return None


async def _run_remotion_pipeline(
    topic: str,
    model: str,
    visual_plan: str,
    duration: int,
    complexity: str,
    job_id: str,
    max_attempts: int = 3,
) -> Optional[str]:
    last_error = None
    previous_code = None
    for attempt in range(1, max_attempts + 1):
        log(f"\n🧠 Remotion attempt {attempt}/{max_attempts}")
        code = generate_remotion_code(
            topic=topic,
            model=model,
            visual_plan=visual_plan,
            duration=duration,
            complexity=complexity,
            error=last_error,
            previous_code=previous_code,
            log=log,
        )
        previous_code = code
        video, err = render_remotion(
            tsx_code=code,
            job_id=f"{job_id}_{attempt}",
            duration=duration,
            output_dir=OUTPUT_DIR,
            log=log,
        )
        if video:
            return video
        last_error = err
        log("🔁 Remotion render failed — retrying with error context...")
    return None


async def process_topic_async(
    topic: str,
    model: str = DEFAULT_MODEL,
    engine: str = "auto",
    duration: int = 60,
    job_id: Optional[str] = None,
    max_attempts: int = 4,
    status_cb=None,
) -> Optional[dict]:
    """
    Full Clarity video pipeline.
    Returns dict with video_url / engine / duration, or None on hard failure.
    """
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    job_id = job_id or "local"

    def set_status(status: str, **extra):
        if status_cb:
            status_cb(status, extra)

    set_status("routing")
    route = route_prompt(topic, forced_engine=engine)
    chosen_engine = route["engine"]
    duration = int(route.get("duration", duration) or duration)
    complexity = route.get("complexity", "medium")
    subject = route.get("subject", topic)
    log(f"Router chose: {chosen_engine} ({route.get('reason')})")

    set_status("planning", engine=chosen_engine)
    visual_plan = generate_visual_plan(subject, chosen_engine, duration=duration)
    log(f"Visual plan ready ({len(visual_plan)} chars)")

    set_status("generating_code", engine=chosen_engine)
    if chosen_engine == "remotion":
        video = await _run_remotion_pipeline(
            topic=subject,
            model=model,
            visual_plan=visual_plan,
            duration=duration,
            complexity=complexity,
            job_id=job_id,
            max_attempts=min(3, max_attempts),
        )
    else:
        video = await _run_manim_pipeline(
            topic=subject,
            model=model,
            visual_plan=visual_plan,
            duration=duration,
            complexity=complexity,
            max_attempts=max_attempts,
        )

    if not (video and os.path.exists(video)):
        log("❌ Failed to generate base video")
        return None

    log(f"✅ Base video: {video}")
    try:
        set_status("generating_audio", engine=chosen_engine)
        video_duration = get_media_duration(video)
        narration_script = generate_narration_script(
            topic=subject,
            visual_plan=visual_plan,
            video_duration=video_duration,
            output_dir=OUTPUT_DIR,
            model=model,
            log=log,
        )
        audio_path, srt_path, audio_duration = await generate_audio_with_captions(
            narration_script, output_dir=OUTPUT_DIR, log=log
        )

        set_status("merging", engine=chosen_engine)
        final_video = merge_video_audio_captions(
            video_path=video,
            audio_path=audio_path,
            srt_path=srt_path,
            video_duration=video_duration,
            audio_duration=audio_duration,
            output_dir=OUTPUT_DIR,
            log=log,
        )

        set_status("uploading", engine=chosen_engine)
        video_url = upload_to_r2(final_video, object_key=f"videos/{job_id}.mp4")
        log(f"☁️ Uploaded: {video_url}")
        return {
            "video_url": video_url,
            "engine": chosen_engine,
            "duration": video_duration,
            "reason": route.get("reason"),
        }
    except Exception as e:
        log(f"⚠️ Video rendered, but post-process/upload failed: {e}")
        # Still try uploading silent video if present
        try:
            video_url = upload_to_r2(video, object_key=f"videos/{job_id}_silent.mp4")
            return {
                "video_url": video_url,
                "engine": chosen_engine,
                "duration": get_media_duration(video),
                "warning": str(e),
            }
        except Exception:
            return None


def process_topic(
    topic: str,
    model: str = DEFAULT_MODEL,
    engine: str = "auto",
    duration: int = 60,
    job_id: Optional[str] = None,
    max_attempts: int = 4,
) -> Optional[str]:
    """CLI-friendly wrapper — returns video URL string only."""
    result = asyncio.run(
        process_topic_async(
            topic=topic,
            model=model,
            engine=engine,
            duration=duration,
            job_id=job_id,
            max_attempts=max_attempts,
        )
    )
    if not result:
        return None
    return result.get("video_url")
