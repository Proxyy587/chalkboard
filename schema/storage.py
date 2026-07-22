"""Storage models for per-request / per-user video uploads."""

from __future__ import annotations

from typing import Annotated, Literal, Optional, Union

from pydantic import BaseModel, Field, model_validator


class InlineR2Storage(BaseModel):
    provider: Literal["r2"] = "r2"
    bucket: str = Field(..., min_length=1)
    access_key_id: str = Field(..., min_length=1)
    secret_access_key: str = Field(..., min_length=1)
    account_id: str = Field(..., min_length=1, description="Cloudflare account ID")
    public_url: Optional[str] = Field(
        default=None,
        description="Public CDN base URL, e.g. https://pub-xxx.r2.dev",
    )


class InlineS3Storage(BaseModel):
    provider: Literal["s3", "custom_s3", "minio", "backblaze"] = "s3"
    bucket: str = Field(..., min_length=1)
    access_key_id: str = Field(..., min_length=1)
    secret_access_key: str = Field(..., min_length=1)
    region: str = Field(default="us-east-1")
    endpoint: Optional[str] = Field(
        default=None,
        description="Required for MinIO / custom S3-compatible endpoints",
    )
    public_url: Optional[str] = None
    force_path_style: bool = True


class VideoStorageRequest(BaseModel):
    """
    Where to upload the finished video.

    Priority (first match wins):
    1. `inline` — credentials in this request (never stored, job-scoped only)
    2. `integration_id` — saved integration from Settings (must belong to API key owner)
    3. User's default saved integration (if authenticated with chalk_* key)
    4. Server default R2 env vars
    """

    inline: Optional[
        Annotated[
            Union[InlineR2Storage, InlineS3Storage],
            Field(discriminator="provider"),
        ]
    ] = None
    integration_id: Optional[str] = Field(
        default=None,
        description="ID from Settings → Storage (saved & encrypted)",
    )

    @model_validator(mode="after")
    def _one_source(self):
        if self.inline and self.integration_id:
            raise ValueError("Use either storage.inline OR storage.integration_id, not both.")
        return self
