"""Generation quotas for chalk_* API keys (shared Neon DB).

FREE / unknown  → 3 / UTC day
STUDENT / HOBBY → 40 / UTC month (Hobby)
PRO             → 80 / UTC month
OWNER / ENTERPRISE / CREATOR → unlimited
"""

from __future__ import annotations

import os
import secrets
from datetime import datetime, timezone
from typing import Optional

try:
    import psycopg
except ImportError:  # pragma: no cover
    psycopg = None  # type: ignore

FREE_DAILY_LIMIT = int(os.getenv("FREE_DAILY_VIDEO_LIMIT", "3"))
HOBBY_MONTHLY_LIMIT = int(os.getenv("HOBBY_MONTHLY_VIDEO_LIMIT", "40"))
PRO_MONTHLY_LIMIT = int(os.getenv("PRO_MONTHLY_VIDEO_LIMIT", "80"))

UNLIMITED_PLANS = {"OWNER", "ENTERPRISE", "CREATOR"}


def _utc_day() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _utc_month() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m")


def plan_is_unlimited(plan: Optional[str]) -> bool:
    if not plan:
        return False
    return plan.upper() in UNLIMITED_PLANS


def plan_quota(plan: Optional[str]) -> tuple[str, int, str]:
    """
    Returns (window_kind, limit, window_key).
    window_kind is 'day' or 'month'.
    """
    p = (plan or "FREE").upper()
    if p in UNLIMITED_PLANS:
        return "day", 10**9, _utc_day()
    if p in {"PRO"}:
        return "month", PRO_MONTHLY_LIMIT, _utc_month()
    if p in {"STUDENT", "HOBBY"}:
        return "month", HOBBY_MONTHLY_LIMIT, _utc_month()
    return "day", FREE_DAILY_LIMIT, _utc_day()


def plan_wants_watermark(plan: Optional[str]) -> bool:
    p = (plan or "FREE").upper()
    return p not in {"PRO", "STUDENT", "HOBBY", "OWNER", "ENTERPRISE", "CREATOR"}


def plan_max_height(plan: Optional[str]) -> int:
    """720 for free tier, 1080 otherwise."""
    return 720 if plan_wants_watermark(plan) else 1080


def check_and_consume_api_key_daily(api_key_id: str, plan: str) -> tuple[bool, str]:
    """
    Atomically increment usage for a chalk_* key (daily or monthly by plan).
    Returns (ok, error_message). Unlimited plans always succeed.
    """
    if plan_is_unlimited(plan):
        return True, ""

    dsn = os.getenv("DATABASE_URL", "").strip()
    if not dsn or psycopg is None:
        return False, "Quota service unavailable. Try again later."

    kind, limit, window = plan_quota(plan)
    subject = f"key:{api_key_id}"
    new_id = f"cq_{secrets.token_hex(12)}"
    period_label = "day" if kind == "day" else "month"
    err_msg = (
        f"Limit reached ({limit} videos / {period_label} on this plan)."
        if kind == "day"
        else f"Monthly limit reached ({limit} renders / month on this plan)."
    )

    try:
        with psycopg.connect(dsn) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT count FROM generation_quotas
                    WHERE subject = %s AND window = %s
                    LIMIT 1
                    """,
                    (subject, window),
                )
                existing = cur.fetchone()
                if existing and int(existing[0]) >= limit:
                    return False, err_msg
                if existing:
                    cur.execute(
                        """
                        UPDATE generation_quotas
                        SET count = count + 1, updated_at = NOW()
                        WHERE subject = %s AND window = %s AND count < %s
                        RETURNING count
                        """,
                        (subject, window, limit),
                    )
                else:
                    cur.execute(
                        """
                        INSERT INTO generation_quotas
                          (id, subject, window, count, created_at, updated_at)
                        VALUES (%s, %s, %s, 1, NOW(), NOW())
                        ON CONFLICT (subject, window)
                        DO UPDATE SET
                          count = generation_quotas.count + 1,
                          updated_at = NOW()
                        WHERE generation_quotas.count < %s
                        RETURNING count
                        """,
                        (new_id, subject, window, limit),
                    )
                row = cur.fetchone()
                conn.commit()
                if not row:
                    return False, err_msg
                return True, ""
    except Exception as exc:
        return False, f"Quota check failed: {exc}"
