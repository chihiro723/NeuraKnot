"""
LLMファクトリ
OpenAI、Anthropic、Google Geminiの3プロバイダーに対応
"""
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_google_genai import ChatGoogleGenerativeAI
from app.core.config import settings
from app.core.exceptions import ValidationError, InvalidProvider, InvalidModel
from typing import Dict, Optional
import logging

logger = logging.getLogger(__name__)


class LLMFactory:
    """LLMインスタンスを生成するファクトリクラス"""
    
    # プロバイダーごとの利用可能モデル
    AVAILABLE_MODELS = {
        "openai": [
            "gpt-4.1",
            "gpt-4.1-mini",
            "gpt-4.1-nano"
        ],
        "anthropic": [
            "claude-sonnet-4-5-20250929",
            "claude-haiku-4-5-20251001",
            "claude-opus-4-1-20250805"
        ],
        "google": [
            "gemini-2.5-pro",
            "gemini-2.5-flash",
            "gemini-2.5-flash-lite"
        ]
    }
    
    @staticmethod
    def create_llm(
        provider: str,
        model: str,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        streaming: bool = False,
        callbacks: Optional[list] = None,
        **kwargs
    ):
        """
        LLMインスタンス生成
        
        Args:
            provider: プロバイダー名（openai、anthropic、google）
            model: モデル名
            temperature: 温度パラメータ（0.0-2.0）
            max_tokens: 最大トークン数
            streaming: ストリーミングモード
            **kwargs: その他のパラメータ
            
        Returns:
            LangChainのChatモデルインスタンス
            
        Raises:
            InvalidProvider: 不正なプロバイダー
            InvalidModel: 不正なモデル
            ValidationError: APIキー未設定
        """
        provider = provider.lower()
        
        # プロバイダー検証
        if provider not in LLMFactory.AVAILABLE_MODELS:
            raise InvalidProvider(
                provider,
                list(LLMFactory.AVAILABLE_MODELS.keys())
            )
        
        # モデル検証
        if model not in LLMFactory.AVAILABLE_MODELS[provider]:
            raise InvalidModel(
                provider,
                model,
                LLMFactory.AVAILABLE_MODELS[provider]
            )
        
        logger.info(f"Creating LLM: provider={provider}, model={model}, streaming={streaming}")
        
        if provider == "openai":
            if not settings.OPENAI_API_KEY:
                raise ValidationError("OPENAI_API_KEYが設定されていません")
            
            return ChatOpenAI(
                model=model,
                temperature=temperature,
                max_tokens=max_tokens,
                streaming=streaming,
                stream_usage=True,  # ストリーミング時にトークン使用量を取得
                callbacks=callbacks,
                api_key=settings.OPENAI_API_KEY,
                **kwargs
            )
        
        elif provider == "anthropic":
            if not settings.ANTHROPIC_API_KEY:
                raise ValidationError("ANTHROPIC_API_KEYが設定されていません")
            
            return ChatAnthropic(
                model=model,
                temperature=temperature,
                max_tokens=max_tokens,
                streaming=streaming,
                api_key=settings.ANTHROPIC_API_KEY,
                **kwargs
            )
        
        elif provider == "google":
            if not settings.GOOGLE_API_KEY:
                raise ValidationError("GOOGLE_API_KEYが設定されていません")
            
            return ChatGoogleGenerativeAI(
                model=model,
                temperature=temperature,
                max_output_tokens=max_tokens,
                streaming=streaming,
                google_api_key=settings.GOOGLE_API_KEY,
                **kwargs
            )
    
    @staticmethod
    def validate_api_keys() -> Dict[str, bool]:
        """
        APIキーの有効性をチェック
        
        Returns:
            各プロバイダーのAPIキー有無の辞書
        """
        return {
            "openai": bool(settings.OPENAI_API_KEY),
            "anthropic": bool(settings.ANTHROPIC_API_KEY),
            "google": bool(settings.GOOGLE_API_KEY)
        }
    
    @staticmethod
    def get_available_models() -> Dict[str, list]:
        """
        利用可能なモデル一覧を返す
        
        Returns:
            プロバイダーごとのモデルリスト
        """
        return LLMFactory.AVAILABLE_MODELS

