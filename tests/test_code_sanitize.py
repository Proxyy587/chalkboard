"""Tests for Manim / Remotion code sanitizers."""

from services.llm import sanitize_generated_code, sanitize_remotion_code


def test_drops_zero_wait_lines():
    code = """
from manim import *
class Scene(Scene):
    def construct(self):
        self.play(Write(Text("Hi")), run_time=0.5)
        self.wait(0.0)  # Already at beat boundary
        self.wait(1.0)
""".strip()
    out = sanitize_generated_code(code)
    assert "self.wait(0.0)" not in out
    assert "self.wait(0)" not in out
    assert "self.wait(1.0)" in out


def test_clamps_zero_run_time():
    code = "self.play(FadeIn(x), run_time=0)\nself.play(FadeIn(y), run_time=0.0)\n"
    out = sanitize_generated_code(code)
    assert "run_time=0)" not in out.replace("run_time=0.5", "")
    assert "run_time=0.5" in out


def test_strips_get_part_by_tex():
    code = "part = eq.get_part_by_tex('x')\nself.play(FadeIn(eq))\n"
    out = sanitize_generated_code(code)
    assert "get_part_by_tex" not in out


def test_remotion_zero_duration_frames():
    code = """
import React from 'react';
export const MainComposition = () => (
  <Sequence durationInFrames={0}>x</Sequence>
);
"""
    out = sanitize_remotion_code(code)
    assert "durationInFrames={0}" not in out
    assert "durationInFrames={1}" in out
