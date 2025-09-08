from typing import Dict, Any
import httpx
from app.mcp.mcp_client import BaseMCPClient
from app.utils.logger import logger
from app.utils.exceptions import MCPException


class SlackClient(BaseMCPClient):
    """Slack MCP クライアント"""
    
    def __init__(self):
        super().__init__("slack")
        self.base_url = "https://slack.com/api"
    
    async def authenticate(self, credentials: Dict[str, Any]) -> Dict[str, Any]:
        """
        Slack認証
        
        Args:
            credentials: 認証情報（APIトークン）
            
        Returns:
            認証データ
        """
        try:
            api_token = credentials.get("api_token")
            if not api_token:
                raise MCPException(self.service_name, "API token required")
            
            # トークンの検証
            headers = {
                "Authorization": f"Bearer {api_token}",
                "Content-Type": "application/json"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/auth.test",
                    headers=headers
                )
                
                if response.status_code != 200:
                    raise MCPException(self.service_name, "Token validation failed")
                
                auth_info = response.json()
                
                if not auth_info.get("ok"):
                    raise MCPException(self.service_name, f"Authentication failed: {auth_info.get('error')}")
                
                return {
                    "api_token": api_token,
                    "team_id": auth_info.get("team_id"),
                    "team_name": auth_info.get("team"),
                    "user_id": auth_info.get("user_id"),
                    "user": auth_info.get("user")
                }
                
        except Exception as e:
            logger.error(f"Slack authentication error: {str(e)}")
            raise MCPException(self.service_name, f"Authentication failed: {str(e)}")
    
    async def test_connection(self, auth_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Slack接続テスト
        
        Args:
            auth_data: 認証データ
            
        Returns:
            接続テスト結果
        """
        try:
            headers = {
                "Authorization": f"Bearer {auth_data['api_token']}",
                "Content-Type": "application/json"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/auth.test",
                    headers=headers
                )
                
                if response.status_code == 200:
                    auth_info = response.json()
                    if auth_info.get("ok"):
                        return {
                            "connected": True,
                            "message": "Successfully connected to Slack",
                            "team_name": auth_info.get("team"),
                            "user": auth_info.get("user")
                        }
                    else:
                        return {
                            "connected": False,
                            "message": f"Connection failed: {auth_info.get('error')}"
                        }
                else:
                    return {
                        "connected": False,
                        "message": f"Connection failed: {response.status_code}"
                    }
                    
        except Exception as e:
            logger.error(f"Slack test connection error: {str(e)}")
            return {
                "connected": False,
                "message": f"Connection test failed: {str(e)}"
            }
    
    async def execute_action(self, action: str, params: Dict[str, Any], auth_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Slackアクションを実行
        
        Args:
            action: アクション名
            params: パラメータ
            auth_data: 認証データ
            
        Returns:
            実行結果
        """
        try:
            headers = {
                "Authorization": f"Bearer {auth_data['api_token']}",
                "Content-Type": "application/json"
            }
            
            async with httpx.AsyncClient() as client:
                if action == "send_message":
                    return await self._send_message(client, headers, params)
                elif action == "list_channels":
                    return await self._list_channels(client, headers, params)
                elif action == "get_user_info":
                    return await self._get_user_info(client, headers, params)
                else:
                    raise MCPException(self.service_name, f"Unknown action: {action}")
                    
        except Exception as e:
            logger.error(f"Slack action execution error: {str(e)}")
            raise MCPException(self.service_name, f"Action execution failed: {str(e)}")
    
    async def _send_message(self, client: httpx.AsyncClient, headers: Dict[str, str], params: Dict[str, Any]) -> Dict[str, Any]:
        """メッセージを送信"""
        channel = params.get("channel")
        text = params.get("text")
        
        if not channel or not text:
            raise MCPException(self.service_name, "Channel and text required")
        
        data = {
            "channel": channel,
            "text": text
        }
        
        # 追加オプション
        if "username" in params:
            data["username"] = params["username"]
        if "icon_emoji" in params:
            data["icon_emoji"] = params["icon_emoji"]
        if "attachments" in params:
            data["attachments"] = params["attachments"]
        
        response = await client.post(
            f"{self.base_url}/chat.postMessage",
            headers=headers,
            json=data
        )
        
        if response.status_code == 200:
            result = response.json()
            if result.get("ok"):
                return result
            else:
                raise MCPException(self.service_name, f"Failed to send message: {result.get('error')}")
        else:
            raise MCPException(self.service_name, f"Failed to send message: {response.status_code}")
    
    async def _list_channels(self, client: httpx.AsyncClient, headers: Dict[str, str], params: Dict[str, Any]) -> Dict[str, Any]:
        """チャンネル一覧を取得"""
        exclude_archived = params.get("exclude_archived", True)
        limit = params.get("limit", 100)
        
        query_params = {
            "exclude_archived": exclude_archived,
            "limit": limit
        }
        
        response = await client.get(
            f"{self.base_url}/conversations.list",
            headers=headers,
            params=query_params
        )
        
        if response.status_code == 200:
            result = response.json()
            if result.get("ok"):
                return result
            else:
                raise MCPException(self.service_name, f"Failed to list channels: {result.get('error')}")
        else:
            raise MCPException(self.service_name, f"Failed to list channels: {response.status_code}")
    
    async def _get_user_info(self, client: httpx.AsyncClient, headers: Dict[str, str], params: Dict[str, Any]) -> Dict[str, Any]:
        """ユーザー情報を取得"""
        user_id = params.get("user_id")
        
        if not user_id:
            raise MCPException(self.service_name, "User ID required")
        
        query_params = {
            "user": user_id
        }
        
        response = await client.get(
            f"{self.base_url}/users.info",
            headers=headers,
            params=query_params
        )
        
        if response.status_code == 200:
            result = response.json()
            if result.get("ok"):
                return result
            else:
                raise MCPException(self.service_name, f"Failed to get user info: {result.get('error')}")
        else:
            raise MCPException(self.service_name, f"Failed to get user info: {response.status_code}")