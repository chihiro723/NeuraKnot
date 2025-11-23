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
    name: Optional[str] = None  # 発言者名（英数字・アンダースコア・ハイフンのみ、最大64文字）


class AgentConfig(BaseModel):
    """エージェント設定"""
    provider: str = "openai"
    model: str = "gpt-4.1"
    temperature: float = Field(0.7, ge=0.0, le=2.0)
    max_tokens: int = Field(2000, ge=1, le=8000)
    persona: str = "assistant"
    custom_system_prompt: Optional[str] = None
    agent_name: Optional[str] = None  # エージェント名


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
    user_name: str = "ユーザー"  # ユーザー名（デフォルト値を設定）
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


class MessageItem(BaseModel):
    """メッセージアイテム"""
    sender_type: str = Field(..., description="送信者タイプ (user/ai)")
    sender_name: Optional[str] = Field(None, description="送信者名（グループチャット用）")
    content: str = Field(..., description="メッセージ内容")
    created_at: str = Field(..., description="作成日時")


class SuggestQuestionsRequest(BaseModel):
    """グループチャットの質問候補生成リクエスト"""
    group_chat_id: str = Field(..., description="グループチャットID")
    group_chat_name: str = Field(..., description="グループチャット名")
    system_prompt: Optional[str] = Field(None, description="システムプロンプト")
    recent_messages: List[MessageItem] = Field(..., description="最新のメッセージリスト", min_length=1)


class SuggestConversationQuestionsRequest(BaseModel):
    """1対1会話の質問候補生成リクエスト"""
    conversation_id: str = Field(..., description="会話ID")
    agent_name: str = Field(..., description="AIエージェント名")
    agent_persona: str = Field(..., description="AIエージェントのペルソナ")
    system_prompt: Optional[str] = Field(None, description="システムプロンプト")
    recent_messages: List[MessageItem] = Field(..., description="最新のメッセージリスト", min_length=1)

