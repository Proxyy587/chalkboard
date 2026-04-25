import subprocess
import uuid
import os

def run_manim(code: str):
    job_id = str(uuid.uuid4())
    file_path = f"temp/{job_id}.py"

    os.makedirs("temp", exist_ok=True)

    with open(file_path, "w") as f:
        f.write(code)

    output_dir = f"media/{job_id}"

    cmd = [
        "manim",
        file_path,
        "Scene",
        "-o",
        job_id,
        "--media_dir",
        output_dir,
        "-ql",
    ]

    subprocess.run(cmd, check=True)

    return f"{output_dir}/videos/{job_id}.mp4"