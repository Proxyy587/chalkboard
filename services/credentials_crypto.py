"""Decrypt/encrypt storage credentials (AES-256-GCM + scrypt).

Wire format (must match Next.js `client/lib/crypto/storage.ts`):
  base64(iv) : base64(authTag) : base64(ciphertext)

Key derivation:
  scrypt(SECRET_ENCRYPTION_KEY, salt="clarity-storage-v1", N=16384, r=8, p=1, dklen=32)
"""

from __future__ import annotations

import base64
import hashlib
import json
import os
from typing import Any


def _derive_key() -> bytes:
    secret = os.getenv("SECRET_ENCRYPTION_KEY", "").encode("utf-8")
    if len(secret) < 32:
        raise RuntimeError(
            "SECRET_ENCRYPTION_KEY must be at least 32 characters "
            "(same value on Vercel and the VPS worker)."
        )
    return hashlib.scrypt(
        secret, salt=b"clarity-storage-v1", n=16384, r=8, p=1, dklen=32
    )


def decrypt_credentials(encrypted_data: str) -> dict[str, Any]:
    parts = encrypted_data.split(":")
    if len(parts) != 3:
        raise ValueError("Invalid encrypted data format")
    iv = base64.b64decode(parts[0])
    tag = base64.b64decode(parts[1])
    ciphertext = base64.b64decode(parts[2])
    if len(iv) != 12:
        raise ValueError("Invalid IV length")
    if len(tag) != 16:
        raise ValueError("Invalid auth tag length")

    from cryptography.hazmat.primitives.ciphers.aead import AESGCM

    plaintext = AESGCM(_derive_key()).decrypt(iv, ciphertext + tag, None)
    data = json.loads(plaintext.decode("utf-8"))
    if not isinstance(data, dict):
        raise ValueError("Decrypted credentials must be an object")
    return data


def encrypt_credentials(plaintext: dict[str, Any]) -> str:
    """Used for tests / tooling — production writes happen in Next.js."""
    import os as _os

    from cryptography.hazmat.primitives.ciphers.aead import AESGCM

    iv = _os.urandom(12)
    raw = json.dumps(plaintext, separators=(",", ":"), ensure_ascii=False).encode(
        "utf-8"
    )
    packed = AESGCM(_derive_key()).encrypt(iv, raw, None)  # ciphertext || tag
    ciphertext, tag = packed[:-16], packed[-16:]
    return ":".join(
        [
            base64.b64encode(iv).decode("ascii"),
            base64.b64encode(tag).decode("ascii"),
            base64.b64encode(ciphertext).decode("ascii"),
        ]
    )
