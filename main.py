from fastapi import FastAPI
from schema.chat import ChatRequest

app = FastAPI()


@app.post("/generate-lecture")
async def chat(request: ChatRequest):
    return {"message": "Hello, World!"}