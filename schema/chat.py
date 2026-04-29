from pydantic import BaseModel
from typing import List, Optional


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[Message]
    model: Optional[str] = "deepseek/deepseek-v3.2"


class JobCreateResponse(BaseModel):
    job_id: str
    status: str
    cached: bool = False
    video_url: Optional[str] = None


class JobStatusResponse(BaseModel):
    job_id: str
    status: str
    video_url: Optional[str] = None
    error: Optional[str] = None
    cached: bool = False