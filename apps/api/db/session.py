from sqlalchemy import event, text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import Session as SyncSession
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
# set_principal_context(). Falls back to the owner URL if APP_DATABASE_URL is unset
# (local dev without a separate role) — in which case RLS is effectively bypassed.
app_engine = create_async_engine(
    settings.app_database_url or settings.database_url,
    echo=False,
    future=True,
    poolclass=NullPool,
)
app_session = async_sessionmaker(app_engine, class_=AsyncSession, expire_on_commit=False)


def _apply_rls_guc(session: SyncSession, transaction, connection) -> None:
    """Re-apply the RLS GUCs at the start of every transaction.

    A session-level GUC (set_config(..., false)) does NOT survive a COMMIT here, so
    after any mid-request commit the scope would be lost. We stash the principal on
    session.info and reapply it on each `after_begin` (including the fresh
    transaction that starts after a commit). No-op for sessions that never set a
    principal (e.g. the Celery workers, which run as the RLS-bypassing owner role).
    """
    agency_id = session.info.get("agency_id")
    if not agency_id:
        return
    connection.execute(
        text(
            "SELECT set_config('app.current_agency_id', :aid, false), "
            "       set_config('app.current_member_id', :mid, false)"
        ),
        {"aid": agency_id, "mid": session.info.get("member_id") or ""},
    )


event.listen(SyncSession, "after_begin", _apply_rls_guc)


async def set_principal_context(
    session: AsyncSession, agency_id: str, member_id: str | None = None
) -> None:
    """Scope a request session's queries to one principal for RLS.

    `app.current_agency_id` scopes to the tenant; `app.current_member_id` is the
    empty string for owners (see all agency clients) or the member id for non-owners
    (see only their ClientMember clients). Both are ALWAYS set together so policies
    never fail open. The principal is stashed on session.info so _apply_rls_guc can
    reapply it after mid-request commits; we also apply it to the current (already
    open) transaction now.
    """
    session.info["agency_id"] = agency_id
    session.info["member_id"] = member_id or ""
    await session.execute(
        text(
            "SELECT set_config('app.current_agency_id', :aid, false), "
            "       set_config('app.current_member_id', :mid, false)"
        ),
        {"aid": agency_id, "mid": member_id or ""},
    )


async def get_db():
    """FastAPI dependency — yields a request-scoped session on the restricted role."""
    async with app_session() as session:
        yield session


async def get_owner_db():
    """System/identity session on the owner role (bypasses RLS). For auth/onboarding
    endpoints that run BEFORE any principal scope exists (Google sign-in, create
    agency, invite preview/accept) — they enforce their own checks (token hash,
    email match, onboarding token) instead of relying on RLS."""
    async with async_session() as session:
        yield session
