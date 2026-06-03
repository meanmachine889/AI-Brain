"""Custom SQLAlchemy column types."""

from sqlalchemy.types import Text, TypeDecorator

from core.crypto import decrypt, encrypt


class EncryptedString(TypeDecorator):
    """A Text column that is transparently encrypted at rest.

    Encryption happens at the ORM boundary, so all read/write sites use the column
    as a normal string — no scattered encrypt/decrypt calls to forget. Stored as
    version-tagged ciphertext (see core.crypto).
    """

    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        return encrypt(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        return decrypt(value)
