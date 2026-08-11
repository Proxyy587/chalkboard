# ManiMotion — Manim Production Guide

> For AI agents and developers. Runtime: `services/quality_tiers.py`, sanitizer, worker.

## Table of contents

1. [Speed](#1-speed)
2. [Quality tiers](#2-quality-tiers)
3. [Templates](#3-templates)
4. [Error prevention](#4-error-prevention)
5. [Prompt / flow](#5-prompt--flow)
6. [Code patterns](#6-code-patterns)
7. [Timing / ETA](#7-timing--eta)

Also see: [`MANIM_ENGINE.md`](./MANIM_ENGINE.md), [`PROMPT_ENGINEERING.md`](./PROMPT_ENGINEERING.md).

---

## 1. Speed

### Where time goes

| Stage | Typical |
|-------|---------|
| LLM plan + narration + code | 40–80s |
| LaTeX (cold) | 30–60s first job |
| Manim frames | 30–120s |
| TTS + merge + upload | 20–40s |

### Production rules

- **Tier‑1 / templates → `-ql` (480p15)** via `manim_quality: low`
- **Tier‑2+ → `-qm` (720p30)** — never `-qh` for default user jobs
- **LaTeX warmup** on API startup (`services/latex_warmup.py`)
- **Audio drives timing** — do not parallelize render before TTS/beat_map
- Cap beats (tier1: 5) and duration (~30–35s for templates)

### Complexity budget

| Tier | Max MathTex on screen | ValueTrackers | always_redraw | 3D |
|------|----------------------|---------------|---------------|-----|
| 1 | 3 | 2 | 1 | no |
| 2 | 6 | 5 | 3 | rare |
| 3 | 8 | 5 | 3 | ok if needed |

---

## 2. Quality tiers

Set `tier` on `POST /video/request` (`tier1` | `tier2` | `tier3`).

| Tier | ETA | Quality flag | Complexity |
|------|-----|--------------|------------|
| tier1 | ~1–2 min | `-ql` | simple |
| tier2 | ~2–3 min | `-qm` | medium |
| tier3 | ~4–5 min | `-qm` | medium + longer |

### Good vs bad signals

**Bad:** raw `UP*4.5`, no waits between plays, everything in one `self.play`, `TransformMatchingTex` on `Text`, all-white objects.

**Good:** `.to_edge()`, paced `wait(0.5–1.5)`, progressive reveals, color encodes meaning, summary + `SurroundingRectangle`.

---

## 3. Templates

Homepage starters live in `client/lib/demo-prompts.ts`. They:

- Use **tier1** + **engine=manim** + **duration≈30**
- **Auto-start** render when opened
- Are short, concrete STEM prompts

Validated topics: derivatives (tangent), integrals (Riemann), F=ma, Euler identity.

---

## 4. Error prevention

Top crashes (see also sanitizer):

1. `TransformMatchingTex` on non-MathTex → `ReplacementTransform`
2. `wait(0)` / `run_time=0`
3. `get_part_by_tex`
4. Axes without `x_length`/`y_length`
5. Off-safe-zone coords
6. Transform after FadeOut
7. Wrong class name (must be `Scene`)
8. f-string MathTex with backslashes
9. Unbalanced LaTeX braces
10. External imports

Pipeline: **sanitize → validate → render → parse error → (TMT force-fix + re-render) → LLM retry**.

---

## 5. Prompt / flow

```
route → beat sheet → [BEAT] narration → TTS + word timestamps
  → measured beat_map → Manim (tier rules) → merge (no atempo) → upload
```

Status phases (client ETA): `queued → routing → planning → generating_audio → generating_code → merging → uploading → completed`.

---

## 6. Code patterns

Safe dynamic label:

```python
slope_label = always_redraw(lambda: MathTex(
    r"f'(x) = " + f"{2 * x_tracker.get_value():.2f}",
    font_size=28, color=TEAL,
).to_corner(DR, buff=0.5))
```

MathTex steps: transform **in place** at `ORIGIN` with `TransformMatchingTex` only between MathTex.

Split screen: axes `LEFT*3` with sizing; equations `RIGHT*2.8` + `scale_to_fit_width`.

---

## 7. Timing / ETA

`services/quality_tiers.py` → `estimate_job`, `status_payload`.

API returns `eta_seconds`, `eta_display`, `message`, `phase`, `tier` on create + status.
