import os
import subprocess


def merge_video_audio_captions(
    video_path: str,
    audio_path: str,
    srt_path: str,
    video_duration: float,
    audio_duration: float,
    output_dir: str,
    log=print,
) -> str:
    log("Step 5/6: Merging video + narration + captions with ffmpeg...")
    final_path = video_path.replace(".mp4", "_final.mp4")
    atempo = 1.0
    if audio_duration > 0 and video_duration > 0:
        ratio = audio_duration / video_duration
        if 0.85 < ratio < 1.15:
            atempo = ratio
    audio_filter = f"atempo={atempo:.4f}" if atempo != 1.0 else "anull"
    escaped_srt = srt_path.replace("\\", "/").replace(":", "\\:")
    vf = (
        f"subtitles={escaped_srt}:force_style="
        "'FontName=Arial,FontSize=18,PrimaryColour=&Hffffff,"
        "OutlineColour=&H000000,Outline=2,Shadow=1,Alignment=2,MarginV=25'"
    )
    cmd_with_subs = [
        "ffmpeg",
        "-y",
        "-i",
        video_path,
        "-i",
        audio_path,
        "-vf",
        vf,
        "-af",
        audio_filter,
        "-shortest",
        "-c:v",
        "libx264",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-movflags",
        "+faststart",
        final_path,
    ]
    try:
        subprocess.run(cmd_with_subs, check=True, capture_output=True, text=True)
    except subprocess.CalledProcessError as e:
        ffmpeg_err = (e.stderr or "").strip() or (e.stdout or "").strip() or str(e)
        err_path = os.path.join(output_dir, "ffmpeg_merge_error.log")
        with open(err_path, "w", encoding="utf-8") as f:
            f.write(ffmpeg_err)
        log(f"  ⚠️ Subtitle burn-in failed. Error log saved: {err_path}")
        log("  ↪ Retrying merge with audio only.")
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-i",
                video_path,
                "-i",
                audio_path,
                "-af",
                audio_filter,
                "-shortest",
                "-c:v",
                "copy",
                "-c:a",
                "aac",
                "-b:a",
                "128k",
                "-movflags",
                "+faststart",
                final_path,
            ],
            check=True,
            capture_output=True,
            text=True,
        )
    log(f"  ✔️ Final merged video saved at {final_path}")
    return final_path
