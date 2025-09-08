from typing import Dict, Any, List
from fastapi import APIRouter, Depends, status
from app.security.auth import get_current_user
from app.security.rate_limit import limiter, RATE_LIMITS
from app.services.agent_service import AgentService
from app.mcp.mcp_client import MCPService
from app.utils.logger import logger
from app.utils.exceptions import ResourceNotFoundException, MCPException

router = APIRouter(prefix="/mcp")


@router.post("/{agent_id}/configure", status_code=status.HTTP_201_CREATED)
@limiter.limit(RATE_LIMITS["mcp"])
async def configure_mcp(
    agent_id: str,
    service_name: str,
    config: Dict[str, Any],
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, str]:
    """
    エージェントのMCP設定を構成
    
    Args:
        agent_id: エージェントID
        service_name: MCPサービス名
        config: サービス設定
        current_user: 現在のユーザー
        
    Returns:
        成功メッセージ
        
    Raises:
        ResourceNotFoundException: エージェントが見つからない
        MCPException: MCP設定エラー
    """
    try:
        # エージェントの存在確認と権限チェック
        agent_service = AgentService()
        agent = await agent_service.get_agent(agent_id, current_user["id"])
        
        if not agent:
            raise ResourceNotFoundException("Agent", agent_id)
        
        # MCP設定の保存
        mcp_service = MCPService()
        await mcp_service.configure_service(
            agent_id=agent_id,
            user_id=current_user["id"],
            service_name=service_name,
            config=config
        )
        
        logger.info(
            f"MCP configured for agent {agent_id}, service {service_name} by user {current_user['id']}"
        )
        return {"message": f"MCP service {service_name} configured successfully"}
        
    except Exception as e:
        logger.error(f"Configure MCP error: {str(e)}", exc_info=True)
        raise


@router.get("/services", response_model=List[Dict[str, Any]])
async def get_available_services() -> List[Dict[str, Any]]:
    """
    利用可能なMCPサービス一覧を取得
    
    Returns:
        MCPサービスのリスト
    """
    try:
        mcp_service = MCPService()
        services = await mcp_service.get_available_services()
        return services
        
    except Exception as e:
        logger.error(f"Get MCP services error: {str(e)}", exc_info=True)
        raise


@router.post("/{agent_id}/test")
async def test_mcp_connection(
    agent_id: str,
    service_name: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    MCP接続をテスト
    
    Args:
        agent_id: エージェントID
        service_name: MCPサービス名
        current_user: 現在のユーザー
        
    Returns:
        テスト結果
        
    Raises:
        ResourceNotFoundException: エージェントが見つからない
        MCPException: MCP接続エラー
    """
    try:
        # エージェントの存在確認と権限チェック
        agent_service = AgentService()
        agent = await agent_service.get_agent(agent_id, current_user["id"])
        
        if not agent:
            raise ResourceNotFoundException("Agent", agent_id)
        
        # MCP接続テスト
        mcp_service = MCPService()
        result = await mcp_service.test_connection(
            agent_id=agent_id,
            user_id=current_user["id"],
            service_name=service_name
        )
        
        logger.info(
            f"MCP connection test for agent {agent_id}, service {service_name}: {result['status']}"
        )
        return result
        
    except Exception as e:
        logger.error(f"Test MCP connection error: {str(e)}", exc_info=True)
        raise