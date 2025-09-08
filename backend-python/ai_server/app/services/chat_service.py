import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List
from langchain_openai import ChatOpenAI
from langchain.schema import SystemMessage, HumanMessage, AIMessage
from langchain.memory import ConversationBufferMemory
from app.models.chat import ChatResponse, ConversationHistory, ChatMessage, MessageRole
from app.services.agent_service import AgentService
from app.services.memory_service import MemoryService
from app.services.secret_manager import SecretManager
from app.database.supabase_client import DatabaseService
from app.config import get_settings
from app.utils.logger import logger
from app.utils.exceptions import AIServiceException, DatabaseException


class ChatService(DatabaseService):
    """チャット処理サービス"""
    
    def __init__(self):
        super().__init__()
        self.settings = get_settings()
        self.agent_service = AgentService()
        self.memory_service = MemoryService()
        self.secret_manager = SecretManager()
    
    async def generate_response(
        self,
        user_id: str,
        agent_id: str,
        message: str,
        conversation_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> ChatResponse:
        """
        AI応答を生成
        
        Args:
            user_id: ユーザーID
            agent_id: エージェントID
            message: ユーザーメッセージ
            conversation_id: 会話ID
            context: 追加コンテキスト
            
        Returns:
            AI応答
            
        Raises:
            AIServiceException: AI処理エラー
        """
        try:
            # エージェント情報の取得
            agent = await self.agent_service.get_agent(agent_id, user_id)
            if not agent:
                raise AIServiceException("Agent not found")
            
            # 会話IDの生成または検証
            if not conversation_id:
                conversation_id = str(uuid.uuid4())
            
            # メモリからコンテキスト取得
            conversation_memory = await self.memory_service.get_conversation_memory(
                conversation_id, agent_id
            )
            
            # システムプロンプトの構築
            system_prompt = await self._build_system_prompt(agent, context)
            
            # LangChainモデルの初期化
            llm = await self._initialize_llm(agent)
            
            # メッセージの構築
            messages = [SystemMessage(content=system_prompt)]
            
            # 会話履歴の追加
            if conversation_memory:
                messages.extend(conversation_memory)
            
            messages.append(HumanMessage(content=message))
            
            # AI応答の生成
            try:
                response = await llm.ainvoke(messages)
                ai_message = response.content
            except Exception as e:
                logger.error(f"LLM invocation error: {str(e)}")
                raise AIServiceException(f"Failed to generate AI response: {str(e)}")
            
            # 応答の作成
            chat_response = ChatResponse(
                conversation_id=conversation_id,
                message=ai_message,
                agent_id=agent_id,
                timestamp=datetime.utcnow(),
                metadata={
                    "model": agent.model,
                    "temperature": agent.temperature
                }
            )
            
            # メモリの更新
            await self.memory_service.update_conversation_memory(
                conversation_id=conversation_id,
                agent_id=agent_id,
                user_message=message,
                ai_message=ai_message
            )
            
            return chat_response
            
        except Exception as e:
            logger.error(f"Generate response error: {str(e)}", exc_info=True)
            raise AIServiceException(f"Failed to generate response: {str(e)}")
    
    async def _initialize_llm(self, agent) -> ChatOpenAI:
        """
        LLMモデルを初期化
        
        Args:
            agent: エージェント情報
            
        Returns:
            初期化されたLLMモデル
        """
        # 機密情報からAPIキーを取得
        secrets = await self.secret_manager.get_agent_secrets(agent.id, agent.user_id)
        api_key = self.settings.openai_api_key  # デフォルトのAPIキー
        
        if secrets and "api_keys" in secrets:
            custom_api_key = secrets["api_keys"].get("openai")
            if custom_api_key:
                api_key = custom_api_key
        
        return ChatOpenAI(
            model=agent.model,
            temperature=agent.temperature,
            max_tokens=agent.max_tokens,
            api_key=api_key
        )
    
    async def _build_system_prompt(
        self,
        agent,
        context: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        システムプロンプトを構築
        
        Args:
            agent: エージェント情報
            context: 追加コンテキスト
            
        Returns:
            システムプロンプト
        """
        base_prompt = agent.system_prompt or "You are a helpful AI assistant."
        
        # パーソナリティの追加
        if agent.personality:
            personality_prompt = f"\n\nPersonality traits: {agent.personality.tone}, {agent.personality.formality}"
            if agent.personality.custom_instructions:
                personality_prompt += f"\n{agent.personality.custom_instructions}"
            base_prompt += personality_prompt
        
        # コンテキストの追加
        if context:
            context_prompt = "\n\nAdditional context:"
            for key, value in context.items():
                context_prompt += f"\n- {key}: {value}"
            base_prompt += context_prompt
        
        return base_prompt
    
    async def save_conversation(
        self,
        user_id: str,
        agent_id: str,
        conversation_id: str,
        user_message: str,
        ai_response: str
    ):
        """
        会話履歴を保存
        
        Args:
            user_id: ユーザーID
            agent_id: エージェントID
            conversation_id: 会話ID
            user_message: ユーザーメッセージ
            ai_response: AI応答
        """
        try:
            # ユーザーメッセージの保存
            await self.execute_with_retry(
                lambda: self.client.table("messages").insert({
                    "conversation_id": conversation_id,
                    "user_id": user_id,
                    "agent_id": agent_id,
                    "role": MessageRole.USER.value,
                    "content": user_message,
                    "created_at": datetime.utcnow().isoformat()
                }).execute()
            )
            
            # AI応答の保存
            await self.execute_with_retry(
                lambda: self.client.table("messages").insert({
                    "conversation_id": conversation_id,
                    "user_id": user_id,
                    "agent_id": agent_id,
                    "role": MessageRole.ASSISTANT.value,
                    "content": ai_response,
                    "created_at": datetime.utcnow().isoformat()
                }).execute()
            )
            
        except Exception as e:
            self.handle_database_error(e, "save_conversation")
    
    async def get_conversation_history(
        self,
        user_id: str,
        agent_id: str,
        conversation_id: Optional[str] = None,
        limit: int = 50
    ) -> ConversationHistory:
        """
        会話履歴を取得
        
        Args:
            user_id: ユーザーID
            agent_id: エージェントID
            conversation_id: 会話ID
            limit: 取得上限
            
        Returns:
            会話履歴
        """
        try:
            query = self.client.table("messages").select("*").eq("user_id", user_id).eq("agent_id", agent_id)
            
            if conversation_id:
                query = query.eq("conversation_id", conversation_id)
            
            result = await self.execute_with_retry(
                lambda: query.order("created_at", desc=False).limit(limit).execute()
            )
            
            messages = [
                ChatMessage(
                    role=MessageRole(msg["role"]),
                    content=msg["content"],
                    timestamp=datetime.fromisoformat(msg["created_at"]),
                    metadata=msg.get("metadata")
                )
                for msg in result.data
            ]
            
            return ConversationHistory(
                conversation_id=conversation_id or "all",
                agent_id=agent_id,
                messages=messages,
                created_at=messages[0].timestamp if messages else datetime.utcnow(),
                updated_at=messages[-1].timestamp if messages else datetime.utcnow()
            )
            
        except Exception as e:
            self.handle_database_error(e, "get_conversation_history")