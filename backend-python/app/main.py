"""
FastAPIメインアプリケーション
BridgeSpeak AI Server
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1 import chat, health, services
from app.middleware.error_handler import add_exception_handlers
from app.core.log_filter import setup_logging_with_filter
import logging

# ロギング設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# 機密情報フィルターを適用
setup_logging_with_filter()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION
)

# CORSミドルウェア
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# エラーハンドラ
add_exception_handlers(app)

# ルーター登録
app.include_router(
    chat.router,
    prefix=f"{settings.API_V1_PREFIX}/ai",
    tags=["AI Chat"]
)
# tools.routerは削除されました（サービスシステムに移行）
app.include_router(
    services.router,
    prefix=f"{settings.API_V1_PREFIX}/services",
    tags=["Services"]
)
app.include_router(
    health.router,
    prefix=settings.API_V1_PREFIX,
    tags=["Health"]
)


@app.get("/")
async def root():
    """
    ルートエンドポイント
    
    Returns:
        サービス情報
    """
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "running"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True
    )

