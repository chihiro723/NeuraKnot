from slowapi import Limiter
from slowapi.util import get_remote_address
from app.config import get_settings

settings = get_settings()

# レート制限の設定
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["1000 per hour"],
    storage_uri=settings.redis_url
)

# エンドポイント別のレート制限を定義
RATE_LIMITS = {
    "chat": f"{settings.rate_limit_chat_per_minute} per minute",
    "secret": f"{settings.rate_limit_secret_per_minute} per minute",
    "mcp": f"{settings.rate_limit_mcp_per_hour} per hour",
    "default": "100 per minute"
}