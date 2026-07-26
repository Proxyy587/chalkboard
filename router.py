import json
import os
import re
from typing import Any, Optional

from dotenv import load_dotenv
from openrouter import OpenRouter

from prompts.router_prompt import ROUTER_PROMPT

load_dotenv()

_client = OpenRouter(api_key=os.getenv("OPENROUTER_API_KEY"))
ROUTER_MODEL = os.getenv("ROUTER_MODEL", "openai/gpt-4o-mini")


def _parse_json_object(text: str) -> dict[str, Any]:
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{[\s\S]*\}", text)
        if not match:
            raise
        return json.loads(match.group(0))


def route_prompt(
    prompt: str,
    forced_engine: str = "auto",
    preferred_duration: Optional[int] = None,
) -> dict[str, Any]:
    """Decide manim vs remotion for a user prompt."""
    forced = (forced_engine or "auto").strip().lower()

    if forced in {"manim", "remotion"}:
        if preferred_duration:
            duration = max(15, min(180, int(preferred_duration)))
        else:
            duration = None  # planner picks freely
        return {
            "engine": forced,
            "reason": "user specified",
            "complexity": "medium",
            "duration": duration,
            "subject": prompt,
        }

    response = _client.chat.send(
        model=ROUTER_MODEL,
        messages=[
            {"role": "system", "content": ROUTER_PROMPT},
            {"role": "user", "content": f"Route this: {prompt}"},
        ],
    )
    data = _parse_json_object(response.choices[0].message.content)
    engine = str(data.get("engine", "manim")).lower()
    if engine not in {"manim", "remotion"}:
        engine = "manim"

    if preferred_duration:
        duration = max(15, min(180, int(preferred_duration)))
    else:
        # Let the beat-sheet planner choose freely (match forced-engine path)
        duration = None

    complexity = str(data.get("complexity", "medium")).lower()
    if complexity not in {"simple", "medium", "complex"}:
        complexity = "medium"
    if complexity == "complex":
        complexity = "medium"

    return {
        "engine": engine,
        "reason": str(data.get("reason", "")),
        "complexity": complexity,
        "duration": duration,
        "subject": str(data.get("subject", prompt)),
        # Router still suggests a natural length for logging / UI hints
        "suggested_duration": max(
            20, min(120, int(data.get("duration", 55) or 55))
        ),
    }
