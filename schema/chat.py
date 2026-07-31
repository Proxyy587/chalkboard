from typing import List, Optional

from pydantic import BaseModel, Field

from schema.storage import VideoStorageRequest


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
        le=180,
        description="Optional. If omitted, the router and beat sheet choose a natural duration.",
    )


class VideoRequest(BaseModel):
    """Clarity public API request."""

    prompt: str = Field(
        ...,
        min_length=10,
        max_length=2000,
        description="Lecture topic / prompt (10–2000 chars).",
    )
    model: Optional[str] = "deepseek/deepseek-v3.2"
    engine: Optional[str] = Field(default="auto", description="auto | manim | remotion")
    duration: Optional[int] = Field(
        default=None,
        ge=15,
        le=180,
        description="Optional target seconds. If omitted, AI chooses freely (20–120s).",
    )
    storage: Optional[VideoStorageRequest] = Field(
        default=None,
        description="Optional upload destination: inline R2/S3 creds or saved integration_id",
    )
    # Set only by the trusted Next proxy (master key). Ignored for chalk_* keys.
    watermark: Optional[bool] = Field(
        default=None,
        description="Force free-tier watermark (platform proxy only).",
    )
    max_height: Optional[int] = Field(
        default=None,
        ge=360,
        le=1080,
        description="Max output height (platform proxy only).",
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
