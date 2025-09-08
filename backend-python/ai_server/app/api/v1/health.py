from fastapi import APIRouter, Depends
from datetime import datetime
from typing import Dict, Any
import psutil
import platform
from app.config import get_settings
from app.database.supabase_client import get_supabase
from app.utils.logger import logger

router = APIRouter()


@router.get("/health")
async def health_check() -> Dict[str, Any]:
    """
    ヘルスチェックエンドポイント
    
    Returns:
        システムの健康状態
    """
    settings = get_settings()
    
    # 基本的なヘルスチェック
    health_status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0",
        "environment": settings.environment
    }
    
    # 開発環境では詳細情報を含める
    if settings.environment == "development":
        try:
            # システム情報
            health_status["system"] = {
                "platform": platform.system(),
                "python_version": platform.python_version(),
                "cpu_percent": psutil.cpu_percent(interval=1),
                "memory_percent": psutil.virtual_memory().percent
            }
            
            # データベース接続チェック
            try:
                supabase = get_supabase()
                # 簡単なクエリでデータベース接続を確認
                supabase.table("agents").select("id").limit(1).execute()
                health_status["database"] = "connected"
            except Exception as e:
                logger.error(f"Database health check failed: {str(e)}")
                health_status["database"] = "disconnected"
                health_status["status"] = "degraded"
            
        except Exception as e:
            logger.error(f"Health check error: {str(e)}")
            health_status["error"] = str(e)
            health_status["status"] = "unhealthy"
    
    return health_status


@router.get("/health/detailed", dependencies=[Depends(get_settings)])
async def detailed_health_check() -> Dict[str, Any]:
    """
    詳細なヘルスチェック（開発環境のみ）
    
    Returns:
        詳細なシステム状態
    """
    settings = get_settings()
    
    if settings.environment != "development":
        return {"error": "Detailed health check is only available in development"}
    
    try:
        # CPU情報
        cpu_info = {
            "count": psutil.cpu_count(),
            "percent": psutil.cpu_percent(interval=1, percpu=True),
            "freq": psutil.cpu_freq()._asdict() if psutil.cpu_freq() else None
        }
        
        # メモリ情報
        memory = psutil.virtual_memory()
        memory_info = {
            "total": memory.total,
            "available": memory.available,
            "percent": memory.percent,
            "used": memory.used,
            "free": memory.free
        }
        
        # ディスク情報
        disk = psutil.disk_usage('/')
        disk_info = {
            "total": disk.total,
            "used": disk.used,
            "free": disk.free,
            "percent": disk.percent
        }
        
        # ネットワーク情報
        net_io = psutil.net_io_counters()
        network_info = {
            "bytes_sent": net_io.bytes_sent,
            "bytes_recv": net_io.bytes_recv,
            "packets_sent": net_io.packets_sent,
            "packets_recv": net_io.packets_recv
        }
        
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "system": {
                "platform": platform.platform(),
                "python_version": platform.python_version(),
                "machine": platform.machine(),
                "processor": platform.processor()
            },
            "resources": {
                "cpu": cpu_info,
                "memory": memory_info,
                "disk": disk_info,
                "network": network_info
            },
            "process": {
                "pid": psutil.Process().pid,
                "create_time": datetime.fromtimestamp(psutil.Process().create_time()).isoformat(),
                "num_threads": psutil.Process().num_threads(),
                "memory_info": psutil.Process().memory_info()._asdict()
            }
        }
        
    except Exception as e:
        logger.error(f"Detailed health check failed: {str(e)}")
        return {
            "status": "error",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }