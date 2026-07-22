"""Decrypt storage credentials encrypted by the Next.js client (AES-256-GCM + scrypt)."""

from __future__ import annotations

import base64
import hashlib
import json
import os
from typing import Any

from cryptography.hazmat.primitives.ciphers.aead import AESGCM


def _derive_key() -> bytes:
    secret = os.getenv("SECRET_ENCRYPTION_KEY", "").encode("utf-8")
    if len(secret) < 32:
        raise RuntimeError("SECRET_ENCRYPTION_KEY must be at least 32 characters")
    # Match Node scryptSync(secret, "clarity-storage-v1", 32)
    return hashlib.scrypt(secret, salt=b"clarity-storage-v1", n=16384, r=8, p=1, dklen=32)


def decrypt_credentials(encrypted_data: str) -> dict[str, Any]:
    parts = encrypted_data.split(":")
    if len(parts) != 3:
        raise ValueError("Invalid encrypted data format")
    iv = base64.b64decode(parts[0])
    tag = base64.b64decode(parts[1])
    ciphertext = base64.b64decode(parts[2])
    key = _derive_key()
    aesgcm = AESGCM(key)
    # Node GCM: ciphertext + tag concatenated in final()
    plaintext = aesgcm.decrypt(iv, ciphertext + tag, None)
    return json.loads(plaintext.decode("utf-8"))
