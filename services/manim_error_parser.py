"""Parse Manim stderr into actionable retry hints for the LLM."""

from __future__ import annotations

import re
from typing import Any


def parse_manim_error(stderr: str) -> dict[str, Any]:
    text = stderr or ""
    result: dict[str, Any] = {
        "type": "unknown",
        "message": "",
        "line": None,
        "fix_hint": "",
        "full_error": text[-2000:],
        "force_safe_tmt": False,
    }

    line_match = re.search(r'File ".*?\.py", line (\d+)', text)
    if line_match:
        result["line"] = int(line_match.group(1))

    if (
        'assert hasattr(mobject, "tex_string")' in text
        or ("TransformMatchingTex" in text and "AssertionError" in text)
        or ("tex_string" in text and "AssertionError" in text)
    ):
        result.update(
            {
                "type": "TransformMatchingTex",
                "message": "TransformMatchingTex used on non-MathTex object",
                "fix_hint": (
                    "Replace EVERY TransformMatchingTex(...) with "
                    "ReplacementTransform(...). TransformMatchingTex ONLY works "
                    "between MathTex/Tex objects — never Text, VGroup, or mixed."
                ),
                "force_safe_tmt": True,
            }
        )
        return result

    if "duration of 0" in text or "run_time of 0" in text or "<= 0 seconds" in text:
        result.update(
            {
                "type": "ZeroDuration",
                "message": "wait/run_time <= 0 is invalid",
                "fix_hint": (
                    "Delete every self.wait(0)/wait(0.0). All run_time values must be > 0 "
                    "(minimum 0.5). Skip a wait instead of writing wait(0)."
                ),
            }
        )
        return result

    attr_match = re.search(
        r"AttributeError: '(\w+)' object has no attribute '(\w+)'",
        text,
    )
    if attr_match:
        obj_type, attr = attr_match.group(1), attr_match.group(2)
        result.update(
            {
                "type": "AttributeError",
                "message": f"'{obj_type}' has no attribute '{attr}'",
                "fix_hint": _attribute_hint(obj_type, attr),
            }
        )
        return result

    name_match = re.search(r"NameError: name '(\w+)' is not defined", text)
    if name_match:
        name = name_match.group(1)
        result.update(
            {
                "type": "NameError",
                "message": f"'{name}' is not defined",
                "fix_hint": (
                    f"'{name}' is undefined. Keep `from manim import *` and fix the name. "
                    "Do not invent APIs."
                ),
            }
        )
        return result

    if "get_part_by_tex" in text or "get_parts_by_tex" in text or "NoneType" in text:
        result.update(
            {
                "type": "TexPart",
                "message": "Likely get_part_by_tex / NoneType next_to crash",
                "fix_hint": (
                    "Remove ALL get_part_by_tex / get_parts_by_tex. "
                    "Highlight whole MathTex with SurroundingRectangle only."
                ),
            }
        )
        return result

    type_match = re.search(r"TypeError: (.+?)(?:\n|$)", text)
    if type_match:
        result.update(
            {
                "type": "TypeError",
                "message": type_match.group(1)[:300],
                "fix_hint": "Check argument types (floats vs lists vs Mobjects).",
            }
        )
        return result

    val_match = re.search(r"ValueError: (.+?)(?:\n|$)", text)
    if val_match:
        result.update(
            {
                "type": "ValueError",
                "message": val_match.group(1)[:300],
                "fix_hint": "Check numeric ranges (Axes x_range/y_range, wait/run_time > 0).",
            }
        )
        return result

    syn_match = re.search(r"SyntaxError: (.+?)(?:\n|$)", text)
    if syn_match:
        result.update(
            {
                "type": "SyntaxError",
                "message": syn_match.group(1)[:300],
                "fix_hint": "Fix Python syntax; return a complete valid script.",
            }
        )
        return result

    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    if lines:
        result["message"] = lines[-1][:400]
    return result


def _attribute_hint(obj_type: str, attr: str) -> str:
    hints = {
        ("MathTex", "text"): "MathTex has no .text — use .tex_string or don't read text",
        ("Text", "tex_string"): "Text has no .tex_string — use ReplacementTransform for Text",
        ("Axes", "coords_to_point"): "Use axes.c2p(...) not .coords_to_point()",
        ("Axes", "point_to_coords"): "Use axes.p2c(...) not .point_to_coords()",
    }
    return hints.get(
        (obj_type, attr),
        f"'{obj_type}' has no '{attr}'. Use Manim CE APIs only.",
    )


def format_error_for_llm(error_info: dict[str, Any], previous_code: str | None = None) -> str:
    """Compact, actionable error block for generate_manim_code retries."""
    parts = [
        f"ERROR TYPE: {error_info.get('type', 'unknown')}",
        f"ERROR: {error_info.get('message', '')}",
        f"FIX REQUIRED: {error_info.get('fix_hint', '')}",
    ]
    if error_info.get("line"):
        parts.append(f"Approx line: {error_info['line']}")
        if previous_code:
            parts.append("CONTEXT:\n" + _section(previous_code, int(error_info["line"])))
    # Keep traceback short
    full = (error_info.get("full_error") or "")[-1200:]
    if full:
        parts.append(f"TRACE (tail):\n{full}")
    return "\n".join(parts)


def _section(code: str, line_num: int, context: int = 8) -> str:
    lines = code.split("\n")
    start = max(0, line_num - context - 1)
    end = min(len(lines), line_num + context)
    out = []
    for i, line in enumerate(lines[start:end], start=start + 1):
        mark = "→ " if i == line_num else "  "
        out.append(f"{mark}{i:3d}: {line}")
    return "\n".join(out)
