from cryptography.fernet import Fernet
from typing import Optional
import base64
import json
from app.config import get_settings
from app.utils.logger import logger, get_security_logger
from app.utils.exceptions import EncryptionException

security_logger = get_security_logger()


class EncryptionService:
    """機密情報の暗号化・復号化サービス"""
    
    def __init__(self):
        settings = get_settings()
        try:
            # 暗号化キーの検証と設定
            self._fernet = Fernet(settings.encryption_key.encode())
        except Exception as e:
            logger.error(f"Invalid encryption key: {str(e)}")
            raise EncryptionException("Invalid encryption key configuration")
    
    def encrypt(self, data: str) -> str:
        """
        文字列データを暗号化
        
        Args:
            data: 暗号化する文字列
            
        Returns:
            暗号化されたBase64エンコード文字列
        """
        try:
            encrypted = self._fernet.encrypt(data.encode())
            return base64.urlsafe_b64encode(encrypted).decode()
        except Exception as e:
            logger.error(f"Encryption failed: {str(e)}")
            raise EncryptionException("Failed to encrypt data")
    
    def decrypt(self, encrypted_data: str) -> str:
        """
        暗号化されたデータを復号化
        
        Args:
            encrypted_data: 暗号化されたBase64エンコード文字列
            
        Returns:
            復号化された文字列
        """
        try:
            decoded = base64.urlsafe_b64decode(encrypted_data.encode())
            decrypted = self._fernet.decrypt(decoded)
            return decrypted.decode()
        except Exception as e:
            logger.error(f"Decryption failed: {str(e)}")
            raise EncryptionException("Failed to decrypt data")
    
    def encrypt_dict(self, data: dict) -> str:
        """
        辞書データを暗号化
        
        Args:
            data: 暗号化する辞書
            
        Returns:
            暗号化されたBase64エンコード文字列
        """
        try:
            json_data = json.dumps(data)
            return self.encrypt(json_data)
        except Exception as e:
            logger.error(f"Dict encryption failed: {str(e)}")
            raise EncryptionException("Failed to encrypt dictionary data")
    
    def decrypt_dict(self, encrypted_data: str) -> dict:
        """
        暗号化された辞書データを復号化
        
        Args:
            encrypted_data: 暗号化されたBase64エンコード文字列
            
        Returns:
            復号化された辞書
        """
        try:
            decrypted_json = self.decrypt(encrypted_data)
            return json.loads(decrypted_json)
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON after decryption: {str(e)}")
            raise EncryptionException("Decrypted data is not valid JSON")
        except Exception as e:
            logger.error(f"Dict decryption failed: {str(e)}")
            raise EncryptionException("Failed to decrypt dictionary data")
    
    def mask_sensitive_data(self, data: str, visible_chars: int = 4) -> str:
        """
        機密データをマスク（例：APIキーの表示用）
        
        Args:
            data: マスクするデータ
            visible_chars: 表示する文字数
            
        Returns:
            マスクされた文字列
        """
        if len(data) <= visible_chars * 2:
            return "*" * len(data)
        
        return f"{data[:visible_chars]}{'*' * (len(data) - visible_chars * 2)}{data[-visible_chars:]}"
    
    def log_encryption_event(self, event_type: str, user_id: Optional[str] = None, 
                           resource_type: Optional[str] = None):
        """セキュリティイベントのログ記録"""
        security_logger.info(
            "Encryption event",
            extra={
                "event_type": event_type,
                "user_id": user_id,
                "resource_type": resource_type,
                "ip_address": None  # リクエストコンテキストから取得する場合
            }
        )


# シングルトンインスタンス
encryption_service = EncryptionService()