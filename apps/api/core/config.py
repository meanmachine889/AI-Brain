from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str
    redis_url: str
    anthropic_api_key: str = ""
    openai_api_key: str = ""
    jwt_secret: str
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

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()