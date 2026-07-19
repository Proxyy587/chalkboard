from typing import List, Optional

from pydantic import BaseModel, Field


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    """Legacy ChalkBoard request shape."""

    messages: List[Message]
    model: Optional[str] = "deepseek/deepseek-v3.2"
    engine: Optional[str] = "auto"
    duration: Optional[int] = Field(
        default=None,
        ge=15,
        le=120,
        description="Optional. If omitted, the router chooses a natural duration.",
    )


class VideoRequest(BaseModel):
    """Clarity public API request."""

    prompt: str = Field(..., min_length=3)
    model: Optional[str] = "deepseek/deepseek-v3.2"
    engine: Optional[str] = Field(default="auto", description="auto | manim | remotion")
    duration: Optional[int] = Field(
        default=None,
        ge=15,
        le=120,
        description="Optional target seconds. If omitted, router chooses freely (~25–90s).",
    )


class JobCreateResponse(BaseModel):
    job_id: str
    status: str
    cached: bool = False
    video_url: Optional[str] = None
    engine: Optional[str] = None


class JobStatusResponse(BaseModel):
    job_id: str
    status: str
    video_url: Optional[str] = None
    error: Optional[str] = None
    cached: bool = False
    engine: Optional[str] = None
    duration: Optional[float] = None
