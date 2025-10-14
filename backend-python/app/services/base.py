"""
BaseServiceクラスと@toolデコレータ

Pythonネイティブのサービス/ツールシステムの基盤
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional, Callable, Type
from pydantic import BaseModel
from langchain.tools import StructuredTool
import inspect


class ToolMetadata(BaseModel):
    """ツールのメタデータ"""
    name: str
    description: str
    input_schema: Dict[str, Any]
    category: str = "general"
    tags: List[str] = []


class BaseService(ABC):
    """
    全てのサービスの基底クラス
    
    サービスは関連するツールの集合を提供します。
    ツール情報はDBに保存せず、Pythonコードから動的に取得します。
    """
    
    # サブクラスで必須の定義
    SERVICE_NAME: str
    SERVICE_DESCRIPTION: str
    SERVICE_ICON: str
    SERVICE_TYPE: str  # built_in, api_wrapper, database, custom
    
    def __init__(self, config: Optional[dict] = None, auth: Optional[dict] = None):
        """
        サービスインスタンスを初期化
        
        Args:
            config: サービス固有の設定（オプション）
            auth: 認証情報（APIキー等、オプション）
        """
        self.config = config or {}
        self.auth = auth or {}
        self._tools: Dict[str, ToolMetadata] = {}
        self._register_tools()
    
    @abstractmethod
    def _register_tools(self):
        """
        サービスのツールを登録
        
        このメソッドで@toolデコレータが付与されたメソッドを_toolsに登録します。
        サブクラスで実装が必要です。
        """
        pass
    
    def get_tools(self) -> List[ToolMetadata]:
        """
        サービスが提供する全ツールのメタデータを取得
        
        Returns:
            ツールメタデータのリスト
        """
        return list(self._tools.values())
    
    def get_langchain_tools(self) -> List[StructuredTool]:
        """
        LangChain互換のToolオブジェクトを取得
        
        Returns:
            LangChain StructuredToolのリスト
        """
        langchain_tools = []
        for tool_name, metadata in self._tools.items():
            # メソッドを取得
            method = getattr(self, tool_name)
            
            # StructuredToolを作成
            langchain_tool = StructuredTool(
                name=metadata.name,
                description=metadata.description,
                func=method if not inspect.iscoroutinefunction(method) else None,
                coroutine=method if inspect.iscoroutinefunction(method) else None,
                args_schema=self._create_pydantic_model(metadata.input_schema),
            )
            langchain_tools.append(langchain_tool)
        
        return langchain_tools
    
    def _create_pydantic_model(self, schema: Dict[str, Any]) -> Type[BaseModel]:
        """
        JSON SchemaからPydanticモデルを動的に作成
        
        Args:
            schema: JSON Schema
            
        Returns:
            Pydanticモデルクラス
        """
        from pydantic import create_model
        
        properties = schema.get("properties", {})
        required = schema.get("required", [])
        
        fields = {}
        for field_name, field_schema in properties.items():
            field_type = str  # デフォルト
            if field_schema.get("type") == "integer":
                field_type = int
            elif field_schema.get("type") == "number":
                field_type = float
            elif field_schema.get("type") == "boolean":
                field_type = bool
            
            # 必須フィールドかどうか
            if field_name in required:
                fields[field_name] = (field_type, ...)
            else:
                fields[field_name] = (Optional[field_type], None)
        
        return create_model('DynamicModel', **fields)
    
    def get_tool_catalog(self) -> Dict[str, Any]:
        """
        サービス情報とツール一覧を含むカタログを取得
        
        Returns:
            サービス情報とツールのカタログ
        """
        return {
            "service": {
                "name": self.SERVICE_NAME,
                "description": self.SERVICE_DESCRIPTION,
                "icon": self.SERVICE_ICON,
                "type": self.SERVICE_TYPE,
            },
            "tools": [tool.dict() for tool in self._tools.values()]
        }
    
    async def execute_tool(self, tool_name: str, arguments: Dict[str, Any]) -> Any:
        """
        指定されたツールを実行
        
        Args:
            tool_name: 実行するツール名
            arguments: ツールへの引数
            
        Returns:
            ツールの実行結果
            
        Raises:
            ValueError: ツールが見つからない場合
        """
        if tool_name not in self._tools:
            raise ValueError(f"Tool '{tool_name}' not found in {self.__class__.__name__}")
        
        method = getattr(self, tool_name)
        
        # asyncメソッドかどうかをチェック
        if inspect.iscoroutinefunction(method):
            return await method(**arguments)
        else:
            return method(**arguments)
    
    @classmethod
    def get_config_schema(cls) -> Dict[str, Any]:
        """
        サービスの設定スキーマを取得
        
        Returns:
            JSON Schemaフォーマットの設定スキーマ
        """
        return {}
    
    @classmethod
    def get_auth_schema(cls) -> Dict[str, Any]:
        """
        サービスの認証情報スキーマを取得
        
        Returns:
            JSON Schemaフォーマットの認証スキーマ
        """
        return {}
    
    def _add_tool(self, method_name: str, metadata: ToolMetadata):
        """
        ツールを_toolsに追加
        
        Args:
            method_name: メソッド名
            metadata: ツールのメタデータ
        """
        self._tools[metadata.name] = metadata


def tool(
    name: str,
    description: str,
    input_schema: Dict[str, Any],
    category: str = "general",
    tags: Optional[List[str]] = None
) -> Callable:
    """
    メソッドをツールとしてマークするデコレータ
    
    使用例:
        @tool(
            name="get_current_time",
            description="現在の時刻を取得します",
            input_schema={
                "type": "object",
                "properties": {
                    "timezone": {"type": "string", "description": "タイムゾーン"}
                },
                "required": []
            },
            category="datetime",
            tags=["time", "utility"]
        )
        async def get_current_time(self, timezone: str = "UTC") -> str:
            # 実装
            pass
    
    Args:
        name: ツール名
        description: ツールの説明
        input_schema: JSON Schemaフォーマットの入力スキーマ
        category: ツールのカテゴリ
        tags: ツールのタグ
    """
    def decorator(func: Callable) -> Callable:
        metadata = ToolMetadata(
            name=name,
            description=description,
            input_schema=input_schema,
            category=category,
            tags=tags or []
        )
        # メタデータを関数に付与
        func._tool_metadata = metadata  # type: ignore
        return func
    return decorator



