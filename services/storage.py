import os
from datetime import datetime, timezone
from typing import Optional
from urllib.parse import urlparse

import boto3
from botocore.client import Config

from services.user_storage import UserStorageConfig


def r2_config_status() -> dict:
    """Return which R2 env vars are present (no secret values)."""
    account_id = bool(os.getenv("R2_ACCOUNT_ID"))
    bucket = bool(os.getenv("R2_BUCKET_NAME") or os.getenv("AWS_BUCKET_NAME"))
    access_key = bool(os.getenv("R2_ACCESS_KEY_ID") or os.getenv("AWS_ACCESS_KEY_ID"))
    secret_key = bool(os.getenv("R2_SECRET_ACCESS_KEY") or os.getenv("AWS_SECRET_ACCESS_KEY"))
    public_base = bool(os.getenv("R2_PUBLIC_BASE_URL"))
    endpoint = bool(
        os.getenv("R2_ENDPOINT_URL")
        or os.getenv("AWS_ENDPOINT_URL_S3")
        or os.getenv("R2_ACCOUNT_ID")
    )
    ready = all([bucket, access_key, secret_key, public_base, endpoint])
    return {
        "ready": ready,
        "has_account_id": account_id,
        "has_bucket": bucket,
        "has_access_key": access_key,
        "has_secret_key": secret_key,
        "has_public_base": public_base,
        "has_endpoint": endpoint,
    }


def _resolve_r2_settings() -> tuple[str, str, str, str, str]:
    account_id = os.getenv("R2_ACCOUNT_ID")
    bucket = os.getenv("R2_BUCKET_NAME") or os.getenv("AWS_BUCKET_NAME")
    access_key = os.getenv("R2_ACCESS_KEY_ID") or os.getenv("AWS_ACCESS_KEY_ID")
    secret_key = os.getenv("R2_SECRET_ACCESS_KEY") or os.getenv("AWS_SECRET_ACCESS_KEY")
    public_base = os.getenv("R2_PUBLIC_BASE_URL")
    endpoint_url = os.getenv("R2_ENDPOINT_URL") or os.getenv("AWS_ENDPOINT_URL_S3")
    if not endpoint_url and account_id:
        endpoint_url = f"https://{account_id}.r2.cloudflarestorage.com"

    if not all([bucket, access_key, secret_key, public_base, endpoint_url]):
        raise RuntimeError(
            "Platform storage is not configured on this server. Missing R2/S3 env vars "
            "(R2_BUCKET_NAME, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PUBLIC_BASE_URL, "
            "and AWS_ENDPOINT_URL_S3 or R2_ACCOUNT_ID)."
        )

    parsed = urlparse(endpoint_url)
    endpoint_url = f"{parsed.scheme}://{parsed.netloc}"
    return bucket, access_key, secret_key, public_base, endpoint_url


def _s3_client_from_user(cfg: UserStorageConfig):
    creds = cfg.credentials
    provider = cfg.provider.upper()
    force_path = bool(creds.get("forcePathStyle") or creds.get("force_path_style"))

    if provider == "R2":
        account_id = creds.get("accountId") or creds.get("account_id")
        if not account_id:
            raise RuntimeError("R2 storage requires accountId / account_id.")
        endpoint = f"https://{account_id}.r2.cloudflarestorage.com"
        region = "auto"
        force_path = False
    elif provider == "UPLOADTHING":
        raise RuntimeError(
            "UploadThing uploads are not available on the public API yet. "
            "Use R2, S3, MinIO, Backblaze, or custom_s3 with storage.inline."
        )
    else:
        endpoint = creds.get("endpoint") or creds.get("endpointUrl")
        region = creds.get("region") or "us-east-1"
        if not endpoint and provider in {"MINIO", "CUSTOM_S3", "BACKBLAZE"}:
            raise RuntimeError(f"{provider} storage requires an endpoint URL.")

    client = boto3.client(
        "s3",
        endpoint_url=endpoint or None,
        aws_access_key_id=creds.get("accessKeyId") or creds.get("access_key_id"),
        aws_secret_access_key=creds.get("secretAccessKey") or creds.get("secret_access_key"),
        config=Config(
            signature_version="s3v4",
            s3={"addressing_style": "path" if force_path else "auto"},
        ),
        region_name=region,
    )
    public_base = cfg.public_url or creds.get("publicUrl") or creds.get("public_url")
    return client, cfg.bucket_name, public_base


def _upload_with_s3_client(
    client,
    bucket: str,
    public_base: Optional[str],
    file_path: str,
    object_key: str,
    log=print,
) -> str:
    content_type = "video/mp4" if file_path.lower().endswith(".mp4") else "application/octet-stream"
    size_mb = os.path.getsize(file_path) / (1024 * 1024)
    log(f"  ☁️ Uploading {size_mb:.1f} MB → s3://{bucket}/{object_key}")
    client.upload_file(
        file_path,
        bucket,
        object_key,
        ExtraArgs={"ContentType": content_type},
    )
    if public_base:
        url = f"{public_base.rstrip('/')}/{object_key}"
    else:
        url = f"s3://{bucket}/{object_key}"
    log(f"  ☁️ Public URL: {url}")
    return url


def upload_to_r2(
    file_path: str,
    object_key: str | None = None,
    log=print,
    user_id: str | None = None,
    storage_override: UserStorageConfig | None = None,
    use_platform_storage: bool = False,
) -> str:
    """
    Upload a finished video.

    - storage_override: user inline / saved integration (no env fallback)
    - use_platform_storage: master key → server .env R2 only
    """
    del user_id  # reserved; destination is fully decided before upload

    if not os.path.isfile(file_path):
        raise FileNotFoundError(f"Cannot upload missing file: {file_path}")

    if not object_key:
        filename = os.path.basename(file_path)
        stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
        object_key = f"videos/{stamp}-{filename}"

    if object_key.startswith("videos/local"):
        stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
        object_key = f"videos/{stamp}-{os.path.basename(file_path)}"

    if storage_override:
        if storage_override.provider.upper() == "UPLOADTHING":
            raise RuntimeError(
                "UploadThing is not supported for API uploads yet. "
                "Use R2 / S3-compatible storage.inline."
            )
        try:
            client, bucket, public_base = _s3_client_from_user(storage_override)
            label = (
                "inline"
                if storage_override.integration_id == "inline"
                else storage_override.integration_id
            )
            log(f"  📦 Uploading to user storage ({label})")
            return _upload_with_s3_client(
                client, bucket, public_base, file_path, object_key, log=log
            )
        except Exception as e:
            raise RuntimeError(f"User storage upload failed: {e}") from e

    if use_platform_storage:
        log("  📦 Uploading to platform storage (.env R2)")
        bucket, access_key, secret_key, public_base, endpoint_url = _resolve_r2_settings()
        client = boto3.client(
            "s3",
            endpoint_url=endpoint_url,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            config=Config(signature_version="s3v4"),
            region_name="auto",
        )
        return _upload_with_s3_client(
            client, bucket, public_base, file_path, object_key, log=log
        )

    raise RuntimeError(
        "No storage destination for this job. Pass storage.inline or use the master key."
    )
