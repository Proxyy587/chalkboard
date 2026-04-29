import os
import asyncio
from typing import Optional

from services.audio import generate_audio_with_captions
from services.llm import generate_manim_code, generate_narration_script
from services.merger import merge_video_audio_captions
from services.renderer import get_media_duration, render_video
from services.storage import upload_to_r2

OUTPUT_DIR = "outputs"


def log(msg: str):
    print(msg, flush=True)


async def process_topic_async(topic: str, max_attempts: int = 4) -> Optional[str]:
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    last_error = None
    previous_code = None
    video = None
    code = None

    for attempt in range(1, max_attempts + 1):
        log(f"\n🧠 Attempt {attempt}/{max_attempts}: Generating code...")
        code = generate_manim_code(topic, error=last_error, previous_code=previous_code, log=log)
        previous_code = code
        log("\n📜 Cleaned code:")
        print(code)
        log("\n🎬 Rendering video...")
        video, err = render_video(code, output_dir=OUTPUT_DIR, log=log)
        if video:
            break
        last_error = err
        log("\n🔁 Render failed. Retrying with copied traceback and previous code context...")

    if not (video and code and os.path.exists(video)):
        log("\n❌ Failed to generate video")
        return None

    log(f"\n✅ Base video saved at: {video}")
    try:
        video_duration = get_media_duration(video)
        log(f"Step 3/6: Measured video duration: {video_duration:.2f}s")
        narration_script = generate_narration_script(topic, code, video_duration, output_dir=OUTPUT_DIR, log=log)
        log("\n🗣️ Narration script:")
        print(narration_script)
        audio_path, srt_path, audio_duration = await generate_audio_with_captions(
            narration_script, output_dir=OUTPUT_DIR, log=log
        )
        final_video = merge_video_audio_captions(
            video_path=video,
            audio_path=audio_path,
            srt_path=srt_path,
            video_duration=video_duration,
            audio_duration=audio_duration,
            output_dir=OUTPUT_DIR,
            log=log,
        )
        video_url = upload_to_r2(final_video)
        log(f"\n☁️ Uploaded to R2: {video_url}")
        return video_url
    except Exception as e:
        log(f"\n⚠️ Video rendered, but narration merge failed: {e}")
        return video


def process_topic(topic: str, max_attempts: int = 4) -> Optional[str]:
    return asyncio.run(process_topic_async(topic, max_attempts=max_attempts))
