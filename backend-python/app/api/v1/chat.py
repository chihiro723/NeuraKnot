"""
チャットエンドポイント
通常チャットとストリーミングチャット
"""
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from app.models.request import ChatRequest
from app.models.response import ChatResponse
from app.services.agent_service import AgentService
from app.services.registry import get_registry
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
    
    # サービスレジストリからツールを取得
    tools = []
    registry = get_registry()
    basic_tools_count = 0
    service_tools_count = 0
    
    # サービス設定に基づいてツールを取得
    if request.services:
        for service_config in request.services:
            service_class = registry.get_service_class(service_config.service_class)
            if service_class:
                # サービスインスタンスを作成（認証情報付き）
                auth = {}
                if service_config.api_key:
                    auth["api_key"] = service_config.api_key
                
                service = service_class(
                    config=service_config.headers or {},
                    auth=auth
                )
                service_tools = service.get_langchain_tools()
                
                # ツール選択モードに基づいてフィルタリング
                if service_config.tool_selection_mode == "selected" and service_config.selected_tools:
                    service_tools = [
                        tool for tool in service_tools
                        if tool.name in service_config.selected_tools
                    ]
                
                tools.extend(service_tools)
                
                # サービスタイプごとにカウント
                if service.SERVICE_TYPE == 'built_in':
                    basic_tools_count += len(service_tools)
                else:
                    service_tools_count += len(service_tools)
                
                logger.info(f"Loaded {len(service_tools)} tools from {service_config.service_class}")
    
    # エージェントサービスでチャット実行
    agent_service = AgentService()
    response = await agent_service.execute_chat(request, tools)
    
    # メタデータにツール数を設定
    response.metadata.basic_tools_count = basic_tools_count
    response.metadata.service_tools_count = service_tools_count
    
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
            # サービスレジストリからツールを取得
            tools = []
            registry = get_registry()
            
            logger.info(f"📦 Services in request: {len(request.services) if request.services else 0}")
            logger.info(f"📦 Service details: {[s.service_class for s in request.services] if request.services else []}")
            
            # デバッグログ: サービス設定の詳細を確認
            if request.services:
                for i, service_config in enumerate(request.services):
                    logger.info(f"📦 Service {i}: class={service_config.service_class}, api_key={'***' if service_config.api_key else 'None'}, headers={service_config.headers}")
            
            # サービス設定に基づいてツールを取得
            if request.services:
                for service_config in request.services:
                    service_class = registry.get_service_class(service_config.service_class)
                    if service_class:
                        # サービスインスタンスを作成（認証情報付き）
                        auth = {}
                        if service_config.api_key:
                            auth["api_key"] = service_config.api_key
                        
                        service = service_class(
                            config=service_config.headers or {},
                            auth=auth
                        )
                        service_tools = service.get_langchain_tools()
                        
                        # ツール選択モードに基づいてフィルタリング
                        if service_config.tool_selection_mode == "selected" and service_config.selected_tools:
                            service_tools = [
                                tool for tool in service_tools
                                if tool.name in service_config.selected_tools
                            ]
                        
                        tools.extend(service_tools)
                        logger.info(f"Loaded {len(service_tools)} tools from {service_config.service_class}")
            
            # コールバック作成（ツール読み込み後に作成）
            callback = SSEStreamingCallback()

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
                """エージェントを実行（astream_eventsでツールイベントのみキャプチャ）"""
                try:
                    # astream_eventsを使用してツールイベントのみキャプチャ
                    # トークンストリーミングはSSEStreamingCallbackのon_llm_new_tokenに任せる
                    async for event in agent_executor.astream_events(
                        {
                            "input": request.message,
                            "chat_history": chat_history
                        },
                        version="v2",
                        config={"callbacks": [callback]}
                    ):
                        kind = event["event"]
                        
                        # ツール開始イベント
                        if kind == "on_tool_start":
                            tool_name = event.get("name", "Unknown")
                            tool_input = event["data"].get("input", {})
                            
                            # 現在のメッセージ位置を記録
                            insert_position = len("".join(callback.accumulated_tokens))
                            callback.tool_insert_positions[tool_name] = insert_position
                            callback.tool_start_times[tool_name] = time.time()
                            
                            logger.info(f"🔧 Tool start captured via astream_events: {tool_name}")
                            
                            await callback.queue.put({
                                "type": "tool_start",
                                "tool_id": tool_name,
                                "tool_name": tool_name,
                                "input": str(tool_input),
                                "insert_position": insert_position
                            })
                        
                        # ツール終了イベント
                        elif kind == "on_tool_end":
                            tool_name = event.get("name", "Unknown")
                            tool_output = event["data"].get("output", "")
                            
                            # 実行時間を計算
                            execution_time_ms = 0
                            if tool_name in callback.tool_start_times:
                                execution_time_ms = int((time.time() - callback.tool_start_times[tool_name]) * 1000)
                                del callback.tool_start_times[tool_name]
                            
                            # 挿入位置を取得
                            insert_position = callback.tool_insert_positions.get(tool_name, 0)
                            if tool_name in callback.tool_insert_positions:
                                del callback.tool_insert_positions[tool_name]
                            
                            logger.info(f"✅ Tool end captured via astream_events: {tool_name}")
                            
                            # ツール呼び出し情報を蓄積
                            tool_call_info = {
                                "tool_id": tool_name,
                                "tool_name": tool_name,
                                "status": "completed",
                                "input": event["data"].get("input", {}),
                                "output": str(tool_output)[:500],
                                "error": None,
                                "execution_time_ms": execution_time_ms,
                                "insert_position": insert_position
                            }
                            callback.tool_calls.append(tool_call_info)
                            
                            await callback.queue.put({
                                "type": "tool_end",
                                "tool_id": tool_name,
                                "status": "completed",
                                "output": str(tool_output)[:500],
                                "error": None,
                                "execution_time_ms": execution_time_ms
                            })
                        
                        # LLMストリームイベントは処理しない（SSEStreamingCallbackのon_llm_new_tokenで処理される）
                    
                    # 処理完了時に完全なメタデータを含むdoneイベントを送信
                    processing_time_ms = int((time.time() - start_time) * 1000)
                    
                    basic_tools_count = 0
                    service_tools_count = 0
                    
                    # サービスタイプごとにツール数をカウント
                    for service_config in request.services:
                        service_class = registry.get_service_class(service_config.service_class)
                        if service_class:
                            service = service_class()
                            if service.SERVICE_TYPE == 'built_in':
                                basic_tools_count += len([t for t in callback.tool_calls if t['tool_name'] in [tool.name for tool in service.get_langchain_tools()]])
                            else:
                                service_tools_count += len([t for t in callback.tool_calls if t['tool_name'] in [tool.name for tool in service.get_langchain_tools()]])
                    
                    # 生成されたメッセージ
                    completion_text = "".join(callback.accumulated_tokens)
                    
                    # トークン使用量を取得（callback.token_usageから）
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
                            "service_tools_count": service_tools_count
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

