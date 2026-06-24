from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str
    # Restricted-role URL for the API request path (subject to row-level security).
    # Falls back to database_url if unset — in that case the API connects as the
    # table owner and RLS is bypassed, so set this to the app_user role in prod.
    app_database_url: str = ""
    redis_url: str
    anthropic_api_key: str = ""
    openai_api_key: str = ""
    jwt_secret: str
    # Separate secret for signing short-lived OAuth `state` tokens. Keeping it
    # distinct from jwt_secret means a leak of one signing key can't forge the
    # other (login tokens vs. OAuth round-trip state). Falls back to jwt_secret
    # if unset so existing setups keep working; set it explicitly in prod.
    oauth_state_secret: str = ""
    slack_client_id: str = ""
    slack_client_secret: str = ""
    slack_redirect_uri: str = ""
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = ""
    jira_client_id: str = ""
    jira_client_secret: str = ""
    jira_redirect_uri: str = ""
    embedding_model: str = "text-embedding-3-small"
    embedding_dim: int = 1536
    claude_model: str = "claude-sonnet-4-6"  # unused (kept for reference)
    chat_model: str = "gemini-2.5-flash"
    google_api_key: str = ""
    # comma-separated list of allowed frontend origins (web, future mobile/admin, etc.)
    cors_origins: str = "http://localhost:3000"
    # base URL of the web app — used to build invite links and OAuth return redirects
    frontend_url: str = "http://localhost:3000"
    # comma-separated Fernet keys for encrypting OAuth tokens at rest, NEWEST FIRST.
    # In prod this comes from a secrets manager, never the DB or git. Rotate by
    # prepending a new key, re-encrypting, then dropping the old one.
    token_encryption_keys: str = ""
    # Auth-endpoint rate limiting (Redis-backed, per client IP). Brute-force /
    # token-stuffing protection on /auth/google, /refresh, /accept-invite,
    # /invite-preview. Disable in tests/dev via RATE_LIMIT_ENABLED=false.
    rate_limit_enabled: bool = True
    auth_rate_limit_times: int = 10
    auth_rate_limit_window_seconds: int = 60
    # HSTS (Strict-Transport-Security) forces HTTPS for max-age seconds. Only
    # safe over real TLS — on localhost it can pin the browser to HTTPS. Off by
    # default; set HSTS_ENABLED=true in prod (behind TLS). The other security
    # headers are always sent.
    hsts_enabled: bool = False
    hsts_max_age: int = 31536000  # 1 year

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def token_encryption_key_list(self) -> list[str]:
        return [k.strip() for k in self.token_encryption_keys.split(",") if k.strip()]

    @property
    def oauth_state_signing_key(self) -> str:
        return self.oauth_state_secret or self.jwt_secret


settings = Settings()