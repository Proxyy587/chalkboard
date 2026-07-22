"""Load user storage integration from Postgres for per-user uploads."""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Optional

try:
    import psycopg
except ImportError:  # pragma: no cover
    psycopg = None  # type: ignore

from services.credentials_crypto import decrypt_credentials


@dataclass
class UserStorageConfig:
    integration_id: str
    provider: str
    bucket_name: str
    public_url: Optional[str]
    credentials: dict


def get_active_storage_for_user(user_id: str) -> Optional[UserStorageConfig]:
    return get_storage_integration_for_user(user_id, integration_id=None)


def get_storage_integration_for_user(
    user_id: str,
    integration_id: Optional[str] = None,
) -> Optional[UserStorageConfig]:
    dsn = os.getenv("DATABASE_URL", "").strip()
    if not dsn or psycopg is None or not user_id:
        return None
    try:
        with psycopg.connect(dsn) as conn:
            with conn.cursor() as cur:
                if integration_id:
                    cur.execute(
                        """
                        SELECT id, provider, bucket_name, public_url, encrypted_config
                        FROM storage_integrations
                        WHERE user_id = %s AND id = %s AND is_active = true
                        LIMIT 1
                        """,
                        (user_id, integration_id),
                    )
                else:
                    cur.execute(
                        """
                        SELECT id, provider, bucket_name, public_url, encrypted_config
                        FROM storage_integrations
                        WHERE user_id = %s AND is_active = true
                        ORDER BY is_verified DESC, created_at DESC
                        LIMIT 1
                        """,
                        (user_id,),
                    )
                row = cur.fetchone()
                if not row:
                    return None
                creds = decrypt_credentials(row[4])
                return UserStorageConfig(
                    integration_id=str(row[0]),
                    provider=str(row[1]),
                    bucket_name=str(row[2]),
                    public_url=row[3],
                    credentials=creds,
                )
    except Exception:
        return None
