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
        # Match whole filter names like " subtitles " in ffmpeg -filters output.
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
    Merge narration onto video.

    Critical: Remotion outputs often include a silent AAC track.
    Always map:
      - video from input 0
      - audio from input 1 (narration)
    Never keep Remotion's silent audio.
    """
    log("Step 5/6: Merging video + narration with ffmpeg...")
    final_path = video_path.replace(".mp4", "_final.mp4")

    atempo = 1.0
    if audio_duration > 0 and video_duration > 0:
        ratio = audio_duration / video_duration
        if 0.85 <= ratio <= 1.15:
            atempo = max(0.5, min(2.0, ratio))

    audio_filter = f"atempo={atempo:.4f}" if abs(atempo - 1.0) > 0.01 else None

    video_abs = os.path.abspath(video_path)
    audio_abs = os.path.abspath(audio_path)
    srt_abs = None
    if srt_path and os.path.exists(srt_path) and os.path.getsize(srt_path) > 0:
        srt_abs = os.path.abspath(srt_path)
    final_abs = os.path.abspath(final_path)

    def _run_audio_merge(include_soft_subs: bool) -> None:
        cmd = [
            "ffmpeg",
            "-y",
            "-i",
            video_abs,
            "-i",
            audio_abs,
        ]
        if include_soft_subs and srt_abs:
            cmd.extend(["-i", srt_abs])

        # Map Remotion/Manim video + narration audio only.
        cmd.extend(["-map", "0:v:0", "-map", "1:a:0"])
        if include_soft_subs and srt_abs:
            cmd.extend(["-map", "2:0"])

        if audio_filter:
            cmd.extend(["-af", audio_filter])

        cmd.extend(
            [
                "-shortest",
                "-c:v",
                "copy",
                "-c:a",
                "aac",
                "-b:a",
                "128k",
                "-ar",
                "48000",
                "-ac",
                "2",
            ]
        )
        if include_soft_subs and srt_abs:
            cmd.extend(["-c:s", "mov_text", "-metadata:s:s:0", "language=eng"])

        cmd.extend(["-movflags", "+faststart", final_abs])
        subprocess.run(cmd, check=True, capture_output=True, text=True)

    # 1) Try soft-mux captions (no libass needed)
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

    # 2) Optional burned captions only if ffmpeg has libass/subtitles filter (Docker)
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
