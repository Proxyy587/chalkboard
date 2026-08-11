"""Pre-warm Manim LaTeX so the first user job is not paying cold-start cost."""

from __future__ import annotations

import os
import subprocess
import tempfile


WARMUP_SCRIPT = r"""
from manim import *

class Warmup(Scene):
    def construct(self):
        eqs = [
            MathTex(r"\int_0^\infty e^{-x}\,dx"),
            MathTex(r"\frac{d}{dx}[x^2]=2x"),
            MathTex(r"\sum_{n=1}^{\infty}\frac{1}{n^2}"),
            MathTex(r"\vec{F}=m\vec{a}"),
        ]
        for eq in eqs:
            self.add(eq)
"""


def warmup_latex(log=print) -> bool:
    """
    Run a tiny Manim scene once at process start to populate the LaTeX cache.
    Safe to call multiple times; failures are non-fatal.
    """
    if os.getenv("SKIP_LATEX_WARMUP", "").strip().lower() in {"1", "true", "yes"}:
        log("  ⏭️ LaTeX warmup skipped (SKIP_LATEX_WARMUP)")
        return False

    path = None
    try:
        with tempfile.NamedTemporaryFile(
            suffix=".py", mode="w", delete=False, encoding="utf-8"
        ) as f:
            f.write(WARMUP_SCRIPT)
            path = f.name

        from services.renderer import _manim_cmd

        cmd = [*_manim_cmd(), path, "Warmup", "-ql", "--media_dir", "/tmp/manim-warmup"]
        log("  🔥 Warming LaTeX / Manim cache…")
        subprocess.run(cmd, capture_output=True, text=True, timeout=180, check=False)
        log("  ✅ LaTeX warmup finished")
        return True
    except Exception as exc:
        log(f"  ⚠️ LaTeX warmup skipped: {exc}")
        return False
    finally:
        if path:
            try:
                os.unlink(path)
            except OSError:
                pass
