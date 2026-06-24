"""Security-response-headers middleware.

This is a JSON API consumed by a separate Next.js frontend, so the response
bodies are data, not HTML — the headers below mainly harden the few HTML
surfaces (the Swagger `/docs` and ReDoc `/redoc` pages) and set safe defaults
for any future browser-rendered content.

- Strict-Transport-Security: only over real TLS; gated behind HSTS_ENABLED so
  it can't pin localhost to HTTPS in dev.
- X-Content-Type-Options: nosniff — always.
- X-Frame-Options: DENY + CSP frame-ancestors 'none' — clickjacking protection
  for /docs.
- Referrer-Policy: strict-origin-when-cross-origin.
- Content-Security-Policy: tight `default-src 'none'` for API/JSON responses;
  a relaxed policy for the docs routes (Swagger/ReDoc load JS/CSS from a CDN
  and use inline styles, which a strict CSP would break).
"""

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.types import ASGIApp

from core.config import settings

# Paths whose HTML needs the CDN-loaded Swagger/ReDoc assets.
_DOCS_PATHS = ("/docs", "/redoc")

# Strict policy for normal (JSON) responses: nothing may load, nothing may frame.
_API_CSP = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"

# Relaxed policy for the docs pages. Swagger UI / ReDoc pull their bundle from
# jsdelivr and apply inline styles (and ReDoc needs a worker blob + data: fonts).
_DOCS_CSP = (
    "default-src 'none'; "
    "script-src 'self' https://cdn.jsdelivr.net 'unsafe-inline'; "
    "style-src 'self' https://cdn.jsdelivr.net 'unsafe-inline'; "
    "img-src 'self' https://fastapi.tiangolo.com data:; "
    "font-src 'self' https://cdn.jsdelivr.net data:; "
    "worker-src 'self' blob:; "
    "frame-ancestors 'none'; base-uri 'none'"
)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: ASGIApp):
        super().__init__(app)

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        headers = response.headers

        headers["X-Content-Type-Options"] = "nosniff"
        headers["X-Frame-Options"] = "DENY"
        headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        is_docs = request.url.path in _DOCS_PATHS or request.url.path == "/openapi.json"
        headers["Content-Security-Policy"] = _DOCS_CSP if is_docs else _API_CSP

        if settings.hsts_enabled:
            headers["Strict-Transport-Security"] = (
                f"max-age={settings.hsts_max_age}; includeSubDomains"
            )

        return response
