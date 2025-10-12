"""
チャットエンドポイント
通常チャットとストリーミングチャット
"""
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from app.models.request import ChatRequest
from app.models.response import ChatResponse
from app.services.agent_service import AgentService
from app.services.mcp_service import MCPService
from app.tools.basic_tools import get_basic_tools
from app.core.streaming import SSEStreamingCallback
from app.core.llm_factory import LLMFactory
from langchain.agents import AgentExecutor, create_openai_tools_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
import json
import asyncio
import time
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    通常チャット
    
    Args:
        request: チャットリクエスト
        
    Returns:
        ChatResponse: チャット結果
    """
    logger.info(f"Chat request from user {request.user_id}")
    
    # ツールを取得
    tools = []
    
    # 基本ツールを追加
    if request.include_basic_tools:
        basic_tools = get_basic_tools()
        tools.extend(basic_tools)
        logger.info(f"Added {len(basic_tools)} basic tools")
    
    # MCPツールを追加
    mcp_tools = await MCPService.load_all_tools(request.mcp_servers)
    tools.extend(mcp_tools)
    logger.info(f"Added {len(mcp_tools)} MCP tools")
    
    # エージェントサービスでチャット実行
    agent_service = AgentService()
    response = await agent_service.execute_chat(request, tools)
    
    # メタデータにツール数を設定
    response.metadata.basic_tools_count = len(get_basic_tools()) if request.include_basic_tools else 0
    response.metadata.mcp_tools_count = len(mcp_tools)
    
    return response


@router.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    """
    ストリーミングチャット
    
    Args:
        request: チャットリクエスト
        
    Returns:
        StreamingResponse: SSEストリーム
    """
    logger.info(f"Streaming chat request from user {request.user_id}")
    
    async def event_generator():
        try:
            # ツールを取得
            tools = []
            
            # コールバック作成（ツール読み込み前に作成）
            callback = SSEStreamingCallback()
            
            if request.include_basic_tools:
                basic_tools = get_basic_tools()
                # 各ツールにコールバックを設定
                for tool in basic_tools:
                    tool.callbacks = [callback]
                tools.extend(basic_tools)
                logger.info(f"✅ Loaded {len(basic_tools)} basic tools with callbacks")
                for tool in basic_tools:
                    logger.info(f"  📦 Tool: {tool.name}")
            
            mcp_tools = await MCPService.load_all_tools(request.mcp_servers)
            # MCPツールにもコールバックを設定
            for tool in mcp_tools:
                tool.callbacks = [callback]
            tools.extend(mcp_tools)
            logger.info(f"✅ Total tools available: {len(tools)} (all with callbacks)")

            # LLM作成（ストリーミング有効、コールバック設定）
            llm = LLMFactory.create_llm(
                provider=request.agent_config.provider,
                model=request.agent_config.model,
                temperature=request.agent_config.temperature,
                max_tokens=request.agent_config.max_tokens,
                streaming=True,
                callbacks=[callback]
            )
            
            # システムプロンプト構築
            system_prompt = AgentService._build_system_prompt(
                request.agent_config.persona,
                request.agent_config.custom_system_prompt
            )
            
            prompt = ChatPromptTemplate.from_messages([
                ("system", system_prompt),
                MessagesPlaceholder(variable_name="chat_history", optional=True),
                ("human", "{input}"),
                MessagesPlaceholder(variable_name="agent_scratchpad"),
            ])
            
            # エージェント作成
            agent = create_openai_tools_agent(llm, tools, prompt)
            agent_executor = AgentExecutor(
                agent=agent,
                tools=tools,
                max_iterations=10,
                max_execution_time=120,
                return_intermediate_steps=True,
                handle_parsing_errors=True,
                callbacks=[callback],
                verbose=True  # デバッグのためverboseを有効化
            )
            
            logger.info(f"🤖 Agent executor created with {len(tools)} tools and callback registered")
            
            # 会話履歴変換
            chat_history = AgentService._convert_history_to_messages(request.conversation_history)

            # エージェント実行とイベントストリームを並行処理
            start_time = time.time()
            
            async def run_agent():
                """エージェントを実行"""
                try:
                    await agent_executor.ainvoke({
                        "input": request.message,
                        "chat_history": chat_history
                    })
                    
                    # 処理完了時に完全なメタデータを含むdoneイベントを送信
                    processing_time_ms = int((time.time() - start_time) * 1000)
                    
                    basic_tools_count = len(basic_tools) if request.include_basic_tools else 0
                    
                    # 生成されたメッセージ
                    completion_text = "".join(callback.accumulated_tokens)
                    
                    # トークン使用量を取得（callback.token_usageから）
                    # stream_usage=Trueで設定されているため、on_llm_endで取得できる
                    tokens_used = callback.token_usage
                    logger.info(f"💰 Token usage from API: {tokens_used}")
                    
                    await callback.queue.put({
                        "type": "done",
                        "conversation_id": request.conversation_id,
                        "message": completion_text,
                        "tool_calls": callback.tool_calls,
                        "metadata": {
                            "model": request.agent_config.model,
                            "provider": request.agent_config.provider,
                            "tokens_used": tokens_used,
                            "processing_time_ms": processing_time_ms,
                            "completion_mode_used": "streaming",
                            "tools_available": len(tools),
                            "basic_tools_count": basic_tools_count,
                            "mcp_tools_count": len(mcp_tools)
                        }
                    })
                except Exception as e:
                    logger.error(f"Agent execution error: {e}", exc_info=True)
                    await callback.queue.put({
                        "type": "error",
                        "code": "AGENT_ERROR",
                        "message": str(e)
                    })

            # エージェント実行をバックグラウンドで開始
            agent_task = asyncio.create_task(run_agent())

            # イベントをストリーム
            try:
                async for event in callback.get_events():
                    yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
            finally:
                # エージェント実行が完了するまで待機
                if not agent_task.done():
                    await agent_task
        
        except Exception as e:
            logger.error(f"Streaming error: {e}", exc_info=True)
            yield f"data: {json.dumps({'type': 'error', 'code': 'INTERNAL_ERROR', 'message': str(e)}, ensure_ascii=False)}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive"
        }
    )

