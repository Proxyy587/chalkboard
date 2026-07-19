import os
import re
import time
from typing import Optional

from dotenv import load_dotenv
from openrouter import OpenRouter

from prompts.manim_prompt import MANIM_SYSTEM_PROMPT, MANIM_USER_TEMPLATE
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


def sanitize_generated_code(code: str) -> str:
    code = re.sub(
        r"\.get_parts_by_tex\((.*?)\)\s*\[\s*0\s*\]",
        r".get_part_by_tex(\1)",
        code,
    )
    return code.replace(".get_parts_by_tex(", ".get_part_by_tex(")


def generate_visual_plan(topic: str, engine: str, duration: int = 60, model: str = PLANNER_MODEL) -> str:
    response = _client.chat.send(
        model=model,
        messages=[
            {
                "role": "system",
                "content": (
                    f"You are a {engine} video planner for STEM/education content. "
                    "Describe exactly what should appear on screen at each moment. "
                    "Be specific about shapes, positions, colors, and timing. "
                    "Format as a numbered sequence of visual moments."
                ),
            },
            {
                "role": "user",
                "content": f"Plan a {duration}-second educational video about: {topic}",
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


def generate_manim_code(
    topic: str,
    model: str = DEFAULT_MODEL,
    visual_plan: str = "",
    duration: int = 60,
    complexity: str = "medium",
    error: Optional[str] = None,
    previous_code: Optional[str] = None,
    log=print,
) -> str:
    log("Generating Manim code...")
    t0 = time.time()
    user_msg = MANIM_USER_TEMPLATE.format(
        topic=topic,
        visual_plan=visual_plan or "Auto-detect best educational visual sequence.",
        duration=duration,
        complexity=complexity,
    )
    if previous_code:
        user_msg += f"\n\nPREVIOUS ATTEMPT:\n{previous_code}"
    if error:
        user_msg += f"\n\nRENDER ERROR TO FIX (fix only what is broken):\n{error}"

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
    duration: int = 60,
    complexity: str = "medium",
    error: Optional[str] = None,
    previous_code: Optional[str] = None,
    log=print,
) -> str:
    log("Generating Remotion code...")
    t0 = time.time()
    user_msg = REMOTION_USER_TEMPLATE.format(
        topic=topic,
        duration=duration,
        frames=duration * 30,
        complexity=complexity,
        visual_plan=visual_plan or "Auto-detect best educational visual sequence.",
    )
    if previous_code:
        user_msg += f"\n\nPREVIOUS ATTEMPT:\n{previous_code}"
    if error:
        user_msg += f"\n\nRENDER ERROR TO FIX (fix only what is broken):\n{error}"

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
