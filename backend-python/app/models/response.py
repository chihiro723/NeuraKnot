"""
レスポンススキーマ
Pydanticモデルによるレスポンス定義
"""
from pydantic import BaseModel
from typing import List, Optional, Dict, Any


class TokenUsage(BaseModel):
    """トークン使用量"""
    prompt: int
    completion: int
    total: int


class ToolCall(BaseModel):
    """ツール呼び出し情報"""
    tool_id: str
    tool_name: str
    status: str  # "completed" or "failed"
    input: Dict[str, Any]
    output: str
    error: Optional[str] = None
    execution_time_ms: int


class ChatMetadata(BaseModel):
    """チャットメタデータ"""
    model: str
    provider: str
    tokens_used: TokenUsage
    processing_time_ms: int
    completion_mode_used: str
    tools_available: int
    basic_tools_count: int
    service_tools_count: int


class ChatResponse(BaseModel):
    """チャットレスポンス"""
    conversation_id: str
    message: str
    tool_calls: List[ToolCall] = []
    metadata: ChatMetadata


class ToolParameter(BaseModel):
    """ツールパラメータ"""
    name: str
    type: str
    description: str
    default: Optional[Any] = None


class ToolExample(BaseModel):
    """ツール使用例"""
    description: str
    input: Dict[str, Any]


class Tool(BaseModel):
    """ツール情報"""
    id: str
    name: str
    description: str
    category: str
    is_active: bool
    parameters: Dict[str, List[ToolParameter]]
    examples: List[ToolExample] = []


class ServiceStatus(BaseModel):
    """サービスステータス"""
    id: str
    name: str
    service_class: str
    status: str  # "active", "inactive", "error"
    error_message: Optional[str] = None
    tool_count: int
    active_tool_count: int
    last_checked_at: str
    tools: List[Tool]


class ToolsResponse(BaseModel):
    """ツール一覧レスポンス"""
    services: List[ServiceStatus]
    basic_tools: List[Tool]
    summary: Dict[str, int]


class HealthResponse(BaseModel):
    """ヘルスチェックレスポンス"""
    status: str
    service: str
    timestamp: str
    dependencies: Dict[str, str]
    errors: list = []


class EnhancePromptResponse(BaseModel):
    """プロンプト強化レスポンス"""
    enhanced_prompt: str
    metadata: Optional[Dict[str, Any]] = None

