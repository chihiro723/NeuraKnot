from typing import Dict, Any
import httpx
from app.mcp.mcp_client import BaseMCPClient
from app.utils.logger import logger
from app.utils.exceptions import MCPException


class GoogleDriveClient(BaseMCPClient):
    """Google Drive MCP クライアント"""
    
    def __init__(self):
        super().__init__("google_drive")
        self.base_url = "https://www.googleapis.com/drive/v3"
    
    async def authenticate(self, credentials: Dict[str, Any]) -> Dict[str, Any]:
        """
        Google OAuth認証
        
        Args:
            credentials: OAuth認証情報
            
        Returns:
            認証トークン
        """
        try:
            # OAuth2フローの実装（Calendar と同様）
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
            logger.error(f"Google Drive authentication error: {str(e)}")
            raise MCPException(self.service_name, f"Authentication failed: {str(e)}")
    
    async def test_connection(self, auth_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Google Drive接続テスト
        
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
                    f"{self.base_url}/about?fields=user,storageQuota",
                    headers=headers
                )
                
                if response.status_code == 200:
                    drive_info = response.json()
                    return {
                        "connected": True,
                        "message": "Successfully connected to Google Drive",
                        "user_email": drive_info.get("user", {}).get("emailAddress"),
                        "storage_used": drive_info.get("storageQuota", {}).get("usage")
                    }
                else:
                    return {
                        "connected": False,
                        "message": f"Connection failed: {response.status_code}"
                    }
                    
        except Exception as e:
            logger.error(f"Google Drive test connection error: {str(e)}")
            return {
                "connected": False,
                "message": f"Connection test failed: {str(e)}"
            }
    
    async def execute_action(self, action: str, params: Dict[str, Any], auth_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Google Driveアクションを実行
        
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
                if action == "list_files":
                    return await self._list_files(client, headers, params)
                elif action == "upload_file":
                    return await self._upload_file(client, headers, params)
                elif action == "download_file":
                    return await self._download_file(client, headers, params)
                elif action == "share_file":
                    return await self._share_file(client, headers, params)
                else:
                    raise MCPException(self.service_name, f"Unknown action: {action}")
                    
        except Exception as e:
            logger.error(f"Google Drive action execution error: {str(e)}")
            raise MCPException(self.service_name, f"Action execution failed: {str(e)}")
    
    async def _list_files(self, client: httpx.AsyncClient, headers: Dict[str, str], params: Dict[str, Any]) -> Dict[str, Any]:
        """ファイル一覧を取得"""
        page_size = params.get("page_size", 10)
        query = params.get("query")  # 検索クエリ
        
        query_params = {
            "pageSize": page_size,
            "fields": "files(id,name,mimeType,size,createdTime,modifiedTime)"
        }
        
        if query:
            query_params["q"] = query
        
        response = await client.get(
            f"{self.base_url}/files",
            headers=headers,
            params=query_params
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            raise MCPException(self.service_name, f"Failed to list files: {response.status_code}")
    
    async def _upload_file(self, client: httpx.AsyncClient, headers: Dict[str, str], params: Dict[str, Any]) -> Dict[str, Any]:
        """ファイルをアップロード"""
        file_name = params.get("file_name")
        file_content = params.get("file_content")
        mime_type = params.get("mime_type", "application/octet-stream")
        
        if not file_name or not file_content:
            raise MCPException(self.service_name, "File name and content required")
        
        # メタデータの準備
        metadata = {
            "name": file_name
        }
        
        # マルチパートアップロード
        files = {
            "metadata": (None, metadata, "application/json"),
            "media": (file_name, file_content, mime_type)
        }
        
        # Content-Typeヘッダーを削除（multipart/form-dataが自動設定される）
        upload_headers = {k: v for k, v in headers.items() if k != "Content-Type"}
        
        response = await client.post(
            "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
            headers=upload_headers,
            files=files
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            raise MCPException(self.service_name, f"Failed to upload file: {response.status_code}")
    
    async def _download_file(self, client: httpx.AsyncClient, headers: Dict[str, str], params: Dict[str, Any]) -> Dict[str, Any]:
        """ファイルをダウンロード"""
        file_id = params.get("file_id")
        
        if not file_id:
            raise MCPException(self.service_name, "File ID required")
        
        response = await client.get(
            f"{self.base_url}/files/{file_id}?alt=media",
            headers=headers
        )
        
        if response.status_code == 200:
            return {
                "success": True,
                "content": response.content,
                "content_type": response.headers.get("content-type")
            }
        else:
            raise MCPException(self.service_name, f"Failed to download file: {response.status_code}")
    
    async def _share_file(self, client: httpx.AsyncClient, headers: Dict[str, str], params: Dict[str, Any]) -> Dict[str, Any]:
        """ファイルを共有"""
        file_id = params.get("file_id")
        email = params.get("email")
        role = params.get("role", "reader")  # reader, writer, commenter
        
        if not file_id:
            raise MCPException(self.service_name, "File ID required")
        
        permission_data = {
            "role": role,
            "type": "user" if email else "anyone"
        }
        
        if email:
            permission_data["emailAddress"] = email
        
        response = await client.post(
            f"{self.base_url}/files/{file_id}/permissions",
            headers=headers,
            json=permission_data
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            raise MCPException(self.service_name, f"Failed to share file: {response.status_code}")