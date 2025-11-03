"""
エージェントサービス
LangChain AgentExecutorベースのエージェント管理
"""
from langchain.agents import AgentExecutor
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
        "none": "あなたは有能なAIアシスタントです。ユーザーの質問に対して適切に回答してください。",
        "assistant": "あなたは親切で丁寧なアシスタントです。ユーザーの質問に対して、利用可能なツールを効果的に活用して正確で有用な回答を提供してください。",
        "creative": "あなたは創造的で柔軟な思考を持つクリエイティブパートナーです。独創的なアイデアを提案し、ユーザーの創造性を刺激してください。",
        "analytical": "あなたは論理的で分析的な専門家です。データや事実に基づいた客観的な分析を提供し、明確な結論を導いてください。",
        "concise": "あなたは簡潔で要点を絞った応答をする専門家です。無駄を省き、核心的な情報のみを提供してください。"
    }
    
    @staticmethod
    def _build_system_prompt(persona: str, custom_prompt: str = None, user_name: str = None) -> str:
        """
        ペルソナに応じたシステムプロンプトを構築
        
        Args:
            persona: ペルソナ名
            custom_prompt: カスタムプロンプト（Go側で既にペルソナプロンプトと連結済み）
            user_name: ユーザー名（会話の相手）
            
        Returns:
            システムプロンプト文字列
        """
        # ユーザー名の文脈を追加
        user_context = ""
        if user_name:
            user_context = f"\n\n【会話相手の情報】\nあなたは今、{user_name}さんと会話しています。自然で親しみやすい対話を心がけてください。"
        
        # custom_promptが渡された場合は、既にGo側でペルソナプロンプトと連結されているのでそのまま使用
        if custom_prompt:
            # ツール使用の指示を追加
            return f"""{custom_prompt}{user_context}

【ツール活用の最重要指示】
- **利用可能なツールを最大限積極的に活用してください**
- ユーザーの質問に対して、ツールを使うことでより正確で有用な回答ができる場合は、**必ずツールを使用してください**
- 複数のツールを組み合わせることで、より豊かな回答が可能です
- 例：
  * 現在時刻を聞かれたら → 日時計算ツールを使用
  * 天気を聞かれたら → 天気予報ツールを使用
  * 計算が必要なら → 計算ツールを使用
  * 検索が必要なら → 検索ツールを使用
- ツールの結果を受け取ったら、それを元にユーザーにわかりやすく丁寧に説明してください
- **ツールを使わずに推測で答えるのは避けてください**。正確な情報が必要な場合は必ずツールを使用すること

【回答時の追加提案】
- 回答後、**利用可能な他のツールを使ってさらにできることを積極的に紹介してください**
- 例：「ちなみに、天気予報ツールで明日の天気も確認できますよ」「日時計算ツールで〇〇日後の日付も計算できます」
- ユーザーの潜在的なニーズを先回りして提案することで、より有用な体験を提供してください
"""
        
        # custom_promptがない場合は、ペルソナのデフォルトプロンプトを使用
        # ペルソナが空文字列の場合は"none"として扱う
        persona_key = persona if persona else "none"
        base_prompt = AgentService.PERSONA_PROMPTS.get(
            persona_key,
            AgentService.PERSONA_PROMPTS["none"]
        )
        
        return f"""{base_prompt}{user_context}

【ツール活用の最重要指示】
- **利用可能なツールを最大限積極的に活用してください**
- ユーザーの質問に対して、ツールを使うことでより正確で有用な回答ができる場合は、**必ずツールを使用してください**
- 複数のツールを組み合わせることで、より豊かな回答が可能です
- 例：
  * 現在時刻を聞かれたら → 日時計算ツールを使用
  * 天気を聞かれたら → 天気予報ツールを使用
  * 計算が必要なら → 計算ツールを使用
  * 検索が必要なら → 検索ツールを使用
- ツールの結果を受け取ったら、それを元にユーザーにわかりやすく丁寧に説明してください
- **ツールを使わずに推測で答えるのは避けてください**。正確な情報が必要な場合は必ずツールを使用すること

【回答時の追加提案】
- 回答後、**利用可能な他のツールを使ってさらにできることを積極的に紹介してください**
- 例：「ちなみに、天気予報ツールで明日の天気も確認できますよ」「日時計算ツールで〇〇日後の日付も計算できます」
- ユーザーの潜在的なニーズを先回りして提案することで、より有用な体験を提供してください
"""
    
    @staticmethod
    def _convert_history_to_messages(history: List) -> List:
        """
        会話履歴をLangChainメッセージ形式に変換
        
        Args:
            history: 会話履歴のリスト
            
        Returns:
            LangChainメッセージのリスト
            
        Note:
            空のコンテンツを持つメッセージはフィルタリングされます。
            これはAnthropicなどのプロバイダーが空メッセージを許可しないためです。
        """
        messages = []
        for msg in history:
            # 空のコンテンツをフィルタリング
            # Anthropicは空のメッセージを許可しないため、必ずチェックする
            if not msg.content or not msg.content.strip():
                logger.warning(f"Skipping message with empty content: role={msg.role}")
                continue
            
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
            request.agent_config.custom_system_prompt,
            request.user_name
        )
        
        # プロバイダーごとに適切なエージェントを作成
        if request.agent_config.provider == "openai":
            # OpenAI用: create_openai_tools_agent
            from langchain.agents import create_openai_tools_agent
            
            prompt = ChatPromptTemplate.from_messages([
                ("system", system_prompt),
                MessagesPlaceholder(variable_name="chat_history", optional=True),
                ("human", "{input}"),
                MessagesPlaceholder(variable_name="agent_scratchpad"),
            ])
            
            agent = create_openai_tools_agent(llm, filtered_tools, prompt)
            
        elif request.agent_config.provider == "anthropic":
            # Anthropic用: ツールコールに対応したエージェント
            # Anthropicのツールコールは特殊な形式なので、ReActエージェントを使用
            logger.info("Using Anthropic with ReAct agent pattern")
            
            from langchain.agents import create_structured_chat_agent
            
            # ReAct形式のプロンプト
            prompt = ChatPromptTemplate.from_messages([
                ("system", f"""{system_prompt}

あなたは以下のツールにアクセスできます:
{{tools}}

次の形式を使用してください:

Question: 答える必要がある質問
Thought: 何をすべきか常に考えてください
Action: 実行するアクション、[{{tool_names}}]のいずれか
Action Input: アクションへの入力
Observation: アクションの結果
... (このThought/Action/Action Input/Observationを必要に応じて繰り返す)
Thought: 最終的な答えがわかりました
Final Answer: 元の質問に対する最終的な答え"""),
                MessagesPlaceholder(variable_name="chat_history", optional=True),
                ("human", "{input}\n\n{agent_scratchpad}"),
            ])
            
            try:
                agent = create_structured_chat_agent(llm, filtered_tools, prompt)
            except Exception as e:
                logger.warning(f"create_structured_chat_agent failed: {e}, using simpler approach")
                # よりシンプルなアプローチ: ツールを使わずにLLMのみ
                from langchain.agents import create_react_agent
                from langchain_core.prompts import PromptTemplate
                
                template = f"""{system_prompt}

Answer the following questions as best you can. You have access to the following tools:

{{tools}}

Use the following format:

Question: the input question you must answer
Thought: you should always think about what to do
Action: the action to take, should be one of [{{tool_names}}]
Action Input: the input to the action
Observation: the result of the action
... (this Thought/Action/Action Input/Observation can repeat N times)
Thought: I now know the final answer
Final Answer: the final answer to the original input question

Begin!

Question: {{input}}
Thought:{{agent_scratchpad}}"""
                
                prompt = PromptTemplate.from_template(template)
                agent = create_react_agent(llm, filtered_tools, prompt)
                
        else:
            # Google等その他のプロバイダー: ツール呼び出しエージェント
            try:
                from langchain.agents import create_tool_calling_agent
                
                # プロバイダーに応じたツール形式に変換
                try:
                    llm_with_tools = llm.bind_tools(filtered_tools)
                except AttributeError:
                    # bind_toolsがない場合はそのまま使用
                    llm_with_tools = llm
                
                prompt = ChatPromptTemplate.from_messages([
                    ("system", system_prompt),
                    MessagesPlaceholder(variable_name="chat_history", optional=True),
                    ("human", "{input}"),
                    MessagesPlaceholder(variable_name="agent_scratchpad"),
                ])
                
                agent = create_tool_calling_agent(llm_with_tools, filtered_tools, prompt)
            except ImportError:
                # フォールバック
                logger.warning("create_tool_calling_agent not available, using create_openai_tools_agent as fallback")
                from langchain.agents import create_openai_tools_agent
                
                prompt = ChatPromptTemplate.from_messages([
                    ("system", system_prompt),
                    MessagesPlaceholder(variable_name="chat_history", optional=True),
                    ("human", "{input}"),
                    MessagesPlaceholder(variable_name="agent_scratchpad"),
                ])
                
                agent = create_openai_tools_agent(llm, filtered_tools, prompt)
        
        # エージェントエグゼキューター作成
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

