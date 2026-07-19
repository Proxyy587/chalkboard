"""Backward-compatible alias — Manim rendering lives here. """

from services.renderer import find_output_video, get_media_duration, render_video

__all__ = ["render_video", "find_output_video", "get_media_duration"]
