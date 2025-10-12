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
        self.tool_insert_positions = {}  # ツールごとの挿入位置を記録
        # トークン蓄積用
        self.accumulated_tokens = []
        self.tool_calls = []
        self.token_usage = {"prompt": 0, "completion": 0, "total": 0}
        self.start_time = time.time()
    
    async def on_llm_new_token(self, token: str, **kwargs: Any) -> None:
        """
        新しいトークンが生成された時

        Args:
            token: 生成されたトークン
        """
        logger.info(f"Token received: {repr(token)}")
        self.accumulated_tokens.append(token)
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
        
        # 現在のメッセージ位置を記録（UI表示用）
        insert_position = len("".join(self.accumulated_tokens))
        self.tool_insert_positions[tool_name] = insert_position
        
        logger.info(f"🔧 on_tool_start called! Tool: {tool_name}, Input: {input_str}, Position: {insert_position}")
        
        event = {
            "type": "tool_start",
            "tool_id": tool_name,
            "tool_name": tool_name,
            "input": input_str,
            "insert_position": insert_position
        }
        
        await self.queue.put(event)
        logger.info(f"✅ Tool start event queued: {event}")
    
    async def on_llm_end(self, response: LLMResult, **kwargs: Any) -> None:
        """
        LLM完了時 - トークン使用量を取得
        
        Args:
            response: LLMの応答結果
        """
        # stream_usage=Trueの場合、usage_metadataに含まれる
        if hasattr(response, 'generations') and response.generations:
            for generation_list in response.generations:
                for generation in generation_list:
                    if hasattr(generation, 'message') and hasattr(generation.message, 'usage_metadata'):
                        usage_meta = generation.message.usage_metadata
                        
                        if usage_meta:
                            # usage_metadataは辞書型
                            self.token_usage = {
                                "prompt": usage_meta.get('input_tokens', 0),
                                "completion": usage_meta.get('output_tokens', 0),
                                "total": usage_meta.get('total_tokens', 0)
                            }
                            logger.info(f"✅ Token usage from usage_metadata: {self.token_usage}")
                            return
        
        # レガシーな方法（llm_output）もフォールバックとして確認
        if response.llm_output and "token_usage" in response.llm_output:
            usage = response.llm_output["token_usage"]
            self.token_usage = {
                "prompt": usage.get("prompt_tokens", 0),
                "completion": usage.get("completion_tokens", 0),
                "total": usage.get("total_tokens", 0)
            }
            logger.info(f"✅ Token usage from llm_output: {self.token_usage}")
        else:
            logger.warning(f"⚠️ No token_usage found in llm_output or usage_metadata")
    
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
        
        # 挿入位置を取得
        insert_position = self.tool_insert_positions.get(tool_name, 0)
        if tool_name in self.tool_insert_positions:
            del self.tool_insert_positions[tool_name]
        
        # ツール呼び出し情報を蓄積
        tool_call_info = {
            "tool_id": tool_name,
            "tool_name": tool_name,
            "status": "completed",
            "input": kwargs.get("input", {}),
            "output": output_str[:500],
            "error": None,
            "execution_time_ms": execution_time_ms,
            "insert_position": insert_position
        }
        self.tool_calls.append(tool_call_info)
        
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
        
        # 挿入位置を取得
        insert_position = self.tool_insert_positions.get(tool_name, 0)
        if tool_name in self.tool_insert_positions:
            del self.tool_insert_positions[tool_name]
        
        # ツール呼び出し情報を蓄積
        tool_call_info = {
            "tool_id": tool_name,
            "tool_name": tool_name,
            "status": "failed",
            "input": kwargs.get("input", {}),
            "output": "",
            "error": str(error),
            "execution_time_ms": execution_time_ms,
            "insert_position": insert_position
        }
        self.tool_calls.append(tool_call_info)
        
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
        
        Note:
            doneイベントはchat.pyのrun_agent関数内で完全なメタデータと共に送信されるため、
            ここでは何もしない。
        """
        logger.info("Agent finished - done event will be sent by run_agent()")
    
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

