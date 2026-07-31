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
2. [docs/MANIM_ENGINE.md](../../docs/MANIM_ENGINE.md) — Manim crash rules (`wait(0)` banned)
3. [docs/REMOTION_ENGINE.md](../../docs/REMOTION_ENGINE.md) — Remotion frame rules
4. [docs/ROADMAP.md](../../docs/ROADMAP.md) — public API plans

## Pipeline (do not break order)

```
route → beat sheet → marked narration → TTS (+ word timestamps)
  → beat_map → code timed to beats → render → clean merge → R2
```

**Audio drives the timeline.** Voice tempo is sacred — never use `atempo`.

## Beat sheet contract

Planner outputs JSON (`prompts/planner_prompt.py`):
- `beats[].duration_sec` must sum to `target_duration_sec` (planner estimate)
- Each beat has `visual` + `narration`
- If user omits `duration`, planner picks 20–120s freely

After TTS, `services/beat_timing.py` **replaces** planner durations with measured
`start_s` / `end_s` / `duration_sec` from word timestamps (`timing_source=tts`).

Narration scripts must include `[BEAT:N]` markers (`prompts/narration_prompt.py`).

## Sync rules

| Problem | Fix |
|---------|-----|
| Narration ahead of visuals | Increase `self.wait()` / honor measured `duration_sec` |
| Visuals finish before voice | Pad with `self.wait()` to measured beat length |
| Total length drift | Prefer waits in codegen; merger may freeze-pad video only |
| Robotic / slow voice | **Bug** — remove any atempo; regenerate with beat_map timing |

Merger (`services/merger.py`):
- **Never** `atempo` / speed-adjust narration
- Audio longer: `tpad` freeze-pad video (all `-i` first, then `-vf`)
- Video longer: `-shortest` so output ends with narration
- Soft subtitle tracks skipped; burn captions after mux

Latency / reliability:
- Default `MANIM_MAX_ATTEMPTS=3` (was 4); simplify plan from attempt 2
- Cap beat sheet at 8 beats
- If render undershoots audio by >1.5s, one pad re-render via `append_end_wait`

## Do not

- Treat video duration as a constraint the audio must fit into
- Use `atempo` (any factor) on narration
- Emit `self.wait(0)` / `run_time=0` in Manim prompts or examples
- Emit `durationInFrames={0}` in Remotion prompts or examples
- Revert to render-then-narrate as the default
- Use Manim `-ql` in production
- Remove beat-sheet JSON / `[BEAT:N]` markers without updating `audio.py` + `worker.py`
- Add `get_part_by_tex` examples to Manim prompts

## Quick test

```bash
# local
curl -X POST http://localhost:8000/video/request \
  -H "Content-Type: application/json" \
  -H "x-api-key: $CLARITY_API_KEY" \
  -d '{"prompt":"Explain the product rule in calculus","engine":"manim"}'
```

Poll `/video/status/{job_id}` until `completed`. Check job work dir for
`beat_map.json` and `words.json` when debugging sync.
