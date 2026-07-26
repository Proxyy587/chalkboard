# prompt-docs — sample / research prompts (NOT loaded at runtime)

These files are **source material** for improving production prompts:

| File | Use for |
|------|---------|
| `manim.prompt.py` | Layout pedagogy, axes rules (never port `get_part_by_tex`) |
| `remotion.prompt.py` | Motion patterns, charts, Easing examples |
| `narration.prompt.py` | Voice style, quality judge, error-fixer wording |

**Live prompts** that the worker actually uses live in `/prompts/`:

- `planner_prompt.py` — JSON beat sheet
- `narration_prompt.py` — TTS script polish
- `manim_prompt.py` / `remotion_prompt.py` — code generation
- `quality_prompt.py` — optional judge (`QUALITY_JUDGE=1`)

Do **not** import this folder from `services/llm.py`. Port useful bits into `/prompts/` while keeping:

1. JSON beat sheets (not freeform storyboards)
2. Manim ban on `get_part_by_tex`
3. Audio-before-render sync pipeline

See `docs/PROMPT_ENGINEERING.md`.
