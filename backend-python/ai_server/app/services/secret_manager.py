from typing import Optional, Dict, Any
from datetime import datetime
from app.models.agent import AgentSecret
from app.security.encryption import encryption_service
# from app.database.postgres_client import DatabaseService
from app.utils.logger import logger, get_security_logger
from app.utils.exceptions import EncryptionException, DatabaseException, AuthorizationException

security_logger = get_security_logger()


class SecretManager:
    """機密情報管理サービス"""
    
    def __init__(self):
        pass
    
    async def save_agent_secrets(
        self,
        agent_id: str,
        user_id: str,
        secrets: AgentSecret
    ):
        """
        エージェントの機密情報を保存
        
        Args:
            agent_id: エージェントID
            user_id: ユーザーID
            secrets: 機密情報
            
        Raises:
            EncryptionException: 暗号化エラー
            DatabaseException: データベースエラー
        """
        try:
            # 既存の機密情報をチェック
            existing = await self._get_secret_record(agent_id, user_id)
            if existing:
                raise DatabaseException("Secrets already exist. Use update instead.")
            
            # 機密情報の暗号化
            encrypted_data = {}
            
            if secrets.api_keys:
                encrypted_data["api_keys"] = encryption_service.encrypt_dict(secrets.api_keys)
            
            if secrets.oauth_tokens:
                encrypted_data["oauth_tokens"] = encryption_service.encrypt_dict(secrets.oauth_tokens)
            
            if secrets.custom_secrets:
                encrypted_data["custom_secrets"] = encryption_service.encrypt_dict(secrets.custom_secrets)
            
            # データベースに保存
            secret_record = {
                "agent_id": agent_id,
                "user_id": user_id,
                "encrypted_data": encrypted_data,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }
            
            await self.execute_with_retry(
                lambda: self.client.table("agent_secrets").insert(secret_record).execute()
            )
            
            # セキュリティログ
            security_logger.info(
                "Agent secrets saved",
                extra={
                    "event_type": "secrets_created",
                    "user_id": user_id,
                    "agent_id": agent_id,
                    "ip_address": None
                }
            )
            
        except Exception as e:
            logger.error(f"Save agent secrets error: {str(e)}")
            raise
    
    async def get_agent_secrets(
        self,
        agent_id: str,
        user_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        エージェントの機密情報を取得（復号化済み）
        
        Args:
            agent_id: エージェントID
            user_id: ユーザーID
            
        Returns:
            復号化された機密情報
            
        Raises:
            AuthorizationException: アクセス権限エラー
            EncryptionException: 復号化エラー
        """
        try:
            # 機密情報の取得
            record = await self._get_secret_record(agent_id, user_id)
            if not record:
                return None
            
            # 復号化
            decrypted_data = {}
            encrypted_data = record["encrypted_data"]
            
            if "api_keys" in encrypted_data and encrypted_data["api_keys"]:
                decrypted_data["api_keys"] = encryption_service.decrypt_dict(
                    encrypted_data["api_keys"]
                )
            
            if "oauth_tokens" in encrypted_data and encrypted_data["oauth_tokens"]:
                decrypted_data["oauth_tokens"] = encryption_service.decrypt_dict(
                    encrypted_data["oauth_tokens"]
                )
            
            if "custom_secrets" in encrypted_data and encrypted_data["custom_secrets"]:
                decrypted_data["custom_secrets"] = encryption_service.decrypt_dict(
                    encrypted_data["custom_secrets"]
                )
            
            # セキュリティログ
            security_logger.info(
                "Agent secrets accessed",
                extra={
                    "event_type": "secrets_accessed",
                    "user_id": user_id,
                    "agent_id": agent_id,
                    "ip_address": None
                }
            )
            
            return decrypted_data
            
        except Exception as e:
            logger.error(f"Get agent secrets error: {str(e)}")
            raise
    
    async def update_agent_secrets(
        self,
        agent_id: str,
        user_id: str,
        secrets: AgentSecret
    ):
        """
        エージェントの機密情報を更新
        
        Args:
            agent_id: エージェントID
            user_id: ユーザーID
            secrets: 新しい機密情報
        """
        try:
            # 既存の機密情報を確認
            existing = await self._get_secret_record(agent_id, user_id)
            if not existing:
                # 存在しない場合は新規作成
                await self.save_agent_secrets(agent_id, user_id, secrets)
                return
            
            # 機密情報の暗号化
            encrypted_data = existing["encrypted_data"] or {}
            
            if secrets.api_keys:
                encrypted_data["api_keys"] = encryption_service.encrypt_dict(secrets.api_keys)
            
            if secrets.oauth_tokens:
                encrypted_data["oauth_tokens"] = encryption_service.encrypt_dict(secrets.oauth_tokens)
            
            if secrets.custom_secrets:
                encrypted_data["custom_secrets"] = encryption_service.encrypt_dict(secrets.custom_secrets)
            
            # 更新
            update_data = {
                "encrypted_data": encrypted_data,
                "updated_at": datetime.utcnow().isoformat()
            }
            
            await self.execute_with_retry(
                lambda: self.client.table("agent_secrets")
                .update(update_data)
                .eq("agent_id", agent_id)
                .eq("user_id", user_id)
                .execute()
            )
            
            # セキュリティログ
            security_logger.info(
                "Agent secrets updated",
                extra={
                    "event_type": "secrets_updated",
                    "user_id": user_id,
                    "agent_id": agent_id,
                    "ip_address": None
                }
            )
            
        except Exception as e:
            logger.error(f"Update agent secrets error: {str(e)}")
            raise
    
    async def delete_agent_secrets(
        self,
        agent_id: str,
        user_id: str
    ):
        """
        エージェントの機密情報を削除
        
        Args:
            agent_id: エージェントID
            user_id: ユーザーID
        """
        try:
            result = await self.execute_with_retry(
                lambda: self.client.table("agent_secrets")
                .delete()
                .eq("agent_id", agent_id)
                .eq("user_id", user_id)
                .execute()
            )
            
            if result.data:
                # セキュリティログ
                security_logger.info(
                    "Agent secrets deleted",
                    extra={
                        "event_type": "secrets_deleted",
                        "user_id": user_id,
                        "agent_id": agent_id,
                        "ip_address": None
                    }
                )
            
        except Exception as e:
            logger.error(f"Delete agent secrets error: {str(e)}")
            raise
    
    async def _get_secret_record(
        self,
        agent_id: str,
        user_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        機密情報レコードを取得
        
        Args:
            agent_id: エージェントID
            user_id: ユーザーID
            
        Returns:
            機密情報レコード
        """
        try:
            result = await self.execute_with_retry(
                lambda: self.client.table("agent_secrets")
                .select("*")
                .eq("agent_id", agent_id)
                .eq("user_id", user_id)
                .single()
                .execute()
            )
            
            return result.data if result.data else None
            
        except Exception as e:
            if "not found" in str(e).lower():
                return None
            raise