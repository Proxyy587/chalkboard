import json
import os
import re
import time
from typing import Any, Optional

from dotenv import load_dotenv
from openrouter import OpenRouter

from prompts.manim_prompt import (
    MANIM_ERROR_HINTS,
    MANIM_SYSTEM_PROMPT,
    MANIM_USER_TEMPLATE,
)
from prompts.narration_prompt import NARRATION_SYSTEM_PROMPT, NARRATION_USER_TEMPLATE
from prompts.planner_prompt import VISUAL_PLANNER_SYSTEM_PROMPT, VISUAL_PLANNER_USER_TEMPLATE
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
    needle = f".{method}("
    out: list[str] = []
    i = 0
    while True:
        idx = code.find(needle, i)
        if idx < 0:
            out.append(code[i:])
            break
        start = idx
        while start > 0 and (code[start - 1].isalnum() or code[start - 1] == "_"):
            start -= 1
        out.append(code[i:start])
        out.append(code[start:idx])
        pos = idx + len(needle)
        depth = 1
        while pos < len(code) and depth:
            ch = code[pos]
            if ch == "(":
                depth += 1
            elif ch == ")":
                depth -= 1
            pos += 1
        if code[pos : pos + 3] == "[0]":
            pos += 3
        elif code[pos : pos + 5] == "[ 0 ]":
            pos += 5
        i = pos
    return "".join(out)


def sanitize_generated_code(code: str) -> str:
    code = _strip_method_calls(code, "get_parts_by_tex")
    code = _strip_method_calls(code, "get_part_by_tex")
    return code


def _parse_json_object(text: str) -> dict[str, Any]:
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{[\s\S]*\}", text)
        if not match:
            raise
        return json.loads(match.group(0))


def format_beat_sheet_for_prompt(plan: dict[str, Any]) -> str:
    """Human-readable beat block for code/narration prompts."""
    lines = [
        f"Title: {plan.get('title', 'Untitled')}",
        f"Target duration: {plan.get('target_duration_sec', '?')}s",
        f"Style: {plan.get('style_notes', '')}",
        "",
    ]
    for beat in plan.get("beats", []):
        bid = beat.get("id", "?")
        dur = beat.get("duration_sec", "?")
        lines.append(f"--- BEAT {bid} ({dur}s) ---")
        lines.append(f"Visual: {beat.get('visual', '')}")
        lines.append(f"Narration: {beat.get('narration', '')}")
        lines.append("")
    return "\n".join(lines).strip()


def beat_sheet_target_duration(plan: dict[str, Any]) -> float:
    beats = plan.get("beats") or []
    if beats:
        return float(sum(float(b.get("duration_sec", 0)) for b in beats))
    return float(plan.get("target_duration_sec") or 55)


def generate_visual_plan(
    topic: str,
    engine: str,
    duration: Optional[int] = None,
    model: str = PLANNER_MODEL,
    log=print,
) -> dict[str, Any]:
    """Return structured beat sheet (dict), not plain text."""
    if duration:
        duration_line = (
            f"User requested ~{duration}s total. "
            f"Beat durations must sum to {duration}s (±2s)."
        )
    else:
        duration_line = (
            "User did NOT specify duration — choose the best length (20–120s) "
            "for this topic and set target_duration_sec accordingly."
        )

    log("Generating beat-sheet visual plan...")
    response = _client.chat.send(
        model=model,
        messages=[
            {"role": "system", "content": VISUAL_PLANNER_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": VISUAL_PLANNER_USER_TEMPLATE.format(
                    topic=topic,
                    engine=engine,
                    duration_line=duration_line,
                ),
            },
        ],
    )
    raw = response.choices[0].message.content.strip()
    plan = _parse_json_object(raw)

    beats = plan.get("beats") or []
    if len(beats) < 2:
        raise RuntimeError("Visual plan missing beats")

    # Normalize beat ids
    for i, beat in enumerate(beats, start=1):
        beat["id"] = i
        beat["duration_sec"] = float(beat.get("duration_sec", 5))

    if duration:
        plan["target_duration_sec"] = int(duration)
    else:
        plan["target_duration_sec"] = int(
            plan.get("target_duration_sec") or beat_sheet_target_duration(plan)
        )

    log(f"  ✔️ Beat sheet: {len(beats)} beats, ~{plan['target_duration_sec']}s")
    return plan


def generate_narration_script(
    topic: str,
    visual_plan: dict[str, Any],
    target_duration: Optional[float] = None,
    output_dir: str = ".",
    model: str = DEFAULT_MODEL,
    log=print,
) -> str:
    """Polish beat narrations into one script aligned to target duration."""
    log("Generating narration script from beat sheet...")
    duration = target_duration or beat_sheet_target_duration(visual_plan)
    target_words = int(duration * 2.3)

    beat_lines = []
    for beat in visual_plan.get("beats", []):
        beat_lines.append(
            f"Beat {beat.get('id')} ({beat.get('duration_sec')}s): {beat.get('narration', '')}"
        )

    user_msg = NARRATION_USER_TEMPLATE.format(
        topic=topic,
        target_duration=duration,
        target_words=target_words,
        beat_narration_block="\n".join(beat_lines),
    )

    response = _client.chat.send(
        model=model,
        messages=[
            {"role": "system", "content": NARRATION_SYSTEM_PROMPT},
            {"role": "user", "content": user_msg},
        ],
    )
    script = response.choices[0].message.content.strip()
    script_path = os.path.join(output_dir, "narration_script.txt")
    with open(script_path, "w", encoding="utf-8") as f:
        f.write(script + "\n")
    log(f"  ✔️ Narration script saved ({len(script.split())} words)")
    return script


def _duration_text(duration: Optional[int]) -> str:
    if duration:
        return f"exactly ~{duration} seconds (beat timings must sum to this)"
    return "match the beat sheet target_duration_sec — full creative freedom on pacing"


def generate_manim_code(
    topic: str,
    model: str = DEFAULT_MODEL,
    visual_plan: dict[str, Any] | str = "",
    duration: Optional[int] = None,
    complexity: str = "medium",
    error: Optional[str] = None,
    previous_code: Optional[str] = None,
    log=print,
) -> str:
    log("Generating Manim code...")
    t0 = time.time()
    if isinstance(visual_plan, dict):
        plan_text = format_beat_sheet_for_prompt(visual_plan)
        if duration is None:
            duration = int(visual_plan.get("target_duration_sec") or beat_sheet_target_duration(visual_plan))
    else:
        plan_text = str(visual_plan)

    user_msg = MANIM_USER_TEMPLATE.format(
        topic=topic,
        visual_plan=plan_text,
        duration_text=_duration_text(duration),
        complexity=complexity,
    )
    if previous_code:
        trimmed = previous_code if len(previous_code) < 6000 else previous_code[:6000] + "\n# ... truncated ..."
        user_msg += f"\n\nPREVIOUS ATTEMPT:\n{trimmed}"
    if error:
        user_msg += f"\n\nRENDER ERROR TO FIX:\n{error[-2500:]}\n{MANIM_ERROR_HINTS}"
        if "NoneType" in error and "next_to" in error:
            user_msg += (
                "\nRemove ALL get_part_by_tex / next_to(part). "
                "Use SurroundingRectangle on whole MathTex."
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
    visual_plan: dict[str, Any] | str = "",
    duration: Optional[int] = None,
    complexity: str = "medium",
    error: Optional[str] = None,
    previous_code: Optional[str] = None,
    log=print,
) -> str:
    log("Generating Remotion code...")
    t0 = time.time()
    if isinstance(visual_plan, dict):
        plan_text = format_beat_sheet_for_prompt(visual_plan)
        dur = duration or int(visual_plan.get("target_duration_sec") or beat_sheet_target_duration(visual_plan))
    else:
        plan_text = str(visual_plan)
        dur = duration or 55

    user_msg = REMOTION_USER_TEMPLATE.format(
        topic=topic,
        duration=dur,
        frames=dur * 30,
        complexity=complexity,
        visual_plan=plan_text,
    )
    if previous_code:
        user_msg += f"\n\nPREVIOUS ATTEMPT:\n{previous_code[:6000]}"
    if error:
        user_msg += f"\n\nRENDER ERROR TO FIX:\n{error[-2500:]}"

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
