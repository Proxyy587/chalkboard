"""Unit tests for TTS beat-map alignment (no network / edge-tts)."""

from services.beat_timing import (
    apply_measured_timings_to_plan,
    build_beat_map,
    ensure_beat_markers,
    find_timestamp_at_char,
    strip_and_locate_beats,
)


def test_strip_and_locate_beats():
    script = "[BEAT:1] Hello world. [BEAT:2] Next idea here."
    clean, positions = strip_and_locate_beats(script)
    assert "BEAT" not in clean
    assert clean.startswith("Hello")
    assert positions["1"] == 0
    assert positions["2"] > positions["1"]


def test_find_timestamp_and_beat_map():
    words = [
        {"word": "Hello", "start_s": 0.0, "end_s": 0.4, "char_offset": 0},
        {"word": "world.", "start_s": 0.5, "end_s": 1.0, "char_offset": 6},
        {"word": "Next", "start_s": 1.2, "end_s": 1.5, "char_offset": 13},
        {"word": "idea", "start_s": 1.6, "end_s": 2.0, "char_offset": 18},
    ]
    # "Hello world. Next idea" → beat2 at char of "Next"
    assert find_timestamp_at_char(words, 0) == 0.0
    assert find_timestamp_at_char(words, 13) == 1.2

    beat_map = build_beat_map(
        words,
        {"1": 0, "2": 13},
        audio_duration=2.5,
    )
    assert beat_map["1"]["start_s"] == 0.0
    assert beat_map["1"]["end_s"] == 1.2
    assert beat_map["2"]["start_s"] == 1.2
    assert beat_map["2"]["end_s"] == 2.5


def test_ensure_markers_fallback():
    plan = {
        "beats": [
            {"id": 1, "narration": "First line."},
            {"id": 2, "narration": "Second line."},
        ]
    }
    marked = ensure_beat_markers("plain text without markers", plan)
    assert "[BEAT:1]" in marked
    assert "[BEAT:2]" in marked


def test_apply_measured_timings():
    plan = {
        "title": "T",
        "target_duration_sec": 60,
        "beats": [
            {"id": 1, "duration_sec": 10, "visual": "A", "narration": "a"},
            {"id": 2, "duration_sec": 10, "visual": "B", "narration": "b"},
        ],
    }
    beat_map = {
        "1": {"start_s": 0.0, "end_s": 3.0, "duration_sec": 3.0},
        "2": {"start_s": 3.0, "end_s": 7.5, "duration_sec": 4.5},
    }
    timed = apply_measured_timings_to_plan(plan, beat_map, 7.5)
    assert timed["beats"][0]["duration_sec"] == 3.0
    assert timed["beats"][1]["start_s"] == 3.0
    assert timed["timing_source"] == "tts"
    assert timed["target_duration_sec"] == 8  # round(7.5)
    # original untouched
    assert plan["beats"][0]["duration_sec"] == 10
