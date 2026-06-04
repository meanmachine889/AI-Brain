from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import NullPool
from core.config import settings

# NullPool: don't cache/reuse connections across event loops. The Celery workers
# call asyncio.run() per task (a fresh loop each time), and asyncpg connections are
# bound to the loop that created them — a pooled connection from one task's loop
# would blow up when reused in the next ("attached to a different loop"). NullPool
# opens a fresh connection per session and closes it, so nothing crosses loops.

# Owner-role engine: used by the Celery workers (cross-tenant by design) and by
# Alembic. As the table owner this role BYPASSES row-level security.
engine = create_async_engine(
    settings.database_url, echo=False, future=True, poolclass=NullPool
)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

# Restricted-role engine: used by the API request path. This role is subject to
# RLS, so every request must scope the session to the authenticated agency via
# set_agency_context(). Falls back to the owner URL if APP_DATABASE_URL is unset
# (local dev without a separate role) — in which case RLS is effectively bypassed.
app_engine = create_async_engine(
    settings.app_database_url or settings.database_url,
    echo=False,
    future=True,
    poolclass=NullPool,
)
app_session = async_sessionmaker(app_engine, class_=AsyncSession, expire_on_commit=False)


async def set_agency_context(session: AsyncSession, agency_id: str) -> None:
    """Scope a request session's queries to one agency for RLS.

    Uses a session-level GUC (is_local=false) so it survives the commits that
    endpoints do mid-request; the NullPool connection is discarded at request end,
    so it never leaks to another request. RLS policies read this via
    current_setting('app.current_agency_id', true).
    """
    await session.execute(
        text("SELECT set_config('app.current_agency_id', :aid, false)"),
        {"aid": agency_id},
    )


async def get_db():
    """FastAPI dependency — yields a request-scoped session on the restricted role."""
    async with app_session() as session:
        yield session
