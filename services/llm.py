import os
import re
import time
from typing import Optional

from dotenv import load_dotenv
from openrouter import OpenRouter

from prompts.manim_prompt import (
    MANIM_ERROR_HINTS,
    MANIM_SYSTEM_PROMPT,
    MANIM_USER_TEMPLATE,
)
from prompts.remotion_prompt import REMOTION_SYSTEM_PROMPT, REMOTION_USER_TEMPLATE

load_dotenv()
_client = OpenRouter(api_key=os.getenv("OPENROUTER_API_KEY"))
DEFAULT_MODEL = os.getenv("DEFAULT_MODEL", "deepseek/deepseek-v3.2")
PLANNER_MODEL = os.getenv("PLANNER_MODEL", "openai/gpt-4o-mini")


def clean_code(code: str, language: str = "python") -> str:
    code = code.strip()
    if language == "python":
        code = re.sub(r"^```(?:python)?\s*\n?", "", code, flags=re.MULTILINE)
    else:
        code = re.sub(r"^```(?:typescript|tsx|ts|js|jsx)?\s*\n?", "", code, flags=re.MULTILINE)
    code = re.sub(r"\n?```\s*$", "", code)
    return code.strip()


def _strip_method_calls(code: str, method: str) -> str:
    """Replace `obj.method(...)` with `obj`, respecting nested parentheses."""
    needle = f".{method}("
    out: list[str] = []
    i = 0
    while True:
        idx = code.find(needle, i)
        if idx < 0:
            out.append(code[i:])
            break
        # Find start of identifier before the dot
        start = idx
        while start > 0 and (code[start - 1].isalnum() or code[start - 1] == "_"):
            start -= 1
        out.append(code[i:start])
        out.append(code[start:idx])  # the object name
        # Skip balanced (...) after method(
        pos = idx + len(needle)
        depth = 1
        while pos < len(code) and depth:
            ch = code[pos]
            if ch == "(":
                depth += 1
            elif ch == ")":
                depth -= 1
            pos += 1
        # Also drop trailing [0] if present (legacy get_parts_by_tex usage)
        if code[pos : pos + 3] == "[0]":
            pos += 3
        elif code[pos : pos + 5] == "[ 0 ]":
            pos += 5
        i = pos
    return "".join(out)


def sanitize_generated_code(code: str) -> str:
    """Deterministic fixes for common LLM Manim mistakes."""
    # get_part(s)_by_tex often returns None → next_to crashes with NoneType.
    # Rewrite every call to the parent mobject so arrows/boxes still target something valid.
    code = _strip_method_calls(code, "get_parts_by_tex")
    code = _strip_method_calls(code, "get_part_by_tex")
    return code


def generate_visual_plan(
    topic: str,
    engine: str,
    duration: Optional[int] = None,
    model: str = PLANNER_MODEL,
) -> str:
    if duration:
        duration_line = f"Plan about a {duration}-second educational video."
    else:
        duration_line = (
            "Choose a natural duration (roughly 30–75 seconds) based on topic complexity. "
            "Do not force an exact length."
        )
    response = _client.chat.send(
        model=model,
        messages=[
            {
                "role": "system",
                "content": (
                    f"You are a {engine} video planner for STEM/education content. "
                    "Describe exactly what should appear on screen at each moment. "
                    "Be specific about shapes, positions, colors, and timing. "
                    "Keep plans SIMPLE and crash-proof for Manim "
                    "(no highlighting individual tex substrings with arrows). "
                    "Format as a numbered sequence of visual moments."
                ),
            },
            {
                "role": "user",
                "content": f"{duration_line}\n\nTopic: {topic}",
            },
        ],
    )
    return response.choices[0].message.content.strip()


def build_narration_prompt(topic: str, video_duration: float, visual_beats: str) -> str:
    target_words = int(video_duration * 140 / 60)
    return f"""Write a narration script for this animation:

TOPIC: {topic}

VISUAL SEQUENCE:
{visual_beats}

Rules:
- Target length: about {video_duration:.0f} seconds
- Speaking rate: ~140 words/minute (~{target_words} words)
- One sentence roughly maps to one visual beat
- Plain text only — no markdown, bullets, or stage directions
- Do not say "in this video" or "as you can see"
"""


def generate_narration_script(
    topic: str,
    visual_plan: str,
    video_duration: float,
    output_dir: str,
    model: str = DEFAULT_MODEL,
    log=print,
) -> str:
    log("Generating narration script...")
    response = _client.chat.send(
        model=model,
        messages=[
            {
                "role": "system",
                "content": (
                    "You write concise STEM narration scripts for animations. "
                    "Keep pacing natural, concept-first, and avoid filler."
                ),
            },
            {"role": "user", "content": build_narration_prompt(topic, video_duration, visual_plan)},
        ],
    )
    script = response.choices[0].message.content.strip()
    script_path = os.path.join(output_dir, "narration_script.txt")
    with open(script_path, "w", encoding="utf-8") as f:
        f.write(script + "\n")
    log(f"  ✔️ Narration script saved at {script_path}")
    return script


def _duration_text(duration: Optional[int]) -> str:
    if duration:
        return f"about {duration} seconds (flexible ±20%)"
    return "choose a natural length for the topic (typically 30–75s)"


def generate_manim_code(
    topic: str,
    model: str = DEFAULT_MODEL,
    visual_plan: str = "",
    duration: Optional[int] = None,
    complexity: str = "medium",
    error: Optional[str] = None,
    previous_code: Optional[str] = None,
    log=print,
) -> str:
    log("Generating Manim code...")
    t0 = time.time()
    user_msg = MANIM_USER_TEMPLATE.format(
        topic=topic,
        visual_plan=visual_plan or "Auto-detect best educational visual sequence. Keep it simple.",
        duration_text=_duration_text(duration),
        complexity=complexity,
    )
    if previous_code:
        # On retries, send only a truncated previous attempt to leave room for the fix
        trimmed = previous_code if len(previous_code) < 6000 else previous_code[:6000] + "\n# ... truncated ..."
        user_msg += f"\n\nPREVIOUS ATTEMPT:\n{trimmed}"
    if error:
        user_msg += f"\n\nRENDER ERROR TO FIX (fix only what is broken):\n{error[-2500:]}"
        user_msg += f"\n{MANIM_ERROR_HINTS}"
        if "NoneType" in error and "next_to" in error:
            user_msg += (
                "\nSPECIFIC FIX REQUIRED: Remove ALL get_part_by_tex / next_to(part) patterns. "
                "Highlight whole MathTex with SurroundingRectangle instead."
            )

    response = _client.chat.send(
        model=model,
        messages=[
            {"role": "system", "content": MANIM_SYSTEM_PROMPT},
            {"role": "user", "content": user_msg},
        ],
    )
    code = sanitize_generated_code(clean_code(response.choices[0].message.content, "python"))
    if "from manim import" not in code:
        raise RuntimeError("Invalid Manim code: missing manim import")
    if "class Scene" not in code:
        raise RuntimeError("Invalid Manim code: class must be named Scene")
    log(f"  ✔️ Manim code generated in {time.time() - t0:.1f}s")
    return code


def generate_remotion_code(
    topic: str,
    model: str = DEFAULT_MODEL,
    visual_plan: str = "",
    duration: Optional[int] = None,
    complexity: str = "medium",
    error: Optional[str] = None,
    previous_code: Optional[str] = None,
    log=print,
) -> str:
    log("Generating Remotion code...")
    t0 = time.time()
    dur = duration or 55
    user_msg = REMOTION_USER_TEMPLATE.format(
        topic=topic,
        duration=dur,
        frames=dur * 30,
        complexity=complexity,
        visual_plan=visual_plan or "Auto-detect best educational visual sequence.",
    )
    if previous_code:
        user_msg += f"\n\nPREVIOUS ATTEMPT:\n{previous_code[:6000]}"
    if error:
        user_msg += f"\n\nRENDER ERROR TO FIX (fix only what is broken):\n{error[-2500:]}"

    response = _client.chat.send(
        model=model,
        messages=[
            {"role": "system", "content": REMOTION_SYSTEM_PROMPT},
            {"role": "user", "content": user_msg},
        ],
    )
    code = clean_code(response.choices[0].message.content, "typescript")
    if "MainComposition" not in code:
        raise RuntimeError("Invalid Remotion code: missing MainComposition")
    log(f"  ✔️ Remotion code generated in {time.time() - t0:.1f}s")
    return code
