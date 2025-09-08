from typing import List, Dict, Any
from fastapi import APIRouter, Depends, status
from app.models.agent import Agent, AgentCreate, AgentUpdate, AgentPreset, AgentSecret
from app.security.auth import get_current_user
from app.security.rate_limit import limiter, RATE_LIMITS
from app.services.agent_service import AgentService
from app.services.secret_manager import SecretManager
from app.utils.logger import logger
from app.utils.exceptions import ResourceNotFoundException, ValidationException

router = APIRouter(prefix="/agents")


@router.post("", response_model=Agent, status_code=status.HTTP_201_CREATED)
async def create_agent(
    agent_data: AgentCreate,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Agent:
    """
    新規エージェントを作成
    
    Args:
        agent_data: エージェント作成データ
        current_user: 現在のユーザー
        
    Returns:
        作成されたエージェント
    """
    try:
        agent_service = AgentService()
        agent = await agent_service.create_agent(
            user_id=current_user["id"],
            agent_data=agent_data
        )
        
        logger.info(f"Agent created: {agent.id} by user {current_user['id']}")
        return agent
        
    except Exception as e:
        logger.error(f"Create agent error: {str(e)}", exc_info=True)
        raise


@router.get("/{agent_id}", response_model=Agent)
async def get_agent(
    agent_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Agent:
    """
    エージェント公開情報を取得
    
    Args:
        agent_id: エージェントID
        current_user: 現在のユーザー
        
    Returns:
        エージェント情報（公開情報のみ）
        
    Raises:
        ResourceNotFoundException: エージェントが見つからない
    """
    try:
        agent_service = AgentService()
        agent = await agent_service.get_agent(agent_id, current_user["id"])
        
        if not agent:
            raise ResourceNotFoundException("Agent", agent_id)
        
        return agent
        
    except Exception as e:
        logger.error(f"Get agent error: {str(e)}", exc_info=True)
        raise


@router.put("/{agent_id}", response_model=Agent)
async def update_agent(
    agent_id: str,
    update_data: AgentUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Agent:
    """
    エージェント情報を更新
    
    Args:
        agent_id: エージェントID
        update_data: 更新データ
        current_user: 現在のユーザー
        
    Returns:
        更新されたエージェント
        
    Raises:
        ResourceNotFoundException: エージェントが見つからない
    """
    try:
        agent_service = AgentService()
        agent = await agent_service.update_agent(
            agent_id=agent_id,
            user_id=current_user["id"],
            update_data=update_data
        )
        
        if not agent:
            raise ResourceNotFoundException("Agent", agent_id)
        
        logger.info(f"Agent updated: {agent_id} by user {current_user['id']}")
        return agent
        
    except Exception as e:
        logger.error(f"Update agent error: {str(e)}", exc_info=True)
        raise


@router.get("/presets", response_model=List[AgentPreset])
async def get_agent_presets() -> List[AgentPreset]:
    """
    利用可能なプリセットエージェント一覧を取得
    
    Returns:
        プリセットエージェントのリスト
    """
    try:
        agent_service = AgentService()
        presets = await agent_service.get_presets()
        return presets
        
    except Exception as e:
        logger.error(f"Get presets error: {str(e)}", exc_info=True)
        raise


@router.post("/{agent_id}/secrets", status_code=status.HTTP_201_CREATED)
@limiter.limit(RATE_LIMITS["secret"])
async def save_agent_secrets(
    agent_id: str,
    secrets: AgentSecret,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, str]:
    """
    エージェントの機密設定を保存（サーバーサイドのみ）
    
    Args:
        agent_id: エージェントID
        secrets: 機密設定データ
        current_user: 現在のユーザー
        
    Returns:
        成功メッセージ
        
    Raises:
        ResourceNotFoundException: エージェントが見つからない
        ValidationException: バリデーションエラー
    """
    try:
        # エージェントの存在確認と権限チェック
        agent_service = AgentService()
        agent = await agent_service.get_agent(agent_id, current_user["id"])
        
        if not agent:
            raise ResourceNotFoundException("Agent", agent_id)
        
        # 機密情報の保存
        secret_manager = SecretManager()
        await secret_manager.save_agent_secrets(
            agent_id=agent_id,
            user_id=current_user["id"],
            secrets=secrets
        )
        
        logger.info(f"Secrets saved for agent {agent_id} by user {current_user['id']}")
        return {"message": "Secrets saved successfully"}
        
    except Exception as e:
        logger.error(f"Save secrets error: {str(e)}", exc_info=True)
        raise


@router.put("/{agent_id}/secrets")
@limiter.limit(RATE_LIMITS["secret"])
async def update_agent_secrets(
    agent_id: str,
    secrets: AgentSecret,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, str]:
    """
    エージェントの機密設定を更新
    
    Args:
        agent_id: エージェントID
        secrets: 機密設定データ
        current_user: 現在のユーザー
        
    Returns:
        成功メッセージ
    """
    try:
        # エージェントの存在確認と権限チェック
        agent_service = AgentService()
        agent = await agent_service.get_agent(agent_id, current_user["id"])
        
        if not agent:
            raise ResourceNotFoundException("Agent", agent_id)
        
        # 機密情報の更新
        secret_manager = SecretManager()
        await secret_manager.update_agent_secrets(
            agent_id=agent_id,
            user_id=current_user["id"],
            secrets=secrets
        )
        
        logger.info(f"Secrets updated for agent {agent_id} by user {current_user['id']}")
        return {"message": "Secrets updated successfully"}
        
    except Exception as e:
        logger.error(f"Update secrets error: {str(e)}", exc_info=True)
        raise


@router.delete("/{agent_id}/secrets", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit(RATE_LIMITS["secret"])
async def delete_agent_secrets(
    agent_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    エージェントの機密設定を削除
    
    Args:
        agent_id: エージェントID
        current_user: 現在のユーザー
    """
    try:
        # エージェントの存在確認と権限チェック
        agent_service = AgentService()
        agent = await agent_service.get_agent(agent_id, current_user["id"])
        
        if not agent:
            raise ResourceNotFoundException("Agent", agent_id)
        
        # 機密情報の削除
        secret_manager = SecretManager()
        await secret_manager.delete_agent_secrets(
            agent_id=agent_id,
            user_id=current_user["id"]
        )
        
        logger.info(f"Secrets deleted for agent {agent_id} by user {current_user['id']}")
        
    except Exception as e:
        logger.error(f"Delete secrets error: {str(e)}", exc_info=True)
        raise