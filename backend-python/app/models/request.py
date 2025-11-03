"""
リクエストスキーマ
Pydanticモデルによるバリデーション
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum


class MessageRole(str, Enum):
    """メッセージロール"""
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class CompletionMode(str, Enum):
    """完了モード"""
    AUTO = "auto"
    TOOLS_REQUIRED = "tools_required"
    COMPLETION_ONLY = "completion_only"


class ConversationMessage(BaseModel):
    """会話メッセージ"""
    role: MessageRole
    content: str


class AgentConfig(BaseModel):
    """エージェント設定"""
    provider: str = "openai"
    model: str = "gpt-4.1"
    temperature: float = Field(0.7, ge=0.0, le=2.0)
    max_tokens: int = Field(2000, ge=1, le=8000)
    persona: str = "assistant"
    custom_system_prompt: Optional[str] = None


class ServiceConfig(BaseModel):
    """サービス設定"""
    service_class: str
    tool_selection_mode: str = "all"  # "all" or "selected"
    selected_tools: List[str] = []
    api_key: Optional[str] = None  # 後方互換性のため残す（非推奨）
    headers: Optional[Dict[str, str]] = None
    auth: Optional[Dict[str, Any]] = None  # 認証情報（api_key, bot_token等、サービスごとに異なる）
    enabled: bool = True


class ChatRequest(BaseModel):
    """チャットリクエスト"""
    user_id: str
    conversation_id: str
    message: str = Field(..., min_length=1, max_length=10000)
    completion_mode: CompletionMode = CompletionMode.AUTO
    allowed_tools: Optional[List[str]] = None
    agent_config: AgentConfig = AgentConfig()
    services: List[ServiceConfig] = []
    conversation_history: List[ConversationMessage] = []


class ToolsRequest(BaseModel):
    """ツール一覧リクエスト"""
    user_id: str
    services: List[ServiceConfig]


class EnhancePromptRequest(BaseModel):
    """プロンプト強化リクエスト"""
    current_prompt: str = Field(..., max_length=5000, description="強化対象のシステムプロンプト")

