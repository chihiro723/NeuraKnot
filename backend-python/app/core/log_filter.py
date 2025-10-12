"""
ログフィルタリング
APIキーなどの機密情報をログから除去
"""
import logging
import re
from typing import List, Tuple, Pattern


class SensitiveDataFilter(logging.Filter):
    """ログからAPIキーなどの機密情報を除去するフィルター"""
    
    # パターンと置換文字列のリスト
    PATTERNS: List[Tuple[Pattern, str]] = [
        # Bearer トークン
        (re.compile(r'Bearer\s+[A-Za-z0-9\-._~+/]+=*', re.IGNORECASE), 'Bearer ***'),
        
        # APIキー形式
        (re.compile(r'sk-[A-Za-z0-9]{32,}'), 'sk-***'),
        (re.compile(r'xoxb-[A-Za-z0-9-]+'), 'xoxb-***'),
        (re.compile(r'xoxp-[A-Za-z0-9-]+'), 'xoxp-***'),
        (re.compile(r'ghp_[A-Za-z0-9]{36}'), 'ghp_***'),
        
        # Authorization ヘッダー（JSON形式）
        (re.compile(r'"Authorization":\s*"[^"]*"', re.IGNORECASE), '"Authorization": "***"'),
        (re.compile(r"'Authorization':\s*'[^']*'", re.IGNORECASE), "'Authorization': '***'"),
        
        # APIキーフィールド（JSON形式）
        (re.compile(r'"api_key":\s*"[^"]*"', re.IGNORECASE), '"api_key": "***"'),
        (re.compile(r"'api_key':\s*'[^']*'", re.IGNORECASE), "'api_key': '***'"),
        
        # パスワードフィールド
        (re.compile(r'"password":\s*"[^"]*"', re.IGNORECASE), '"password": "***"'),
        (re.compile(r"'password':\s*'[^']*'", re.IGNORECASE), "'password': '***'"),
        
        # トークンフィールド
        (re.compile(r'"token":\s*"[^"]*"', re.IGNORECASE), '"token": "***"'),
        (re.compile(r"'token':\s*'[^']*'", re.IGNORECASE), "'token': '***'"),
        
        # secret フィールド
        (re.compile(r'"secret":\s*"[^"]*"', re.IGNORECASE), '"secret": "***"'),
        (re.compile(r"'secret':\s*'[^']*'", re.IGNORECASE), "'secret': '***'"),
        
        # AWS Access Key
        (re.compile(r'AKIA[0-9A-Z]{16}'), 'AKIA***'),
        
        # 一般的なAPIキーパターン（長い英数字文字列）
        (re.compile(r'\b[A-Za-z0-9]{40,}\b'), '***'),
    ]
    
    def filter(self, record: logging.LogRecord) -> bool:
        """
        ログレコードをフィルタリング
        
        Args:
            record: ログレコード
            
        Returns:
            常にTrue（ログは出力する、ただし内容をマスキング）
        """
        # メッセージを取得
        message = record.getMessage()
        
        # 各パターンで置換
        for pattern, replacement in self.PATTERNS:
            message = pattern.sub(replacement, message)
        
        # 置換後のメッセージを設定
        # record.msgを直接書き換えるのではなく、argsをクリアしてmsgに設定
        record.msg = message
        record.args = ()
        
        return True


def setup_logging_with_filter():
    """
    ログフィルターを設定したロギングを初期化
    """
    # ルートロガーを取得
    root_logger = logging.getLogger()
    
    # フィルターを追加
    sensitive_filter = SensitiveDataFilter()
    
    # すべてのハンドラーにフィルターを追加
    for handler in root_logger.handlers:
        handler.addFilter(sensitive_filter)
    
    # 新しいハンドラーにもフィルターを追加するため、ルートロガー自体にも追加
    root_logger.addFilter(sensitive_filter)
    
    logging.info("Sensitive data filter has been applied to logging")


def get_filtered_logger(name: str) -> logging.Logger:
    """
    フィルター付きロガーを取得
    
    Args:
        name: ロガー名
        
    Returns:
        フィルター付きロガー
    """
    logger = logging.getLogger(name)
    
    # フィルターが未設定の場合は追加
    if not any(isinstance(f, SensitiveDataFilter) for f in logger.filters):
        logger.addFilter(SensitiveDataFilter())
    
    return logger


# 使用例
if __name__ == "__main__":
    # ロギング設定
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # フィルターを適用
    setup_logging_with_filter()
    
    logger = logging.getLogger(__name__)
    
    # テスト
    logger.info("API Key: sk-1234567890abcdef1234567890abcdef")
    logger.info('Authorization: Bearer xoxb-1234567890-abcdefghijklmnop')
    logger.info('{"api_key": "secret-key-12345", "data": "normal"}')
    logger.info("Password is: mypassword123")
    
    # 期待される出力:
    # API Key: sk-***
    # Authorization: Bearer ***
    # {"api_key": "***", "data": "normal"}
    # Password is: ***

