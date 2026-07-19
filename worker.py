import asyncio
import os
import uuid
from datetime import datetime, timezone
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


def _r2_object_key(job_id: str, suffix: str = "final") -> str:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    safe_job = (job_id or uuid.uuid4().hex).replace("/", "-")
    return f"videos/{safe_job}/{stamp}_{suffix}.mp4"


async def _run_manim_pipeline(
    topic: str,
    model: str,
    visual_plan: str,
    duration: Optional[int],
    complexity: str,
    max_attempts: int = 4,
) -> tuple[Optional[str], Optional[str]]:
    last_error = None
    previous_code = None
    for attempt in range(1, max_attempts + 1):
        # Escalate simplicity on later retries for higher success rate.
        attempt_complexity = complexity
        attempt_plan = visual_plan
        if attempt >= 2:
            attempt_complexity = "simple"
        if attempt >= 3:
            attempt_plan = (
                "Keep it VERY simple and crash-proof:\n"
                "1) Title at top\n"
                "2) One main MathTex equation at center\n"
                "3) SurroundingRectangle highlight\n"
                "4) TransformMatchingTex to next equation\n"
                "5) Short conclusion text\n"
                "NO get_part_by_tex, NO arrows to equation parts, NO next_to on subparts.\n"
                f"Original plan intent (simplify heavily):\n{visual_plan[:1200]}"
            )
        log(f"\n🧠 Manim attempt {attempt}/{max_attempts} (complexity={attempt_complexity})")
        try:
            code = generate_manim_code(
                topic=topic,
                model=model,
                visual_plan=attempt_plan,
                duration=duration,
                complexity=attempt_complexity,
                error=last_error,
                previous_code=previous_code,
                log=log,
            )
        except Exception as e:
            last_error = str(e)
            log(f"  ❌ Code generation failed: {last_error}")
            continue
        previous_code = code
        video, err = render_video(code, output_dir=OUTPUT_DIR, log=log)
        if video:
            return video, None
        last_error = err
        log("🔁 Manim render failed — retrying with error context...")
    return None, last_error or "Manim failed after all attempts"


async def _run_remotion_pipeline(
    topic: str,
    model: str,
    visual_plan: str,
    duration: int,
    complexity: str,
    job_id: str,
    max_attempts: int = 3,
) -> tuple[Optional[str], Optional[str]]:
    last_error = None
    previous_code = None
    for attempt in range(1, max_attempts + 1):
        log(f"\n🧠 Remotion attempt {attempt}/{max_attempts}")
        try:
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
        except Exception as e:
            last_error = str(e)
            log(f"  ❌ Code generation failed: {last_error}")
            continue
        previous_code = code
        video, err = render_remotion(
            tsx_code=code,
            job_id=f"{job_id}_{attempt}",
            duration=duration,
            output_dir=OUTPUT_DIR,
            log=log,
        )
        if video:
            return video, None
        last_error = err
        log("🔁 Remotion render failed — retrying with error context...")
    return None, last_error or "Remotion failed after all attempts"


async def process_topic_async(
    topic: str,
    model: str = DEFAULT_MODEL,
    engine: str = "auto",
    duration: Optional[int] = None,
    job_id: Optional[str] = None,
    max_attempts: int = 4,
    status_cb=None,
) -> dict:
    """
    Full Clarity video pipeline.
    Always returns a dict:
      success → {ok: True, video_url, engine, duration, ...}
      failure → {ok: False, error: "...", engine?: ...}
    """
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    job_id = job_id or uuid.uuid4().hex

    def set_status(status: str, **extra):
        if status_cb:
            status_cb(status, extra)

    try:
        set_status("routing")
        route = route_prompt(topic, forced_engine=engine, preferred_duration=duration)
        chosen_engine = route["engine"]
        # User-provided duration wins; otherwise router-chosen duration.
        final_duration = int(route["duration"])
        complexity = route.get("complexity", "medium")
        subject = route.get("subject", topic)
        log(
            f"Router chose: {chosen_engine} ({route.get('reason')}), "
            f"duration={final_duration}s, complexity={complexity}"
        )
        set_status("routing", engine=chosen_engine, duration=final_duration)

        set_status("planning", engine=chosen_engine)
        visual_plan = generate_visual_plan(
            subject,
            chosen_engine,
            duration=final_duration,
        )
        log(f"Visual plan ready ({len(visual_plan)} chars)")

        set_status("generating_code", engine=chosen_engine)
        if chosen_engine == "remotion":
            video, render_err = await _run_remotion_pipeline(
                topic=subject,
                model=model,
                visual_plan=visual_plan,
                duration=final_duration,
                complexity=complexity,
                job_id=job_id,
                max_attempts=min(3, max_attempts),
            )
        else:
            video, render_err = await _run_manim_pipeline(
                topic=subject,
                model=model,
                visual_plan=visual_plan,
                duration=final_duration,
                complexity=complexity,
                max_attempts=max_attempts,
            )

        if not (video and os.path.exists(video)):
            err = render_err or "Failed to generate base video"
            log(f"❌ {err}")
            return {"ok": False, "error": err[-4000:], "engine": chosen_engine}

        log(f"✅ Base video: {video}")
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
        video_url = upload_to_r2(
            final_video,
            object_key=_r2_object_key(job_id, "final"),
            log=log,
        )
        log(f"☁️ Uploaded: {video_url}")
        return {
            "ok": True,
            "video_url": video_url,
            "engine": chosen_engine,
            "duration": video_duration,
            "reason": route.get("reason"),
        }
    except Exception as e:
        log(f"⚠️ Pipeline error: {e}")
        # Best-effort: upload whatever base video exists
        try:
            if "video" in locals() and video and os.path.exists(video):
                set_status("uploading", engine=locals().get("chosen_engine"))
                video_url = upload_to_r2(
                    video,
                    object_key=_r2_object_key(job_id, "silent"),
                    log=log,
                )
                return {
                    "ok": True,
                    "video_url": video_url,
                    "engine": locals().get("chosen_engine"),
                    "duration": get_media_duration(video),
                    "warning": str(e),
                }
        except Exception as upload_err:
            return {
                "ok": False,
                "error": f"{e} | upload also failed: {upload_err}",
                "engine": locals().get("chosen_engine"),
            }
        return {"ok": False, "error": str(e), "engine": locals().get("chosen_engine")}


def process_topic(
    topic: str,
    model: str = DEFAULT_MODEL,
    engine: str = "auto",
    duration: Optional[int] = None,
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
            job_id=job_id or uuid.uuid4().hex,
            max_attempts=max_attempts,
        )
    )
    if not result or not result.get("ok"):
        return None
    return result.get("video_url")
