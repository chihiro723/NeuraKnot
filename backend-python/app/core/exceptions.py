"""
カスタム例外定義
BridgeSpeak固有のエラーハンドリング
"""
from typing import Optional, Dict, Any


class BridgeSpeakException(Exception):
    """基底カスタム例外"""
    
    def __init__(
        self,
        code: str,
        message: str,
        details: Optional[Dict[str, Any]] = None,
        status_code: int = 500
    ):
        self.code = code
        self.message = message
        self.details = details or {}
        self.status_code = status_code
        super().__init__(message)


# ========================================
# バリデーションエラー (400)
# ========================================

class ValidationError(BridgeSpeakException):
    """バリデーションエラー"""
    
    def __init__(self, message: str, details: Optional[Dict] = None):
        super().__init__("VALIDATION_ERROR", message, details, 400)


class InvalidCompletionMode(BridgeSpeakException):
    """不正なcompletion_mode"""
    
    def __init__(self, mode: str):
        super().__init__(
            "INVALID_COMPLETION_MODE",
            f"不正なcompletion_mode: {mode}",
            {"provided_mode": mode},
            400
        )


class InvalidModel(BridgeSpeakException):
    """不正なモデル"""
    
    def __init__(self, provider: str, model: str, available_models: list):
        super().__init__(
            "INVALID_MODEL",
            f"プロバイダー '{provider}' では '{model}' は利用できません",
            {
                "provider": provider,
                "provided_model": model,
                "available_models": available_models
            },
            400
        )


class InvalidProvider(BridgeSpeakException):
    """不正なプロバイダー"""
    
    def __init__(self, provider: str, available_providers: list):
        super().__init__(
            "INVALID_PROVIDER",
            f"不正なプロバイダー: {provider}",
            {
                "provided_provider": provider,
                "available_providers": available_providers
            },
            400
        )


# ========================================
# ツール関連エラー (422)
# ========================================

class ToolsRequiredButNoneAvailable(BridgeSpeakException):
    """ツール必須だが利用可能なツールなし"""
    
    def __init__(self):
        super().__init__(
            "TOOLS_REQUIRED_BUT_NONE_AVAILABLE",
            "completion_modeが'tools_required'ですが、利用可能なツールがありません",
            status_code=422
        )


class ToolsRequiredButNotUsed(BridgeSpeakException):
    """ツール必須だがAIが使用しなかった"""
    
    def __init__(self):
        super().__init__(
            "TOOLS_REQUIRED_BUT_NOT_USED",
            "completion_modeが'tools_required'ですが、AIがツールを使用しませんでした",
            status_code=422
        )


class ToolsRequiredButAllDisallowed(BridgeSpeakException):
    """ツール必須だが全て拒否された"""
    
    def __init__(self):
        super().__init__(
            "TOOLS_REQUIRED_BUT_ALL_DISALLOWED",
            "completion_modeが'tools_required'ですが、allowed_toolsで全てのツールが拒否されています",
            status_code=422
        )


class MCPToolExecutionError(BridgeSpeakException):
    """MCPツール実行エラー"""
    
    def __init__(self, tool_name: str, error_message: str):
        super().__init__(
            "MCP_TOOL_EXECUTION_ERROR",
            f"MCPツール '{tool_name}' の実行に失敗しました",
            {"tool_name": tool_name, "error": error_message},
            422
        )


# ========================================
# レート制限エラー (429)
# ========================================

class RateLimitExceeded(BridgeSpeakException):
    """レート制限超過"""
    
    def __init__(self, retry_after: int = 60):
        super().__init__(
            "RATE_LIMIT_EXCEEDED",
            f"レート制限を超過しました。{retry_after}秒後に再試行してください",
            {"retry_after": retry_after},
            429
        )


# ========================================
# サーバーエラー (500)
# ========================================

class InternalError(BridgeSpeakException):
    """内部エラー"""
    
    def __init__(self, message: str = "内部エラーが発生しました", details: Optional[Dict] = None):
        super().__init__("INTERNAL_ERROR", message, details, 500)


# ========================================
# 外部サービスエラー (503)
# ========================================

class MCPConnectionError(BridgeSpeakException):
    """MCP接続エラー"""
    
    def __init__(self, server_name: str, details: Optional[Dict] = None):
        super().__init__(
            "MCP_CONNECTION_ERROR",
            f"MCPサーバー '{server_name}' に接続できません",
            details,
            503
        )


class LLMAPIError(BridgeSpeakException):
    """LLM APIエラー"""
    
    def __init__(self, provider: str, error_message: str):
        super().__init__(
            "LLM_API_ERROR",
            f"LLM API ({provider}) でエラーが発生しました",
            {"provider": provider, "error": error_message},
            503
        )


# ========================================
# タイムアウトエラー (504)
# ========================================

class MCPTimeoutError(BridgeSpeakException):
    """MCPタイムアウト"""
    
    def __init__(self, server_name: str, timeout: float):
        super().__init__(
            "MCP_TIMEOUT_ERROR",
            f"MCPサーバー '{server_name}' がタイムアウトしました ({timeout}秒)",
            {"server_name": server_name, "timeout": timeout},
            504
        )


class LLMAPITimeout(BridgeSpeakException):
    """LLM APIタイムアウト"""
    
    def __init__(self, provider: str, timeout: float):
        super().__init__(
            "LLM_API_TIMEOUT",
            f"LLM API ({provider}) がタイムアウトしました ({timeout}秒)",
            {"provider": provider, "timeout": timeout},
            504
        )

