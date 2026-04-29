import os
from datetime import datetime, timezone
from urllib.parse import urlparse

import boto3
from botocore.client import Config


def upload_to_r2(file_path: str, object_key: str | None = None) -> str:
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
            "Missing R2/S3 env vars. Required: R2_BUCKET_NAME (or AWS_BUCKET_NAME), "
            "R2_ACCESS_KEY_ID (or AWS_ACCESS_KEY_ID), "
            "R2_SECRET_ACCESS_KEY (or AWS_SECRET_ACCESS_KEY), "
            "R2_PUBLIC_BASE_URL, and R2_ENDPOINT_URL (or AWS_ENDPOINT_URL_S3 or R2_ACCOUNT_ID)."
        )

    # If endpoint was provided as "...cloudflarestorage.com/<bucket>",
    # normalize to the base host endpoint required by boto3.
    parsed = urlparse(endpoint_url)
    endpoint_url = f"{parsed.scheme}://{parsed.netloc}"

    if not object_key:
        filename = os.path.basename(file_path)
        stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
        object_key = f"videos/{stamp}-{filename}"

    client = boto3.client(
        "s3",
        endpoint_url=endpoint_url,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        config=Config(signature_version="s3v4"),
        region_name="auto",
    )

    content_type = "video/mp4" if file_path.lower().endswith(".mp4") else "application/octet-stream"
    client.upload_file(
        file_path,
        bucket,
        object_key,
        ExtraArgs={"ContentType": content_type},
    )

    return f"{public_base.rstrip('/')}/{object_key}"
