from typing import Dict, Any, List, Optional
from abc import ABC, abstractmethod
import httpx
from app.config import get_settings
from app.services.secret_manager import SecretManager
# from app.database.postgres_client import DatabaseService
from app.utils.logger import logger
from app.utils.exceptions import MCPException, ExternalServiceException


class BaseMCPClient(ABC):
    """MCP基底クライアント"""
    
    def __init__(self, service_name: str):
        self.service_name = service_name
        self.settings = get_settings()
        self.secret_manager = SecretManager()
    
    @abstractmethod
    async def authenticate(self, credentials: Dict[str, Any]) -> Dict[str, Any]:
        """
        サービス認証
        
        Args:
            credentials: 認証情報
            
        Returns:
            認証トークン
        """
        pass
    
    @abstractmethod
    async def test_connection(self, auth_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        接続テスト
        
        Args:
            auth_data: 認証データ
            
        Returns:
            接続テスト結果
        """
        pass
    
    @abstractmethod
    async def execute_action(self, action: str, params: Dict[str, Any], auth_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        アクションの実行
        
        Args:
            action: 実行するアクション名
            params: アクションパラメータ
            auth_data: 認証データ
            
        Returns:
            アクション実行結果
        """
        pass


class MCPService(DatabaseService):
    """MCP統合サービス"""
    
    def __init__(self):
        super().__init__()
        self.secret_manager = SecretManager()
        self._clients = self._initialize_clients()
    
    def _initialize_clients(self) -> Dict[str, BaseMCPClient]:
        """
        MCPクライアントを初期化
        
        Returns:
            利用可能なMCPクライアント
        """
        from app.mcp.services.google_calendar import GoogleCalendarClient
        from app.mcp.services.slack import SlackClient
        from app.mcp.services.google_drive import GoogleDriveClient
        
        return {
            "google_calendar": GoogleCalendarClient(),
            "slack": SlackClient(),
            "google_drive": GoogleDriveClient()
        }
    
    async def get_available_services(self) -> List[Dict[str, Any]]:
        """
        利用可能なMCPサービス一覧を取得
        
        Returns:
            MCPサービスのリスト
        """
        services = []
        
        for service_name, client in self._clients.items():
            service_info = {
                "name": service_name,
                "display_name": service_name.replace("_", " ").title(),
                "description": f"{service_name} integration service",
                "category": self._get_service_category(service_name),
                "auth_type": "oauth2" if "google" in service_name else "api_key",
                "available_actions": self._get_service_actions(service_name)
            }
            services.append(service_info)
        
        return services
    
    async def configure_service(
        self,
        agent_id: str,
        user_id: str,
        service_name: str,
        config: Dict[str, Any]
    ):
        """
        MCPサービスを設定
        
        Args:
            agent_id: エージェントID
            user_id: ユーザーID
            service_name: サービス名
            config: 設定データ
            
        Raises:
            MCPException: 設定エラー
        """
        try:
            if service_name not in self._clients:
                raise MCPException(service_name, "Service not available")
            
            client = self._clients[service_name]
            
            # 認証の実行
            auth_data = await client.authenticate(config)
            
            # 機密情報として保存
            secrets = await self.secret_manager.get_agent_secrets(agent_id, user_id) or {}
            
            if "mcp_configs" not in secrets:
                secrets["mcp_configs"] = {}
            
            secrets["mcp_configs"][service_name] = {
                "auth_data": auth_data,
                "config": config,
                "configured_at": datetime.utcnow().isoformat()
            }
            
            # エージェントの機密情報を更新
            from app.models.agent import AgentSecret
            agent_secret = AgentSecret(
                agent_id=agent_id,
                custom_secrets=secrets
            )
            
            await self.secret_manager.update_agent_secrets(agent_id, user_id, agent_secret)
            
            logger.info(f"MCP service {service_name} configured for agent {agent_id}")
            
        except Exception as e:
            logger.error(f"Configure MCP service error: {str(e)}")
            raise MCPException(service_name, f"Configuration failed: {str(e)}")
    
    async def test_connection(
        self,
        agent_id: str,
        user_id: str,
        service_name: str
    ) -> Dict[str, Any]:
        """
        MCP接続をテスト
        
        Args:
            agent_id: エージェントID
            user_id: ユーザーID
            service_name: サービス名
            
        Returns:
            テスト結果
        """
        try:
            if service_name not in self._clients:
                raise MCPException(service_name, "Service not available")
            
            # エージェントの機密情報を取得
            secrets = await self.secret_manager.get_agent_secrets(agent_id, user_id)
            if not secrets or "mcp_configs" not in secrets or service_name not in secrets["mcp_configs"]:
                return {
                    "status": "error",
                    "message": f"Service {service_name} is not configured"
                }
            
            client = self._clients[service_name]
            auth_data = secrets["mcp_configs"][service_name]["auth_data"]
            
            # 接続テストの実行
            result = await client.test_connection(auth_data)
            
            return {
                "status": "success" if result.get("connected") else "error",
                "service": service_name,
                "message": result.get("message", "Connection test completed"),
                "details": result
            }
            
        except Exception as e:
            logger.error(f"Test MCP connection error: {str(e)}")
            return {
                "status": "error",
                "service": service_name,
                "message": f"Connection test failed: {str(e)}"
            }
    
    async def execute_mcp_action(
        self,
        agent_id: str,
        user_id: str,
        service_name: str,
        action: str,
        params: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        MCPアクションを実行
        
        Args:
            agent_id: エージェントID
            user_id: ユーザーID
            service_name: サービス名
            action: アクション名
            params: パラメータ
            
        Returns:
            実行結果
        """
        try:
            if service_name not in self._clients:
                raise MCPException(service_name, "Service not available")
            
            # エージェントの機密情報を取得
            secrets = await self.secret_manager.get_agent_secrets(agent_id, user_id)
            if not secrets or "mcp_configs" not in secrets or service_name not in secrets["mcp_configs"]:
                raise MCPException(service_name, "Service not configured")
            
            client = self._clients[service_name]
            auth_data = secrets["mcp_configs"][service_name]["auth_data"]
            
            # アクションの実行
            result = await client.execute_action(action, params, auth_data)
            
            logger.info(f"MCP action {action} executed for service {service_name}")
            return result
            
        except Exception as e:
            logger.error(f"Execute MCP action error: {str(e)}")
            raise MCPException(service_name, f"Action execution failed: {str(e)}")
    
    def _get_service_category(self, service_name: str) -> str:
        """サービスのカテゴリを取得"""
        categories = {
            "google_calendar": "productivity",
            "google_drive": "storage",
            "slack": "communication"
        }
        return categories.get(service_name, "other")
    
    def _get_service_actions(self, service_name: str) -> List[str]:
        """サービスの利用可能アクションを取得"""
        actions = {
            "google_calendar": ["list_events", "create_event", "update_event", "delete_event"],
            "google_drive": ["list_files", "upload_file", "download_file", "share_file"],
            "slack": ["send_message", "list_channels", "get_user_info"]
        }
        return actions.get(service_name, [])


# datetime のインポートを追加
from datetime import datetime