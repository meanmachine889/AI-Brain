from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import NullPool
from core.config import settings

# NullPool: don't cache/reuse connections across event loops. The Celery workers
# call asyncio.run() per task (a fresh loop each time), and asyncpg connections are
# bound to the loop that created them — a pooled connection from one task's loop
# would blow up when reused in the next ("attached to a different loop"). NullPool
# opens a fresh connection per session and closes it, so nothing crosses loops.
engine = create_async_engine(
    settings.database_url, echo=False, future=True, poolclass=NullPool
)

async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db():
    """FastAPI dependency — yields a session per request."""
    async with async_session() as session:
        yield session
