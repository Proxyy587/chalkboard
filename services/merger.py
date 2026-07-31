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

    Voice length is sacred. Timing sync must come from beat-timed codegen.

    Mismatch policy:
      - Audio longer than video → freeze-pad last video frame (tpad)
      - Video longer than audio → keep natural audio; video continues after voice
        ends (no -shortest trim that fights beat sync; no voice stretch)
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

    def _run_audio_merge(include_soft_subs: bool) -> None:
        cmd = ["ffmpeg", "-y"]
        if pad_video_sec > 0.05:
            vf = f"tpad=stop_mode=clone:stop_duration={pad_video_sec:.3f}"
            cmd.extend(["-i", video_abs, "-vf", vf])
        else:
            cmd.extend(["-i", video_abs])
        cmd.extend(["-i", audio_abs])
        if include_soft_subs and srt_abs:
            cmd.extend(["-i", srt_abs])

        cmd.extend(["-map", "0:v:0", "-map", "1:a:0"])
        if include_soft_subs and srt_abs:
            cmd.extend(["-map", "2:0"])

        # No atempo. No -shortest — let padded video cover full narration,
        # or let slightly-long video finish after voice ends.
        cmd.extend(
            [
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
        if include_soft_subs and srt_abs:
            cmd.extend(["-c:s", "mov_text", "-metadata:s:s:0", "language=eng"])

        # When video is longer and we didn't pad, duration follows video.
        # When we padded, video ≈ audio. Explicit -t to audio length when padded
        # keeps trailing silence from an overshot pad from mattering.
        if pad_video_sec > 0.05 and audio_duration > 0:
            cmd.extend(["-t", f"{audio_duration:.3f}"])

        cmd.extend(["-movflags", "+faststart", final_abs])
        subprocess.run(cmd, check=True, capture_output=True, text=True)

    if srt_abs:
        try:
            _run_audio_merge(include_soft_subs=True)
            log(f"  ✔️ Final merged video (soft captions) saved at {final_path}")
        except subprocess.CalledProcessError as e:
            err = (e.stderr or "").strip() or str(e)
            err_path = os.path.join(output_dir, "ffmpeg_merge_error.log")
            with open(err_path, "w", encoding="utf-8") as f:
                f.write(err)
            log("  ⚠️ Soft caption mux failed — retrying audio-only merge.")
            _run_audio_merge(include_soft_subs=False)
            log(f"  ✔️ Final merged video saved at {final_path}")
    else:
        try:
            _run_audio_merge(include_soft_subs=False)
            log(f"  ✔️ Final merged video saved at {final_path}")
        except subprocess.CalledProcessError as e:
            err = (e.stderr or "").strip() or (e.stdout or "").strip() or str(e)
            err_path = os.path.join(output_dir, "ffmpeg_merge_error.log")
            with open(err_path, "w", encoding="utf-8") as f:
                f.write(err)
            raise RuntimeError(f"ffmpeg audio merge failed: {err}") from e

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
