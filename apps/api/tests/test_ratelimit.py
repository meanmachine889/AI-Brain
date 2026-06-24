"""Tests for the Redis-backed auth rate limiter (core.ratelimit).

Uses a fake in-memory async Redis (with TTL semantics) injected via _get_redis,
so no live Redis is needed. Covers: the (times+1)th call in a window trips 429,
buckets/IPs are independent, the window resets after TTL, and Redis failures
fail open (request allowed).
"""

import asyncio

import pytest
from fastapi import HTTPException

import core.ratelimit as rl  # noqa: E402
from core.config import settings
from core.ratelimit import RateLimiter


class FakeRedis:
    """Minimal async Redis stand-in: INCR + EXPIRE/TTL, pipeline support."""

    def __init__(self):
        self.counts: dict[str, int] = {}
        self.ttls: dict[str, int] = {}
        self.fail = False

    def _check(self):
        if self.fail:
            raise ConnectionError("redis down")

    async def expire(self, key, seconds):
        self._check()
        self.ttls[key] = seconds

    def pipeline(self, transaction=True):
        return _FakePipeline(self)

    # test helpers
    def advance_window(self, key):
        """Simulate the TTL elapsing: the key (and its counter) expire."""
        self.counts.pop(key, None)
        self.ttls.pop(key, None)


class _FakePipeline:
    def __init__(self, redis: FakeRedis):
        self.redis = redis
        self.ops = []

    def incr(self, key):
        self.ops.append(("incr", key))

    def ttl(self, key):
        self.ops.append(("ttl", key))

    async def execute(self):
        self.redis._check()
        results = []
        for op, key in self.ops:
            if op == "incr":
                self.redis.counts[key] = self.redis.counts.get(key, 0) + 1
                results.append(self.redis.counts[key])
            elif op == "ttl":
                results.append(self.redis.ttls.get(key, -1))
        return results

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False


class FakeRequest:
    def __init__(self, ip="1.2.3.4", forwarded=None):
        headers = {}
        if forwarded:
            headers["x-forwarded-for"] = forwarded
        self.headers = headers
        self.client = type("C", (), {"host": ip})()


@pytest.fixture
def fake_redis(monkeypatch):
    r = FakeRedis()
    monkeypatch.setattr(rl, "_get_redis", lambda: r)
    monkeypatch.setattr(settings, "rate_limit_enabled", True)
    return r


def _hit(limiter, request):
    """Call the limiter (synchronously, via asyncio.run); True if allowed, False if 429."""

    async def _call():
        await limiter(request)

    try:
        asyncio.run(_call())
        return True
    except HTTPException as e:
        assert e.status_code == 429
        assert e.headers.get("Retry-After")
        return False


def test_allows_up_to_limit_then_blocks(fake_redis):
    limiter = RateLimiter(times=3, seconds=60, bucket="b")
    req = FakeRequest()
    assert _hit(limiter, req) is True
    assert _hit(limiter, req) is True
    assert _hit(limiter, req) is True
    # 4th call in the window trips the limit
    assert _hit(limiter, req) is False


def test_different_ips_are_independent(fake_redis):
    limiter = RateLimiter(times=1, seconds=60, bucket="b")
    assert _hit(limiter, FakeRequest(ip="1.1.1.1")) is True
    assert _hit(limiter, FakeRequest(ip="1.1.1.1")) is False
    # a different IP gets its own fresh counter
    assert _hit(limiter, FakeRequest(ip="2.2.2.2")) is True


def test_different_buckets_are_independent(fake_redis):
    a = RateLimiter(times=1, seconds=60, bucket="login")
    b = RateLimiter(times=1, seconds=60, bucket="refresh")
    req = FakeRequest()
    assert _hit(a, req) is True
    assert _hit(a, req) is False
    # exhausting one bucket does not affect another
    assert _hit(b, req) is True


def test_window_resets_after_ttl(fake_redis):
    limiter = RateLimiter(times=1, seconds=60, bucket="b")
    req = FakeRequest()
    assert _hit(limiter, req) is True
    assert _hit(limiter, req) is False
    # window elapses -> counter cleared -> allowed again
    fake_redis.advance_window("rl:b:1.2.3.4")
    assert _hit(limiter, req) is True


def test_forwarded_for_first_hop_is_the_client(fake_redis):
    limiter = RateLimiter(times=1, seconds=60, bucket="b")
    req = FakeRequest(ip="10.0.0.1", forwarded="9.9.9.9, 10.0.0.1")
    assert _hit(limiter, req) is True
    # same forwarded client -> same key -> blocked
    assert _hit(limiter, FakeRequest(ip="10.0.0.2", forwarded="9.9.9.9")) is False


def test_fails_open_when_redis_down(fake_redis):
    fake_redis.fail = True
    limiter = RateLimiter(times=1, seconds=60, bucket="b")
    req = FakeRequest()
    # Redis is broken -> requests are allowed, never 429
    assert _hit(limiter, req) is True
    assert _hit(limiter, req) is True


def test_disabled_is_a_noop(monkeypatch, fake_redis):
    monkeypatch.setattr(settings, "rate_limit_enabled", False)
    limiter = RateLimiter(times=1, seconds=60, bucket="b")
    req = FakeRequest()
    assert _hit(limiter, req) is True
    assert _hit(limiter, req) is True  # would block if enabled
