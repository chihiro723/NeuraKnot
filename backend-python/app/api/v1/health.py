"""
ヘルスチェックエンドポイント
サーバーの健全性とLLM APIキーの状態を確認
"""
from fastapi import APIRouter
from app.core.llm_factory import LLMFactory
from app.models.response import HealthResponse
from datetime import datetime

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """
    ヘルスチェック
    
    Returns:
        HealthResponse: サーバー状態とLLM API依存関係の状態
    """
    # APIキーの確認
    api_keys_status = LLMFactory.validate_api_keys()
    
    dependencies = {
        "openai": "ok" if api_keys_status["openai"] else "not_configured",
        "anthropic": "ok" if api_keys_status["anthropic"] else "not_configured",
        "google": "ok" if api_keys_status["google"] else "not_configured"
    }
    
    # 少なくとも1つが有効か確認
    is_healthy = any(api_keys_status.values())
    
    errors = []
    if not is_healthy:
        errors.append("少なくとも1つのLLM APIキーが必要です")
    
    return HealthResponse(
        status="healthy" if is_healthy else "unhealthy",
        service="backend-python",
        timestamp=datetime.utcnow().isoformat() + "Z",
        dependencies=dependencies,
        errors=errors
    )

