from fastapi import FastAPI
from fastapi import HTTPException
from schema.chat import ChatRequest
from worker import process_topic_async

app = FastAPI()


@app.post("/generate-lecture")
async def chat(request: ChatRequest):
    user_messages = [m.content for m in request.messages if m.role.lower() == "user" and m.content.strip()]
    if not user_messages:
        raise HTTPException(status_code=400, detail="At least one user message is required.")
    topic = user_messages[-1]
    video_url = await process_topic_async(topic)
    if not video_url:
        raise HTTPException(status_code=500, detail="Failed to generate video.")
    return {"videoUrl": video_url}