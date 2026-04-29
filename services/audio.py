import asyncio
import os

import edge_tts

from services.renderer import get_media_duration


async def _generate_audio_with_captions_async(script: str, output_dir: str, voice: str):
    audio_path = os.path.join(output_dir, "narration.mp3")
    srt_path = os.path.join(output_dir, "captions.srt")
    communicate = edge_tts.Communicate(script, voice=voice)
    submaker = edge_tts.SubMaker()
    audio_bytes = bytearray()

    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_bytes.extend(chunk["data"])
        elif chunk["type"] == "WordBoundary":
            if hasattr(submaker, "feed"):
                submaker.feed(chunk)
            elif hasattr(submaker, "create_sub"):
                submaker.create_sub(chunk["text"], (chunk["offset"], chunk["duration"]))

    with open(audio_path, "wb") as f:
        f.write(audio_bytes)
    with open(srt_path, "w", encoding="utf-8") as f:
        if hasattr(submaker, "get_srt"):
            f.write(submaker.get_srt())
        elif hasattr(submaker, "generate_subs"):
            f.write(submaker.generate_subs(words_in_cue=6))
        else:
            raise RuntimeError("Unsupported edge-tts SubMaker API.")
    return audio_path, srt_path, get_media_duration(audio_path)


def generate_audio_with_captions(
    script: str,
    output_dir: str,
    voice: str = "en-US-AriaNeural",
    log=print,
) -> tuple[str, str, float]:
    log("Step 4/6: Generating TTS audio and SRT captions...")
    audio_path, srt_path, audio_duration = asyncio.run(
        _generate_audio_with_captions_async(script=script, output_dir=output_dir, voice=voice)
    )
    log(f"  ✔️ Audio saved at {audio_path}")
    log(f"  ✔️ Captions saved at {srt_path}")
    return audio_path, srt_path, audio_duration
