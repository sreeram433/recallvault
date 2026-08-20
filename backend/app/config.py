from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "production"
    log_level: str = "INFO"
    gcp_project_id: str = ""

    cors_allow_origins: str = "http://localhost:3000"
    jwt_secret: str = Field(default="", alias="JWT_SECRET")
    jwt_algorithm: str = "HS256"
    jwt_ttl_seconds: int = 60 * 60 * 24 * 14

    database_url: str = ""
    instance_connection_name: str = ""
    db_user: str = "recallvault"
    db_name: str = "recallvault"
    db_password: str = Field(default="", alias="DB_PASSWORD")
    db_ip_type: str = "private"

    gcs_screenshots_bucket: str = ""
    screenshot_signed_url_ttl_seconds: int = 600

    jwt_secret_resource: str = ""
    db_password_resource: str = ""

    rate_limit_import: str = "30/hour"
    rate_limit_auth: str = "20/hour"

    def cors_origins(self) -> list[str]:
        return [part.strip() for part in self.cors_allow_origins.split(",") if part.strip()]


def _read_secret(resource: str) -> str:
    if not resource:
        return ""
    from google.cloud import secretmanager

    client = secretmanager.SecretManagerServiceClient()
    name = resource if resource.startswith("projects/") else f"{resource}/versions/latest"
    payload = client.access_secret_version(request={"name": name}).payload.data
    return payload.decode("utf-8").strip()


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    if not settings.jwt_secret and settings.jwt_secret_resource:
        settings.jwt_secret = _read_secret(settings.jwt_secret_resource)
    if not settings.db_password and settings.db_password_resource:
        settings.db_password = _read_secret(settings.db_password_resource)
    return settings
