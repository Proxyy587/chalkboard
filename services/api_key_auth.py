"""Validate user API keys against the shared Postgres database (Prisma schema).

Plan is ALWAYS taken from the account (user.plan), never a stale key.plan
snapshot — upgrading Hobby/Pro upgrades every key immediately.
"""

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


def _normalize_account_plan(website_plan: Optional[str], key_plan: Optional[str]) -> str:
    """Map User.plan (FREE|HOBBY|PRO|OWNER) → quota plan ids."""
    p = (website_plan or key_plan or "FREE").upper().strip()
    if p in {"OWNER", "ENTERPRISE", "CREATOR"}:
        return p
    if p == "PRO":
        return "PRO"
    if p in {"HOBBY", "STUDENT"}:
        return "HOBBY"
    return "FREE"


def _key_plan_cache(account_plan: str) -> str:
    """ApiKeyPlan enum values stored on the row (cache only)."""
    if account_plan in {"OWNER", "ENTERPRISE", "CREATOR"}:
        return "OWNER" if account_plan == "OWNER" else account_plan
    if account_plan == "PRO":
        return "PRO"
    if account_plan == "HOBBY":
        return "STUDENT"
    return "FREE"


def validate_user_api_key(key: str, client_ip: Optional[str] = None) -> Optional[AuthContext]:
    """
    Look up chalk_* API key joined to the owning account.
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
                    SELECT k.id, k.user_id, k.plan, u.plan AS account_plan
                    FROM api_keys k
                    INNER JOIN "user" u ON u.id = k.user_id
                    WHERE k.key_hash = %s
                      AND k.is_active = true
                      AND k.revoked_at IS NULL
                      AND (k.expires_at IS NULL OR k.expires_at > NOW())
                    LIMIT 1
                    """,
                    (key_hash,),
                )
                row = cur.fetchone()
                if not row:
                    return None
                api_key_id, user_id, key_plan, account_plan = (
                    row[0],
                    row[1],
                    row[2],
                    row[3],
                )
                plan = _normalize_account_plan(
                    str(account_plan) if account_plan else None,
                    str(key_plan) if key_plan else None,
                )
                cache = _key_plan_cache(plan)

                cur.execute(
                    """
                    UPDATE api_keys
                    SET last_used_at = NOW(),
                        usage_count = usage_count + 1,
                        last_used_ip = COALESCE(%s, last_used_ip),
                        plan = %s
                    WHERE id = %s
                    """,
                    (client_ip, cache, api_key_id),
                )
            conn.commit()
        return AuthContext(
            api_key_id=str(api_key_id),
            user_id=str(user_id),
            plan=plan,
        )
    except Exception:
        return None
