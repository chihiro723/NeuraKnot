"""
サービスAPI

サービス一覧、ツール一覧、ツール実行のエンドポイント
"""

from fastapi import APIRouter, HTTPException, Header
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
import logging

from app.services.registry import get_registry

logger = logging.getLogger(__name__)
router = APIRouter()


class ExecuteToolRequest(BaseModel):
    """ツール実行リクエスト"""
    tool_name: str
    arguments: Dict[str, Any]
    user_id: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    auth: Optional[Dict[str, Any]] = None


class ExecuteToolResponse(BaseModel):
    """ツール実行レスポンス"""
    success: bool
    result: Any
    error: Optional[str] = None


@router.get("/", summary="サービス一覧取得")
async def list_services() -> List[Dict[str, Any]]:
    """
    登録されている全サービスの一覧を取得
    
    Returns:
        サービスメタデータのリスト
    """
    try:
        registry = get_registry()
        services = registry.list_all_services()
        logger.info(f"Retrieved {len(services)} services")
        return services
    except Exception as e:
        logger.error(f"Failed to list services: {str(e)}")
        raise HTTPException(status_code=500, detail=f"サービス一覧の取得に失敗しました: {str(e)}")


@router.get("/{service_class}/tools", summary="サービスのツール一覧取得")
async def get_service_tools(service_class: str) -> List[Dict[str, Any]]:
    """
    指定したサービスが提供するツールの一覧を取得
    
    Args:
        service_class: サービスクラス名
        
    Returns:
        ツールメタデータのリスト
        
    Raises:
        HTTPException: サービスが見つからない場合
    """
    try:
        registry = get_registry()
        tools = registry.get_service_tools(service_class)
        
        if not tools:
            logger.warning(f"Service not found: {service_class}")
            raise HTTPException(status_code=404, detail=f"サービス '{service_class}' が見つかりません")
        
        logger.info(f"Retrieved {len(tools)} tools for service: {service_class}")
        return tools
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get tools for service {service_class}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"ツール一覧の取得に失敗しました: {str(e)}")


@router.post("/{service_class}/execute", summary="ツール実行", response_model=ExecuteToolResponse)
async def execute_tool(
    service_class: str,
    request: ExecuteToolRequest,
    x_user_id: Optional[str] = Header(None)
) -> ExecuteToolResponse:
    """
    指定したサービスのツールを実行
    
    Args:
        service_class: サービスクラス名
        request: ツール実行リクエスト
        x_user_id: ユーザーID（ヘッダーから取得）
        
    Returns:
        ツール実行結果
        
    Raises:
        HTTPException: サービスまたはツールが見つからない場合
    """
    try:
        registry = get_registry()
        
        # デバッグログ: 認証情報の内容を確認
        logger.info(f"Service execution debug - service_class: {service_class}, config: {request.config}, auth: {request.auth}")
        
        # サービスインスタンスを作成
        service_instance = registry.create_service_instance(
            service_class,
            config=request.config,
            auth=request.auth
        )
        
        if not service_instance:
            logger.warning(f"Service not found: {service_class}")
            raise HTTPException(status_code=404, detail=f"サービス '{service_class}' が見つかりません")
        
        # ツールを実行
        logger.info(f"Executing tool: {service_class}.{request.tool_name}")
        result = await service_instance.execute_tool(request.tool_name, request.arguments)
        
        logger.info(f"Tool execution successful: {service_class}.{request.tool_name}")
        return ExecuteToolResponse(success=True, result=result)
        
    except ValueError as e:
        # ツールが見つからない
        logger.warning(f"Tool not found: {service_class}.{request.tool_name}")
        raise HTTPException(status_code=404, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Tool execution failed: {service_class}.{request.tool_name} - {str(e)}")
        return ExecuteToolResponse(success=False, result=None, error=str(e))

