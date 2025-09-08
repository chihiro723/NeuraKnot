from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import Field, validator
import os
from functools import lru_cache


class Settings(BaseSettings):
    # FastAPI設定
    environment: str = Field(default="development", env="ENVIRONMENT")
    api_host: str = Field(default="0.0.0.0", env="API_HOST")
    api_port: int = Field(default=8000, env="API_PORT")
    
    # Supabase設定
    supabase_url: str = Field(..., env="SUPABASE_URL")
    supabase_service_role_key: str = Field(..., env="SUPABASE_SERVICE_ROLE_KEY")
    supabase_anon_key: str = Field(..., env="SUPABASE_ANON_KEY")
    
    # AI設定
    openai_api_key: str = Field(..., env="OPENAI_API_KEY")
    default_model: str = Field(default="gpt-3.5-turbo", env="DEFAULT_MODEL")
    
    # セキュリティ
    encryption_key: str = Field(..., env="ENCRYPTION_KEY")
    jwt_secret_key: str = Field(..., env="JWT_SECRET_KEY")
    jwt_algorithm: str = Field(default="HS256", env="JWT_ALGORITHM")
    access_token_expire_minutes: int = Field(default=30, env="ACCESS_TOKEN_EXPIRE_MINUTES")
    
    # MCP OAuth設定
    google_client_id: Optional[str] = Field(None, env="GOOGLE_CLIENT_ID")
    google_client_secret: Optional[str] = Field(None, env="GOOGLE_CLIENT_SECRET")
    google_redirect_uri: Optional[str] = Field(None, env="GOOGLE_REDIRECT_URI")
    
    # Redis設定
    redis_url: str = Field(default="redis://localhost:6379", env="REDIS_URL")
    
    # ログ設定
    log_level: str = Field(default="INFO", env="LOG_LEVEL")
    
    # CORS設定
    allowed_origins: List[str] = Field(
        default=["http://localhost:3000", "http://localhost:5173"],
        env="ALLOWED_ORIGINS"
    )
    
    # レート制限設定
    rate_limit_chat_per_minute: int = Field(default=30, env="RATE_LIMIT_CHAT_PER_MINUTE")
    rate_limit_secret_per_minute: int = Field(default=5, env="RATE_LIMIT_SECRET_PER_MINUTE")
    rate_limit_mcp_per_hour: int = Field(default=3, env="RATE_LIMIT_MCP_PER_HOUR")
    
    @validator("allowed_origins", pre=True)
    def parse_allowed_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v
    
    @validator("environment")
    def validate_environment(cls, v):
        if v not in ["development", "production", "testing"]:
            raise ValueError("Environment must be one of: development, production, testing")
        return v
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """設定のシングルトンインスタンスを返す"""
    return Settings()


# 便利なヘルパー関数
def is_production() -> bool:
    """本番環境かどうかを判定"""
    return get_settings().environment == "production"


def is_development() -> bool:
    """開発環境かどうかを判定"""
    return get_settings().environment == "development"