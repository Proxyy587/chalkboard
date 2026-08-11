# ManiMotion — Remotion Production Guide

> For AI agents and developers. Complements [`REMOTION_ENGINE.md`](./REMOTION_ENGINE.md).

## Table of contents

1. [Speed](#1-speed)
2. [Quality tiers](#2-quality-tiers)
3. [Templates](#3-templates)
4. [Error prevention](#4-error-prevention)
5. [Prompt / design](#5-prompt--design)
6. [Timing / ETA](#6-timing--eta)

---

## 1. Speed

| Stage | Typical |
|-------|---------|
| LLM TSX | 20–35s |
| Bundle (cold) | 15–30s |
| Frames @ 30fps | 30–90s |
| TTS + merge | 20–35s |

Rules:

- Prefer **shorter durations** for tier1 (≤30s → ≤900 frames)
- `interpolate` + clamp only on tier1 (avoid heavy `spring` spam)
- Static data **outside** the component
- Imports only from `react` + `remotion`
- Named export: `MainComposition` only

Audio still drives beat timing when Remotion is chosen by the router — same beat_map contract as Manim.

---

## 2. Quality tiers

Same `tier` field as Manim (`services/quality_tiers.py`).

| Tier | Frames budget (guide) | ETA |
|------|----------------------|-----|
| tier1 | ≤ ~750–900 | ~1–2 min |
| tier2 | ≤ ~1350 | ~2–3 min |
| tier3 | ≤ ~2700 | ~3–5 min |

Tier1 Remotion rules:

- Max ~10 animated elements
- No nested Sequence depth > 2
- No emoji icons (use text / SVG shapes)
- Dark bg `#0B1020` / `#0D1117`
- Every `interpolate` clamped

---

## 3. Templates

Homepage starters currently force **Manim** for reliability. Remotion is still available via router/`engine: remotion`.

When authoring Remotion demos:

- Hardcode chart/timeline data outside the component
- Stagger with `delay = index * 15`
- Title entry 0–20 frames; cards from frame 30+

---

## 4. Error prevention

1. Heavy work inside render body → move outside / `useMemo`
2. External packages (`d3`, `lodash`, …) → banned
3. Unclamped `interpolate` → always clamp
4. `spring({ frame: frame - delay })` with negative frame → `Math.max(0, …)`
5. `fetch` / async in component → banned
6. Wrong export name → must be `MainComposition`
7. Missing `import React from 'react'`
8. `durationInFrames={0}` → `Math.max(1, Math.round(sec * 30))`

Sanitizer: `sanitize_remotion_code` in `services/llm.py`.

---

## 5. Prompt / design

Clarity tokens:

- Background `#0B1020`
- Accents `#7C3AED`, `#06B6D4`, `#F59E0B`, `#10B981`
- Title 56–72px, body 28–36px
- Font `Inter, system-ui, sans-serif`
- Padding ≥ 60–80px from edges

Beat sync: one `Series.Sequence` / `Sequence` per beat; `durationInFrames = max(1, round(duration_sec * 30))`.

---

## 6. Timing / ETA

Same status/ETA fields as Manim jobs (`eta_display`, `message`, `phase`). Client shows them in the chalkboard output panel.
