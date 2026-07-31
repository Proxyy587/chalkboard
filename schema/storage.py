"""Storage models for per-request / per-user video uploads."""

from __future__ import annotations

from typing import Annotated, Literal, Optional, Union

from pydantic import BaseModel, Field, model_validator


class InlineR2Storage(BaseModel):
    provider: Literal["r2"] = "r2"
    bucket: str = Field(..., min_length=1, description="R2 bucket name")
    access_key_id: str = Field(..., min_length=1)
    secret_access_key: str = Field(..., min_length=1)
    account_id: str = Field(
        ...,
        min_length=1,
        description="Cloudflare account ID (used to build the S3 API endpoint)",
    )
    public_url: Optional[str] = Field(
        default=None,
        description="Public base URL for returned video_url, e.g. https://pub-xxx.r2.dev",
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
    public_url: Optional[str] = Field(
        default=None,
        description="Public CDN/base URL used to build the returned video_url",
    )
    force_path_style: bool = Field(
        default=True,
        description="Prefer path-style addressing (typical for MinIO)",
    )


class VideoStorageRequest(BaseModel):
    """
    Where to upload the finished video (public API).

    Priority (first match wins):
    1. `inline` — credentials in this request (job-scoped, never stored)
  2. `integration_id` — saved integration from Settings → Storage
  3. Master key (`CLARITY_API_KEY`) → server .env R2 (owner only)
  4. User's default saved integration (if any)
  5. Otherwise → 400 error (no shared bucket for public keys)
    """

    inline: Optional[
        Annotated[
            Union[InlineR2Storage, InlineS3Storage],
            Field(discriminator="provider"),
        ]
    ] = None
    integration_id: Optional[str] = Field(
        default=None,
        description="Saved integration id from Settings → Storage",
    )

    @model_validator(mode="after")
    def _one_source(self):
        if self.inline and self.integration_id:
            raise ValueError("Use either storage.inline OR storage.integration_id, not both.")
        return self
