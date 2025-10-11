"""
設定管理
Pydantic Settingsを使用した環境変数ベースの設定
"""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """アプリケーション設定"""
    
    # API設定
    API_V1_PREFIX: str = "/api"
    PROJECT_NAME: str = "BridgeSpeak AI Server"
    VERSION: str = "1.0.0"
    HOST: str = "0.0.0.0"
    PORT: int = 8001
    
    # CORS設定
    ALLOWED_ORIGINS: List[str] = ["http://localhost:8080", "http://localhost:3000"]
    
    # LLM API Keys
    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    GOOGLE_API_KEY: str = ""
    
    # LangSmith設定
    LANGSMITH_TRACING_V2: bool = False
    LANGSMITH_API_KEY: str = ""
    LANGSMITH_PROJECT: str = "bridgespeak"
    LANGSMITH_ENDPOINT: str = "https://smith.langchain.com"
    
    # タイムアウト設定（秒）
    MCP_CONNECTION_TIMEOUT: int = 10
    MCP_TOOL_TIMEOUT: int = 30
    AGENT_EXECUTION_TIMEOUT: int = 120
    
    class Config:
        env_file = ".env.local"
        case_sensitive = True


settings = Settings()

