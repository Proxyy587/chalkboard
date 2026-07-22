"""Validate user API keys against the shared Postgres database (Prisma schema)."""

from __future__ import annotations

import hashlib
import os
from dataclasses import dataclass
from typing import Optional

try:
    import psycopg
except ImportError:  # pragma: no cover
    psycopg = None  # type: ignore


@dataclass
class AuthContext:
    api_key_id: str
    user_id: str
    plan: str


def _hash_key(key: str) -> str:
    return hashlib.sha256(key.strip().encode("utf-8")).hexdigest()


def is_user_api_key(key: str) -> bool:
    return key.startswith("chalk_") and "_sk_v1_" in key


def validate_user_api_key(key: str, client_ip: Optional[str] = None) -> Optional[AuthContext]:
    """
    Look up chalk_* API key in api_keys table.
    Returns None if invalid. Updates last_used_at best-effort.
    """
    if not key or not is_user_api_key(key):
        return None
    dsn = os.getenv("DATABASE_URL", "").strip()
    if not dsn or psycopg is None:
        return None

    key_hash = _hash_key(key)
    try:
        with psycopg.connect(dsn) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT id, user_id, plan
                    FROM api_keys
                    WHERE key_hash = %s
                      AND is_active = true
                      AND revoked_at IS NULL
                      AND (expires_at IS NULL OR expires_at > NOW())
                    LIMIT 1
                    """,
                    (key_hash,),
                )
                row = cur.fetchone()
                if not row:
                    return None
                api_key_id, user_id, plan = row[0], row[1], row[2]
                cur.execute(
                    """
                    UPDATE api_keys
                    SET last_used_at = NOW(),
                        usage_count = usage_count + 1,
                        last_used_ip = COALESCE(%s, last_used_ip)
                    WHERE id = %s
                    """,
                    (client_ip, api_key_id),
                )
            conn.commit()
        return AuthContext(api_key_id=str(api_key_id), user_id=str(user_id), plan=str(plan))
    except Exception:
        return None
