"""
エージェントサービス
LangChain AgentExecutorベースのエージェント管理
"""
from langchain.agents import AgentExecutor, create_openai_tools_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from app.models.request import ChatRequest, CompletionMode
from app.models.response import ChatResponse, ToolCall, ChatMetadata, TokenUsage
from app.core.llm_factory import LLMFactory
from app.core.exceptions import ToolsRequiredButNoneAvailable
from typing import List, Dict, Any
import time
import logging

logger = logging.getLogger(__name__)


class AgentService:
    """LangChain Agentベースのエージェント管理サービス"""
    
    # ペルソナごとのシステムプロンプト
    PERSONA_PROMPTS = {
        "assistant": "あなたは親切で丁寧なアシスタントです。ユーザーの質問に対して、利用可能なツールを効果的に活用して正確で有用な回答を提供してください。",
        "creative": "あなたは創造的で柔軟な思考を持つクリエイティブパートナーです。独創的なアイデアを提案し、ユーザーの創造性を刺激してください。",
        "analytical": "あなたは論理的で分析的な専門家です。データや事実に基づいた客観的な分析を提供し、明確な結論を導いてください。",
        "concise": "あなたは簡潔で要点を絞った応答をする専門家です。無駄を省き、核心的な情報のみを提供してください。"
    }
    
    @staticmethod
    def _build_system_prompt(persona: str, custom_prompt: str = None) -> str:
        """
        ペルソナに応じたシステムプロンプトを構築
        
        Args:
            persona: ペルソナ名
            custom_prompt: カスタムプロンプト
            
        Returns:
            システムプロンプト文字列
        """
        if custom_prompt:
            return custom_prompt
        
        base_prompt = AgentService.PERSONA_PROMPTS.get(
            persona,
            AgentService.PERSONA_PROMPTS["assistant"]
        )
        
        return f"""{base_prompt}

【重要な指示】
- ツールを使う必要がない場合は、直接回答してください
- ツールを使う場合は、適切なツールを選択し、明確な引数を渡してください
- ツールの結果を受け取ったら、それを元にユーザーにわかりやすく説明してください
"""
    
    @staticmethod
    def _convert_history_to_messages(history: List) -> List:
        """
        会話履歴をLangChainメッセージ形式に変換
        
        Args:
            history: 会話履歴のリスト
            
        Returns:
            LangChainメッセージのリスト
        """
        messages = []
        for msg in history:
            if msg.role == "user":
                messages.append(HumanMessage(content=msg.content))
            elif msg.role == "assistant":
                messages.append(AIMessage(content=msg.content))
            elif msg.role == "system":
                messages.append(SystemMessage(content=msg.content))
        return messages
    
    async def execute_chat(
        self,
        request: ChatRequest,
        tools: list
    ) -> ChatResponse:
        """
        チャット実行
        
        Args:
            request: チャットリクエスト
            tools: 利用可能なツールのリスト
            
        Returns:
            チャットレスポンス
            
        Raises:
            ToolsRequiredButNoneAvailable: ツール必須だがツールなし
        """
        start_time = time.time()
        
        # バリデーション
        if request.completion_mode == CompletionMode.TOOLS_REQUIRED:
            if not tools:
                raise ToolsRequiredButNoneAvailable()
        
        # ツールフィルタリング
        filtered_tools = self._filter_tools(tools, request.allowed_tools)
        
        logger.info(f"Executing chat with {len(filtered_tools)} tools")
        
        # LLM作成
        llm = LLMFactory.create_llm(
            provider=request.agent_config.provider,
            model=request.agent_config.model,
            temperature=request.agent_config.temperature,
            max_tokens=request.agent_config.max_tokens
        )
        
        # プロンプト作成
        system_prompt = self._build_system_prompt(
            request.agent_config.persona,
            request.agent_config.custom_system_prompt
        )
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            MessagesPlaceholder(variable_name="chat_history", optional=True),
            ("human", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad"),
        ])
        
        # エージェント実行
        agent = create_openai_tools_agent(llm, filtered_tools, prompt)
        agent_executor = AgentExecutor(
            agent=agent,
            tools=filtered_tools,
            max_iterations=10,
            max_execution_time=120,  # 最大実行時間（秒）
            return_intermediate_steps=True,
            handle_parsing_errors=True,  # パースエラーを自動処理
            verbose=False
        )
        
        # 会話履歴を変換
        chat_history = self._convert_history_to_messages(request.conversation_history)
        
        # 実行
        result = await agent_executor.ainvoke({
            "input": request.message,
            "chat_history": chat_history
        })
        
        # レスポンス構築
        processing_time_ms = int((time.time() - start_time) * 1000)
        
        return self._build_response(
            request,
            result,
            len(filtered_tools),
            processing_time_ms
        )
    
    def _filter_tools(self, tools: list, allowed_tools):
        """
        ツールフィルタリング
        
        Args:
            tools: 全ツール
            allowed_tools: 許可されたツール名のリスト
            
        Returns:
            フィルタリングされたツール
        """
        if allowed_tools is None:
            return tools
        if allowed_tools == []:
            return []
        return [t for t in tools if t.name in allowed_tools]
    
    def _build_response(
        self,
        request: ChatRequest,
        result: Dict[str, Any],
        tools_count: int,
        processing_time_ms: int
    ) -> ChatResponse:
        """
        レスポンス構築
        
        Args:
            request: リクエスト
            result: エージェント実行結果
            tools_count: ツール数
            processing_time_ms: 処理時間
            
        Returns:
            ChatResponse
        """
        # ツール呼び出しを抽出
        tool_calls = []
        if "intermediate_steps" in result:
            for action, output in result["intermediate_steps"]:
                tool_calls.append(ToolCall(
                    tool_id=action.tool,
                    tool_name=action.tool,
                    status="completed",
                    input=action.tool_input,
                    output=str(output)[:500],
                    error=None,
                    execution_time_ms=0  # 個別計測は困難なため0
                ))
        
        return ChatResponse(
            conversation_id=request.conversation_id,
            message=result.get("output", ""),
            tool_calls=tool_calls,
            metadata=ChatMetadata(
                model=request.agent_config.model,
                provider=request.agent_config.provider,
                tokens_used=TokenUsage(prompt=0, completion=0, total=0),  # 後で実装可能
                processing_time_ms=processing_time_ms,
                completion_mode_used=request.completion_mode,
                tools_available=tools_count,
                basic_tools_count=0,  # 呼び出し側で設定
                service_tools_count=0  # 呼び出し側で設定
            )
        )

