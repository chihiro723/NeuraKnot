from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
import time
import redis.asyncio as redis
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import get_settings
from app.utils.logger import logger, get_metrics_logger
from app.utils.exceptions import BaseAPIException
from app.api.v1 import chat, agents, mcp, health
from app.security.rate_limit import limiter


# メトリクスロガー
metrics_logger = get_metrics_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """アプリケーションのライフサイクル管理"""
    settings = get_settings()
    
    # 起動時の処理
    logger.info("Starting AI API Server", extra={
        "environment": settings.environment,
        "host": settings.api_host,
        "port": settings.api_port
    })
    
    # PostgreSQLクライアントの初期化（必要に応じて）
    # init_postgres()
    
    # Redisクライアントの初期化
    app.state.redis = await redis.from_url(
        settings.redis_url,
        encoding="utf-8",
        decode_responses=True
    )
    
    yield
    
    # 終了時の処理
    await app.state.redis.close()
    logger.info("Shutting down AI API Server")


# FastAPIアプリケーションの作成
app = FastAPI(
    title="AI Hybrid Messaging API",
    description="Secure AI API Server for Hybrid Messaging Application",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if get_settings().environment == "development" else None,
    redoc_url="/redoc" if get_settings().environment == "development" else None,
)

# 設定の取得
settings = get_settings()

# レート制限の設定
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Trusted Hostミドルウェア（本番環境のみ）
if settings.environment == "production":
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=["api.yourdomain.com", "*.yourdomain.com"]
    )


# リクエスト処理時間の計測ミドルウェア
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    
    # メトリクスログ
    metrics_logger.info(
        "API Request",
        extra={
            "endpoint": request.url.path,
            "method": request.method,
            "status_code": response.status_code,
            "response_time": round(process_time * 1000, 2),  # ミリ秒単位
            "user_id": getattr(request.state, "user_id", None)
        }
    )
    
    response.headers["X-Process-Time"] = str(process_time)
    return response


# グローバル例外ハンドラー
@app.exception_handler(BaseAPIException)
async def api_exception_handler(request: Request, exc: BaseAPIException):
    logger.error(
        f"API Exception: {exc.detail}",
        extra={
            "status_code": exc.status_code,
            "path": request.url.path,
            "method": request.method
        }
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(
        f"Unexpected error: {str(exc)}",
        extra={
            "path": request.url.path,
            "method": request.method,
            "error_type": type(exc).__name__
        },
        exc_info=True
    )
    
    # 本番環境では詳細なエラー情報を隠す
    if settings.environment == "production":
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"}
        )
    else:
        return JSONResponse(
            status_code=500,
            content={"detail": str(exc)}
        )


# APIルーターの登録
app.include_router(health.router, prefix="/api/v1", tags=["health"])
app.include_router(chat.router, prefix="/api/v1", tags=["chat"])
app.include_router(agents.router, prefix="/api/v1", tags=["agents"])
app.include_router(mcp.router, prefix="/api/v1", tags=["mcp"])


# ルートエンドポイント
@app.get("/")
async def root():
    return {
        "message": "AI Hybrid Messaging API",
        "version": "1.0.0",
        "status": "operational"
    }