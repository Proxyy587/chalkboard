"""Resolve per-job upload destination from API request + user account."""

from __future__ import annotations

from typing import Optional

from schema.storage import InlineR2Storage, InlineS3Storage, VideoStorageRequest
from services.user_storage import (
    UserStorageConfig,
    get_active_storage_for_user,
    get_storage_integration_for_user,
)


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
) -> Optional[UserStorageConfig]:
    if storage_req:
        if storage_req.inline:
            return inline_to_user_config(storage_req.inline)
        if storage_req.integration_id:
            if not user_id:
                raise ValueError("storage.integration_id requires a user API key (chalk_*).")
            cfg = get_storage_integration_for_user(user_id, storage_req.integration_id)
            if not cfg:
                raise ValueError("Storage integration not found or not owned by this API key.")
            return cfg

    if user_id:
        return get_active_storage_for_user(user_id)
    return None
