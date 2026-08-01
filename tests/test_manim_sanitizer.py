"""Tests for Manim sanitizer / validator / error parser."""

from services.llm import sanitize_generated_code
from services.manim_error_parser import parse_manim_error
from services.manim_sanitizer import sanitize_manim_code
from services.manim_validator import validate_manim_code


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
    assert "self.wait(1.0)" in out


def test_transform_matching_tex_on_text():
    code = """
from manim import *
class Scene(Scene):
    def construct(self):
        title = Text("Before")
        title2 = Text("After")
        eq1 = MathTex(r"x")
        eq2 = MathTex(r"y")
        self.play(TransformMatchingTex(title, title2))
        self.play(TransformMatchingTex(eq1, eq2))
""".strip()
    out, fixes = sanitize_manim_code(code)
    assert "TransformMatchingTex(title, title2)" not in out
    assert "ReplacementTransform(title, title2)" in out
    assert "TransformMatchingTex(eq1, eq2)" in out
    assert any("TransformMatchingTex" in f for f in fixes)


def test_force_safe_tmt():
    code = "self.play(TransformMatchingTex(a, b))\n"
    out, fixes = sanitize_manim_code(code, force_safe_tmt=True)
    assert "TransformMatchingTex" not in out
    assert "ReplacementTransform" in out


def test_validator_catches_syntax():
    issues = validate_manim_code("from manim import *\nclass Scene(Scene):\n  def construct(self)\n")
    assert any(i.severity == "error" and "syntax" in i.message.lower() for i in issues)


def test_parse_tmt_assertion():
    stderr = 'assert hasattr(mobject, "tex_string")\nAssertionError'
    info = parse_manim_error(stderr)
    assert info["type"] == "TransformMatchingTex"
    assert info["force_safe_tmt"] is True
