import json
import os
import subprocess
import time
import uuid
from typing import Optional


def find_output_video(output_dir: str, job_id: str) -> Optional[str]:
    search_root = os.path.join(output_dir, "videos", job_id)
    if not os.path.exists(search_root):
        return None
    for root, _, files in os.walk(search_root):
        for file_name in files:
            if file_name.endswith(".mp4") and not file_name.endswith("_final.mp4"):
                return os.path.join(root, file_name)
    return None


def render_video(code: str, output_dir: str, log=print) -> tuple[Optional[str], Optional[str]]:
    log("Step 2/6: Starting Manim rendering...")
    job_id = str(uuid.uuid4())
    file_path = os.path.join(output_dir, f"{job_id}.py")
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(code)
    try:
        log(f"  ▶️ Executing: uv run manim {file_path} Scene -ql --media_dir {output_dir} -o {job_id}")
        t0 = time.time()
        subprocess.run(
            ["uv", "run", "manim", file_path, "Scene", "-ql", "--media_dir", output_dir, "-o", job_id],
            check=True,
            capture_output=True,
            text=True,
        )
        log(f"  ✔️ Rendering finished in {time.time()-t0:.1f}s.")
    except subprocess.CalledProcessError as e:
        stderr = (e.stderr or "").strip()
        stdout = (e.stdout or "").strip()
        err = stderr if stderr else stdout if stdout else str(e)
        err_path = os.path.join(output_dir, f"{job_id}_render_error.log")
        with open(err_path, "w", encoding="utf-8") as f:
            f.write(err)
        log(f"  ❌ Rendering failed. Error log saved: {err_path}")
        return None, err
    video_path = find_output_video(output_dir, job_id)
    if not video_path:
        return None, "Could not find rendered video file"
    log(f"  ✔️ Video will be at {video_path}")
    return video_path, None


def get_media_duration(path: str) -> float:
    result = subprocess.run(
        ["ffprobe", "-v", "quiet", "-print_format", "json", "-show_format", path],
        capture_output=True,
        text=True,
        check=True,
    )
    data = json.loads(result.stdout)
    return float(data["format"]["duration"])
