"""
Brave Search API サービス

Web検索機能を提供（要APIキー）
"""

import httpx
from typing import Optional, Dict, Any

from app.services.base import BaseService, tool


class BraveSearchService(BaseService):
    """Brave Search API サービス（要APIキー）"""
    
    SERVICE_NAME = "Brave Search"
    SERVICE_DESCRIPTION = "Brave Search APIを使用したWeb検索機能"
    SERVICE_ICON = "🔍"
    SERVICE_TYPE = "api_wrapper"
    
    BASE_URL = "https://api.search.brave.com/res/v1"
    
    def _register_tools(self):
        """ツールを登録"""
        for name in dir(self):
            if not name.startswith('_'):
                method = getattr(self, name)
                if hasattr(method, '_tool_metadata'):
                    self._add_tool(name, method._tool_metadata)
    
    @classmethod
    def get_auth_schema(cls) -> Dict[str, Any]:
        """認証情報スキーマ"""
        return {
            "type": "object",
            "properties": {
                "api_key": {
                    "type": "string",
                    "description": "Brave Search API キー",
                    "minLength": 1
                }
            },
            "required": ["api_key"]
        }
    
    @tool(
        name="web_search",
        description="Brave Search APIを使用してWeb検索を実行します",
        input_schema={
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "検索クエリ"
                },
                "count": {
                    "type": "integer",
                    "description": "取得する結果数（デフォルト: 10、最大: 20）",
                    "minimum": 1,
                    "maximum": 20
                }
            },
            "required": ["query"]
        },
        category="search",
        tags=["web", "search", "internet"]
    )
    async def web_search(self, query: str, count: int = 10) -> str:
        """Brave Search APIを使用してWeb検索を実行"""
        if not self.auth or "api_key" not in self.auth:
            return "エラー: APIキーが設定されていません"
        
        try:
            async with httpx.AsyncClient() as client:
                headers = {
                    "Accept": "application/json",
                    "Accept-Encoding": "gzip",
                    "X-Subscription-Token": self.auth["api_key"]
                }
                params = {
                    "q": query,
                    "count": min(count, 20)
                }
                
                response = await client.get(
                    f"{self.BASE_URL}/web/search",
                    headers=headers,
                    params=params,
                    timeout=15.0
                )
                response.raise_for_status()
                
                data = response.json()
                web_results = data.get("web", {}).get("results", [])
                
                if not web_results:
                    return f"検索クエリ「{query}」に対する結果が見つかりませんでした"
                
                result = f"検索クエリ「{query}」の結果（{len(web_results)}件）:\n\n"
                
                for i, item in enumerate(web_results, 1):
                    title = item.get("title", "タイトルなし")
                    url = item.get("url", "")
                    description = item.get("description", "")
                    
                    result += f"{i}. {title}\n"
                    result += f"   URL: {url}\n"
                    if description:
                        result += f"   概要: {description}\n"
                    result += "\n"
                
                return result.strip()
                
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 401:
                return "エラー: APIキーが無効です"
            elif e.response.status_code == 429:
                return "エラー: レート制限を超えました。しばらく待ってから再試行してください"
            return f"エラー: 検索に失敗しました - {e.response.status_code}"
        except httpx.RequestError as e:
            return f"エラー: リクエストエラー - {str(e)}"
        except Exception as e:
            return f"エラー: {str(e)}"













