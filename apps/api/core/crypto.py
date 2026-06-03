"""Application-layer encryption for secrets at rest (OAuth access/refresh tokens).

Design goals:
- Key lives OUTSIDE the database (TOKEN_ENCRYPTION_KEYS env, from a secrets
  manager in prod). A DB-only breach therefore yields useless ciphertext.
- Authenticated encryption (Fernet = AES-128-CBC + HMAC) so tampering is detected.
- Key rotation built in via MultiFernet: encrypt with the newest key, decrypt with
  any key still listed. Rotate by prepending a new key, re-encrypting, then dropping
  the old one.
- Ciphertext is tagged with a version prefix (`v1:`) so we can later migrate the
  scheme (e.g. to KMS-backed envelope encryption) gradually, without a schema change.

Generate a key:
    uv run python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
"""

from cryptography.fernet import Fernet, MultiFernet

from core.config import settings

# Bump this if the encryption scheme changes; decrypt() branches on it.
_VERSION = "v1"
_PREFIX = _VERSION + ":"

_cipher: MultiFernet | None = None


def _get_cipher() -> MultiFernet:
    """Build (once) the MultiFernet from configured keys. Newest key must be first."""
    global _cipher
    if _cipher is None:
        keys = settings.token_encryption_key_list
        if not keys:
            raise RuntimeError(
                "TOKEN_ENCRYPTION_KEYS is not set — cannot encrypt/decrypt secrets. "
                "Generate one with Fernet.generate_key()."
            )
        _cipher = MultiFernet([Fernet(k.encode()) for k in keys])
    return _cipher


def is_encrypted(value: str) -> bool:
    return value.startswith(_PREFIX)


def encrypt(plaintext: str) -> str:
    """Encrypt a string, returning version-tagged ciphertext."""
    token = _get_cipher().encrypt(plaintext.encode()).decode()
    return _PREFIX + token


def decrypt(value: str) -> str:
    """Decrypt a version-tagged ciphertext.

    Legacy plaintext (written before encryption was introduced, i.e. without the
    version prefix) is returned as-is. This keeps reads safe during/after the
    backfill migration; once backfilled, every stored value carries the prefix.
    """
    if not is_encrypted(value):
        return value
    token = value[len(_PREFIX):]
    return _get_cipher().decrypt(token.encode()).decode()
