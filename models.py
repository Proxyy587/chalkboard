import os
import uuid
import subprocess
from openrouter import OpenRouter
from dotenv import load_dotenv
from prompt import MANIM_SYSTEM_PROMPT

load_dotenv()

client = OpenRouter(api_key=os.getenv("OPENROUTER_API_KEY"))

OUTPUT_DIR = "outputs"
os.makedirs(OUTPUT_DIR, exist_ok=True)

def generate_code(query):
    response = client.chat.send(
        model="z-ai/glm-4.5-air:free",
        messages=[
            {"role": "system", "content": MANIM_SYSTEM_PROMPT},
            {"role": "user", "content": query},
        ],
    )
    return response.choices[0].message.content


def render_video(code):
    job_id = str(uuid.uuid4())

    file_name = f"{job_id}.py"
    file_path = os.path.join(OUTPUT_DIR, file_name)

    with open(file_path, "w") as f:
        f.write(code)

    try:
        subprocess.run(
            [
                "manim",
                file_path,
                "MainScene",
                "-ql",
                "--media_dir", OUTPUT_DIR,
                "-o", job_id
            ],
            check=True
        )
    except subprocess.CalledProcessError as e:
        print("❌ Rendering failed:", e)
        return None

    # Final video path
    video_path = f"{OUTPUT_DIR}/videos/{job_id}/480p15/{job_id}.mp4"

    return video_path


if __name__ == "__main__":
    query = input("Enter your question: ")

    print("\n🧠 Generating code...")
    code = generate_code(query)

    print("\n📜 Generated code:\n")
    print(code)

    print("\n🎬 Rendering video...")
    video = render_video(code)

    if video:
        print(f"\n✅ Video saved at: {video}")
    else:
        print("\n❌ Failed to generate video")