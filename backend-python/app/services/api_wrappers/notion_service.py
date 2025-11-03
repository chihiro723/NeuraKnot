"""
Notion API サービス

Notionの全機能を網羅：ページ、データベース、ブロック、コメント、ユーザー管理
要認証：Notion Integration Token
Notion API Version: 2022-06-28（最新安定版）
"""

import httpx
import json
from typing import Optional, Dict, Any, List

from app.services.base import BaseService, tool


class NotionService(BaseService):
    """Notion API サービス（要APIキー）"""
    
    SERVICE_NAME = "Notion"
    SERVICE_DESCRIPTION = "Notionの全機能を操作：ページ、データベース、ブロック、コメント"
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
    
    # ==================== ページ検索 ====================
    
    @tool(
        name="search_pages",
        description="Notionワークスペース内のページをキーワード検索します。タイトルや本文から関連ページを発見。空文字列で全ページ取得可能。ページIDとURLを取得し、他ツール（get_page_content, delete_page等）連携の起点として使用。検索結果から目的のページを特定してください。",
        input_schema={
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "検索クエリ（空文字列で全ページ取得）"
                },
                "page_size": {
                    "type": "integer",
                    "description": "取得するページ数（デフォルト: 10、最大: 100）",
                    "minimum": 1,
                    "maximum": 100
                }
                }
        },
        category="notion",
        tags=["notion", "search", "page"]
    )
    async def search_pages(self, query: str = "", page_size: int = 10) -> str:
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
                    if query:
                        return f"検索クエリ「{query}」に対する結果が見つかりませんでした"
                    else:
                        return "ページが見つかりませんでした。Integration がページへのアクセス権限を持っているか確認してください。"
                
                if query:
                    result = f"検索クエリ「{query}」の結果（{len(results)}件）:\n\n"
                else:
                    result = f"検索結果（{len(results)}件）:\n\n"
                
                for i, page in enumerate(results, 1):
                    page_id = page.get("id", "不明")
                    title = self._extract_title(page)
                    
                    result += f"{i}. {title}\n"
                    result += f"   ID: {page_id}\n"
                    result += f"   URL: https://notion.so/{page_id.replace('-', '')}\n\n"
                
                return result.strip()
                
        except httpx.HTTPStatusError as e:
            return self._handle_http_error(e, "検索")
        except Exception as e:
            return f"エラー: {str(e)}"
    
    # ==================== ページ取得 ====================
    
    @tool(
        name="get_page_content",
        description="Notionページの内容を完全に取得します。ネストされたブロック、全ブロックタイプ（見出し、リスト、コードブロック等）に対応しています。",
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
        tags=["notion", "page", "content", "read"]
    )
    async def get_page_content(self, page_id: str) -> str:
        """Notionページの内容を完全取得"""
        if not self.auth or "api_key" not in self.auth:
            return "エラー: APIキーが設定されていません"
        
        try:
            formatted_id = self._format_page_id(page_id)
            
            async with httpx.AsyncClient() as client:
                headers = self._get_headers()
                
                # ページ情報を取得
                response = await client.get(
                    f"{self.BASE_URL}/pages/{formatted_id}",
                    headers=headers,
                    timeout=15.0
                )
                response.raise_for_status()
                page_data = response.json()
                
                # タイトルを抽出
                title = self._extract_title(page_data)
                
                result = f"【ページタイトル】 {title}\n"
                result += f"【ページID】 {formatted_id}\n"
                result += f"【URL】 https://notion.so/{formatted_id.replace('-', '')}\n\n"
                result += "=" * 50 + "\n"
                result += "【コンテンツ】\n\n"
                
                # ブロックを再帰的に取得
                content = await self._get_blocks_recursive(client, formatted_id, headers)
                result += content
                
                return result.strip()
                
        except httpx.HTTPStatusError as e:
            return self._handle_http_error(e, "ページ取得")
        except Exception as e:
            return f"エラー: {str(e)}"
    
    @tool(
        name="get_blocks_with_ids",
        description="Notionページのブロック一覧をブロックIDとともに取得します。ブロックを更新・削除する前に、このツールでブロックIDを取得してください。",
        input_schema={
            "type": "object",
            "properties": {
                "page_id": {
                    "type": "string",
                    "description": "ページID（ハイフンなしまたはありのどちらでも可）"
                }
            },
            "required": ["page_id"]
        },
        category="notion",
        tags=["notion", "page", "blocks", "read", "ids"]
    )
    async def get_blocks_with_ids(self, page_id: str) -> str:
        """ページのブロック一覧をID付きで取得"""
        if not self.auth or "api_key" not in self.auth:
            return "エラー: APIキーが設定されていません"
        
        try:
            formatted_id = self._format_page_id(page_id)
            
            async with httpx.AsyncClient() as client:
                headers = self._get_headers()
                
                # ページ情報を取得
                response = await client.get(
                    f"{self.BASE_URL}/pages/{formatted_id}",
                    headers=headers,
                    timeout=15.0
                )
                response.raise_for_status()
                page_data = response.json()
                
                # タイトルを抽出
                title = self._extract_title(page_data)
                
                result = f"【ページタイトル】 {title}\n"
                result += f"【ページID】 {formatted_id}\n"
                result += f"【URL】 https://notion.so/{formatted_id.replace('-', '')}\n\n"
                result += "=" * 50 + "\n"
                result += "【ブロック一覧（ID付き）】\n\n"
                result += "※ [ID: xxx] の部分がブロックIDです。update_blockやdelete_blockで使用できます。\n\n"
                
                # ブロックを再帰的に取得（ID付き）
                content = await self._get_blocks_recursive_with_ids(client, formatted_id, headers)
                result += content
                
                return result.strip()
                
        except httpx.HTTPStatusError as e:
            return self._handle_http_error(e, "ブロック取得")
        except Exception as e:
            return f"エラー: {str(e)}"
    
    # ==================== ページ作成 ====================
    
    @tool(
        name="create_page",
        description="新しいNotionページを作成します。親ページまたはデータベース配下に作成できます。",
        input_schema={
            "type": "object",
            "properties": {
                "parent_id": {
                    "type": "string",
                    "description": "親ページまたはデータベースのID"
                },
                "title": {
                    "type": "string",
                    "description": "ページタイトル"
                },
                "content": {
                    "type": "string",
                    "description": "ページの本文（オプション）"
                }
            },
            "required": ["parent_id", "title"]
        },
        category="notion",
        tags=["notion", "page", "create", "write"]
    )
    async def create_page(self, parent_id: str, title: str, content: str = "") -> str:
        """新しいページを作成"""
        if not self.auth or "api_key" not in self.auth:
            return "エラー: APIキーが設定されていません"
        
        try:
            formatted_id = self._format_page_id(parent_id)
            
            # ページ作成ペイロード
            payload = {
                "parent": {"page_id": formatted_id},
                "properties": {
                    "title": {
                        "title": [{"text": {"content": title}}]
                    }
                }
            }
            
            # コンテンツがある場合はブロックとして追加
            if content:
                payload["children"] = [
                    {
                        "object": "block",
                        "type": "paragraph",
                        "paragraph": {
                            "rich_text": [{"text": {"content": content}}]
                        }
                    }
                ]
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.BASE_URL}/pages",
                    headers=self._get_headers(),
                    json=payload,
                    timeout=15.0
                )
                response.raise_for_status()
                
                data = response.json()
                new_page_id = data.get("id")
                
                return f"✅ ページを作成しました！\n\nタイトル: {title}\nページID: {new_page_id}\nURL: https://notion.so/{new_page_id.replace('-', '')}"
                
        except httpx.HTTPStatusError as e:
            return self._handle_http_error(e, "ページ作成")
        except Exception as e:
            return f"エラー: {str(e)}"
    
    @tool(
        name="create_database_page",
        description="Notionデータベース内に新しいページ（エントリ）を作成します。タスク管理DBに新タスク追加、CRMに顧客登録、プロジェクトDBに案件追加など、データベースへの新規レコード作成に使用。プロパティ（ステータス、タグ、期日など）を同時に設定可能。通常ページ作成はcreate_pageを、データベースエントリ作成は本ツールを使用してください。",
        input_schema={
            "type": "object",
            "properties": {
                "database_id": {
                    "type": "string",
                    "description": "親データベースのID"
                },
                "title": {
                    "type": "string",
                    "description": "ページのタイトル（Name/Titleプロパティの値）"
                },
                "properties_json": {
                    "type": "string",
                    "description": "その他のプロパティのJSON文字列（オプション）。形式: {\"プロパティ名\": {\"type\": \"プロパティタイプ\", \"value\": 値}}。例: {\"ステータス\": {\"type\": \"status\", \"value\": \"進行中\"}, \"担当者\": {\"type\": \"select\", \"value\": \"山田\"}}"
                },
                "content": {
                    "type": "string",
                    "description": "ページ本文の内容（オプション）"
                }
            },
            "required": ["database_id", "title"]
        },
        category="notion",
        tags=["notion", "database", "page", "create", "write", "entry"]
    )
    async def create_database_page(self, database_id: str, title: str, properties_json: str = "", content: str = "") -> str:
        """データベース内に新しいページ（エントリ）を作成"""
        if not self.auth or "api_key" not in self.auth:
            return "エラー: APIキーが設定されていません"
        
        try:
            import json
            formatted_db_id = self._format_page_id(database_id)
            
            # 基本ペイロード
            payload = {
                "parent": {"database_id": formatted_db_id},
                "properties": {
                    # Nameプロパティ（ほとんどのDBで必須）
                    "Name": {
                        "title": [{"text": {"content": title}}]
                    }
                }
            }
            
            # 追加プロパティがある場合は処理
            if properties_json:
                try:
                    properties_input = json.loads(properties_json)
                    for prop_name, prop_data in properties_input.items():
                        prop_type = prop_data.get("type")
                        prop_value = prop_data.get("value")
                        
                        if prop_type == "status":
                            payload["properties"][prop_name] = {"status": {"name": str(prop_value)}}
                        elif prop_type == "select":
                            payload["properties"][prop_name] = {"select": {"name": str(prop_value)}}
                        elif prop_type == "multi_select":
                            if isinstance(prop_value, list):
                                payload["properties"][prop_name] = {"multi_select": [{"name": str(v)} for v in prop_value]}
                            else:
                                payload["properties"][prop_name] = {"multi_select": [{"name": str(prop_value)}]}
                        elif prop_type == "date":
                            payload["properties"][prop_name] = {"date": {"start": str(prop_value)}}
                        elif prop_type == "checkbox":
                            payload["properties"][prop_name] = {"checkbox": bool(prop_value)}
                        elif prop_type == "number":
                            payload["properties"][prop_name] = {"number": float(prop_value)}
                        elif prop_type == "url":
                            payload["properties"][prop_name] = {"url": str(prop_value)}
                        elif prop_type == "email":
                            payload["properties"][prop_name] = {"email": str(prop_value)}
                        elif prop_type == "phone_number":
                            payload["properties"][prop_name] = {"phone_number": str(prop_value)}
                        elif prop_type == "rich_text":
                            payload["properties"][prop_name] = {"rich_text": [{"text": {"content": str(prop_value)}}]}
                except json.JSONDecodeError:
                    return "エラー: properties_jsonが正しいJSON形式ではありません"
            
            # コンテンツがある場合は追加
            if content:
                payload["children"] = [
                    {
                        "object": "block",
                        "type": "paragraph",
                        "paragraph": {
                            "rich_text": [{"text": {"content": content}}]
                        }
                    }
                ]
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.BASE_URL}/pages",
                    headers=self._get_headers(),
                    json=payload,
                    timeout=15.0
                )
                response.raise_for_status()
                
                data = response.json()
                new_page_id = data.get("id")
                
                return f"✅ データベースページを作成しました！\n\nタイトル: {title}\nページID: {new_page_id}\nURL: https://notion.so/{new_page_id.replace('-', '')}"
                
        except httpx.HTTPStatusError as e:
            return self._handle_http_error(e, "データベースページ作成")
        except Exception as e:
            return f"エラー: データベースページ作成に失敗 - {str(e)}"
    
    # ==================== ページ更新 ====================
    
    @tool(
        name="update_page_title",
        description="Notionページのタイトルを更新します。",
        input_schema={
            "type": "object",
            "properties": {
                "page_id": {
                    "type": "string",
                    "description": "ページID"
                },
                "new_title": {
                    "type": "string",
                    "description": "新しいタイトル"
                }
            },
            "required": ["page_id", "new_title"]
        },
        category="notion",
        tags=["notion", "page", "update", "write"]
    )
    async def update_page_title(self, page_id: str, new_title: str) -> str:
        """ページタイトルを更新"""
        if not self.auth or "api_key" not in self.auth:
            return "エラー: APIキーが設定されていません"
        
        try:
            formatted_id = self._format_page_id(page_id)
            
            payload = {
                "properties": {
                    "title": {
                        "title": [{"text": {"content": new_title}}]
                    }
                }
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.patch(
                    f"{self.BASE_URL}/pages/{formatted_id}",
                    headers=self._get_headers(),
                    json=payload,
                    timeout=15.0
                )
                response.raise_for_status()
                
                return f"✅ ページタイトルを更新しました！\n\n新しいタイトル: {new_title}"
                
        except httpx.HTTPStatusError as e:
            return self._handle_http_error(e, "ページ更新")
        except Exception as e:
            return f"エラー: {str(e)}"
    
    @tool(
        name="update_page_properties",
        description="Notionページの各種プロパティ（カスタムフィールド）を更新します。タスクのステータス変更、タグ追加、日付設定など、データベースページのあらゆるプロパティに対応。対応タイプ: status, select, multi_select, date, checkbox, number, url, email, phone_number, rich_text。例: ステータスを「完了」に変更、タグに「重要」を追加、期日を設定など。",
        input_schema={
            "type": "object",
            "properties": {
                "page_id": {
                    "type": "string",
                    "description": "更新するページのID（データベース内のページを想定）"
                },
                "properties_json": {
                    "type": "string",
                    "description": "更新するプロパティのJSON文字列。形式: {\"プロパティ名\": {\"type\": \"プロパティタイプ\", \"value\": 値}}。例: {\"ステータス\": {\"type\": \"status\", \"value\": \"完了\"}, \"期日\": {\"type\": \"date\", \"value\": \"2024-12-31\"}}"
                }
            },
            "required": ["page_id", "properties_json"]
        },
        category="notion",
        tags=["notion", "page", "properties", "update", "write", "database"]
    )
    async def update_page_properties(self, page_id: str, properties_json: str) -> str:
        """ページのプロパティを更新（汎用）"""
        if not self.auth or "api_key" not in self.auth:
            return "エラー: APIキーが設定されていません"
        
        try:
            import json
            formatted_id = self._format_page_id(page_id)
            
            # JSON文字列をパース
            try:
                properties_input = json.loads(properties_json)
            except json.JSONDecodeError:
                return "エラー: properties_jsonが正しいJSON形式ではありません"
            
            # Notion APIのプロパティ形式に変換
            properties_payload = {}
            for prop_name, prop_data in properties_input.items():
                prop_type = prop_data.get("type")
                prop_value = prop_data.get("value")
                
                if prop_type == "status":
                    properties_payload[prop_name] = {"status": {"name": str(prop_value)}}
                elif prop_type == "select":
                    properties_payload[prop_name] = {"select": {"name": str(prop_value)}}
                elif prop_type == "multi_select":
                    if isinstance(prop_value, list):
                        properties_payload[prop_name] = {"multi_select": [{"name": str(v)} for v in prop_value]}
                    else:
                        properties_payload[prop_name] = {"multi_select": [{"name": str(prop_value)}]}
                elif prop_type == "date":
                    properties_payload[prop_name] = {"date": {"start": str(prop_value)}}
                elif prop_type == "checkbox":
                    properties_payload[prop_name] = {"checkbox": bool(prop_value)}
                elif prop_type == "number":
                    properties_payload[prop_name] = {"number": float(prop_value)}
                elif prop_type == "url":
                    properties_payload[prop_name] = {"url": str(prop_value)}
                elif prop_type == "email":
                    properties_payload[prop_name] = {"email": str(prop_value)}
                elif prop_type == "phone_number":
                    properties_payload[prop_name] = {"phone_number": str(prop_value)}
                elif prop_type == "rich_text":
                    properties_payload[prop_name] = {"rich_text": [{"text": {"content": str(prop_value)}}]}
                else:
                    return f"エラー: 未対応のプロパティタイプ '{prop_type}'"
            
            payload = {"properties": properties_payload}
            
            async with httpx.AsyncClient() as client:
                response = await client.patch(
                    f"{self.BASE_URL}/pages/{formatted_id}",
                    headers=self._get_headers(),
                    json=payload,
                    timeout=15.0
                )
                response.raise_for_status()
                
                updated_props = ", ".join(properties_payload.keys())
                return f"✅ ページプロパティを更新しました！\n\n更新されたプロパティ: {updated_props}"
                
        except httpx.HTTPStatusError as e:
            return self._handle_http_error(e, "ページプロパティ更新")
        except Exception as e:
            return f"エラー: ページプロパティ更新に失敗 - {str(e)}"
    
    # ==================== ブロック追加 ====================
    
    @tool(
        name="append_blocks",
        description="Notionページに新しいブロック（テキスト、見出し、リストなど）を追加します。",
        input_schema={
            "type": "object",
            "properties": {
                "page_id": {
                    "type": "string",
                    "description": "ページID"
                },
                "block_type": {
                    "type": "string",
                    "description": "ブロックタイプ（paragraph, heading_1, heading_2, heading_3, bulleted_list_item, numbered_list_item, to_do, code）",
                    "enum": ["paragraph", "heading_1", "heading_2", "heading_3", "bulleted_list_item", "numbered_list_item", "to_do", "code"]
                },
                "content": {
                    "type": "string",
                    "description": "ブロックの内容"
                }
            },
            "required": ["page_id", "block_type", "content"]
        },
        category="notion",
        tags=["notion", "block", "append", "write"]
    )
    async def append_blocks(self, page_id: str, block_type: str, content: str) -> str:
        """ページにブロックを追加"""
        if not self.auth or "api_key" not in self.auth:
            return "エラー: APIキーが設定されていません"
        
        try:
            formatted_id = self._format_page_id(page_id)
            
            # ブロック構造を作成
            block = self._create_block(block_type, content)
            
            payload = {"children": [block]}
            
            async with httpx.AsyncClient() as client:
                response = await client.patch(
                    f"{self.BASE_URL}/blocks/{formatted_id}/children",
                    headers=self._get_headers(),
                    json=payload,
                    timeout=15.0
                )
                response.raise_for_status()
                
                return f"✅ ブロックを追加しました！\n\nタイプ: {block_type}\n内容: {content[:100]}..."
                
        except httpx.HTTPStatusError as e:
            return self._handle_http_error(e, "ブロック追加")
        except Exception as e:
            return f"エラー: {str(e)}"

    # ==================== ページ・ブロック削除 ====================
    
    @tool(
        name="delete_page",
        description="Notionのページを削除（アーカイブ）します。削除されたページはゴミ箱に移動され、復元可能です。",
        input_schema={
            "type": "object",
            "properties": {
                "page_id": {
                    "type": "string",
                    "description": "削除するページのID（ハイフンなしまたはありのどちらでも可）"
                }
            },
            "required": ["page_id"]
        },
        category="notion",
        tags=["notion", "page", "delete", "archive"]
    )
    async def delete_page(self, page_id: str) -> str:
        """ページを削除（アーカイブ）"""
        if not self.auth or "api_key" not in self.auth:
            return "エラー: APIキーが設定されていません"
        
        try:
            formatted_id = self._format_page_id(page_id)
            
            async with httpx.AsyncClient() as client:
                response = await client.patch(
                    f"{self.BASE_URL}/pages/{formatted_id}",
                    headers=self._get_headers(),
                    json={"archived": True},
                    timeout=10.0
                )
                response.raise_for_status()
                
                return f"✅ ページを削除（アーカイブ）しました: {formatted_id}\nページは復元可能です。"
                
        except httpx.HTTPStatusError as e:
            return self._handle_http_error(e, f"ページ削除: {page_id}")
        except Exception as e:
            return f"エラー: ページ削除に失敗 - {str(e)}"
    
    @tool(
        name="update_block",
        description="Notionのブロック（段落、見出しなど）の内容を更新します。",
        input_schema={
            "type": "object",
            "properties": {
                "block_id": {
                    "type": "string",
                    "description": "更新するブロックのID"
                },
                "block_type": {
                    "type": "string",
                    "description": "ブロックタイプ（paragraph, heading_1, heading_2, heading_3, bulleted_list_item, numbered_list_item）",
                    "enum": ["paragraph", "heading_1", "heading_2", "heading_3", "bulleted_list_item", "numbered_list_item"]
                },
                "content": {
                    "type": "string",
                    "description": "新しいコンテンツ"
                }
            },
            "required": ["block_id", "block_type", "content"]
        },
        category="notion",
        tags=["notion", "block", "update"]
    )
    async def update_block(self, block_id: str, block_type: str, content: str) -> str:
        """ブロックの内容を更新"""
        if not self.auth or "api_key" not in self.auth:
            return "エラー: APIキーが設定されていません"
        
        try:
            formatted_id = self._format_page_id(block_id)
            
            # ブロックタイプに応じた更新データを作成
            block_data = self._create_block(block_type, content)
            
            async with httpx.AsyncClient() as client:
                response = await client.patch(
                    f"{self.BASE_URL}/blocks/{formatted_id}",
                    headers=self._get_headers(),
                    json={block_type: block_data[block_type]},
                    timeout=10.0
                )
                response.raise_for_status()
                
                return f"✅ ブロックを更新しました: {formatted_id}\n内容: {content[:50]}..."
                
        except httpx.HTTPStatusError as e:
            return self._handle_http_error(e, f"ブロック更新: {block_id}")
        except Exception as e:
            return f"エラー: ブロック更新に失敗 - {str(e)}"
    
    @tool(
        name="delete_block",
        description="Notionのブロックを削除（アーカイブ）します。削除されたブロックは復元可能です。",
        input_schema={
            "type": "object",
            "properties": {
                "block_id": {
                    "type": "string",
                    "description": "削除するブロックのID"
                }
            },
            "required": ["block_id"]
        },
        category="notion",
        tags=["notion", "block", "delete", "archive"]
    )
    async def delete_block(self, block_id: str) -> str:
        """ブロックを削除（アーカイブ）"""
        if not self.auth or "api_key" not in self.auth:
            return "エラー: APIキーが設定されていません"
        
        try:
            formatted_id = self._format_page_id(block_id)
            
            async with httpx.AsyncClient() as client:
                response = await client.patch(
                    f"{self.BASE_URL}/blocks/{formatted_id}",
                    headers=self._get_headers(),
                    json={"archived": True},
                    timeout=10.0
                )
                response.raise_for_status()
                
                return f"✅ ブロックを削除（アーカイブ）しました: {formatted_id}\nブロックは復元可能です。"
                
        except httpx.HTTPStatusError as e:
            return self._handle_http_error(e, f"ブロック削除: {block_id}")
        except Exception as e:
            return f"エラー: ブロック削除に失敗 - {str(e)}"
    
    # ==================== データベース検索 ====================
    
    @tool(
        name="search_databases",
        description="Notionデータベースを検索します。",
        input_schema={
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "検索クエリ（空文字列で全データベース取得）"
                }
            }
        },
        category="notion",
        tags=["notion", "database", "search"]
    )
    async def search_databases(self, query: str = "") -> str:
        """データベースを検索"""
        if not self.auth or "api_key" not in self.auth:
            return "エラー: APIキーが設定されていません"
        
        try:
            async with httpx.AsyncClient() as client:
                payload = {
                    "query": query,
                    "filter": {
                        "value": "database",
                        "property": "object"
                    }
                }
                
                response = await client.post(
                    f"{self.BASE_URL}/search",
                    headers=self._get_headers(),
                    json=payload,
                    timeout=15.0
                )
                response.raise_for_status()
                
                data = response.json()
                results = data.get("results", [])
                
                if not results:
                    return "データベースが見つかりませんでした"
                
                result = f"データベース検索結果（{len(results)}件）:\n\n"
                
                for i, db in enumerate(results, 1):
                    db_id = db.get("id")
                    title = self._extract_title(db)
                    
                    result += f"{i}. {title}\n"
                    result += f"   ID: {db_id}\n"
                    result += f"   URL: https://notion.so/{db_id.replace('-', '')}\n\n"
                
                return result.strip()
                
        except httpx.HTTPStatusError as e:
            return self._handle_http_error(e, "データベース検索")
        except Exception as e:
            return f"エラー: {str(e)}"

    # ==================== データベースクエリ ====================
    
    @tool(
        name="query_database",
        description="Notionデータベースの内容を取得します。フィルタやソートも可能です。",
        input_schema={
            "type": "object",
            "properties": {
                "database_id": {
                    "type": "string",
                    "description": "データベースID"
                },
                "page_size": {
                    "type": "integer",
                    "description": "取得する行数（デフォルト: 10、最大: 100）",
                    "minimum": 1,
                    "maximum": 100
                }
            },
            "required": ["database_id"]
        },
        category="notion",
        tags=["notion", "database", "query", "read"]
    )
    async def query_database(self, database_id: str, page_size: int = 10) -> str:
        """データベースをクエリ"""
        if not self.auth or "api_key" not in self.auth:
            return "エラー: APIキーが設定されていません"
        
        try:
            formatted_id = self._format_page_id(database_id)
            
            payload = {"page_size": min(page_size, 100)}
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.BASE_URL}/databases/{formatted_id}/query",
                    headers=self._get_headers(),
                    json=payload,
                    timeout=15.0
                )
                response.raise_for_status()
                
                data = response.json()
                results = data.get("results", [])
                
                if not results:
                    return "データベースにデータがありません"
                
                result = f"データベース内容（{len(results)}件）:\n\n"
                
                for i, page in enumerate(results, 1):
                    page_id = page.get("id")
                    title = self._extract_title(page)
                    
                    result += f"{i}. {title}\n"
                    result += f"   ID: {page_id}\n"
                    
                    # プロパティを表示
                    properties = page.get("properties", {})
                    for prop_name, prop_data in properties.items():
                        if prop_name != "Name" and prop_name != "名前":
                            prop_value = self._extract_property_value(prop_data)
                            if prop_value:
                                result += f"   {prop_name}: {prop_value}\n"
                    
                    result += "\n"
                
                return result.strip()
                
        except httpx.HTTPStatusError as e:
            return self._handle_http_error(e, "データベースクエリ")
        except Exception as e:
            return f"エラー: {str(e)}"
    
    # ==================== データベース作成・更新 ====================
    
    @tool(
        name="create_database",
        description="新しいNotionデータベースを作成します。タスク管理、顧客管理、プロジェクト管理など、独自のデータベースを作成できます。プロパティ定義（列の設定）も同時に指定可能。親ページ配下に作成されます。",
        input_schema={
            "type": "object",
            "properties": {
                "parent_page_id": {
                    "type": "string",
                    "description": "親ページのID（このページ配下にデータベースが作成されます）"
                },
                "title": {
                    "type": "string",
                    "description": "データベースのタイトル"
                },
                "properties_json": {
                    "type": "string",
                    "description": "データベースのプロパティ定義（列の設定）のJSON文字列（オプション）。例: {\"ステータス\": {\"type\": \"status\"}, \"タグ\": {\"type\": \"multi_select\"}, \"期日\": {\"type\": \"date\"}}"
                }
            },
            "required": ["parent_page_id", "title"]
        },
        category="notion",
        tags=["notion", "database", "create", "write"]
    )
    async def create_database(self, parent_page_id: str, title: str, properties_json: str = "") -> str:
        """新しいデータベースを作成"""
        if not self.auth or "api_key" not in self.auth:
            return "エラー: APIキーが設定されていません"
        
        try:
            import json
            formatted_id = self._format_page_id(parent_page_id)
            
            # 基本ペイロード
            payload = {
                "parent": {"type": "page_id", "page_id": formatted_id},
                "title": [{"text": {"content": title}}],
                "properties": {
                    "Name": {"title": {}}  # Nameプロパティは必須
                }
            }
            
            # 追加プロパティがある場合は処理
            if properties_json:
                try:
                    properties_input = json.loads(properties_json)
                    for prop_name, prop_data in properties_input.items():
                        prop_type = prop_data.get("type")
                        if prop_type == "status":
                            payload["properties"][prop_name] = {"status": {}}
                        elif prop_type == "select":
                            payload["properties"][prop_name] = {"select": {}}
                        elif prop_type == "multi_select":
                            payload["properties"][prop_name] = {"multi_select": {}}
                        elif prop_type == "date":
                            payload["properties"][prop_name] = {"date": {}}
                        elif prop_type == "checkbox":
                            payload["properties"][prop_name] = {"checkbox": {}}
                        elif prop_type == "number":
                            payload["properties"][prop_name] = {"number": {}}
                        elif prop_type == "url":
                            payload["properties"][prop_name] = {"url": {}}
                        elif prop_type == "email":
                            payload["properties"][prop_name] = {"email": {}}
                        elif prop_type == "phone_number":
                            payload["properties"][prop_name] = {"phone_number": {}}
                        elif prop_type == "rich_text":
                            payload["properties"][prop_name] = {"rich_text": {}}
                except json.JSONDecodeError:
                    return "エラー: properties_jsonが正しいJSON形式ではありません"
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.BASE_URL}/databases",
                    headers=self._get_headers(),
                    json=payload,
                    timeout=15.0
                )
                response.raise_for_status()
                
                data = response.json()
                new_db_id = data.get("id")
                
                return f"✅ データベースを作成しました！\n\nタイトル: {title}\nデータベースID: {new_db_id}\nURL: https://notion.so/{new_db_id.replace('-', '')}"
                
        except httpx.HTTPStatusError as e:
            return self._handle_http_error(e, "データベース作成")
        except Exception as e:
            return f"エラー: データベース作成に失敗 - {str(e)}"
    
    @tool(
        name="update_database",
        description="Notionデータベースのタイトルやプロパティ定義（列の設定）を更新します。既存のプロパティ変更、新しいプロパティ追加、プロパティ削除に対応。データベース構造の再編成に使用。",
        input_schema={
            "type": "object",
            "properties": {
                "database_id": {
                    "type": "string",
                    "description": "更新するデータベースのID"
                },
                "title": {
                    "type": "string",
                    "description": "新しいタイトル（オプション）"
                },
                "properties_json": {
                    "type": "string",
                    "description": "更新するプロパティのJSON文字列（オプション）。例: {\"新しい列\": {\"type\": \"select\"}}"
                }
            },
            "required": ["database_id"]
        },
        category="notion",
        tags=["notion", "database", "update", "write"]
    )
    async def update_database(self, database_id: str, title: str = "", properties_json: str = "") -> str:
        """データベースを更新"""
        if not self.auth or "api_key" not in self.auth:
            return "エラー: APIキーが設定されていません"
        
        try:
            import json
            formatted_id = self._format_page_id(database_id)
            
            payload = {}
            
            # タイトル更新
            if title:
                payload["title"] = [{"text": {"content": title}}]
            
            # プロパティ更新
            if properties_json:
                try:
                    properties_input = json.loads(properties_json)
                    payload["properties"] = {}
                    for prop_name, prop_data in properties_input.items():
                        prop_type = prop_data.get("type")
                        if prop_type == "status":
                            payload["properties"][prop_name] = {"status": {}}
                        elif prop_type == "select":
                            payload["properties"][prop_name] = {"select": {}}
                        elif prop_type == "multi_select":
                            payload["properties"][prop_name] = {"multi_select": {}}
                        elif prop_type == "date":
                            payload["properties"][prop_name] = {"date": {}}
                        elif prop_type == "checkbox":
                            payload["properties"][prop_name] = {"checkbox": {}}
                        elif prop_type == "number":
                            payload["properties"][prop_name] = {"number": {}}
                        elif prop_type == "url":
                            payload["properties"][prop_name] = {"url": {}}
                        elif prop_type == "email":
                            payload["properties"][prop_name] = {"email": {}}
                        elif prop_type == "phone_number":
                            payload["properties"][prop_name] = {"phone_number": {}}
                        elif prop_type == "rich_text":
                            payload["properties"][prop_name] = {"rich_text": {}}
                except json.JSONDecodeError:
                    return "エラー: properties_jsonが正しいJSON形式ではありません"
            
            if not payload:
                return "エラー: titleまたはproperties_jsonのいずれかを指定してください"
            
            async with httpx.AsyncClient() as client:
                response = await client.patch(
                    f"{self.BASE_URL}/databases/{formatted_id}",
                    headers=self._get_headers(),
                    json=payload,
                    timeout=15.0
                )
                response.raise_for_status()
                
                return f"✅ データベースを更新しました！\n\nデータベースID: {formatted_id}"
                
        except httpx.HTTPStatusError as e:
            return self._handle_http_error(e, "データベース更新")
        except Exception as e:
            return f"エラー: データベース更新に失敗 - {str(e)}"
    
    # ==================== ブロック個別取得 ====================
    
    @tool(
        name="get_block",
        description="指定したIDのNotionブロック（段落、見出し、リストなど）の詳細情報を取得します。ブロックのタイプ、内容、メタデータを確認できます。ブロック更新前の内容確認に便利。",
        input_schema={
            "type": "object",
            "properties": {
                "block_id": {
                    "type": "string",
                    "description": "取得するブロックのID"
                }
            },
            "required": ["block_id"]
        },
        category="notion",
        tags=["notion", "block", "read"]
    )
    async def get_block(self, block_id: str) -> str:
        """単体ブロックを取得"""
        if not self.auth or "api_key" not in self.auth:
            return "エラー: APIキーが設定されていません"
        
        try:
            formatted_id = self._format_page_id(block_id)
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.BASE_URL}/blocks/{formatted_id}",
                    headers=self._get_headers(),
                    timeout=10.0
                )
                response.raise_for_status()
                
                block_data = response.json()
                block_type = block_data.get("type")
                block_id_returned = block_data.get("id")
                has_children = block_data.get("has_children", False)
                
                # ブロック内容をフォーマット
                content = self._format_block(block_data, indent=0)
                
                result = f"【ブロック情報】\n"
                result += f"ブロックID: {block_id_returned}\n"
                result += f"タイプ: {block_type}\n"
                result += f"子ブロックあり: {'はい' if has_children else 'いいえ'}\n\n"
                result += f"【内容】\n{content}"
                
                return result
                
        except httpx.HTTPStatusError as e:
            return self._handle_http_error(e, f"ブロック取得: {block_id}")
        except Exception as e:
            return f"エラー: ブロック取得に失敗 - {str(e)}"
    
    # ==================== コメント機能 ====================
    
    @tool(
        name="get_comments",
        description="Notionページに付けられたコメントの一覧を取得します。ディスカッションの確認、レビューコメントの収集に使用。各コメントの内容、投稿者、投稿日時を取得できます。",
        input_schema={
            "type": "object",
            "properties": {
                "page_id": {
                    "type": "string",
                    "description": "コメントを取得するページのID"
                }
            },
            "required": ["page_id"]
        },
        category="notion",
        tags=["notion", "comment", "read"]
    )
    async def get_comments(self, page_id: str) -> str:
        """ページのコメントを取得"""
        if not self.auth or "api_key" not in self.auth:
            return "エラー: APIキーが設定されていません"
        
        try:
            formatted_id = self._format_page_id(page_id)
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.BASE_URL}/comments",
                    headers=self._get_headers(),
                    params={"block_id": formatted_id},
                    timeout=10.0
                )
                response.raise_for_status()
                
                data = response.json()
                comments = data.get("results", [])
                
                if not comments:
                    return f"ページにコメントはありません（ページID: {formatted_id}）"
                
                result = f"【コメント一覧】（{len(comments)}件）\n\n"
                for i, comment in enumerate(comments, 1):
                    comment_id = comment.get("id", "不明")
                    created_time = comment.get("created_time", "不明")
                    created_by = comment.get("created_by", {})
                    user_name = created_by.get("name", "不明")
                    
                    # コメント内容
                    rich_text = comment.get("rich_text", [])
                    if rich_text:
                        text = "".join([t.get("plain_text", "") for t in rich_text])
                    else:
                        text = "（内容なし）"
                    
                    result += f"{i}. {user_name} ({created_time})\n"
                    result += f"   ID: {comment_id}\n"
                    result += f"   内容: {text}\n\n"
                
                return result.strip()
                
        except httpx.HTTPStatusError as e:
            return self._handle_http_error(e, f"コメント取得: {page_id}")
        except Exception as e:
            return f"エラー: コメント取得に失敗 - {str(e)}"
    
    @tool(
        name="add_comment",
        description="Notionページにコメントを追加します。レビューコメント、フィードバック、議論のメモなどを記録。ページまたはディスカッションスレッドに投稿可能。",
        input_schema={
            "type": "object",
            "properties": {
                "page_id": {
                    "type": "string",
                    "description": "コメントを追加するページのID"
                },
                "comment_text": {
                    "type": "string",
                    "description": "コメントの内容"
                },
                "discussion_id": {
                    "type": "string",
                    "description": "既存のディスカッションスレッドID（オプション、スレッドへの返信の場合のみ指定）"
                }
            },
            "required": ["page_id", "comment_text"]
        },
        category="notion",
        tags=["notion", "comment", "write"]
    )
    async def add_comment(self, page_id: str, comment_text: str, discussion_id: str = "") -> str:
        """ページにコメントを追加"""
        if not self.auth or "api_key" not in self.auth:
            return "エラー: APIキーが設定されていません"
        
        try:
            formatted_id = self._format_page_id(page_id)
            
            payload = {
                "parent": {"page_id": formatted_id},
                "rich_text": [{"text": {"content": comment_text}}]
            }
            
            # ディスカッションスレッドへの返信の場合
            if discussion_id:
                payload["discussion_id"] = discussion_id
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.BASE_URL}/comments",
                    headers=self._get_headers(),
                    json=payload,
                    timeout=10.0
                )
                response.raise_for_status()
                
                data = response.json()
                comment_id = data.get("id")
                
                return f"✅ コメントを追加しました！\n\nコメントID: {comment_id}\n内容: {comment_text[:100]}..."
                
        except httpx.HTTPStatusError as e:
            return self._handle_http_error(e, f"コメント追加: {page_id}")
        except Exception as e:
            return f"エラー: コメント追加に失敗 - {str(e)}"
    
    # ==================== ユーザー情報 ====================
    
    @tool(
        name="list_users",
        description="Notionワークスペースのユーザー一覧を取得します。メンバー確認、担当者選択、権限管理に使用。各ユーザーの名前、メールアドレス、アバターURLを取得できます。",
        input_schema={
            "type": "object",
            "properties": {}
        },
        category="notion",
        tags=["notion", "user", "read"]
    )
    async def list_users(self) -> str:
        """ワークスペースのユーザー一覧を取得"""
        if not self.auth or "api_key" not in self.auth:
            return "エラー: APIキーが設定されていません"
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.BASE_URL}/users",
                    headers=self._get_headers(),
                    timeout=10.0
                )
                response.raise_for_status()
                
                data = response.json()
                users = data.get("results", [])
                
                if not users:
                    return "ワークスペースにユーザーが見つかりませんでした"
                
                result = f"【ユーザー一覧】（{len(users)}人）\n\n"
                for i, user in enumerate(users, 1):
                    user_id = user.get("id", "不明")
                    user_type = user.get("type", "不明")
                    name = user.get("name", "不明")
                    avatar_url = user.get("avatar_url", "なし")
                    
                    # メールアドレス（あれば）
                    email = ""
                    if user_type == "person":
                        person_data = user.get("person", {})
                        email = person_data.get("email", "")
                    
                    result += f"{i}. {name}\n"
                    result += f"   ユーザーID: {user_id}\n"
                    result += f"   タイプ: {user_type}\n"
                    if email:
                        result += f"   メール: {email}\n"
                    result += f"   アバター: {avatar_url}\n\n"
                
                return result.strip()
                
        except httpx.HTTPStatusError as e:
            return self._handle_http_error(e, "ユーザー一覧取得")
        except Exception as e:
            return f"エラー: ユーザー一覧取得に失敗 - {str(e)}"
    
    @tool(
        name="get_user",
        description="指定したIDのNotionユーザーの詳細情報を取得します。特定のユーザーの名前、メールアドレス、アバター情報を確認できます。",
        input_schema={
            "type": "object",
            "properties": {
                "user_id": {
                    "type": "string",
                    "description": "ユーザーのID"
                }
            },
            "required": ["user_id"]
        },
        category="notion",
        tags=["notion", "user", "read"]
    )
    async def get_user(self, user_id: str) -> str:
        """特定ユーザーの情報を取得"""
        if not self.auth or "api_key" not in self.auth:
            return "エラー: APIキーが設定されていません"
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.BASE_URL}/users/{user_id}",
                    headers=self._get_headers(),
                    timeout=10.0
                )
                response.raise_for_status()
                
                user = response.json()
                user_id_returned = user.get("id", "不明")
                user_type = user.get("type", "不明")
                name = user.get("name", "不明")
                avatar_url = user.get("avatar_url", "なし")
                
                result = f"【ユーザー情報】\n"
                result += f"ユーザーID: {user_id_returned}\n"
                result += f"名前: {name}\n"
                result += f"タイプ: {user_type}\n"
                result += f"アバター: {avatar_url}\n"
                
                # メールアドレス（あれば）
                if user_type == "person":
                    person_data = user.get("person", {})
                    email = person_data.get("email", "")
                    if email:
                        result += f"メール: {email}\n"
                
                return result.strip()
                
        except httpx.HTTPStatusError as e:
            return self._handle_http_error(e, f"ユーザー取得: {user_id}")
        except Exception as e:
            return f"エラー: ユーザー取得に失敗 - {str(e)}"

    # ==================== ヘルパーメソッド ====================
    
    def _get_headers(self) -> Dict[str, str]:
        """共通ヘッダーを取得"""
        return {
            "Authorization": f"Bearer {self.auth['api_key']}",
            "Notion-Version": self.NOTION_VERSION,
            "Content-Type": "application/json"
        }
    
    def _format_page_id(self, page_id: str) -> str:
        """ページIDを正規化"""
        clean_id = page_id.replace("-", "")
        if len(clean_id) != 32:
            raise ValueError("無効なページIDです")
        return f"{clean_id[:8]}-{clean_id[8:12]}-{clean_id[12:16]}-{clean_id[16:20]}-{clean_id[20:]}"
    
    def _extract_title(self, page_data: Dict[str, Any]) -> str:
        """ページまたはデータベースからタイトルを抽出"""
        # タイトルプロパティから抽出
        properties = page_data.get("properties", {})
        for key, value in properties.items():
            if value.get("type") == "title":
                title_array = value.get("title", [])
                if title_array:
                    return title_array[0].get("plain_text", "タイトルなし")
        
        # タイトルフィールドから抽出（データベース用）
        if "title" in page_data:
            title_array = page_data.get("title", [])
            if title_array:
                return title_array[0].get("plain_text", "タイトルなし")
        
        return "タイトルなし"
    
    def _extract_property_value(self, prop_data: Dict[str, Any]) -> str:
        """プロパティ値を抽出"""
        prop_type = prop_data.get("type")
        
        if prop_type == "rich_text":
            texts = prop_data.get("rich_text", [])
            if texts:
                return texts[0].get("plain_text", "")
        elif prop_type == "number":
            return str(prop_data.get("number", ""))
        elif prop_type == "select":
            select_data = prop_data.get("select")
            if select_data:
                return select_data.get("name", "")
        elif prop_type == "multi_select":
            items = prop_data.get("multi_select", [])
            return ", ".join([item.get("name", "") for item in items])
        elif prop_type == "date":
            date_data = prop_data.get("date")
            if date_data:
                return date_data.get("start", "")
        elif prop_type == "checkbox":
            return "✓" if prop_data.get("checkbox") else "☐"
        elif prop_type == "url":
            return prop_data.get("url", "")
        elif prop_type == "email":
            return prop_data.get("email", "")
        elif prop_type == "phone_number":
            return prop_data.get("phone_number", "")
        
        return ""
    
    async def _get_blocks_recursive(
        self, 
        client: httpx.AsyncClient, 
        block_id: str, 
        headers: Dict[str, str],
        indent: int = 0
    ) -> str:
        """ブロックを再帰的に取得"""
        result = ""
        
        try:
            response = await client.get(
                f"{self.BASE_URL}/blocks/{block_id}/children",
                headers=headers,
                timeout=15.0
            )
            response.raise_for_status()
            
            blocks_data = response.json()
            blocks = blocks_data.get("results", [])
            
            for block in blocks:
                result += self._format_block(block, indent)
                
                # 子ブロックがある場合は再帰的に取得
                if block.get("has_children"):
                    child_result = await self._get_blocks_recursive(
                        client, 
                        block.get("id"), 
                        headers, 
                        indent + 1
                    )
                    result += child_result
        except Exception:
            # 子ブロック取得エラーは無視
            pass
        
        return result
    
    async def _get_blocks_recursive_with_ids(
        self, 
        client: httpx.AsyncClient, 
        block_id: str, 
        headers: Dict[str, str],
        indent: int = 0
    ) -> str:
        """ブロックを再帰的に取得（ID付き）"""
        result = ""
        
        try:
            response = await client.get(
                f"{self.BASE_URL}/blocks/{block_id}/children",
                headers=headers,
                timeout=15.0
            )
            response.raise_for_status()
            
            blocks_data = response.json()
            blocks = blocks_data.get("results", [])
            
            for block in blocks:
                result += self._format_block_with_id(block, indent)
                
                # 子ブロックがある場合は再帰的に取得
                if block.get("has_children"):
                    child_result = await self._get_blocks_recursive_with_ids(
                        client, 
                        block.get("id"), 
                        headers, 
                        indent + 1
                    )
                    result += child_result
        except Exception:
            # 子ブロック取得エラーは無視
            pass
        
        return result
    
    def _format_block_with_id(self, block: Dict[str, Any], indent: int = 0) -> str:
        """ブロックをID付きで整形"""
        block_id = block.get("id", "")
        block_type = block.get("type")
        indent_str = "  " * indent
        
        # ブロックIDをコメントとして追加
        id_comment = f"[ID: {block_id}]"
        
        # 段落
        if block_type == "paragraph":
            text_array = block.get("paragraph", {}).get("rich_text", [])
            if text_array:
                text = "".join([t.get("plain_text", "") for t in text_array])
                return f"{indent_str}{text} {id_comment}\n"
        
        # 見出し1-3
        elif block_type in ["heading_1", "heading_2", "heading_3"]:
            text_array = block.get(block_type, {}).get("rich_text", [])
            if text_array:
                text = "".join([t.get("plain_text", "") for t in text_array])
                if block_type == "heading_1":
                    return f"\n{indent_str}# {text} {id_comment}\n"
                elif block_type == "heading_2":
                    return f"\n{indent_str}## {text} {id_comment}\n"
                else:
                    return f"\n{indent_str}### {text} {id_comment}\n"
        
        # 箇条書き
        elif block_type == "bulleted_list_item":
            text_array = block.get("bulleted_list_item", {}).get("rich_text", [])
            if text_array:
                text = "".join([t.get("plain_text", "") for t in text_array])
                return f"{indent_str}• {text} {id_comment}\n"
        
        # 番号付きリスト
        elif block_type == "numbered_list_item":
            text_array = block.get("numbered_list_item", {}).get("rich_text", [])
            if text_array:
                text = "".join([t.get("plain_text", "") for t in text_array])
                return f"{indent_str}1. {text} {id_comment}\n"
        
        # To-Do
        elif block_type == "to_do":
            text_array = block.get("to_do", {}).get("rich_text", [])
            checked = block.get("to_do", {}).get("checked", False)
            if text_array:
                text = "".join([t.get("plain_text", "") for t in text_array])
                checkbox = "[x]" if checked else "[ ]"
                return f"{indent_str}{checkbox} {text} {id_comment}\n"
        
        # コードブロック
        elif block_type == "code":
            text_array = block.get("code", {}).get("rich_text", [])
            language = block.get("code", {}).get("language", "plain text")
            if text_array:
                text = "".join([t.get("plain_text", "") for t in text_array])
                return f"{indent_str}```{language} {id_comment}\n{text}\n```\n"
        
        # その他のブロックタイプにもIDを追加
        elif block_type == "divider":
            return f"{indent_str}--- {id_comment}\n"
        
        return f"{indent_str}[{block_type}] {id_comment}\n"
    
    def _format_block(self, block: Dict[str, Any], indent: int = 0) -> str:
        """ブロックを整形（ID無し）"""
        block_type = block.get("type")
        indent_str = "  " * indent
        
        # 段落
        if block_type == "paragraph":
            text_array = block.get("paragraph", {}).get("rich_text", [])
            if text_array:
                text = "".join([t.get("plain_text", "") for t in text_array])
                return f"{indent_str}{text}\n"
        
        # 見出し1-3
        elif block_type in ["heading_1", "heading_2", "heading_3"]:
            text_array = block.get(block_type, {}).get("rich_text", [])
            if text_array:
                text = "".join([t.get("plain_text", "") for t in text_array])
                if block_type == "heading_1":
                    return f"\n{indent_str}# {text}\n"
                elif block_type == "heading_2":
                    return f"\n{indent_str}## {text}\n"
                else:
                    return f"\n{indent_str}### {text}\n"
        
        # 箇条書き
        elif block_type == "bulleted_list_item":
            text_array = block.get("bulleted_list_item", {}).get("rich_text", [])
            if text_array:
                text = "".join([t.get("plain_text", "") for t in text_array])
                return f"{indent_str}• {text}\n"
        
        # 番号付きリスト
        elif block_type == "numbered_list_item":
            text_array = block.get("numbered_list_item", {}).get("rich_text", [])
            if text_array:
                text = "".join([t.get("plain_text", "") for t in text_array])
                return f"{indent_str}1. {text}\n"
        
        # To-Do
        elif block_type == "to_do":
            text_array = block.get("to_do", {}).get("rich_text", [])
            checked = block.get("to_do", {}).get("checked", False)
            if text_array:
                text = "".join([t.get("plain_text", "") for t in text_array])
                checkbox = "[x]" if checked else "[ ]"
                return f"{indent_str}{checkbox} {text}\n"
        
        # トグル
        elif block_type == "toggle":
            text_array = block.get("toggle", {}).get("rich_text", [])
            if text_array:
                text = "".join([t.get("plain_text", "") for t in text_array])
                return f"{indent_str}▶ {text}\n"
        
        # 引用
        elif block_type == "quote":
            text_array = block.get("quote", {}).get("rich_text", [])
            if text_array:
                text = "".join([t.get("plain_text", "") for t in text_array])
                return f"{indent_str}> {text}\n"
        
        # コードブロック
        elif block_type == "code":
            text_array = block.get("code", {}).get("rich_text", [])
            language = block.get("code", {}).get("language", "")
            if text_array:
                text = "".join([t.get("plain_text", "") for t in text_array])
                return f"{indent_str}```{language}\n{text}\n```\n"
        
        # コールアウト
        elif block_type == "callout":
            text_array = block.get("callout", {}).get("rich_text", [])
            icon = block.get("callout", {}).get("icon", {})
            icon_str = ""
            if icon.get("type") == "emoji":
                icon_str = icon.get("emoji", "")
            if text_array:
                text = "".join([t.get("plain_text", "") for t in text_array])
                return f"{indent_str}{icon_str} {text}\n"
        
        # 区切り線
        elif block_type == "divider":
            return f"{indent_str}---\n"
        
        # 表
        elif block_type == "table":
            return f"{indent_str}[テーブル]\n"
        
        # 画像
        elif block_type == "image":
            return f"{indent_str}[画像]\n"
        
        return ""
    
    def _create_block(self, block_type: str, content: str) -> Dict[str, Any]:
        """ブロック構造を作成"""
        base_block = {
            "object": "block",
            "type": block_type
        }
        
        rich_text = [{"text": {"content": content}}]
        
        if block_type in ["paragraph", "bulleted_list_item", "numbered_list_item"]:
            base_block[block_type] = {"rich_text": rich_text}
        elif block_type in ["heading_1", "heading_2", "heading_3"]:
            base_block[block_type] = {"rich_text": rich_text}
        elif block_type == "to_do":
            base_block[block_type] = {
                "rich_text": rich_text,
                "checked": False
            }
        elif block_type == "code":
            base_block[block_type] = {
                "rich_text": rich_text,
                "language": "plain text"
            }
        
        return base_block
    
    def _handle_http_error(self, error: httpx.HTTPStatusError, operation: str) -> str:
        """HTTPエラーを処理"""
        status = error.response.status_code
        
        if status == 401:
            return "エラー: APIキーが無効です。Integration Tokenを確認してください。"
        elif status == 404:
            return f"エラー: 対象が見つかりません。IDが正しいか、アクセス権限があるか確認してください。"
        elif status == 400:
            try:
                error_data = error.response.json()
                error_msg = error_data.get("message", "リクエストが不正です")
                return f"エラー: {error_msg}"
            except:
                return f"エラー: リクエストが不正です - {status}"
        elif status == 429:
            return "エラー: レート制限を超えました。しばらく待ってから再試行してください。"
        elif status == 500:
            return "エラー: Notion APIでエラーが発生しました。後ほど再試行してください。"
        
        return f"エラー: {operation}に失敗しました - ステータスコード: {status}"
