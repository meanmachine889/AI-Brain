"""Redis-backed fixed-window rate limiting for the auth endpoints.

The unauthenticated auth routes (`/auth/google`, `/auth/refresh`,
`/auth/accept-invite`, `/auth/invite-preview`) are the brute-force / token-stuffing
surface: each call verifies a Google token, or guesses a refresh/invite token. We
throttle them per client IP.

Redis (already in the stack as the Celery broker) is the counter store, so the
limit is shared correctly across multiple uvicorn workers / horizontally scaled
API processes — an in-memory counter would be per-process and leaky.

The limiter **fails open**: if Redis is unreachable, a request is allowed (and the
error logged). A broker hiccup must not lock everyone out of login.
"""

from __future__ import annotations

import logging

from fastapi import Depends, HTTPException, Request
from redis.asyncio import Redis

from core.config import settings

logger = logging.getLogger(__name__)

_redis: Redis | None = None


def _get_redis() -> Redis:
    global _redis
    if _redis is None:
        # decode_responses so INCR returns an int-able str, not bytes
        _redis = Redis.from_url(settings.redis_url, decode_responses=True)
    return _redis


def _client_ip(request: Request) -> str:
    """Best-effort client IP. Behind a proxy/load balancer the real client is the
    first hop in X-Forwarded-For; fall back to the socket peer.

    NOTE: X-Forwarded-For is client-spoofable unless a trusted proxy overwrites
    it. In prod, terminate TLS at a proxy you control that sets this header.
    """
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


class RateLimiter:
    """FastAPI dependency: allow `times` requests per `seconds` window per IP.

    Each instance uses its own Redis key namespace (`bucket`), so endpoints get
    independent counters — hammering invite-preview won't lock out login.
    """

    def __init__(self, times: int, seconds: int, bucket: str):
        self.times = times
        self.seconds = seconds
        self.bucket = bucket

    async def __call__(self, request: Request) -> None:
        if not settings.rate_limit_enabled:
            return

        key = f"rl:{self.bucket}:{_client_ip(request)}"
        try:
            redis = _get_redis()
            # Atomic: increment the counter and (on the first hit of a window) set
            # its TTL. Subsequent hits in the same window reuse the existing TTL.
            async with redis.pipeline(transaction=True) as pipe:
                pipe.incr(key)
                pipe.ttl(key)
                count, ttl = await pipe.execute()
            if ttl < 0:  # key had no expiry yet (just created, or EXPIRE lost)
                await redis.expire(key, self.seconds)
                ttl = self.seconds
        except Exception:  # fail open — never let a Redis problem block auth
            logger.warning("rate limiter unavailable; allowing request", exc_info=True)
            return

        if count > self.times:
            raise HTTPException(
                status_code=429,
                detail="Too many requests. Please slow down and try again shortly.",
                headers={"Retry-After": str(max(ttl, 1))},
            )


def auth_rate_limit(bucket: str) -> Depends:
    """Build an auth-endpoint limiter dependency for the given bucket name."""
    return Depends(
        RateLimiter(
            times=settings.auth_rate_limit_times,
            seconds=settings.auth_rate_limit_window_seconds,
            bucket=bucket,
        )
    )
