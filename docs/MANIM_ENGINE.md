# Manim engine guide (Clarity / manimotion)

How we generate **reliable** Manim Community Edition scenes for STEM explainers.
Prompts live in `prompts/manim_prompt.py`; sanitization in `services/llm.py`.

## Goal

One render that:
1. Matches measured narration beats (`timing_source=tts`)
2. Never crashes on timing / layout / MathTex pitfalls
3. Looks cinematic on a dark board (`#0B1020`)

## Pipeline contract

```
beat sheet (measured start_s / duration_sec)
  → LLM Manim code
  → sanitize (strip get_part_by_tex, drop wait(0), clamp run_time)
  → manim render (-qm default)
  → optional end-wait pad re-render
  → ffmpeg merge (no atempo)
```

## Non-negotiable API rules

| Rule | Why |
|------|-----|
| `class Scene(Scene):` exactly | Renderer always calls `Scene` |
| `from manim import *` first | No other packages except optional `numpy` |
| `self.wait(t)` with **t > 0** | Manim raises `ValueError` on `wait(0)` |
| `run_time=` **> 0** | Same validator as wait |
| No `get_part_by_tex` / `get_parts_by_tex` | Returns `None` → `next_to` crashes |
| Highlight **whole** `MathTex` only | Substring APIs are banned |
| FadeIn / Write / `self.add` before use | Objects must be on scene |
| Safe zone X∈[-6,6], Y∈[-3.2,3.2] | Prevents off-screen content |

### Zero-duration is always wrong

```python
# BAD — hard crash
self.wait(0)
self.wait(0.0)
self.play(Write(title), run_time=0)

# GOOD — omit the wait, or use a positive value
self.play(Write(title), run_time=0.5)
# (no wait line if already at beat boundary)
self.wait(0.5)
```

Sanitizer removes `self.wait(0)` lines and clamps `run_time<=0` → `0.5`, but
**prompts must not teach zero waits**.

## Beat timing pattern

```python
def construct(self):
    self.camera.background_color = "#0B1020"

    # BEAT 1 @ 0.0s (3.2s)
    title = Text("Product rule", font_size=48, color=BLUE).to_edge(UP, buff=0.5)
    self.play(Write(title), run_time=1.0)
    self.wait(2.2)

    # BEAT 2 @ 3.2s (4.0s)
    eq = MathTex(r"\frac{d}{dx}[uv] = u'v + uv'").scale(1.2)
    self.play(FadeIn(eq), run_time=1.2)
    box = SurroundingRectangle(eq, color=YELLOW)
    self.play(Create(box), run_time=0.8)
    self.wait(2.0)
```

Checklist per beat:
- Comment with `@ start_s (duration_sec)`
- Animations near the **start** of the beat (when narration starts)
- `sum(run_time) + sum(wait) ≈ duration_sec` (all terms > 0)
- Cumulative time before beat N ≈ `start_s`

## Layout recipes

**Full focus (equations)**  
`title.to_edge(UP)` · hero at `ORIGIN` · caption `.to_edge(DOWN)`

**Split (graph + math)**  
Axes `move_to(LEFT * 3)` with `x_length`/`y_length` set · equations `move_to(RIGHT * 2.8)` · `scale_to_fit_width(5)`

**Steps**  
`TransformMatchingTex` in place — never stack 4 equations

After `VGroup.arrange`, clamp width/height to frame.

## Banned / high-risk patterns

- `get_part_by_tex`, `get_parts_by_tex`, arrows to equation substrings
- `next_to` on a piece of MathTex that wasn't added as its own mobject
- Raw coordinates outside the safe zone (`UP*4.5`, `RIGHT*7`, …)
- Fancy Unicode in MathTex (use LaTeX)
- More than 3 equations on screen at once
- `self.wait(0)` “to mark a beat boundary”

## Retry policy

Worker: max 3 attempts (`MANIM_MAX_ATTEMPTS`). Attempt ≥2 uses a **simple**
crash-proof plan (title + one MathTex + rectangle + transform).

Error hints injected on retry: `MANIM_ERROR_HINTS` in `prompts/manim_prompt.py`.

## Local debug

```bash
# After a failed job, inspect (VPS path example)
cat /tmp/clarity-jobs/<job_id>/*_render_error.log
```

Common log line:
`Scene.wait() has a duration of 0 <= 0 seconds` → zero wait; fixed by sanitizer + prompt rules.

## See also

- `docs/PROMPT_ENGINEERING.md` — full pipeline
- `docs/REMOTION_ENGINE.md` — Remotion counterpart
- `.cursor/skills/clarity-video-quality/SKILL.md`
