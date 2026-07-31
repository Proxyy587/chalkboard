"""Resolve per-job upload destination from API request + auth context."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, Optional

from schema.storage import InlineR2Storage, InlineS3Storage, VideoStorageRequest
from services.user_storage import (
    UserStorageConfig,
    get_active_storage_for_user,
    get_storage_integration_for_user,
)

StorageSource = Literal["inline", "integration", "platform"]

NO_STORAGE_ERROR = (
    "No storage configured. Save a bucket in Settings → Storage, or pass "
    "storage.inline / storage.integration_id. See /docs/storage."
)


@dataclass(frozen=True)
class ResolvedStorage:
    """
    Where the finished MP4 should land.

    - inline / integration → use `config` (user credentials)
    - platform → use server .env R2 (master / owner key only)
    """

    source: StorageSource
    config: Optional[UserStorageConfig] = None

    @property
    def use_platform(self) -> bool:
        return self.source == "platform"


def inline_to_user_config(inline: InlineR2Storage | InlineS3Storage) -> UserStorageConfig:
    if isinstance(inline, InlineR2Storage):
        return UserStorageConfig(
            integration_id="inline",
            provider="R2",
            bucket_name=inline.bucket,
            public_url=inline.public_url,
            credentials={
                "accessKeyId": inline.access_key_id,
                "secretAccessKey": inline.secret_access_key,
                "accountId": inline.account_id,
                "publicUrl": inline.public_url or "",
            },
        )
    return UserStorageConfig(
        integration_id="inline",
        provider=inline.provider.upper(),
        bucket_name=inline.bucket,
        public_url=inline.public_url,
        credentials={
            "accessKeyId": inline.access_key_id,
            "secretAccessKey": inline.secret_access_key,
            "region": inline.region,
            "endpoint": inline.endpoint or "",
            "publicUrl": inline.public_url or "",
            "forcePathStyle": inline.force_path_style,
        },
    )


def resolve_job_storage(
    storage_req: Optional[VideoStorageRequest],
    user_id: Optional[str],
    *,
    is_master: bool = False,
) -> ResolvedStorage:
    """
    Priority:
      1. storage.inline — credentials on this request (any key)
      2. storage.integration_id — saved DB integration (chalk_* user key)
      3. master key (CLARITY_API_KEY) → platform .env R2
      4. chalk_* user's default saved integration (if any)
      5. else → error (no silent shared bucket for public keys)
    """
    if storage_req:
        if storage_req.inline:
            return ResolvedStorage("inline", inline_to_user_config(storage_req.inline))
        if storage_req.integration_id:
            if not user_id:
                raise ValueError(
                    "storage.integration_id requires a user API key (chalk_*). "
                    "Pass storage.inline instead, or use your chalk key."
                )
            cfg = get_storage_integration_for_user(user_id, storage_req.integration_id)
            if not cfg:
                raise ValueError(
                    "Storage integration not found or not owned by this API key."
                )
            return ResolvedStorage("integration", cfg)

    # Owner / master key → platform bucket from .env
    if is_master:
        return ResolvedStorage("platform", None)

    # Optional saved default (console storage UI is on hold, but API path kept)
    if user_id:
        cfg = get_active_storage_for_user(user_id)
        if cfg:
            return ResolvedStorage("integration", cfg)

    raise ValueError(NO_STORAGE_ERROR)
