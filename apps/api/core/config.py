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

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()