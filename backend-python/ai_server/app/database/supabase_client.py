from supabase import create_client, Client
from typing import Optional
from app.config import get_settings
from app.utils.logger import logger
from app.utils.exceptions import DatabaseException

_supabase_client: Optional[Client] = None


def init_supabase() -> Client:
    """
    Supabaseクライアントを初期化
    
    Returns:
        Supabaseクライアント
        
    Raises:
        DatabaseException: 初期化失敗時
    """
    global _supabase_client
    
    if _supabase_client is not None:
        return _supabase_client
    
    try:
        settings = get_settings()
        _supabase_client = create_client(
            supabase_url=settings.supabase_url,
            supabase_key=settings.supabase_service_role_key
        )
        logger.info("Supabase client initialized successfully")
        return _supabase_client
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {str(e)}")
        raise DatabaseException("Failed to connect to database")


def get_supabase() -> Client:
    """
    Supabaseクライアントのシングルトンインスタンスを取得
    
    Returns:
        Supabaseクライアント
        
    Raises:
        DatabaseException: クライアントが初期化されていない場合
    """
    if _supabase_client is None:
        raise DatabaseException("Supabase client not initialized")
    
    return _supabase_client


class DatabaseService:
    """データベース操作のベースサービス"""
    
    def __init__(self):
        self.client = get_supabase()
    
    async def execute_with_retry(self, operation, max_retries: int = 3):
        """
        データベース操作をリトライ付きで実行
        
        Args:
            operation: 実行する操作
            max_retries: 最大リトライ回数
            
        Returns:
            操作の結果
            
        Raises:
            DatabaseException: 全てのリトライが失敗した場合
        """
        last_error = None
        
        for attempt in range(max_retries):
            try:
                return await operation()
            except Exception as e:
                last_error = e
                logger.warning(
                    f"Database operation failed (attempt {attempt + 1}/{max_retries}): {str(e)}"
                )
                if attempt < max_retries - 1:
                    await asyncio.sleep(2 ** attempt)  # Exponential backoff
        
        logger.error(f"All database operation retries failed: {str(last_error)}")
        raise DatabaseException("Database operation failed after multiple retries")
    
    def handle_database_error(self, error: Exception, operation: str):
        """
        データベースエラーを処理
        
        Args:
            error: 発生したエラー
            operation: 実行していた操作名
        """
        logger.error(
            f"Database error during {operation}: {str(error)}",
            exc_info=True
        )
        
        # エラーの種類に応じて適切な例外を投げる
        if "duplicate" in str(error).lower():
            raise DatabaseException(f"Duplicate entry error during {operation}")
        elif "not found" in str(error).lower():
            raise DatabaseException(f"Resource not found during {operation}")
        else:
            raise DatabaseException(f"Database error during {operation}")


# asyncioのインポート
import asyncio