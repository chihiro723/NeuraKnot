from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from langchain.schema import HumanMessage, AIMessage
from app.database.supabase_client import DatabaseService
from app.utils.logger import logger
from app.models.chat import MessageRole


class MemoryService(DatabaseService):
    """記憶・学習管理サービス"""
    
    def __init__(self):
        super().__init__()
        self.memory_window = 10  # デフォルトの記憶ウィンドウサイズ
    
    async def get_conversation_memory(
        self,
        conversation_id: str,
        agent_id: str,
        window_size: Optional[int] = None
    ) -> List[Any]:
        """
        会話メモリを取得
        
        Args:
            conversation_id: 会話ID
            agent_id: エージェントID
            window_size: 取得するメッセージ数
            
        Returns:
            LangChain形式のメッセージリスト
        """
        try:
            limit = window_size or self.memory_window
            
            result = await self.execute_with_retry(
                lambda: self.client.table("messages")
                .select("role", "content", "created_at")
                .eq("conversation_id", conversation_id)
                .eq("agent_id", agent_id)
                .order("created_at", desc=False)
                .limit(limit)
                .execute()
            )
            
            messages = []
            for msg in result.data:
                if msg["role"] == MessageRole.USER.value:
                    messages.append(HumanMessage(content=msg["content"]))
                elif msg["role"] == MessageRole.ASSISTANT.value:
                    messages.append(AIMessage(content=msg["content"]))
            
            return messages
            
        except Exception as e:
            logger.error(f"Get conversation memory error: {str(e)}")
            return []
    
    async def update_conversation_memory(
        self,
        conversation_id: str,
        agent_id: str,
        user_message: str,
        ai_message: str
    ):
        """
        会話メモリを更新
        
        Args:
            conversation_id: 会話ID
            agent_id: エージェントID
            user_message: ユーザーメッセージ
            ai_message: AI応答
        """
        try:
            # メッセージの保存は ChatService.save_conversation で行うため、
            # ここではメモリの最適化や要約などの処理を行う
            
            # 長期記憶の要約（必要に応じて実装）
            await self._update_long_term_memory(conversation_id, agent_id)
            
            # コンテキストの更新
            await self._update_context(conversation_id, agent_id)
            
        except Exception as e:
            logger.error(f"Update conversation memory error: {str(e)}")
    
    async def _update_long_term_memory(
        self,
        conversation_id: str,
        agent_id: str
    ):
        """
        長期記憶を更新（要約・圧縮）
        
        Args:
            conversation_id: 会話ID
            agent_id: エージェントID
        """
        try:
            # メッセージ数を確認
            count_result = await self.execute_with_retry(
                lambda: self.client.table("messages")
                .select("id", count="exact")
                .eq("conversation_id", conversation_id)
                .eq("agent_id", agent_id)
                .execute()
            )
            
            message_count = count_result.count
            
            # 一定数を超えたら要約処理を実行
            if message_count > 50:
                # TODO: 古いメッセージを要約して保存
                logger.info(f"Long-term memory update needed for conversation {conversation_id}")
                
        except Exception as e:
            logger.error(f"Update long-term memory error: {str(e)}")
    
    async def _update_context(
        self,
        conversation_id: str,
        agent_id: str
    ):
        """
        会話コンテキストを更新
        
        Args:
            conversation_id: 会話ID
            agent_id: エージェントID
        """
        try:
            # コンテキスト情報の更新
            context_data = {
                "conversation_id": conversation_id,
                "agent_id": agent_id,
                "updated_at": datetime.utcnow().isoformat(),
                "metadata": {
                    "last_activity": datetime.utcnow().isoformat()
                }
            }
            
            # Upsert operation
            await self.execute_with_retry(
                lambda: self.client.table("conversation_contexts")
                .upsert(context_data)
                .execute()
            )
            
        except Exception as e:
            logger.error(f"Update context error: {str(e)}")
    
    async def get_agent_learning_data(
        self,
        agent_id: str,
        user_id: str,
        days: int = 30
    ) -> Dict[str, Any]:
        """
        エージェントの学習データを取得
        
        Args:
            agent_id: エージェントID
            user_id: ユーザーID
            days: 取得する日数
            
        Returns:
            学習データ
        """
        try:
            cutoff_date = (datetime.utcnow() - timedelta(days=days)).isoformat()
            
            # 会話統計
            stats_result = await self.execute_with_retry(
                lambda: self.client.table("messages")
                .select("conversation_id", count="exact")
                .eq("agent_id", agent_id)
                .gte("created_at", cutoff_date)
                .execute()
            )
            
            # トピック分析（簡易版）
            topics_result = await self.execute_with_retry(
                lambda: self.client.table("messages")
                .select("content")
                .eq("agent_id", agent_id)
                .eq("role", MessageRole.USER.value)
                .gte("created_at", cutoff_date)
                .limit(100)
                .execute()
            )
            
            return {
                "total_conversations": len(set(msg["conversation_id"] for msg in stats_result.data)),
                "total_messages": stats_result.count,
                "period_days": days,
                "topics": self._extract_topics(topics_result.data)
            }
            
        except Exception as e:
            logger.error(f"Get agent learning data error: {str(e)}")
            return {}
    
    def _extract_topics(self, messages: List[Dict[str, Any]]) -> List[str]:
        """
        メッセージからトピックを抽出（簡易版）
        
        Args:
            messages: メッセージリスト
            
        Returns:
            トピックリスト
        """
        # TODO: より高度なトピック分析の実装
        # 現時点では頻出単語の簡単な抽出のみ
        topics = []
        word_count = {}
        
        for msg in messages:
            words = msg["content"].lower().split()
            for word in words:
                if len(word) > 5:  # 5文字以上の単語のみ
                    word_count[word] = word_count.get(word, 0) + 1
        
        # 上位5つのトピックを返す
        sorted_words = sorted(word_count.items(), key=lambda x: x[1], reverse=True)
        topics = [word for word, count in sorted_words[:5]]
        
        return topics