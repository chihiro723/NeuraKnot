"""
Notion API サービス

Notionのページ、データベース、ブロックを操作（要APIキー）
"""

import httpx
from typing import Optional, Dict, Any

from app.services.base import BaseService, tool


class NotionService(BaseService):
    """Notion API サービス（要APIキー）"""
    
    SERVICE_NAME = "Notion"
    SERVICE_DESCRIPTION = "Notionのページ、データベース、ブロックを操作"
    SERVICE_ICON = "📝"
    SERVICE_TYPE = "api_wrapper"
    
    BASE_URL = "https://api.notion.com/v1"
    NOTION_VERSION = "2022-06-28"
    
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
                    "description": "Notion Integration Token",
                    "minLength": 1
                }
            },
            "required": ["api_key"]
        }
    
    @tool(
        name="search_pages",
        description="Notionページを検索します",
        input_schema={
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "検索クエリ"
                },
                "page_size": {
                    "type": "integer",
                    "description": "取得するページ数（デフォルト: 10、最大: 100）",
                    "minimum": 1,
                    "maximum": 100
                }
            },
            "required": ["query"]
        },
        category="notion",
        tags=["notion", "search", "page"]
    )
    async def search_pages(self, query: str, page_size: int = 10) -> str:
        """Notionページを検索"""
        if not self.auth or "api_key" not in self.auth:
            return "エラー: APIキーが設定されていません"
        
        try:
            async with httpx.AsyncClient() as client:
                headers = {
                    "Authorization": f"Bearer {self.auth['api_key']}",
                    "Notion-Version": self.NOTION_VERSION,
                    "Content-Type": "application/json"
                }
                payload = {
                    "query": query,
                    "page_size": min(page_size, 100),
                    "filter": {
                        "value": "page",
                        "property": "object"
                    }
                }
                
                response = await client.post(
                    f"{self.BASE_URL}/search",
                    headers=headers,
                    json=payload,
                    timeout=15.0
                )
                response.raise_for_status()
                
                data = response.json()
                results = data.get("results", [])
                
                if not results:
                    return f"検索クエリ「{query}」に対する結果が見つかりませんでした"
                
                result = f"検索クエリ「{query}」の結果（{len(results)}件）:\n\n"
                
                for i, page in enumerate(results, 1):
                    page_id = page.get("id", "不明")
                    title = ""
                    
                    # タイトルを抽出
                    properties = page.get("properties", {})
                    for key, value in properties.items():
                        if value.get("type") == "title":
                            title_array = value.get("title", [])
                            if title_array:
                                title = title_array[0].get("plain_text", "タイトルなし")
                            break
                    
                    result += f"{i}. {title}\n"
                    result += f"   ID: {page_id}\n"
                    result += f"   URL: https://notion.so/{page_id.replace('-', '')}\n\n"
                
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
    
    @tool(
        name="get_page_content",
        description="Notionページの内容を取得します",
        input_schema={
            "type": "object",
            "properties": {
                "page_id": {
                    "type": "string",
                    "description": "ページID（ハイフンあり/なし両対応）"
                }
            },
            "required": ["page_id"]
        },
        category="notion",
        tags=["notion", "page", "content"]
    )
    async def get_page_content(self, page_id: str) -> str:
        """Notionページの内容を取得"""
        if not self.auth or "api_key" not in self.auth:
            return "エラー: APIキーが設定されていません"
        
        try:
            # ページIDの正規化（ハイフンを削除）
            clean_id = page_id.replace("-", "")
            formatted_id = f"{clean_id[:8]}-{clean_id[8:12]}-{clean_id[12:16]}-{clean_id[16:20]}-{clean_id[20:]}"
            
            async with httpx.AsyncClient() as client:
                headers = {
                    "Authorization": f"Bearer {self.auth['api_key']}",
                    "Notion-Version": self.NOTION_VERSION
                }
                
                # ページ情報を取得
                response = await client.get(
                    f"{self.BASE_URL}/pages/{formatted_id}",
                    headers=headers,
                    timeout=15.0
                )
                response.raise_for_status()
                
                page_data = response.json()
                
                # ブロック（コンテンツ）を取得
                response = await client.get(
                    f"{self.BASE_URL}/blocks/{formatted_id}/children",
                    headers=headers,
                    timeout=15.0
                )
                response.raise_for_status()
                
                blocks_data = response.json()
                
                # タイトルを抽出
                title = "タイトルなし"
                properties = page_data.get("properties", {})
                for key, value in properties.items():
                    if value.get("type") == "title":
                        title_array = value.get("title", [])
                        if title_array:
                            title = title_array[0].get("plain_text", "タイトルなし")
                        break
                
                result = f"ページタイトル: {title}\n\n"
                result += "コンテンツ:\n"
                
                blocks = blocks_data.get("results", [])
                for block in blocks:
                    block_type = block.get("type")
                    if block_type == "paragraph":
                        text_array = block.get("paragraph", {}).get("rich_text", [])
                        if text_array:
                            text = " ".join([t.get("plain_text", "") for t in text_array])
                            result += f"{text}\n"
                    elif block_type == "heading_1":
                        text_array = block.get("heading_1", {}).get("rich_text", [])
                        if text_array:
                            text = " ".join([t.get("plain_text", "") for t in text_array])
                            result += f"\n# {text}\n"
                    # 他のブロックタイプも追加可能
                
                return result.strip()
                
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 401:
                return "エラー: APIキーが無効です"
            elif e.response.status_code == 404:
                return "エラー: ページが見つかりません。ページIDが正しいか、アクセス権限があるか確認してください"
            return f"エラー: ページの取得に失敗しました - {e.response.status_code}"
        except httpx.RequestError as e:
            return f"エラー: リクエストエラー - {str(e)}"
        except Exception as e:
            return f"エラー: {str(e)}"












