import os
import re
import time
from typing import Optional

from dotenv import load_dotenv
from openrouter import OpenRouter

from prompt import MANIM_SYSTEM_PROMPT
from prompt import build_narration_prompt
load_dotenv()
_client = OpenRouter(api_key=os.getenv("OPENROUTER_API_KEY"))


def clean_code(code: str) -> str:
    code = code.strip()
    code = re.sub(r"^```(?:python)?\s*\n?", "", code, flags=re.MULTILINE)
    code = re.sub(r"\n?```\s*$", "", code)
    return code.strip()


def sanitize_generated_code(code: str) -> str:
    code = re.sub(
        r"\.get_parts_by_tex\((.*?)\)\s*\[\s*0\s*\]",
        r".get_part_by_tex(\1)",
        code,
    )
    return code.replace(".get_parts_by_tex(", ".get_part_by_tex(")


def build_manim_user_message(topic: str, error: Optional[str] = None, previous_code: Optional[str] = None) -> str:
    msg = f"""Create a complete Manim CE animation for this STEM concept.

TOPIC:
{topic}

CRITICAL LAYOUT CONTRACT (follow strictly):
- GOOD: show one main equation/idea at a time in the center; use TransformMatchingTex between steps
- GOOD: keep a title at the top with .to_edge(UP), and main content at ORIGIN
- GOOD: if multiple lines are needed, use VGroup(...).arrange(DOWN, buff=0.35).move_to(ORIGIN) and cap at 3 lines visible
- GOOD: always constrain size: .scale_to_fit_width(11.5) and .scale_to_fit_height(6.0) for any multi-line group or long MathTex
- GOOD: between sections, clear old objects: self.play(*[FadeOut(m) for m in self.mobjects])

- BAD: stacking many equations vertically so they overflow the frame
- BAD: placing objects with raw UP*4 / DOWN*4 / RIGHT*7 values
- BAD: writing new text on top of old text without Transform/FadeOut

The student must be able to follow each step clearly. Every transition must be intentional. No element should ever collide with another.
Output only raw Python code."""
    if previous_code:
        msg += f"\n\nPREVIOUS ATTEMPT (for reference; do NOT rewrite everything unless necessary):\n{previous_code}"
    if error:
        msg += f"\n\nRENDER ERROR TO FIX (fix only what is broken):\n{error}"
    return msg


def generate_manim_code(topic: str, model: str, error: Optional[str] = None, previous_code: Optional[str] = None, log=print) -> str:
    log("Step 1/6: Sending prompt to LLM for Manim code generation...")
    t0 = time.time()
    response = _client.chat.send(
        model=model,
        messages=[
            {"role": "system", "content": MANIM_SYSTEM_PROMPT},
            {"role": "user", "content": build_manim_user_message(topic, error=error, previous_code=previous_code)},
        ],
    )
    code = sanitize_generated_code(clean_code(response.choices[0].message.content))
    if "from manim import" not in code:
        raise RuntimeError("Invalid code: missing manim import")
    log(f"  ✔️ Manim code generated in {time.time()-t0:.1f}s")
    return code


def extract_visual_beats_from_code(code: str, max_items: int = 18) -> str:
    beats: list[str] = []
    for match in re.finditer(r"(?:Text|Tex|MathTex)\(\s*r?\"([^\"]+)\"", code):
        text = match.group(1).strip().replace("\\\\", "\\")
        if text:
            beats.append(f"Show: {text}")
        if len(beats) >= max_items:
            break
    for match in re.finditer(r"self\.play\((.*?)\)", code):
        action = match.group(1)
        if "TransformMatchingTex" in action:
            beats.append("Transform equation to next step")
        elif "Write(" in action:
            beats.append("Write new expression")
        elif "Create(" in action:
            beats.append("Create visual object")
        elif "FadeOut(" in action:
            beats.append("Clear previous object")
        elif "FadeIn(" in action:
            beats.append("Reveal next object")
        if len(beats) >= max_items:
            break
    if not beats:
        return "No explicit visual beats parsed."
    return "\n".join(f"- {b}" for b in beats)



def generate_narration_script(
    topic: str,
    code: str,
    video_duration: float,
    output_dir: str,
    model: str = "deepseek/deepseek-v3.2",
    log=print,
) -> str:
    log("Step 3/6: Generating narration script...")
    visual_beats = extract_visual_beats_from_code(code)
    response = _client.chat.send(
        model=model,
        messages=[
            {
                "role": "system",
                "content": "You write concise STEM narration scripts for animations. Keep pacing natural, concept-first, and avoid a boring filler tone.",
            },
            {"role": "user", "content": build_narration_prompt(topic, video_duration, visual_beats)},
        ],
    )
    script = response.choices[0].message.content.strip()
    script_path = os.path.join(output_dir, "narration_script.txt")
    with open(script_path, "w", encoding="utf-8") as f:
        f.write(script + "\n")
    log(f"  ✔️ Narration script saved at {script_path}")
    return script
