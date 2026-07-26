---
name: clarity-video-quality
description: >-
  Tune Clarity STEM video generation prompts, beat-sheet planning, audio-video
  sync, and Manim/Remotion quality. Use when improving video output, editing
  prompts in prompts/, debugging narration sync, or preparing the public API.
---

# Clarity Video Quality

## When to use

- User reports poor video quality, bad sync, or robotic narration
- Editing files under `prompts/` or `services/llm.py`
- Adding features before public API launch

## Read first

1. [docs/PROMPT_ENGINEERING.md](../../docs/PROMPT_ENGINEERING.md) — full pipeline
2. [docs/ROADMAP.md](../../docs/ROADMAP.md) — public API plans

## Pipeline (do not break order)

```
route → beat sheet → narration → TTS → code → render → merge → R2
```

Audio is generated **before** render so animation targets real narration length.

## Beat sheet contract

Planner outputs JSON (`prompts/planner_prompt.py`):
- `beats[].duration_sec` must sum to `target_duration_sec`
- Each beat has `visual` + `narration`
- If user omits `duration`, planner picks 20–120s freely

When editing planner prompts, preserve JSON-only output and per-beat narration.

## Sync rules

| Problem | Fix |
|---------|-----|
| Narration ahead of visuals | Increase `self.wait()` / beat `duration_sec` |
| Visuals finish before voice | Lengthen beats or pad video in merger |
| Total length drift | Regenerate beat sheet; check `beat_sheet_target_duration()` |

Merger logic: `services/merger.py` — atempo within 20%, else tpad or faster audio.

## Quality rules

### Manim (`prompts/manim_prompt.py`)
- Never `get_part_by_tex` / `next_to` on subparts
- `# BEAT N` comments + `run_time` + `self.wait()` per beat
- `self.camera.background_color = "#0B1020"`
- Render quality: `MANIM_QUALITY=medium|high` in env

### Remotion (`prompts/remotion_prompt.py`)
- One `Sequence` / `Series.Sequence` per beat, `durationInFrames = duration_sec * 30`
- Prefer `interpolate()` + `Easing` over `spring()` unless bounce is needed
- `extrapolateLeft/Right: 'clamp'` on all `interpolate()`
- Research samples in `prompt-docs/` — port selectively; do not import wholesale

### Narration (`prompts/narration_prompt.py`)
- ~2.3 words/second
- Polish beat lines into flowing script — don't invent new content

## Safe prompt edits

1. Change one prompt file at a time
2. Test with: product rule (Manim), bar chart comparison (Remotion)
3. Check logs for `audio_duration` vs `video_duration`
4. On VPS: `CLARITY_ENV=vps` — no local artifacts after upload

## Do not

- Revert to render-then-narrate order (breaks sync)
- Use Manim `-ql` in production
- Remove beat-sheet JSON structure without updating `services/llm.py` + `worker.py`
- Add `get_part_by_tex` examples to Manim prompts

## Quick test

```bash
# local
curl -X POST http://localhost:8000/video/request \
  -H "Content-Type: application/json" \
  -H "x-api-key: $CLARITY_API_KEY" \
  -d '{"prompt":"Explain the product rule in calculus","engine":"manim"}'
```

Poll `/video/status/{job_id}` until `completed`.
