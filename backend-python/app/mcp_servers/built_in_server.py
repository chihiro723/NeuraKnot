"""
Built-in Tools MCP Server (fastMCP)
システム組み込みの基本ツールをMCPプロトコルで公開
"""
from typing import Any, Dict, List
from app.tools import basic_tools


class BuiltInMCPServer:
    """内部MCP サーバー（HTTP通信なし）"""
    
    def __init__(self):
        self.tools = self._load_tools()
    
    def _load_tools(self) -> List[Any]:
        """基本ツールを読み込み"""
        return basic_tools.get_basic_tools()
    
    def get_catalog(self) -> Dict[str, Any]:
        """ツールカタログを取得（MCP標準形式）"""
        tools_catalog = []
        
        for tool in self.tools:
            # LangChain ツールからメタデータを抽出
            tool_def = {
                "name": tool.name,
                "description": tool.description or "",
                "input_schema": self._extract_input_schema(tool),
                "category": self._categorize_tool(tool.name),
                "tags": self._get_tool_tags(tool.name)
            }
            tools_catalog.append(tool_def)
        
        return {
            "server": {
                "name": "Built-in Tools",
                "version": "1.0.0",
                "description": "システム組み込みの基本ツールセット"
            },
            "tools": tools_catalog
        }
    
    def _extract_input_schema(self, tool: Any) -> Dict[str, Any]:
        """ツールの入力スキーマを抽出"""
        try:
            if hasattr(tool, 'args_schema') and tool.args_schema:
                # Pydantic モデルからスキーマを抽出
                return tool.args_schema.schema()
            elif hasattr(tool, 'args'):
                # 関数シグネチャから推測
                return {"type": "object", "properties": tool.args}
            else:
                return {"type": "object", "properties": {}}
        except Exception:
            return {"type": "object", "properties": {}}
    
    def _categorize_tool(self, tool_name: str) -> str:
        """ツール名からカテゴリを推測"""
        if any(keyword in tool_name for keyword in ['time', 'date', 'days']):
            return 'datetime'
        elif any(keyword in tool_name for keyword in ['calculate', 'statistics', 'percentage', 'temperature', 'length']):
            return 'math'
        elif any(keyword in tool_name for keyword in ['text', 'count', 'case', 'search', 'replace']):
            return 'text'
        elif any(keyword in tool_name for keyword in ['json', 'base64', 'url', 'encode', 'decode']):
            return 'data'
        elif any(keyword in tool_name for keyword in ['uuid', 'hash']):
            return 'security'
        else:
            return 'utility'
    
    def _get_tool_tags(self, tool_name: str) -> List[str]:
        """ツール名からタグを生成"""
        tags = []
        
        if 'time' in tool_name or 'date' in tool_name:
            tags.extend(['time', 'date'])
        if 'calculate' in tool_name or 'statistics' in tool_name:
            tags.extend(['calculation', 'math'])
        if 'text' in tool_name:
            tags.append('text')
        if 'encode' in tool_name or 'decode' in tool_name:
            tags.extend(['encoding', 'conversion'])
        if 'json' in tool_name:
            tags.append('json')
        if 'base64' in tool_name:
            tags.append('base64')
        if 'url' in tool_name:
            tags.append('url')
        if 'hash' in tool_name:
            tags.extend(['security', 'hash'])
        if 'uuid' in tool_name:
            tags.extend(['security', 'id'])
        if 'temperature' in tool_name or 'length' in tool_name:
            tags.extend(['conversion', 'unit'])
        
        return list(set(tags))  # 重複を削除
    
    def get_tool_by_name(self, tool_name: str) -> Any:
        """名前でツールを取得"""
        for tool in self.tools:
            if tool.name == tool_name:
                return tool
        return None
    
    def get_all_tools(self) -> List[Any]:
        """全ツールを取得（LangChain Tool オブジェクト）"""
        return self.tools


# シングルトンインスタンス
_builtin_server_instance = None


def get_builtin_server() -> BuiltInMCPServer:
    """Built-in MCPサーバーのシングルトンインスタンスを取得"""
    global _builtin_server_instance
    if _builtin_server_instance is None:
        _builtin_server_instance = BuiltInMCPServer()
    return _builtin_server_instance

