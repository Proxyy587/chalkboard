"""Optional quality gate prompts (from prompt-docs samples).

Enable with QUALITY_JUDGE=1 — adds one LLM call before Remotion/Manim render.
"""

QUALITY_JUDGE_SYSTEM = """You are a senior video quality reviewer.
Evaluate generated Manim/Remotion code against the beat sheet.

Check:
1. LAYOUT — overflow / crowding risks
2. CLARITY — one idea at a time
3. TIMING — pauses / Sequence durations match beats
4. PEDAGOGY — hook → core → summary
5. COMPILE RISK — missing imports, invalid Remotion/Manim APIs

Return JSON ONLY:
{
  "score": 0-100,
  "passes": true/false,
  "issues": [{"severity": "critical|major|minor", "description": "...", "fix": "..."}],
  "verdict": "approve|fix|regenerate"
}

Score: 90+ approve | 70–89 fix | 50–69 major | <50 regenerate
"""


def build_quality_judge_prompt(
    topic: str,
    engine: str,
    code: str,
    visual_plan: str,
) -> str:
    clipped = code if len(code) <= 3500 else code[:3500] + "\n...[truncated]"
    return f"""Review this generated {engine.upper()} animation code.

TOPIC: {topic}

BEAT SHEET / PLAN:
{visual_plan[:2000]}

GENERATED CODE:
{clipped}

Return quality assessment JSON."""
