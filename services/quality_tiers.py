"""Quality tiers, ETA estimates, and status copy for video jobs."""

from __future__ import annotations

from typing import Any, Literal, Optional

TierName = Literal["tier1", "tier2", "tier3"]

# Render quality passed to Manim (-ql / -qm / -qh)
TIER_CONFIG: dict[str, dict[str, Any]] = {
    "tier1": {
        "label": "Simple",
        "complexity": "simple",
        "manim_quality": "low",  # -ql — templates / fast path
        "max_duration_sec": 35,
        "max_beats": 5,
        "force_engine": None,  # keep auto unless caller forces
        "eta_seconds": 90,
        "eta_display": "~1–2 min",
        "prompt_rules": """
TIER=1 (Simple / Template — reliability + speed first):
- Target scene length 20–35s; max 5 beats
- Max 2 ValueTrackers; NO ThreeDScene / Surface / ParametricSurface
- Max 3 MathTex on screen at once; prefer Write/FadeIn/Create/ReplacementTransform
- TransformMatchingTex ONLY MathTex↔MathTex (else ReplacementTransform)
- Max 1 always_redraw; Axes MUST set x_length/y_length
- Progressive reveals with positive self.wait(0.5–1.5); never wait(0)
- End with a clear summary equation + SurroundingRectangle
""",
    },
    "tier2": {
        "label": "Standard",
        "complexity": "medium",
        "manim_quality": "medium",  # -qm
        "max_duration_sec": 75,
        "max_beats": 8,
        "force_engine": None,
        "eta_seconds": 150,
        "eta_display": "~2–3 min",
        "prompt_rules": """
TIER=2 (Standard):
- Target scene length 45–75s; max 8 beats
- Max 5 ValueTrackers; max 3 always_redraw
- TransformMatchingTex only MathTex↔MathTex
- Split layouts OK; keep safe zone; progressive pacing
""",
    },
    "tier3": {
        "label": "Complex",
        "complexity": "medium",
        "manim_quality": "medium",
        "max_duration_sec": 120,
        "max_beats": 8,
        "force_engine": None,
        "eta_seconds": 270,
        "eta_display": "~4–5 min",
        "prompt_rules": """
TIER=3 (Complex — still crash-safe):
- Up to ~90–120s; still no get_part_by_tex; still no wait(0)
- Prefer clarity over density; warn: longer render
""",
    },
}

STATUS_COPY: dict[str, dict[str, Any]] = {
    "queued": {"message": "Queued…", "eta_delta": 0},
    "routing": {"message": "Choosing engine…", "eta_delta": -5},
    "planning": {"message": "Planning animation…", "eta_delta": -8},
    "generating_audio": {"message": "Generating narration…", "eta_delta": -15},
    "generating_code": {"message": "Writing animation code…", "eta_delta": -35},
    "merging": {"message": "Combining audio & video…", "eta_delta": -12},
    "uploading": {"message": "Uploading…", "eta_delta": -8},
    "processing": {"message": "Working…", "eta_delta": -20},
    "completed": {"message": "Done!", "eta_delta": 0},
    "failed": {"message": "Something went wrong", "eta_delta": None},
}


def normalize_tier(raw: Optional[str]) -> TierName:
    if not raw:
        return "tier2"
    t = str(raw).strip().lower()
    if t in {"1", "simple", "fast", "template", "preview", "tier1"}:
        return "tier1"
    if t in {"3", "complex", "deep", "tier3"}:
        return "tier3"
    if t in {"2", "standard", "medium", "tier2"}:
        return "tier2"
    return "tier2"


def get_tier_config(tier: Optional[str]) -> dict[str, Any]:
    return dict(TIER_CONFIG[normalize_tier(tier)])


def estimate_job(tier: Optional[str] = None) -> dict[str, Any]:
    cfg = get_tier_config(tier)
    return {
        "tier": normalize_tier(tier),
        "eta_seconds": int(cfg["eta_seconds"]),
        "eta_display": str(cfg["eta_display"]),
        "label": str(cfg["label"]),
        "breakdown": {
            "planning": "~8s",
            "narration": "~15s",
            "codegen": "~30s",
            "render": "~30–90s",
            "merge_upload": "~15s",
        },
    }


def status_payload(phase: str, tier: Optional[str] = None) -> dict[str, Any]:
    """Extra fields to merge into JOBS via status_cb."""
    est = estimate_job(tier)
    copy = STATUS_COPY.get(phase) or STATUS_COPY["processing"]
    eta = est["eta_seconds"]
    delta = copy.get("eta_delta")
    if isinstance(delta, int):
        eta = max(15, eta + delta)
    return {
        "phase": phase,
        "message": copy["message"],
        "eta_seconds": None if delta is None else eta,
        "eta_display": est["eta_display"],
        "tier": est["tier"],
    }


def tier_prompt_block(tier: Optional[str]) -> str:
    return str(get_tier_config(tier)["prompt_rules"]).strip()
