"""
SSEストリーミング
LangChain AsyncCallbackHandlerを使用したリアルタイムイベント配信
"""
from langchain_core.callbacks import AsyncCallbackHandler
from langchain_core.outputs import LLMResult
from typing import Any, Dict, List
import asyncio
import time
import logging

logger = logging.getLogger(__name__)


class SSEStreamingCallback(AsyncCallbackHandler):
    """SSEストリーミング用のコールバックハンドラ"""
    
    def __init__(self):
        super().__init__()
        self.queue = asyncio.Queue()
        self.tool_start_times = {}
    
    async def on_llm_new_token(self, token: str, **kwargs: Any) -> None:
        """
        新しいトークンが生成された時

        Args:
            token: 生成されたトークン
        """
        logger.info(f"Token received: {repr(token)}")
        await self.queue.put({
            "type": "token",
            "content": token
        })
    
    async def on_tool_start(
        self,
        serialized: Dict[str, Any],
        input_str: str,
        **kwargs: Any
    ) -> None:
        """
        ツール実行開始時
        
        Args:
            serialized: シリアル化されたツール情報
            input_str: ツール入力
        """
        tool_name = serialized.get("name", "Unknown")
        self.tool_start_times[tool_name] = time.time()
        
        logger.info(f"🔧 on_tool_start called! Tool: {tool_name}, Input: {input_str}")
        
        event = {
            "type": "tool_start",
            "tool_id": tool_name,
            "tool_name": tool_name,
            "input": input_str
        }
        
        await self.queue.put(event)
        logger.info(f"✅ Tool start event queued: {event}")
    
    async def on_tool_end(self, output: str, **kwargs: Any) -> None:
        """
        ツール実行終了時
        
        Args:
            output: ツール出力
        """
        tool_name = kwargs.get("name", "Unknown")
        
        # outputを文字列に変換
        output_str = str(output) if output else ""
        
        logger.info(f"✅ on_tool_end called! Tool: {tool_name}, Output type: {type(output)}, Output: {output_str[:200]}")
        
        # 実行時間を計算
        execution_time_ms = 0
        if tool_name in self.tool_start_times:
            execution_time_ms = int((time.time() - self.tool_start_times[tool_name]) * 1000)
            del self.tool_start_times[tool_name]
        
        event = {
            "type": "tool_end",
            "tool_id": tool_name,
            "status": "completed",
            "output": output_str[:500],  # 最初の500文字
            "error": None,
            "execution_time_ms": execution_time_ms
        }
        
        await self.queue.put(event)
        logger.info(f"✅ Tool end event queued with output length: {len(output_str)}")
    
    async def on_tool_error(self, error: Exception, **kwargs: Any) -> None:
        """
        ツール実行エラー時
        
        Args:
            error: 発生したエラー
        """
        tool_name = kwargs.get("name", "Unknown")
        
        # 実行時間を計算
        execution_time_ms = 0
        if tool_name in self.tool_start_times:
            execution_time_ms = int((time.time() - self.tool_start_times[tool_name]) * 1000)
            del self.tool_start_times[tool_name]
        
        await self.queue.put({
            "type": "tool_end",
            "tool_id": tool_name,
            "status": "failed",
            "output": "",
            "error": str(error),
            "execution_time_ms": execution_time_ms
        })
        
        logger.error(f"Tool error: {tool_name} - {str(error)}")
    
    async def on_agent_finish(self, finish: Any, **kwargs: Any) -> None:
        """
        エージェント完了時
        
        Args:
            finish: エージェント完了情報
        """
        await self.queue.put({
            "type": "done",
            "metadata": {}
        })
        
        logger.info("Agent finished")
    
    async def on_llm_error(self, error: Exception, **kwargs: Any) -> None:
        """
        LLMエラー時
        
        Args:
            error: 発生したエラー
        """
        await self.queue.put({
            "type": "error",
            "code": "LLM_API_ERROR",
            "message": str(error)
        })
        
        logger.error(f"LLM error: {str(error)}")
    
    async def get_events(self):
        """
        イベントストリーム取得
        
        Yields:
            イベント辞書
        """
        while True:
            try:
                event = await asyncio.wait_for(
                    self.queue.get(),
                    timeout=60.0
                )
                yield event
                if event.get("type") == "done" or event.get("type") == "error":
                    break
            except asyncio.TimeoutError:
                logger.warning("SSE stream timeout")
                break

