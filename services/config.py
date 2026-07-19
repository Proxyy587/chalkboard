"""Runtime environment helpers (local vs VPS storage policy)."""

from __future__ import annotations

import os
import shutil
from typing import Iterable, Optional


def clarity_env() -> str:
    """
    Where the service is running.
    Set CLARITY_ENV=local | vps | production
    (aliases: server, cloud → vps)
    """
    raw = (os.getenv("CLARITY_ENV") or "local").strip().lower()
    if raw in {"vps", "production", "prod", "server", "cloud"}:
        return "vps"
    return "local"


def keep_local_outputs() -> bool:
    """
    Whether to retain rendered files under the work dir after a job finishes.

    Defaults:
      - local → keep (True)
      - vps   → delete after upload / job end (False)

    Override with KEEP_LOCAL_OUTPUTS=true|false
    """
    override = os.getenv("KEEP_LOCAL_OUTPUTS")
    if override is not None and override.strip() != "":
        return override.strip().lower() in {"1", "true", "yes", "on"}
    return clarity_env() == "local"


def work_root() -> str:
    """
    Root directory for ephemeral job folders.
    Override with CLARITY_WORK_DIR.
    On VPS defaults to /tmp/clarity-jobs so bind-mounted ./outputs is unused.
    """
    custom = os.getenv("CLARITY_WORK_DIR")
    if custom and custom.strip():
        return custom.strip()
    if not keep_local_outputs():
        return "/tmp/clarity-jobs"
    return "outputs"


def job_work_dir(job_id: str) -> str:
    safe = (job_id or "job").replace("/", "-").replace("..", "")
    path = os.path.join(work_root(), safe)
    os.makedirs(path, exist_ok=True)
    return path


def cleanup_paths(paths: Iterable[Optional[str]], log=print) -> None:
    """Best-effort delete of files/dirs. Never raises."""
    for path in paths:
        if not path:
            continue
        try:
            if os.path.isdir(path):
                shutil.rmtree(path, ignore_errors=True)
                log(f"  🧹 Removed dir {path}")
            elif os.path.isfile(path):
                os.remove(path)
                log(f"  🧹 Removed file {path}")
        except Exception as e:
            log(f"  ⚠️ Cleanup skipped for {path}: {e}")


def cleanup_job_dir(job_dir: Optional[str], log=print) -> None:
    """Delete an entire per-job work directory when local retention is off."""
    if keep_local_outputs():
        return
    if not job_dir:
        return
    cleanup_paths([job_dir], log=log)


def storage_policy() -> dict:
    return {
        "clarity_env": clarity_env(),
        "keep_local_outputs": keep_local_outputs(),
        "work_root": work_root(),
    }
