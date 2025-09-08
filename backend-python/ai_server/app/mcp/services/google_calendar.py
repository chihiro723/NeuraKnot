from typing import Dict, Any
import httpx
from app.mcp.mcp_client import BaseMCPClient
from app.utils.logger import logger
from app.utils.exceptions import MCPException


class GoogleCalendarClient(BaseMCPClient):
    """Google Calendar MCP クライアント"""
    
    def __init__(self):
        super().__init__("google_calendar")
        self.base_url = "https://www.googleapis.com/calendar/v3"
    
    async def authenticate(self, credentials: Dict[str, Any]) -> Dict[str, Any]:
        """
        Google OAuth認証
        
        Args:
            credentials: OAuth認証情報
            
        Returns:
            認証トークン
        """
        try:
            # OAuth2フローの実装
            auth_code = credentials.get("auth_code")
            if not auth_code:
                raise MCPException(self.service_name, "Authorization code required")
            
            # トークン交換
            token_data = {
                "code": auth_code,
                "client_id": self.settings.google_client_id,
                "client_secret": self.settings.google_client_secret,
                "redirect_uri": self.settings.google_redirect_uri,
                "grant_type": "authorization_code"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://oauth2.googleapis.com/token",
                    data=token_data
                )
                
                if response.status_code != 200:
                    raise MCPException(self.service_name, "Token exchange failed")
                
                tokens = response.json()
                
                return {
                    "access_token": tokens["access_token"],
                    "refresh_token": tokens.get("refresh_token"),
                    "expires_in": tokens.get("expires_in", 3600),
                    "token_type": tokens.get("token_type", "Bearer")
                }
                
        except Exception as e:
            logger.error(f"Google Calendar authentication error: {str(e)}")
            raise MCPException(self.service_name, f"Authentication failed: {str(e)}")
    
    async def test_connection(self, auth_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Google Calendar接続テスト
        
        Args:
            auth_data: 認証データ
            
        Returns:
            接続テスト結果
        """
        try:
            headers = {
                "Authorization": f"Bearer {auth_data['access_token']}",
                "Content-Type": "application/json"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/calendars/primary",
                    headers=headers
                )
                
                if response.status_code == 200:
                    calendar_info = response.json()
                    return {
                        "connected": True,
                        "message": "Successfully connected to Google Calendar",
                        "calendar_id": calendar_info.get("id"),
                        "calendar_name": calendar_info.get("summary")
                    }
                else:
                    return {
                        "connected": False,
                        "message": f"Connection failed: {response.status_code}"
                    }
                    
        except Exception as e:
            logger.error(f"Google Calendar test connection error: {str(e)}")
            return {
                "connected": False,
                "message": f"Connection test failed: {str(e)}"
            }
    
    async def execute_action(self, action: str, params: Dict[str, Any], auth_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Google Calendarアクションを実行
        
        Args:
            action: アクション名
            params: パラメータ
            auth_data: 認証データ
            
        Returns:
            実行結果
        """
        try:
            headers = {
                "Authorization": f"Bearer {auth_data['access_token']}",
                "Content-Type": "application/json"
            }
            
            async with httpx.AsyncClient() as client:
                if action == "list_events":
                    return await self._list_events(client, headers, params)
                elif action == "create_event":
                    return await self._create_event(client, headers, params)
                elif action == "update_event":
                    return await self._update_event(client, headers, params)
                elif action == "delete_event":
                    return await self._delete_event(client, headers, params)
                else:
                    raise MCPException(self.service_name, f"Unknown action: {action}")
                    
        except Exception as e:
            logger.error(f"Google Calendar action execution error: {str(e)}")
            raise MCPException(self.service_name, f"Action execution failed: {str(e)}")
    
    async def _list_events(self, client: httpx.AsyncClient, headers: Dict[str, str], params: Dict[str, Any]) -> Dict[str, Any]:
        """イベント一覧を取得"""
        calendar_id = params.get("calendar_id", "primary")
        max_results = params.get("max_results", 10)
        time_min = params.get("time_min")
        time_max = params.get("time_max")
        
        query_params = {
            "maxResults": max_results,
            "singleEvents": True,
            "orderBy": "startTime"
        }
        
        if time_min:
            query_params["timeMin"] = time_min
        if time_max:
            query_params["timeMax"] = time_max
        
        response = await client.get(
            f"{self.base_url}/calendars/{calendar_id}/events",
            headers=headers,
            params=query_params
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            raise MCPException(self.service_name, f"Failed to list events: {response.status_code}")
    
    async def _create_event(self, client: httpx.AsyncClient, headers: Dict[str, str], params: Dict[str, Any]) -> Dict[str, Any]:
        """イベントを作成"""
        calendar_id = params.get("calendar_id", "primary")
        event_data = params.get("event")
        
        if not event_data:
            raise MCPException(self.service_name, "Event data required")
        
        response = await client.post(
            f"{self.base_url}/calendars/{calendar_id}/events",
            headers=headers,
            json=event_data
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            raise MCPException(self.service_name, f"Failed to create event: {response.status_code}")
    
    async def _update_event(self, client: httpx.AsyncClient, headers: Dict[str, str], params: Dict[str, Any]) -> Dict[str, Any]:
        """イベントを更新"""
        calendar_id = params.get("calendar_id", "primary")
        event_id = params.get("event_id")
        event_data = params.get("event")
        
        if not event_id or not event_data:
            raise MCPException(self.service_name, "Event ID and data required")
        
        response = await client.put(
            f"{self.base_url}/calendars/{calendar_id}/events/{event_id}",
            headers=headers,
            json=event_data
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            raise MCPException(self.service_name, f"Failed to update event: {response.status_code}")
    
    async def _delete_event(self, client: httpx.AsyncClient, headers: Dict[str, str], params: Dict[str, Any]) -> Dict[str, Any]:
        """イベントを削除"""
        calendar_id = params.get("calendar_id", "primary")
        event_id = params.get("event_id")
        
        if not event_id:
            raise MCPException(self.service_name, "Event ID required")
        
        response = await client.delete(
            f"{self.base_url}/calendars/{calendar_id}/events/{event_id}",
            headers=headers
        )
        
        if response.status_code == 204:
            return {"success": True, "message": "Event deleted successfully"}
        else:
            raise MCPException(self.service_name, f"Failed to delete event: {response.status_code}")