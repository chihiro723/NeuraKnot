"""
Slack API サービス

Slackのメッセージ送信、チャンネル一覧などを操作（要APIキー）
"""

import httpx
from typing import Optional, Dict, Any

from app.services.base import BaseService, tool


class SlackService(BaseService):
    """Slack API サービス（要APIキー）"""
    
    SERVICE_NAME = "Slack"
    SERVICE_DESCRIPTION = "Slackのメッセージ送信、チャンネル一覧、ユーザー情報取得"
    SERVICE_ICON = "💬"
    SERVICE_TYPE = "api_wrapper"
    
    BASE_URL = "https://slack.com/api"
    
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
                "bot_token": {
                    "type": "string",
                    "description": "Slack Bot User OAuth Token (xoxb-で始まる)",
                    "pattern": "^xoxb-",
                    "minLength": 1
                }
            },
            "required": ["bot_token"]
        }
    
    @tool(
        name="send_message",
        description="Slackチャンネルにメッセージを送信します",
        input_schema={
            "type": "object",
            "properties": {
                "channel": {
                    "type": "string",
                    "description": "チャンネルID または チャンネル名（#general など）"
                },
                "text": {
                    "type": "string",
                    "description": "送信するメッセージ"
                }
            },
            "required": ["channel", "text"]
        },
        category="slack",
        tags=["slack", "message", "send"]
    )
    async def send_message(self, channel: str, text: str) -> str:
        """Slackチャンネルにメッセージを送信"""
        if not self.auth or "bot_token" not in self.auth:
            return "エラー: Bot Tokenが設定されていません"
        
        try:
            async with httpx.AsyncClient() as client:
                headers = {
                    "Authorization": f"Bearer {self.auth['bot_token']}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "channel": channel,
                    "text": text
                }
                
                response = await client.post(
                    f"{self.BASE_URL}/chat.postMessage",
                    headers=headers,
                    json=payload,
                    timeout=15.0
                )
                response.raise_for_status()
                
                data = response.json()
                
                if not data.get("ok"):
                    error = data.get("error", "不明なエラー")
                    return f"エラー: メッセージの送信に失敗しました - {error}"
                
                return f"メッセージを送信しました（チャンネル: {channel}）"
                
        except httpx.HTTPStatusError as e:
            return f"エラー: メッセージの送信に失敗しました - {e.response.status_code}"
        except httpx.RequestError as e:
            return f"エラー: リクエストエラー - {str(e)}"
        except Exception as e:
            return f"エラー: {str(e)}"
    
    @tool(
        name="list_channels",
        description="Slackのチャンネル一覧を取得します",
        input_schema={
            "type": "object",
            "properties": {
                "limit": {
                    "type": "integer",
                    "description": "取得するチャンネル数（デフォルト: 100、最大: 1000）",
                    "minimum": 1,
                    "maximum": 1000
                }
            },
            "required": []
        },
        category="slack",
        tags=["slack", "channels", "list"]
    )
    async def list_channels(self, limit: int = 100) -> str:
        """Slackのチャンネル一覧を取得"""
        if not self.auth or "bot_token" not in self.auth:
            return "エラー: Bot Tokenが設定されていません"
        
        try:
            async with httpx.AsyncClient() as client:
                headers = {
                    "Authorization": f"Bearer {self.auth['bot_token']}"
                }
                params = {
                    "limit": min(limit, 1000),
                    "exclude_archived": True
                }
                
                response = await client.get(
                    f"{self.BASE_URL}/conversations.list",
                    headers=headers,
                    params=params,
                    timeout=15.0
                )
                response.raise_for_status()
                
                data = response.json()
                
                if not data.get("ok"):
                    error = data.get("error", "不明なエラー")
                    return f"エラー: チャンネル一覧の取得に失敗しました - {error}"
                
                channels = data.get("channels", [])
                
                if not channels:
                    return "チャンネルが見つかりませんでした"
                
                result = f"チャンネル一覧（{len(channels)}件）:\n\n"
                
                for channel in channels:
                    name = channel.get("name", "不明")
                    channel_id = channel.get("id", "不明")
                    is_private = channel.get("is_private", False)
                    member_count = channel.get("num_members", 0)
                    
                    privacy_icon = "🔒" if is_private else "🔓"
                    result += f"{privacy_icon} #{name}\n"
                    result += f"   ID: {channel_id}\n"
                    result += f"   メンバー数: {member_count}\n\n"
                
                return result.strip()
                
        except httpx.HTTPStatusError as e:
            return f"エラー: チャンネル一覧の取得に失敗しました - {e.response.status_code}"
        except httpx.RequestError as e:
            return f"エラー: リクエストエラー - {str(e)}"
        except Exception as e:
            return f"エラー: {str(e)}"












