"""Tests for SecurityHeadersMiddleware.

Uses FastAPI's TestClient against a minimal app that mounts the middleware (no
DB/Redis needed). Covers: baseline headers on every response, the strict CSP on
JSON routes vs. the relaxed CSP on the docs surfaces, and HSTS gated by config.
"""

from fastapi import FastAPI
from fastapi.testclient import TestClient

from core.config import settings
from core.security_headers import SecurityHeadersMiddleware


def _client() -> TestClient:
    app = FastAPI()
    app.add_middleware(SecurityHeadersMiddleware)

    @app.get("/ping")
    def ping():
        return {"ok": True}

    return TestClient(app)


def test_baseline_headers_present_on_normal_response():
    r = _client().get("/ping")
    assert r.headers["X-Content-Type-Options"] == "nosniff"
    assert r.headers["X-Frame-Options"] == "DENY"
    assert r.headers["Referrer-Policy"] == "strict-origin-when-cross-origin"
    assert "Content-Security-Policy" in r.headers


def test_strict_csp_on_api_route():
    r = _client().get("/ping")
    csp = r.headers["Content-Security-Policy"]
    assert "default-src 'none'" in csp
    assert "frame-ancestors 'none'" in csp
    # API responses must NOT whitelist the docs CDN
    assert "cdn.jsdelivr.net" not in csp


def test_relaxed_csp_on_docs_routes():
    # The real app's /docs serves Swagger UI; assert the middleware relaxes CSP
    # for /docs, /redoc and /openapi.json so the CDN bundle can load.
    import main

    client = TestClient(main.app)
    for path in ("/docs", "/redoc", "/openapi.json"):
        csp = client.get(path).headers["Content-Security-Policy"]
        assert "cdn.jsdelivr.net" in csp, f"{path} should use the relaxed docs CSP"


def test_hsts_off_by_default(monkeypatch):
    monkeypatch.setattr(settings, "hsts_enabled", False)
    r = _client().get("/ping")
    assert "Strict-Transport-Security" not in r.headers


def test_hsts_sent_when_enabled(monkeypatch):
    monkeypatch.setattr(settings, "hsts_enabled", True)
    monkeypatch.setattr(settings, "hsts_max_age", 12345)
    r = _client().get("/ping")
    hsts = r.headers["Strict-Transport-Security"]
    assert "max-age=12345" in hsts
    assert "includeSubDomains" in hsts


def test_headers_on_error_responses():
    # A 404 (not a registered route) must still carry the security headers,
    # since the middleware wraps the whole stack.
    r = _client().get("/does-not-exist")
    assert r.status_code == 404
    assert r.headers["X-Content-Type-Options"] == "nosniff"
    assert "Content-Security-Policy" in r.headers
