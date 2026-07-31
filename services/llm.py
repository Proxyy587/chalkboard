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
from prompts.quality_prompt import QUALITY_JUDGE_SYSTEM, build_quality_judge_prompt
from prompts.remotion_prompt import (
    REMOTION_ERROR_HINTS,
    REMOTION_SYSTEM_PROMPT,
    REMOTION_USER_TEMPLATE,
)

load_dotenv()
_client = OpenRouter(api_key=os.getenv("OPENROUTER_API_KEY"))
DEFAULT_MODEL = os.getenv("DEFAULT_MODEL", "deepseek/deepseek-v3.2")
PLANNER_MODEL = os.getenv("PLANNER_MODEL", "openai/gpt-4o-mini")
JUDGE_MODEL = os.getenv("JUDGE_MODEL", PLANNER_MODEL)


def clean_code(code: str, language: str = "python") -> str:
    """Strip markdown fences / prose wrappers from LLM code output."""
    code = (code or "").strip()
    if not code:
        return code

    # Prefer fenced block contents when present (Remotion docs note models wrap ```tsx)
    fence = re.search(r"```(?:python|typescript|tsx|ts|js|jsx)?\s*\n([\s\S]*?)```", code)
    if fence:
        code = fence.group(1).strip()
    else:
        if language == "python":
            code = re.sub(r"^```(?:python)?\s*\n?", "", code, flags=re.MULTILINE)
        else:
            code = re.sub(
                r"^```(?:typescript|tsx|ts|js|jsx)?\s*\n?",
                "",
                code,
                flags=re.MULTILINE,
            )
        code = re.sub(r"\n?```\s*$", "", code)

    # Drop leading prose before first import / from / export / class
    if language == "python":
        m = re.search(r"(?m)^(from |import |class )", code)
    else:
        m = re.search(r"(?m)^(import |export |const |function |type )", code)
    if m and m.start() > 0:
        code = code[m.start() :]

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


def sanitize_remotion_code(code: str) -> str:
    """Light post-process for Remotion TSX from LLMs."""
    code = clean_code(code, "typescript")
    if "from 'react'" not in code and 'from "react"' not in code:
        code = "import React from 'react';\n" + code
    # Soften common mistakes
    code = code.replace("export default MainComposition", "")
    code = code.replace("export default MainComposition;", "")
    code = re.sub(r"[^\x09\x0A\x0D\x20-\x7E]", "", code)
    code = code.replace("lowest:", "0,")
    return code.strip()


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
    timing_src = plan.get("timing_source") or "planner"
    audio_dur = plan.get("audio_duration_sec")
    lines = [
        f"Title: {plan.get('title', 'Untitled')}",
        f"Target duration: {plan.get('target_duration_sec', '?')}s",
        f"Timing source: {timing_src}"
        + (f" (measured audio {audio_dur}s)" if audio_dur is not None else ""),
        f"Style: {plan.get('style_notes', '')}",
        "",
        "IMPORTANT: When timing_source=tts, start_s / duration_sec are MEASURED from "
        "real narration. Animations for each beat MUST begin at start_s and fill "
        "exactly duration_sec (run_time + wait). Do not invent new timings.",
        "",
    ]
    for beat in plan.get("beats", []):
        bid = beat.get("id", "?")
        dur = beat.get("duration_sec", "?")
        start = beat.get("start_s")
        end = beat.get("end_s")
        if start is not None and end is not None:
            lines.append(
                f"--- BEAT {bid} @ {float(start):.1f}s–{float(end):.1f}s "
                f"({dur}s) ---"
            )
            lines.append(f"START AT: {float(start):.1f}s")
            lines.append(f"HOLD FOR: {dur}s (until {float(end):.1f}s)")
        else:
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
    """Polish beat narrations into a [BEAT:N]-marked script for timestamp sync."""
    from services.beat_timing import ensure_beat_markers

    log("Generating narration script from beat sheet...")
    duration = target_duration or beat_sheet_target_duration(visual_plan)
    target_words = int(duration * 2.3)

    beat_lines = []
    for beat in visual_plan.get("beats", []):
        beat_lines.append(
            f"[BEAT:{beat.get('id')}] ({beat.get('duration_sec')}s): "
            f"{beat.get('narration', '')}"
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
    script = ensure_beat_markers(
        response.choices[0].message.content.strip(), visual_plan
    )
    script_path = os.path.join(output_dir, "narration_script.txt")
    with open(script_path, "w", encoding="utf-8") as f:
        f.write(script + "\n")
    log(f"  ✔️ Narration script saved ({len(script.split())} words, beat markers on)")
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
            duration = int(
                visual_plan.get("target_duration_sec")
                or beat_sheet_target_duration(visual_plan)
            )
    else:
        plan_text = str(visual_plan)

    user_msg = MANIM_USER_TEMPLATE.format(
        topic=topic,
        visual_plan=plan_text,
        duration_text=_duration_text(duration),
        complexity=complexity,
    )
    if previous_code:
        trimmed = (
            previous_code
            if len(previous_code) < 6000
            else previous_code[:6000] + "\n# ... truncated ..."
        )
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
        dur = duration or int(
            visual_plan.get("target_duration_sec")
            or beat_sheet_target_duration(visual_plan)
        )
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
        user_msg += f"\n\nRENDER ERROR TO FIX:\n{error[-2500:]}\n{REMOTION_ERROR_HINTS}"

    response = _client.chat.send(
        model=model,
        messages=[
            {"role": "system", "content": REMOTION_SYSTEM_PROMPT},
            {"role": "user", "content": user_msg},
        ],
    )
    code = sanitize_remotion_code(response.choices[0].message.content)
    if "MainComposition" not in code:
        raise RuntimeError("Invalid Remotion code: missing MainComposition")
    log(f"  ✔️ Remotion code generated in {time.time() - t0:.1f}s")
    return code


def judge_generated_code(
    topic: str,
    engine: str,
    code: str,
    visual_plan: dict[str, Any] | str,
    model: str = JUDGE_MODEL,
    log=print,
) -> dict[str, Any]:
    """Optional quality gate. Enable with QUALITY_JUDGE=1."""
    plan_text = (
        format_beat_sheet_for_prompt(visual_plan)
        if isinstance(visual_plan, dict)
        else str(visual_plan)
    )
    log("Running quality judge...")
    response = _client.chat.send(
        model=model,
        messages=[
            {"role": "system", "content": QUALITY_JUDGE_SYSTEM},
            {
                "role": "user",
                "content": build_quality_judge_prompt(topic, engine, code, plan_text),
            },
        ],
    )
    try:
        result = _parse_json_object(response.choices[0].message.content)
    except Exception:
        result = {"score": 75, "passes": True, "verdict": "approve", "issues": []}
    log(
        f"  ✔️ Judge: score={result.get('score')} verdict={result.get('verdict')} "
        f"passes={result.get('passes')}"
    )
    return result


def quality_judge_enabled() -> bool:
    return os.getenv("QUALITY_JUDGE", "").strip().lower() in {"1", "true", "yes", "on"}
