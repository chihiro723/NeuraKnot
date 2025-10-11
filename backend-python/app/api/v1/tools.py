"""
ツールエンドポイント
利用可能なツール一覧の取得
"""
from fastapi import APIRouter
from app.models.request import ToolsRequest
from app.models.response import ToolsResponse, MCPServerStatus, Tool
from app.services.mcp_service import MCPService
from app.tools.basic_tools import get_basic_tools
from datetime import datetime
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/available", response_model=ToolsResponse)
async def get_available_tools(request: ToolsRequest):
    """
    利用可能なツール一覧を取得
    
    Args:
        request: ツールリクエスト
        
    Returns:
        ToolsResponse: MCPサーバーと基本ツールの一覧
    """
    logger.info(f"Tools request from user {request.user_id}")
    
    mcp_servers_status = []
    
    # MCPサーバーごとにツールを取得
    for server_config in request.mcp_servers:
        try:
            tools = await MCPService.fetch_tools_from_server(server_config)
            
            # ツール情報を変換
            tool_list = [
                Tool(
                    id=tool.name,
                    name=tool.name,
                    description=tool.description,
                    category="mcp",
                    is_active=True,
                    parameters={"required": [], "optional": []},
                    examples=[]
                )
                for tool in tools
            ]
            
            mcp_servers_status.append(MCPServerStatus(
                id=server_config.id,
                name=server_config.name,
                base_url=server_config.base_url,
                status="active" if tools else "inactive",
                error_message=None,
                tool_count=len(tools),
                active_tool_count=len(tools),
                last_checked_at=datetime.utcnow().isoformat() + "Z",
                tools=tool_list
            ))
        
        except Exception as e:
            logger.error(f"Error fetching tools from {server_config.name}: {e}")
            mcp_servers_status.append(MCPServerStatus(
                id=server_config.id,
                name=server_config.name,
                base_url=server_config.base_url,
                status="error",
                error_message=str(e),
                tool_count=0,
                active_tool_count=0,
                last_checked_at=datetime.utcnow().isoformat() + "Z",
                tools=[]
            ))
    
    # 基本ツールを取得
    basic_tools_list = []
    if request.include_basic_tools:
        basic_tools = get_basic_tools()
        basic_tools_list = [
            Tool(
                id=tool.name,
                name=tool.name,
                description=tool.description,
                category="basic",
                is_active=True,
                parameters={"required": [], "optional": []},
                examples=[]
            )
            for tool in basic_tools
        ]
    
    # サマリーを作成
    active_servers = sum(1 for s in mcp_servers_status if s.status == "active")
    total_mcp_tools = sum(s.tool_count for s in mcp_servers_status)
    
    return ToolsResponse(
        mcp_servers=mcp_servers_status,
        basic_tools=basic_tools_list,
        summary={
            "total_servers": len(request.mcp_servers),
            "active_servers": active_servers,
            "total_tools": total_mcp_tools + len(basic_tools_list),
            "active_tools": total_mcp_tools + len(basic_tools_list),
            "basic_tools": len(basic_tools_list),
            "mcp_tools": total_mcp_tools
        }
    )

