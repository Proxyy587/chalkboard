"""Unit tests for Manim end-wait padding."""

from services.manim_pad import append_end_wait


def test_append_end_wait_adds_marker():
    code = "from manim import *\n\nclass Scene(Scene):\n    def construct(self):\n        self.wait(1)\n"
    out = append_end_wait(code, 7.91)
    assert "CLARITY_END_PAD" in out
    assert "self.wait(7.91)" in out


def test_append_end_wait_replaces_existing():
    code = "class Scene(Scene):\n    def construct(self):\n        self.wait(1.00)  # CLARITY_END_PAD\n"
    out = append_end_wait(code, 4.5)
    assert out.count("CLARITY_END_PAD") == 1
    assert "self.wait(4.50)" in out


def test_append_end_wait_ignores_tiny():
    code = "self.wait(1)\n"
    assert append_end_wait(code, 0.2) == code
