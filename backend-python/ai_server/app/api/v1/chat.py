from fastapi import APIRouter, Depends, BackgroundTasks
from typing import Dict, Any
from app.models.chat import ChatRequest, ChatResponse, ConversationHistory
from app.security.auth import get_current_user
from app.security.rate_limit import limiter, RATE_LIMITS
from app.services.chat_service import ChatService
from app.services.agent_service import AgentService
from app.utils.logger import logger
from app.utils.exceptions import ResourceNotFoundException, AuthorizationException

router = APIRouter(prefix="/chat")


@router.post("/message", response_model=ChatResponse)
@limiter.limit(RATE_LIMITS["chat"])
async def send_message(
    request: ChatRequest,
    background_tasks: BackgroundTasks,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> ChatResponse:
    """
    AI応答を生成
    
    Args:
        request: チャットリクエスト
        background_tasks: バックグラウンドタスク
        current_user: 現在のユーザー
        
    Returns:
        AI応答
        
    Raises:
        ResourceNotFoundException: エージェントが見つからない
        AuthorizationException: アクセス権限がない
    """
    try:
        # エージェントの存在確認と権限チェック
        agent_service = AgentService()
        agent = await agent_service.get_agent(request.agent_id, current_user["id"])
        
        if not agent:
            raise ResourceNotFoundException("Agent", request.agent_id)
        
        # チャットサービスで応答生成
        chat_service = ChatService()
        response = await chat_service.generate_response(
            user_id=current_user["id"],
            agent_id=request.agent_id,
            message=request.message,
            conversation_id=request.conversation_id,
            context=request.context
        )
        
        # バックグラウンドで会話履歴を保存
        background_tasks.add_task(
            chat_service.save_conversation,
            user_id=current_user["id"],
            agent_id=request.agent_id,
            conversation_id=response.conversation_id,
            user_message=request.message,
            ai_response=response.message
        )
        
        logger.info(
            f"Chat message processed for user {current_user['id']} with agent {request.agent_id}"
        )
        
        return response
        
    except Exception as e:
        logger.error(f"Chat error: {str(e)}", exc_info=True)
        raise


@router.get("/history/{agent_id}", response_model=ConversationHistory)
async def get_chat_history(
    agent_id: str,
    conversation_id: str = None,
    limit: int = 50,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> ConversationHistory:
    """
    会話履歴を取得
    
    Args:
        agent_id: エージェントID
        conversation_id: 会話ID（オプション）
        limit: 取得するメッセージ数の上限
        current_user: 現在のユーザー
        
    Returns:
        会話履歴
        
    Raises:
        ResourceNotFoundException: エージェントが見つからない
        AuthorizationException: アクセス権限がない
    """
    try:
        # エージェントの存在確認と権限チェック
        agent_service = AgentService()
        agent = await agent_service.get_agent(agent_id, current_user["id"])
        
        if not agent:
            raise ResourceNotFoundException("Agent", agent_id)
        
        # 会話履歴の取得
        chat_service = ChatService()
        history = await chat_service.get_conversation_history(
            user_id=current_user["id"],
            agent_id=agent_id,
            conversation_id=conversation_id,
            limit=limit
        )
        
        return history
        
    except Exception as e:
        logger.error(f"Get chat history error: {str(e)}", exc_info=True)
        raise