"""
MCPサービス
リモートMCPサーバーからツール定義を取得し、LangChainツールに変換
"""
import asyncio
import httpx
from typing import List
from app.models.request import MCPServerConfig
from app.core.config import settings
from app.core.exceptions import MCPConnectionError, MCPTimeoutError
from app.tools.remote_mcp_tool import RemoteMCPTool
import logging

logger = logging.getLogger(__name__)


class MCPService:
    """リモートMCPサーバーからツール定義を取得し、LangChainツールに変換するサービス"""
    
    @staticmethod
    async def fetch_tools_from_server(
        server_config: MCPServerConfig
    ) -> List[RemoteMCPTool]:
        """
        指定されたMCPサーバーのカタログを取得してツールリストを生成
        
        Args:
            server_config: MCPサーバー設定
            
        Returns:
            RemoteMCPToolのリスト
            
        Raises:
            MCPConnectionError: 接続エラー
            MCPTimeoutError: タイムアウト
        """
        if not server_config.enabled:
            logger.info(f"MCPサーバー '{server_config.name}' は無効です")
            return []
        
        logger.info(f"MCPサーバー '{server_config.name}' からツールカタログを取得中...")
        
        # ヘッダーの準備
        headers = server_config.headers or {}
        if server_config.api_key:
            headers["Authorization"] = f"Bearer {server_config.api_key}"
        
        async with httpx.AsyncClient(timeout=settings.MCP_CONNECTION_TIMEOUT) as client:
            try:
                # MCP標準のカタログエンドポイントを呼び出す
                response = await client.get(
                    f"{server_config.base_url}/catalog",
                    headers=headers
                )
                response.raise_for_status()
                catalog = response.json()
                
                logger.debug(f"カタログ取得成功: {catalog}")
                
                # ツールリストを生成
                tools = []
                tool_definitions = catalog.get("tools", [])
                
                if not tool_definitions:
                    logger.warning(f"MCPサーバー '{server_config.name}' にツールが登録されていません")
                    return []
                
                for tool_def in tool_definitions:
                    tool = RemoteMCPTool(
                        name=tool_def.get("name", "unknown_tool"),
                        description=tool_def.get("description", "説明なし"),
                        mcp_server_url=server_config.base_url,
                        headers=headers,
                        timeout=settings.MCP_TOOL_TIMEOUT
                    )
                    tools.append(tool)
                    logger.info(f"ツール登録: {tool.name}")
                
                logger.info(f"MCPサーバー '{server_config.name}' から {len(tools)} 個のツールを取得しました")
                return tools
                
            except httpx.TimeoutException:
                raise MCPTimeoutError(server_config.name, settings.MCP_CONNECTION_TIMEOUT)
                
            except httpx.HTTPStatusError as e:
                logger.error(
                    f"HTTPエラー: MCPサーバー '{server_config.name}' が "
                    f"{e.response.status_code} を返しました\n"
                    f"レスポンス: {e.response.text[:200]}"
                )
                raise MCPConnectionError(
                    server_config.name,
                    {"status_code": e.response.status_code, "response": e.response.text[:200]}
                )
                
            except httpx.RequestError as e:
                logger.error(f"接続エラー: MCPサーバー '{server_config.name}' に接続できません - {str(e)}")
                raise MCPConnectionError(server_config.name, {"error": str(e)})
                
            except Exception as e:
                logger.error(
                    f"予期しないエラー: MCPサーバー '{server_config.name}' からのツール取得に失敗 - {str(e)}",
                    exc_info=True
                )
                raise MCPConnectionError(server_config.name, {"error": str(e)})
    
    @staticmethod
    async def load_all_tools(
        server_configs: List[MCPServerConfig]
    ) -> List[RemoteMCPTool]:
        """
        複数のMCPサーバーからすべてのツールを並行取得
        
        Args:
            server_configs: MCPサーバー設定のリスト
            
        Returns:
            全MCPツールのリスト
        """
        if not server_configs:
            logger.info("MCPサーバーが設定されていません")
            return []
        
        # 有効なサーバーのみ処理
        enabled_servers = [s for s in server_configs if s.enabled]
        
        if not enabled_servers:
            logger.info("有効なMCPサーバーがありません")
            return []
        
        logger.info(f"{len(enabled_servers)} 個のMCPサーバーからツールを取得します")
        
        # 並行してツールを取得
        tasks = [
            MCPService.fetch_tools_from_server(config)
            for config in enabled_servers
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # 結果を統合
        all_tools = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"サーバー #{i+1} でエラー: {result}")
                continue
            all_tools.extend(result)
        
        logger.info(f"合計 {len(all_tools)} 個のツールを取得しました")
        return all_tools

