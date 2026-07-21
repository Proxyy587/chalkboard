# Clarity Video — Prompt Engineering Guide

This document is the source of truth for how Clarity turns a user prompt into a polished, sync-aware STEM video. Use it when tuning prompts, debugging quality, or preparing the public API.

## Pipeline overview

```
User prompt
    ↓
Router (engine + optional duration)
    ↓
Beat-sheet planner (visual + narration + timing per beat)
    ↓
Narration polish → TTS (audio length known)
    ↓
Manim / Remotion code (timed to beats + audio)
    ↓
Render → ffmpeg merge (sync) → R2 upload
```

**Key insight:** Quality and sync come from the **beat sheet**, not from hoping the LLM guesses timing after render.

## The beat sheet

Every video is planned as sequential **beats**. Each beat has:

| Field | Purpose |
|-------|---------|
| `duration_sec` | How long this moment lasts |
| `visual` | Exactly what appears and how it animates |
| `narration` | Words spoken during this beat |

Rules:
- Beats are sequential; durations sum to `target_duration_sec`
- ~2.3 words/second for narration (5s beat ≈ 11 words)
- Manim: no sub-part equation highlights (whole `MathTex` only)
- Remotion: one `Sequence` per beat

Prompt file: `prompts/planner_prompt.py`

## Duration policy

| Request | Behavior |
|---------|----------|
| `duration` omitted | Router + planner choose 20–120s freely |
| `duration` set | Beat sheet must sum to that length (±2s) |

Do **not** default to 60 seconds. Length should match teaching depth.

## Audio ↔ video sync

1. **Plan** narrations per beat before rendering
2. **TTS** narration → measure `audio_duration`
3. **Code** targets `max(plan_duration, audio_duration)`
4. **Merge** (`services/merger.py`):
   - Within 20%: gentle `atempo` on audio
   - Audio longer: pad video (`tpad` freeze last frame)
   - Video longer: speed narration with `atempo`

## Visual quality levers

### Manim
- `MANIM_QUALITY=medium` (720p30) default — was `low` before
- `MANIM_QUALITY=high` for 1080p60 on beefier VPS
- Dark bg `#0B1020`, colored accents, `TransformMatchingTex`, paced `self.wait()`

### Remotion
- Sequence-per-beat timing
- Spring entrances, clamped interpolates
- Typography scale: title 56–72px, body 28–36px

### Narration
- Beat-aligned script polish (`prompts/narration_prompt.py`)
- Edge TTS voice: `en-US-AriaNeural` (change in `services/audio.py`)
- AAC 192k in merge

## Prompt files map

| File | Role |
|------|------|
| `prompts/router_prompt.py` | manim vs remotion + duration |
| `prompts/planner_prompt.py` | JSON beat sheet |
| `prompts/narration_prompt.py` | Flowing voiceover from beats |
| `prompts/manim_prompt.py` | Sync-aware Manim code |
| `prompts/remotion_prompt.py` | Sync-aware Remotion TSX |

## Tuning checklist

When a video feels poor:

- [ ] Beat sheet has enough beats (4–12)? Hook in beat 1?
- [ ] Narration lines short enough for their `duration_sec`?
- [ ] Manim using `-qm` or `-qh` (`MANIM_QUALITY`)?
- [ ] Code comments show `# BEAT N` with matching waits?
- [ ] Crashes? Check `get_part_by_tex` sanitizer in `services/llm.py`
- [ ] Audio ahead/behind visuals? Compare `audio_duration` vs `video_duration` in logs

## Environment variables

```env
MANIM_QUALITY=medium          # low | medium | high | 4k
DEFAULT_MODEL=deepseek/deepseek-v3.2
PLANNER_MODEL=openai/gpt-4o-mini
ROUTER_MODEL=openai/gpt-4o-mini
CLARITY_ENV=vps               # deletes local files after R2 upload
```

## Roadmap (public API)

Planned before launch:
- Per-user R2 bucket credentials
- Usage metering + pricing tiers
- Webhook on job complete
- Optional `voice` / `style` request fields

See `docs/ROADMAP.md` for details.

## For agents

When editing prompts in this repo, read `.cursor/skills/clarity-video-quality/SKILL.md` first.
