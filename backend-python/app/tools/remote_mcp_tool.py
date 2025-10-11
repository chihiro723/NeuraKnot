"""
RemoteMCPツール
HTTP経由でリモートMCPサーバーと通信するカスタムツール
"""
from langchain_core.tools import BaseTool
from typing import Any, Dict, Optional, Type
from pydantic import BaseModel, Field
import httpx
import logging

logger = logging.getLogger(__name__)


class RemoteMCPToolInput(BaseModel):
    """ツール入力のスキーマ"""
    query: str = Field(description="ツールへの入力")


class RemoteMCPTool(BaseTool):
    """外部MCPサーバーをHTTP経由で呼び出すカスタムツール"""
    
    name: str = Field(description="ツール名")
    description: str = Field(description="ツールの説明")
    mcp_server_url: str = Field(description="MCPサーバーのベースURL")
    headers: Dict[str, str] = Field(default_factory=dict, description="HTTPヘッダー")
    timeout: float = Field(default=30.0, description="タイムアウト秒数")
    args_schema: Optional[Type[BaseModel]] = RemoteMCPToolInput
    
    class Config:
        arbitrary_types_allowed = True
    
    async def _arun(self, query: str = "", **kwargs: Any) -> str:
        """
        非同期でツールを実行
        
        Args:
            query: ツール入力
            **kwargs: その他の引数
            
        Returns:
            ツール実行結果
        """
        # 引数をマージ
        arguments = {"query": query, **kwargs}
        
        payload = {
            "tool": self.name,
            "arguments": arguments
        }
        
        logger.info(f"MCPツール実行開始: {self.name}")
        logger.debug(f"URL: {self.mcp_server_url}/call_tool")
        logger.debug(f"Payload: {payload}")
        
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.post(
                    f"{self.mcp_server_url}/call_tool",
                    json=payload,
                    headers=self.headers
                )
                response.raise_for_status()
                
                result = response.json()
                output = str(result.get("result", result))
                
                logger.info(f"MCPツール実行完了: {self.name}")
                logger.debug(f"結果: {output[:200]}...")
                
                return output
                
            except httpx.TimeoutException:
                error_msg = f"タイムアウト: MCPサーバー '{self.name}' が応答しません ({self.timeout}秒)"
                logger.error(error_msg)
                return f"Error: {error_msg}"
                
            except httpx.HTTPStatusError as e:
                error_msg = f"HTTPエラー: MCPサーバーが {e.response.status_code} を返しました"
                logger.error(f"{error_msg}\nレスポンス: {e.response.text[:200]}")
                return f"Error: {error_msg}"
                
            except httpx.RequestError as e:
                error_msg = f"接続エラー: MCPサーバーに接続できません - {str(e)}"
                logger.error(error_msg)
                return f"Error: {error_msg}"
                
            except Exception as e:
                error_msg = f"予期しないエラー: {type(e).__name__} - {str(e)}"
                logger.error(error_msg, exc_info=True)
                return f"Error: {error_msg}"
    
    def _run(self, query: str = "", **kwargs: Any) -> str:
        """
        同期実行（非推奨、互換性のため残す）
        
        Args:
            query: ツール入力
            **kwargs: その他の引数
            
        Returns:
            ツール実行結果
        """
        import asyncio
        try:
            return asyncio.run(self._arun(query, **kwargs))
        except Exception as e:
            logger.error(f"同期実行エラー: {e}", exc_info=True)
            return f"Error: 同期実行に失敗しました - {str(e)}"

