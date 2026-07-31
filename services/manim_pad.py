"""Post-process Manim code for narration-length padding."""

from __future__ import annotations

import re


def append_end_wait(code: str, extra_sec: float) -> str:
    """
    Append (or replace) a final self.wait() so a short scene reaches narration length.

    Used after a successful render that undershot audio — one cheap re-render beats
    an 8s freeze-frame at the end of the video.
    """
    try:
        extra = float(extra_sec)
    except (TypeError, ValueError):
        return code
    extra = max(0.0, min(extra, 45.0))
    if extra < 0.4 or not code:
        return code

    line = f"        self.wait({extra:.2f})  # CLARITY_END_PAD"
    if "# CLARITY_END_PAD" in code:
        return re.sub(
            r"^[ \t]*self\.wait\([^)]*\)[ \t]*# CLARITY_END_PAD[ \t]*$",
            line,
            code,
            count=1,
            flags=re.M,
        )
    return code.rstrip() + "\n\n" + line + "\n"
