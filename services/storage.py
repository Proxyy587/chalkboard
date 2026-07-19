import os
from datetime import datetime, timezone
from urllib.parse import urlparse

import boto3
from botocore.client import Config


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
            "Missing R2/S3 env vars. Required: R2_BUCKET_NAME, R2_ACCESS_KEY_ID, "
            "R2_SECRET_ACCESS_KEY, R2_PUBLIC_BASE_URL, and AWS_ENDPOINT_URL_S3 "
            "(or R2_ACCOUNT_ID). Check docker-compose env_file / .env on the VPS."
        )

    parsed = urlparse(endpoint_url)
    endpoint_url = f"{parsed.scheme}://{parsed.netloc}"
    return bucket, access_key, secret_key, public_base, endpoint_url


def upload_to_r2(file_path: str, object_key: str | None = None, log=print) -> str:
    if not os.path.isfile(file_path):
        raise FileNotFoundError(f"Cannot upload missing file: {file_path}")

    bucket, access_key, secret_key, public_base, endpoint_url = _resolve_r2_settings()

    if not object_key:
        filename = os.path.basename(file_path)
        stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
        object_key = f"videos/{stamp}-{filename}"

    if object_key.startswith("videos/local"):
        stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
        object_key = f"videos/{stamp}-{os.path.basename(file_path)}"

    client = boto3.client(
        "s3",
        endpoint_url=endpoint_url,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        config=Config(signature_version="s3v4"),
        region_name="auto",
    )

    content_type = "video/mp4" if file_path.lower().endswith(".mp4") else "application/octet-stream"
    size_mb = os.path.getsize(file_path) / (1024 * 1024)
    log(f"  ☁️ Uploading {size_mb:.1f} MB → s3://{bucket}/{object_key}")
    client.upload_file(
        file_path,
        bucket,
        object_key,
        ExtraArgs={"ContentType": content_type},
    )
    url = f"{public_base.rstrip('/')}/{object_key}"
    log(f"  ☁️ Public URL: {url}")
    return url
