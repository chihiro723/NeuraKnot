"""
ツールカタログAPI
MCPサーバーからツール一覧を取得
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, HttpUrl
from typing import Optional, Dict, List, Any
import logging

from app.mcp_servers import get_builtin_server
from app.services.mcp_service import MCPService

router = APIRouter()
logger = logging.getLogger(__name__)


class ToolCatalogRequest(BaseModel):
    """ツールカタログ取得リクエスト"""
    server_url: str
    api_key: Optional[str] = None
    custom_headers: Optional[Dict[str, str]] = None


class ToolCatalogResponse(BaseModel):
    """ツールカタログレスポンス"""
    server: Dict[str, Any]
    tools: List[Dict[str, Any]]


@router.post("/catalog", response_model=ToolCatalogResponse)
async def get_tool_catalog(request: ToolCatalogRequest):
    """
    MCPサーバーからツールカタログを取得
    
    Built-in Toolsサーバー（internal://builtin）の場合は内部サーバーから取得、
    それ以外は外部MCPサーバーにHTTPリクエストを送信
    """
    try:
        # Built-in Toolsサーバーの場合
        if request.server_url == "internal://builtin":
            logger.info("Fetching catalog from built-in server")
            builtin_server = get_builtin_server()
            catalog = builtin_server.get_catalog()
            return ToolCatalogResponse(**catalog)
        
        # 外部MCPサーバーの場合
        logger.info(f"Fetching catalog from external server: {request.server_url}")
        
        mcp_service = MCPService()
        catalog = await mcp_service.fetch_tool_catalog_from_url(
            server_url=request.server_url,
            api_key=request.api_key,
            custom_headers=request.custom_headers or {}
        )
        
        return ToolCatalogResponse(**catalog)
        
    except Exception as e:
        logger.error(f"Failed to fetch tool catalog: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch tool catalog: {str(e)}"
        )


@router.get("/builtin", response_model=ToolCatalogResponse)
async def get_builtin_catalog():
    """
    Built-in Toolsサーバーのツールカタログを取得（簡易版）
    """
    try:
        builtin_server = get_builtin_server()
        catalog = builtin_server.get_catalog()
        return ToolCatalogResponse(**catalog)
    except Exception as e:
        logger.error(f"Failed to fetch built-in catalog: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch built-in catalog: {str(e)}"
        )


class ToolListResponse(BaseModel):
    """ツールリストレスポンス（簡易版）"""
    tools: List[Dict[str, Any]]


@router.get("/builtin/tools", response_model=ToolListResponse)
async def list_builtin_tools():
    """
    Built-in Toolsの一覧を取得（ツールオブジェクトのメタデータのみ）
    """
    try:
        builtin_server = get_builtin_server()
        catalog = builtin_server.get_catalog()
        return ToolListResponse(tools=catalog["tools"])
    except Exception as e:
        logger.error(f"Failed to list built-in tools: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list built-in tools: {str(e)}"
        )
