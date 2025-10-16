"""
エラーハンドラミドルウェア
カスタム例外と一般的な例外の処理
"""
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from app.core.exceptions import NeuraKnotException
import logging
import uuid

logger = logging.getLogger(__name__)


def add_exception_handlers(app: FastAPI):
    """
    例外ハンドラを登録
    
    Args:
        app: FastAPIアプリケーション
    """
    
    @app.exception_handler(NeuraKnotException)
    async def neuraKnot_exception_handler(request: Request, exc: NeuraKnotException):
        """
        カスタム例外ハンドラ
        
        Args:
            request: リクエスト
            exc: NeuraKnotException
            
        Returns:
            JSONResponse: エラーレスポンス
        """
        request_id = str(uuid.uuid4())
        
        logger.error(
            f"NeuraKnotException: {exc.code} - {exc.message}",
            extra={"request_id": request_id, "details": exc.details}
        )
        
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": exc.code,
                    "message": exc.message,
                    "details": exc.details,
                    "request_id": request_id
                }
            }
        )
    
    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        """
        一般的な例外ハンドラ
        
        Args:
            request: リクエスト
            exc: Exception
            
        Returns:
            JSONResponse: エラーレスポンス
        """
        request_id = str(uuid.uuid4())
        
        logger.error(
            f"Unhandled exception: {str(exc)}",
            exc_info=True,
            extra={"request_id": request_id}
        )
        
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "予期しないエラーが発生しました",
                    "details": {"error": str(exc)},
                    "request_id": request_id
                }
            }
        )

