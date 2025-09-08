from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.config import get_settings
from app.utils.logger import logger, get_security_logger
from app.utils.exceptions import AuthenticationException, AuthorizationException
from app.database.supabase_client import get_supabase

security = HTTPBearer()
security_logger = get_security_logger()


class AuthService:
    """認証・認可サービス"""
    
    def __init__(self):
        self.settings = get_settings()
        self.supabase = get_supabase()
    
    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """
        JWTアクセストークンを作成
        
        Args:
            data: トークンに含めるデータ
            expires_delta: 有効期限
            
        Returns:
            JWTトークン文字列
        """
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=self.settings.access_token_expire_minutes)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(
            to_encode,
            self.settings.jwt_secret_key,
            algorithm=self.settings.jwt_algorithm
        )
        return encoded_jwt
    
    def verify_token(self, token: str) -> Dict[str, Any]:
        """
        JWTトークンを検証
        
        Args:
            token: 検証するJWTトークン
            
        Returns:
            トークンのペイロード
            
        Raises:
            AuthenticationException: トークンが無効な場合
        """
        try:
            payload = jwt.decode(
                token,
                self.settings.jwt_secret_key,
                algorithms=[self.settings.jwt_algorithm]
            )
            return payload
        except JWTError as e:
            logger.error(f"JWT verification failed: {str(e)}")
            raise AuthenticationException("Invalid authentication token")
    
    async def get_current_user(self, credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
        """
        現在のユーザー情報を取得
        
        Args:
            credentials: HTTPヘッダーからの認証情報
            
        Returns:
            ユーザー情報
            
        Raises:
            AuthenticationException: 認証失敗時
        """
        token = credentials.credentials
        
        try:
            # Supabaseでトークンを検証
            user = self.supabase.auth.get_user(token)
            if not user:
                raise AuthenticationException("Invalid authentication token")
            
            # セキュリティログ
            security_logger.info(
                "User authenticated",
                extra={
                    "event_type": "authentication_success",
                    "user_id": user.user.id,
                    "ip_address": None  # リクエストコンテキストから取得
                }
            )
            
            return {
                "id": user.user.id,
                "email": user.user.email,
                "metadata": user.user.user_metadata
            }
            
        except Exception as e:
            logger.error(f"Authentication failed: {str(e)}")
            security_logger.warning(
                "Authentication failed",
                extra={
                    "event_type": "authentication_failure",
                    "user_id": None,
                    "ip_address": None
                }
            )
            raise AuthenticationException("Authentication failed")
    
    def check_permissions(self, user: Dict[str, Any], required_permission: str) -> bool:
        """
        ユーザーの権限をチェック
        
        Args:
            user: ユーザー情報
            required_permission: 必要な権限
            
        Returns:
            権限がある場合True
        """
        user_permissions = user.get("metadata", {}).get("permissions", [])
        return required_permission in user_permissions
    
    async def require_permission(
        self,
        required_permission: str,
        user: Dict[str, Any] = Depends(get_current_user)
    ) -> Dict[str, Any]:
        """
        特定の権限を要求する依存性
        
        Args:
            required_permission: 必要な権限
            user: 現在のユーザー
            
        Returns:
            ユーザー情報
            
        Raises:
            AuthorizationException: 権限がない場合
        """
        if not self.check_permissions(user, required_permission):
            security_logger.warning(
                "Authorization failed",
                extra={
                    "event_type": "authorization_failure",
                    "user_id": user["id"],
                    "required_permission": required_permission,
                    "ip_address": None
                }
            )
            raise AuthorizationException(f"Permission '{required_permission}' required")
        
        return user


# シングルトンインスタンス
auth_service = AuthService()

# 依存性として使用する関数
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    """現在のユーザーを取得する依存性"""
    return await auth_service.get_current_user(credentials)


def require_permission(permission: str):
    """特定の権限を要求する依存性ファクトリー"""
    async def permission_checker(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        return await auth_service.require_permission(permission, user)
    return permission_checker