import asyncio
import os
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from router import route_prompt
from services.audio import generate_audio_with_captions
from services.config import cleanup_job_dir, job_work_dir, keep_local_outputs, storage_policy
from services.llm import (
    DEFAULT_MODEL,
    beat_sheet_target_duration,
    format_beat_sheet_for_prompt,
    generate_manim_code,
    generate_narration_script,
    generate_remotion_code,
    generate_visual_plan,
)
from services.merger import merge_video_audio_captions
from services.remotion_renderer import render_remotion
from services.renderer import get_media_duration, render_video
from services.storage import upload_to_r2
from services.user_storage import UserStorageConfig


def log(msg: str):
    print(msg, flush=True)


def _r2_object_key(job_id: str, suffix: str = "final") -> str:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    safe_job = (job_id or uuid.uuid4().hex).replace("/", "-")
    return f"videos/{safe_job}/{stamp}_{suffix}.mp4"


async def _run_manim_pipeline(
    topic: str,
    model: str,
    visual_plan: dict[str, Any],
    duration: Optional[int],
    complexity: str,
    output_dir: str,
    max_attempts: int = 4,
) -> tuple[Optional[str], Optional[str]]:
    last_error = None
    previous_code = None
    plan_text = format_beat_sheet_for_prompt(visual_plan)
    for attempt in range(1, max_attempts + 1):
        attempt_complexity = complexity
        attempt_plan: dict[str, Any] | str = visual_plan
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
                f"Original plan intent (simplify heavily):\n{plan_text[:1200]}"
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
        video, err = render_video(code, output_dir=output_dir, log=log)
        if video:
            return video, None
        last_error = err
        log("🔁 Manim render failed — retrying with error context...")
    return None, last_error or "Manim failed after all attempts"


async def _run_remotion_pipeline(
    topic: str,
    model: str,
    visual_plan: dict[str, Any],
    duration: int,
    complexity: str,
    job_id: str,
    output_dir: str,
    max_attempts: int = 4,
) -> tuple[Optional[str], Optional[str]]:
    from services.llm import judge_generated_code, quality_judge_enabled

    last_error = None
    previous_code = None
    plan_text = format_beat_sheet_for_prompt(visual_plan)
    for attempt in range(1, max_attempts + 1):
        attempt_complexity = complexity
        attempt_plan: dict[str, Any] | str = visual_plan
        if attempt >= 2:
            attempt_complexity = "simple"
        if attempt >= 3:
            attempt_plan = (
                "Keep it VERY simple and compile-proof:\n"
                "1) AbsoluteFill dark bg #0B1020\n"
                "2) One title Sequence, then 2–4 Series.Sequence content slides\n"
                "3) Text + simple SVG or bars only — no complex filters\n"
                "4) interpolate with clamp + Easing.out(Easing.cubic)\n"
                "5) No emoji, no external assets\n"
                f"Original plan intent (simplify heavily):\n{plan_text[:1200]}"
            )
        log(f"\n🧠 Remotion attempt {attempt}/{max_attempts} (complexity={attempt_complexity})")
        try:
            code = generate_remotion_code(
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

        if quality_judge_enabled() and attempt == 1:
            judgment = judge_generated_code(
                topic=topic,
                engine="remotion",
                code=code,
                visual_plan=visual_plan,
                log=log,
            )
            verdict = str(judgment.get("verdict", "approve")).lower()
            score = int(judgment.get("score") or 0)
            if verdict == "regenerate" or score < 50:
                last_error = (
                    "Quality judge rejected code: "
                    + "; ".join(
                        str(i.get("description", ""))
                        for i in (judgment.get("issues") or [])[:3]
                    )
                )
                previous_code = code
                log("  ⚠️ Judge requested regenerate — retrying...")
                continue

        previous_code = code
        video, err = render_remotion(
            tsx_code=code,
            job_id=f"{job_id}_{attempt}",
            duration=duration,
            output_dir=output_dir,
            log=log,
        )
        if video:
            return video, None
        last_error = err
        log("🔁 Remotion render failed — retrying with error context...")
    return None, last_error or "Remotion failed after all attempts"


def _upload_and_maybe_cleanup(
    local_path: str,
    object_key: str,
    work_dir: str,
    user_id: Optional[str] = None,
    storage_override: Optional[UserStorageConfig] = None,
) -> str:
    """Upload to R2/S3, then wipe the job work dir on VPS."""
    if not local_path or not os.path.isfile(local_path):
        raise FileNotFoundError(f"Nothing to upload: {local_path}")
    try:
        url = upload_to_r2(
            local_path,
            object_key=object_key,
            log=log,
            user_id=user_id,
            storage_override=storage_override,
        )
    except Exception as e:
        # Still free disk on VPS even if upload fails
        cleanup_job_dir(work_dir, log=log)
        raise RuntimeError(f"R2 upload failed: {e}") from e

    cleanup_job_dir(work_dir, log=log)
    if keep_local_outputs():
        log(f"  💾 Keeping local outputs ({storage_policy()['clarity_env']})")
    else:
        log("  🧹 Local job files removed after R2 upload (VPS mode)")
    return url


async def process_topic_async(
    topic: str,
    model: str = DEFAULT_MODEL,
    engine: str = "auto",
    duration: Optional[int] = None,
    job_id: Optional[str] = None,
    user_id: Optional[str] = None,
    storage_override: Optional[UserStorageConfig] = None,
    max_attempts: int = 4,
    status_cb=None,
) -> dict:
    """
    Full Clarity video pipeline.
    Always returns a dict:
      success → {ok: True, video_url, engine, duration, ...}
      failure → {ok: False, error: "...", engine?: ...}
    """
    job_id = job_id or uuid.uuid4().hex
    work_dir = job_work_dir(job_id)
    policy = storage_policy()
    log(
        f"Storage policy: env={policy['clarity_env']}, "
        f"keep_local={policy['keep_local_outputs']}, work_dir={work_dir}"
    )

    def set_status(status: str, **extra):
        if status_cb:
            status_cb(status, extra)

    video = None
    chosen_engine = None
    try:
        set_status("routing")
        route = route_prompt(topic, forced_engine=engine, preferred_duration=duration)
        chosen_engine = route["engine"]
        router_duration = route.get("duration")  # None = AI picks length in beat sheet
        complexity = route.get("complexity", "medium")
        subject = route.get("subject", topic)
        log(
            f"Router chose: {chosen_engine} ({route.get('reason')}), "
            f"duration={'auto' if router_duration is None else f'{router_duration}s'}, "
            f"complexity={complexity}"
        )
        set_status("routing", engine=chosen_engine, duration=router_duration)

        # 1) Beat-sheet plan (visual + narration + timing)
        set_status("planning", engine=chosen_engine)
        visual_plan = generate_visual_plan(
            subject,
            chosen_engine,
            duration=router_duration,
            log=log,
        )
        plan_duration = int(beat_sheet_target_duration(visual_plan))
        log(f"Beat sheet ready: {len(visual_plan.get('beats', []))} beats, ~{plan_duration}s")

        # 2) Narration + TTS BEFORE render so audio length guides animation target
        set_status("generating_audio", engine=chosen_engine)
        narration_script = generate_narration_script(
            topic=subject,
            visual_plan=visual_plan,
            target_duration=float(plan_duration),
            output_dir=work_dir,
            model=model,
            log=log,
        )
        audio_path, srt_path, audio_duration = await generate_audio_with_captions(
            narration_script, output_dir=work_dir, log=log
        )
        code_duration = int(round(max(plan_duration, audio_duration)))
        log(f"Audio {audio_duration:.1f}s → code target {code_duration}s")

        # 3) Generate + render video synced to beat sheet + audio length
        set_status("generating_code", engine=chosen_engine)
        if chosen_engine == "remotion":
            video, render_err = await _run_remotion_pipeline(
                topic=subject,
                model=model,
                visual_plan=visual_plan,
                duration=code_duration,
                complexity=complexity,
                job_id=job_id,
                output_dir=work_dir,
                max_attempts=min(3, max_attempts),
            )
        else:
            video, render_err = await _run_manim_pipeline(
                topic=subject,
                model=model,
                visual_plan=visual_plan,
                duration=code_duration,
                complexity=complexity,
                output_dir=work_dir,
                max_attempts=max_attempts,
            )

        if not (video and os.path.exists(video)):
            err = render_err or "Failed to generate base video"
            log(f"❌ {err}")
            cleanup_job_dir(work_dir, log=log)
            return {"ok": False, "error": err[-4000:], "engine": chosen_engine}

        log(f"✅ Base video: {video}")
        video_duration = get_media_duration(video)

        set_status("merging", engine=chosen_engine)
        final_video = merge_video_audio_captions(
            video_path=video,
            audio_path=audio_path,
            srt_path=srt_path,
            video_duration=video_duration,
            audio_duration=audio_duration,
            output_dir=work_dir,
            log=log,
        )

        set_status("uploading", engine=chosen_engine)
        video_url = _upload_and_maybe_cleanup(
            final_video,
            object_key=_r2_object_key(job_id, "final"),
            work_dir=work_dir,
            user_id=user_id,
            storage_override=storage_override,
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
        # Best-effort: upload whatever base video exists, then clean disk on VPS
        try:
            if video and os.path.exists(video):
                set_status("uploading", engine=chosen_engine)
                try:
                    silent_duration = get_media_duration(video)
                except Exception:
                    silent_duration = None
                video_url = _upload_and_maybe_cleanup(
                    video,
                    object_key=_r2_object_key(job_id, "silent"),
                    work_dir=work_dir,
                    user_id=user_id,
                    storage_override=storage_override,
                )
                return {
                    "ok": True,
                    "video_url": video_url,
                    "engine": chosen_engine,
                    "duration": silent_duration,
                    "warning": str(e),
                }
        except Exception as upload_err:
            cleanup_job_dir(work_dir, log=log)
            return {
                "ok": False,
                "error": f"{e} | upload also failed: {upload_err}",
                "engine": chosen_engine,
            }
        cleanup_job_dir(work_dir, log=log)
        return {"ok": False, "error": str(e), "engine": chosen_engine}


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
