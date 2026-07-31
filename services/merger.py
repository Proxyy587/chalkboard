"""Mux narration onto rendered video — never alter speaking tempo."""

from __future__ import annotations

import os
import shutil
import subprocess


def _has_ffmpeg_filter(name: str) -> bool:
    try:
        result = subprocess.run(
            ["ffmpeg", "-hide_banner", "-filters"],
            capture_output=True,
            text=True,
            check=True,
        )
        return f" {name} " in f" {result.stdout} "
    except Exception:
        return False


def _short_ffmpeg_error(err: str, limit: int = 800) -> str:
    text = (err or "").strip()
    if not text:
        return "ffmpeg failed"
    # Prefer the actionable tail (real error lines), drop the giant banner.
    lines = [ln for ln in text.splitlines() if ln.strip()]
    useful = [
        ln
        for ln in lines
        if not ln.startswith("  ")
        and "configuration:" not in ln
        and "libav" not in ln
        and "ffmpeg version" not in ln
    ]
    picked = useful[-12:] if useful else lines[-12:]
    out = "\n".join(picked)
    return out[-limit:]


def merge_video_audio_captions(
    video_path: str,
    audio_path: str,
    srt_path: str,
    video_duration: float,
    audio_duration: float,
    output_dir: str,
    log=print,
) -> str:
    """
    Merge narration onto video with NO speed adjustment (atempo forbidden).

    ffmpeg rule: all `-i` inputs first, then output options (`-vf`, `-map`, …).
    Soft subtitle tracks are skipped — burn captions in a second pass (more reliable).
    """
    log("Step 5/6: Merging video + narration (natural tempo, no atempo)...")
    final_path = video_path.replace(".mp4", "_final.mp4")

    pad_video_sec = 0.0
    if audio_duration > 0 and video_duration > 0:
        delta = audio_duration - video_duration
        if delta > 0.15:
            pad_video_sec = delta
            log(
                f"  🧊 Audio longer by {pad_video_sec:.2f}s — "
                f"freeze-pad video, natural voice"
            )
        elif delta < -0.15:
            log(
                f"  🎞️ Video longer by {-delta:.2f}s — "
                f"keeping natural voice; picture continues after narration"
            )
        else:
            log(f"  ✅ Durations already close (Δ={delta:.2f}s) — clean mux")

    video_abs = os.path.abspath(video_path)
    audio_abs = os.path.abspath(audio_path)
    srt_abs = None
    if srt_path and os.path.exists(srt_path) and os.path.getsize(srt_path) > 0:
        srt_abs = os.path.abspath(srt_path)
    final_abs = os.path.abspath(final_path)

    # ALL inputs first — `-vf` after `-i` but before the next `-i` makes ffmpeg
    # treat the filter as an input option for the audio file (breaks merge).
    cmd = ["ffmpeg", "-y", "-i", video_abs, "-i", audio_abs]

    if pad_video_sec > 0.05:
        cmd.extend(
            [
                "-vf",
                f"tpad=stop_mode=clone:stop_duration={pad_video_sec:.3f}",
            ]
        )

    cmd.extend(
        [
            "-map",
            "0:v:0",
            "-map",
            "1:a:0",
            "-c:v",
            "libx264" if pad_video_sec > 0.05 else "copy",
            "-preset",
            "fast",
            "-crf",
            "20",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            "-ar",
            "48000",
            "-ac",
            "2",
        ]
    )
    if pad_video_sec > 0.05 and audio_duration > 0:
        cmd.extend(["-t", f"{audio_duration:.3f}"])
    elif audio_duration > 0 and video_duration > 0 and video_duration > audio_duration + 0.15:
        # Video longer: end when narration ends (hold natural voice, no stretch).
        cmd.extend(["-shortest"])

    cmd.extend(["-movflags", "+faststart", final_abs])

    try:
        subprocess.run(cmd, check=True, capture_output=True, text=True)
        log(f"  ✔️ Final merged video saved at {final_path}")
    except subprocess.CalledProcessError as e:
        err = (e.stderr or "").strip() or (e.stdout or "").strip() or str(e)
        err_path = os.path.join(output_dir, "ffmpeg_merge_error.log")
        with open(err_path, "w", encoding="utf-8") as f:
            f.write(err)
        raise RuntimeError(f"ffmpeg audio merge failed: {_short_ffmpeg_error(err)}") from e

    if srt_abs and _has_ffmpeg_filter("subtitles"):
        burned = final_abs.replace("_final.mp4", "_final_subs.mp4")
        escaped_srt = srt_abs.replace("\\", "/").replace(":", "\\:").replace("'", "\\'")
        vf = (
            f"subtitles='{escaped_srt}':force_style="
            "'FontName=Arial,FontSize=18,PrimaryColour=&Hffffff,"
            "OutlineColour=&H000000,Outline=2,Shadow=1,Alignment=2,MarginV=25'"
        )
        burn_cmd = [
            "ffmpeg",
            "-y",
            "-i",
            final_abs,
            "-vf",
            vf,
            "-c:v",
            "libx264",
            "-preset",
            "fast",
            "-crf",
            "20",
            "-c:a",
            "copy",
            "-movflags",
            "+faststart",
            burned,
        ]
        try:
            subprocess.run(burn_cmd, check=True, capture_output=True, text=True)
            shutil.move(burned, final_abs)
            log("  ✔️ Burned captions onto final video.")
        except subprocess.CalledProcessError:
            log("  ⚠️ Caption burn-in skipped (narration audio is intact).")

    return final_path
