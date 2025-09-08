import logging
import sys
from pathlib import Path
from pythonjsonlogger import jsonlogger
from app.config import get_settings

# ログディレクトリの作成
LOG_DIR = Path("logs")
LOG_DIR.mkdir(exist_ok=True)


def setup_logger(name: str) -> logging.Logger:
    """
    構造化ログ（JSON形式）のロガーをセットアップ
    """
    settings = get_settings()
    logger = logging.getLogger(name)
    
    # 既にハンドラーが設定されている場合はスキップ
    if logger.handlers:
        return logger
    
    logger.setLevel(getattr(logging, settings.log_level.upper()))
    
    # JSON形式のフォーマッター
    json_formatter = jsonlogger.JsonFormatter(
        fmt="%(asctime)s %(name)s %(levelname)s %(message)s",
        rename_fields={
            "asctime": "timestamp",
            "name": "logger",
            "levelname": "level"
        }
    )
    
    # コンソールハンドラー
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(json_formatter)
    logger.addHandler(console_handler)
    
    # ファイルハンドラー（本番環境のみ）
    if settings.environment == "production":
        file_handler = logging.FileHandler(LOG_DIR / "app.log")
        file_handler.setFormatter(json_formatter)
        logger.addHandler(file_handler)
        
        # エラーログ用の別ファイル
        error_handler = logging.FileHandler(LOG_DIR / "error.log")
        error_handler.setLevel(logging.ERROR)
        error_handler.setFormatter(json_formatter)
        logger.addHandler(error_handler)
    
    return logger


# セキュリティイベント用の専用ロガー
def get_security_logger() -> logging.Logger:
    """
    セキュリティイベント専用のロガーを取得
    """
    logger = setup_logger("security")
    
    # セキュリティログは常にファイルに出力
    if not any(isinstance(h, logging.FileHandler) and "security" in h.baseFilename for h in logger.handlers):
        security_handler = logging.FileHandler(LOG_DIR / "security.log")
        json_formatter = jsonlogger.JsonFormatter(
            fmt="%(asctime)s %(name)s %(levelname)s %(message)s %(user_id)s %(event_type)s %(ip_address)s",
            rename_fields={
                "asctime": "timestamp",
                "name": "logger",
                "levelname": "level"
            }
        )
        security_handler.setFormatter(json_formatter)
        logger.addHandler(security_handler)
    
    return logger


# API利用量監視用のロガー
def get_metrics_logger() -> logging.Logger:
    """
    API利用量監視用のロガーを取得
    """
    logger = setup_logger("metrics")
    
    if not any(isinstance(h, logging.FileHandler) and "metrics" in h.baseFilename for h in logger.handlers):
        metrics_handler = logging.FileHandler(LOG_DIR / "metrics.log")
        json_formatter = jsonlogger.JsonFormatter(
            fmt="%(asctime)s %(name)s %(levelname)s %(message)s %(endpoint)s %(method)s %(status_code)s %(response_time)s %(user_id)s",
            rename_fields={
                "asctime": "timestamp",
                "name": "logger",
                "levelname": "level"
            }
        )
        metrics_handler.setFormatter(json_formatter)
        logger.addHandler(metrics_handler)
    
    return logger


# デフォルトのアプリケーションロガー
logger = setup_logger("app")