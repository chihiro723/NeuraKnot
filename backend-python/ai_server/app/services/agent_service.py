from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid
from app.models.agent import Agent, AgentCreate, AgentUpdate, AgentPreset, AgentPersonality, PersonalityTrait
# from app.database.postgres_client import DatabaseService
from app.utils.logger import logger
from app.utils.exceptions import DatabaseException, ValidationException, AuthorizationException


class AgentService:
    """エージェント管理サービス"""
    
    def __init__(self):
        self._presets = self._load_presets()
    
    async def create_agent(
        self,
        user_id: str,
        agent_data: AgentCreate
    ) -> Agent:
        """
        新規エージェントを作成
        
        Args:
            user_id: ユーザーID
            agent_data: エージェント作成データ
            
        Returns:
            作成されたエージェント
            
        Raises:
            DatabaseException: データベースエラー
        """
        try:
            agent_dict = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "name": agent_data.name,
                "description": agent_data.description,
                "avatar_url": agent_data.avatar_url,
                "type": agent_data.type.value,
                "system_prompt": agent_data.system_prompt,
                "model": agent_data.model,
                "temperature": agent_data.temperature,
                "max_tokens": agent_data.max_tokens,
                "status": "active",
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
                "metadata": agent_data.metadata or {}
            }
            
            # パーソナリティの追加
            if agent_data.personality:
                agent_dict["personality"] = agent_data.personality.dict()
            
            result = await self.execute_with_retry(
                lambda: self.client.table("agents").insert(agent_dict).execute()
            )
            
            return Agent(**result.data[0])
            
        except Exception as e:
            self.handle_database_error(e, "create_agent")
    
    async def get_agent(
        self,
        agent_id: str,
        user_id: str
    ) -> Optional[Agent]:
        """
        エージェント情報を取得
        
        Args:
            agent_id: エージェントID
            user_id: ユーザーID
            
        Returns:
            エージェント情報（見つからない場合はNone）
        """
        try:
            result = await self.execute_with_retry(
                lambda: self.client.table("agents")
                .select("*")
                .eq("id", agent_id)
                .eq("user_id", user_id)
                .single()
                .execute()
            )
            
            if result.data:
                return Agent(**result.data)
            return None
            
        except Exception as e:
            if "not found" in str(e).lower():
                return None
            self.handle_database_error(e, "get_agent")
    
    async def update_agent(
        self,
        agent_id: str,
        user_id: str,
        update_data: AgentUpdate
    ) -> Optional[Agent]:
        """
        エージェント情報を更新
        
        Args:
            agent_id: エージェントID
            user_id: ユーザーID
            update_data: 更新データ
            
        Returns:
            更新されたエージェント
            
        Raises:
            AuthorizationException: 権限エラー
            DatabaseException: データベースエラー
        """
        try:
            # 既存のエージェントを確認
            existing = await self.get_agent(agent_id, user_id)
            if not existing:
                return None
            
            # 更新データの準備
            update_dict = update_data.dict(exclude_unset=True)
            update_dict["updated_at"] = datetime.utcnow().isoformat()
            
            # パーソナリティの更新
            if "personality" in update_dict and update_dict["personality"]:
                update_dict["personality"] = update_dict["personality"].dict()
            
            result = await self.execute_with_retry(
                lambda: self.client.table("agents")
                .update(update_dict)
                .eq("id", agent_id)
                .eq("user_id", user_id)
                .execute()
            )
            
            if result.data:
                return Agent(**result.data[0])
            return None
            
        except Exception as e:
            self.handle_database_error(e, "update_agent")
    
    async def list_agents(
        self,
        user_id: str,
        limit: int = 100,
        offset: int = 0
    ) -> List[Agent]:
        """
        ユーザーのエージェント一覧を取得
        
        Args:
            user_id: ユーザーID
            limit: 取得数上限
            offset: オフセット
            
        Returns:
            エージェントのリスト
        """
        try:
            result = await self.execute_with_retry(
                lambda: self.client.table("agents")
                .select("*")
                .eq("user_id", user_id)
                .eq("status", "active")
                .order("created_at", desc=True)
                .range(offset, offset + limit - 1)
                .execute()
            )
            
            return [Agent(**agent) for agent in result.data]
            
        except Exception as e:
            self.handle_database_error(e, "list_agents")
    
    async def delete_agent(
        self,
        agent_id: str,
        user_id: str
    ) -> bool:
        """
        エージェントを削除（論理削除）
        
        Args:
            agent_id: エージェントID
            user_id: ユーザーID
            
        Returns:
            削除成功時True
        """
        try:
            result = await self.execute_with_retry(
                lambda: self.client.table("agents")
                .update({
                    "status": "archived",
                    "updated_at": datetime.utcnow().isoformat()
                })
                .eq("id", agent_id)
                .eq("user_id", user_id)
                .execute()
            )
            
            return len(result.data) > 0
            
        except Exception as e:
            self.handle_database_error(e, "delete_agent")
    
    async def get_presets(self) -> List[AgentPreset]:
        """
        プリセットエージェント一覧を取得
        
        Returns:
            プリセットエージェントのリスト
        """
        return self._presets
    
    def _load_presets(self) -> List[AgentPreset]:
        """
        プリセットエージェントを読み込み
        
        Returns:
            プリセットエージェントのリスト
        """
        return [
            AgentPreset(
                id="preset_assistant",
                name="General Assistant",
                description="A helpful and friendly AI assistant for general tasks",
                category="General",
                personality=AgentPersonality(
                    traits=[
                        PersonalityTrait(name="helpfulness", value=0.9),
                        PersonalityTrait(name="friendliness", value=0.8)
                    ],
                    tone="friendly",
                    formality="casual"
                ),
                system_prompt="You are a helpful AI assistant. Be friendly and informative.",
                model="gpt-3.5-turbo",
                temperature=0.7,
                tags=["general", "assistant", "helpful"]
            ),
            AgentPreset(
                id="preset_professional",
                name="Professional Advisor",
                description="A formal and professional AI advisor for business contexts",
                category="Business",
                personality=AgentPersonality(
                    traits=[
                        PersonalityTrait(name="professionalism", value=0.95),
                        PersonalityTrait(name="expertise", value=0.9)
                    ],
                    tone="professional",
                    formality="formal"
                ),
                system_prompt="You are a professional business advisor. Provide expert advice in a formal manner.",
                model="gpt-4",
                temperature=0.5,
                tags=["business", "professional", "formal"]
            ),
            AgentPreset(
                id="preset_creative",
                name="Creative Partner",
                description="A creative and imaginative AI for brainstorming and creative tasks",
                category="Creative",
                personality=AgentPersonality(
                    traits=[
                        PersonalityTrait(name="creativity", value=0.95),
                        PersonalityTrait(name="imagination", value=0.9)
                    ],
                    tone="enthusiastic",
                    formality="casual"
                ),
                system_prompt="You are a creative partner. Help with brainstorming and creative ideas.",
                model="gpt-4",
                temperature=0.9,
                tags=["creative", "brainstorming", "imaginative"]
            )
        ]