"""
質問候補生成サービス
グループチャット・1対1会話の履歴から次に聞きそうな質問を生成
"""
import json
from typing import List, Optional
from app.core.llm_factory import LLMFactory
from app.core.exceptions import ValidationError, LLMAPIError
from app.models.request import MessageItem
import logging

logger = logging.getLogger(__name__)


class QuestionSuggestionService:
    """質問候補生成サービス"""

    def __init__(self):
        """初期化"""
        pass

    async def generate_suggestions(
        self,
        group_chat_name: str,
        system_prompt: Optional[str],
        recent_messages: List[MessageItem],
    ) -> tuple[List[str], Optional[dict]]:
        """
        グループチャットの質問候補を生成

        Args:
            group_chat_name: グループチャット名
            system_prompt: システムプロンプト（オプション）
            recent_messages: 最新のメッセージリスト

        Returns:
            (質問候補リスト（4つ）, トークン使用量)

        Raises:
            ValidationError: バリデーションエラー
            LLMAPIError: LLM APIエラー
        """
        if len(recent_messages) < 1:
            raise ValidationError("会話履歴が不足しています")

        conversation_history = self._format_conversation(recent_messages)
        prompt = self._build_prompt(
            group_chat_name=group_chat_name,
            system_prompt=system_prompt,
            conversation_history=conversation_history,
        )

        return await self._call_llm(prompt)

    async def generate_conversation_suggestions(
        self,
        agent_name: str,
        agent_persona: str,
        system_prompt: Optional[str],
        recent_messages: List[MessageItem],
    ) -> tuple[List[str], Optional[dict]]:
        """
        1対1会話の質問候補を生成

        Args:
            agent_name: AIエージェント名
            agent_persona: AIエージェントのペルソナ
            system_prompt: システムプロンプト
            recent_messages: 最新のメッセージリスト

        Returns:
            (質問候補リスト（4つ）, トークン使用量)
        """
        if len(recent_messages) < 1:
            raise ValidationError("会話履歴が不足しています")

        conversation_history = self._format_simple_conversation(recent_messages)
        prompt = self._build_conversation_prompt(
            agent_name=agent_name,
            agent_persona=agent_persona,
            system_prompt=system_prompt,
            conversation_history=conversation_history,
        )

        return await self._call_llm(prompt)

    async def _call_llm(self, prompt: str) -> tuple[List[str], Optional[dict]]:
        """LLMを呼び出して質問候補を生成
        
        Returns:
            (質問候補リスト, トークン使用量)
        """
        try:
            # LangChainでFunction Callingを使用
            llm = LLMFactory.create_llm(
                provider="openai",
                model="gpt-4.1",
                temperature=0.7,
                max_tokens=500,
                streaming=False
            )

            # Function Calling用の関数定義
            functions = [
                {
                    "name": "suggest_questions",
                    "description": "ユーザーが次に質問しそうな内容を4つ提案する",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "questions": {
                                "type": "array",
                                "description": "質問候補のリスト",
                                "items": {
                                    "type": "string",
                                    "description": "具体的で簡潔な質問文（20〜50文字）"
                                },
                                "minItems": 4,
                                "maxItems": 4
                            }
                        },
                        "required": ["questions"]
                    }
                }
            ]

            # システムメッセージとユーザーメッセージを構築
            from langchain_core.messages import SystemMessage, HumanMessage
            messages = [
                SystemMessage(content="あなたは会話の流れを理解し、ユーザーが次に聞きそうな質問を提案するアシスタントです。"),
                HumanMessage(content=prompt)
            ]

            # LangChainのbind機能でFunction Callingを設定
            llm_with_functions = llm.bind(
                functions=functions,
                function_call={"name": "suggest_questions"}
            )

            # 実行
            response = await llm_with_functions.ainvoke(messages)
            
            # トークン使用量を取得
            token_usage = None
            if hasattr(response, 'usage_metadata') and response.usage_metadata:
                token_usage = {
                    "prompt": response.usage_metadata.get("input_tokens", 0),
                    "completion": response.usage_metadata.get("output_tokens", 0),
                    "total": response.usage_metadata.get("total_tokens", 0)
                }
                logger.info(f"Token usage: {token_usage}")
            elif hasattr(response, 'response_metadata') and 'token_usage' in response.response_metadata:
                usage = response.response_metadata['token_usage']
                token_usage = {
                    "prompt": usage.get("prompt_tokens", 0),
                    "completion": usage.get("completion_tokens", 0),
                    "total": usage.get("total_tokens", 0)
                }
                logger.info(f"Token usage (from response_metadata): {token_usage}")

            # レスポンスからFunction Callを取得
            if hasattr(response, 'additional_kwargs') and 'function_call' in response.additional_kwargs:
                function_call = response.additional_kwargs['function_call']
                function_args = json.loads(function_call['arguments'])
                questions = function_args.get("questions", [])

                if len(questions) == 4:
                    return questions, token_usage
                else:
                    logger.warning(f"Expected 4 questions but got {len(questions)}")
                    if len(questions) < 4:
                        default_questions = [
                            "もっと詳しく教えてください",
                            "具体的な例を教えてください",
                            "他にどんな方法がありますか？",
                            "注意点はありますか？"
                        ]
                        questions.extend(default_questions[:(4 - len(questions))])
                    return questions[:4], token_usage

            # Function Callがない場合はテキストから抽出
            logger.warning("Function call not found, falling back to text parsing")
            questions = self._parse_suggestions_from_text(response.content if hasattr(response, 'content') else str(response))
            return questions, token_usage

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM response: {e}")
            raise LLMAPIError("openai", "AIからの応答の解析に失敗しました")
        except Exception as e:
            logger.error(f"LLM API error: {e}")
            raise LLMAPIError("openai", f"質問候補の生成に失敗しました: {str(e)}")

    def _format_conversation(self, messages: List[MessageItem]) -> str:
        """グループチャットの会話履歴をフォーマット"""
        formatted = []
        for msg in messages:
            sender_label = "ユーザー" if msg.sender_type == "user" else f"AI({msg.sender_name})"
            formatted.append(f"{sender_label}: {msg.content}")
        return "\n".join(formatted)

    def _format_simple_conversation(self, messages: List[MessageItem]) -> str:
        """1対1会話をフォーマット"""
        formatted = []
        for msg in messages:
            sender_label = "あなた" if msg.sender_type == "user" else "AI"
            formatted.append(f"{sender_label}: {msg.content}")
        return "\n".join(formatted)

    def _build_prompt(
        self,
        group_chat_name: str,
        system_prompt: Optional[str],
        conversation_history: str,
    ) -> str:
        """グループチャット用プロンプトを構築"""
        prompt_parts = [
            f"グループチャット「{group_chat_name}」での会話履歴を分析してください。\n",
        ]

        if system_prompt:
            prompt_parts.append(f"【グループチャットの目的】\n{system_prompt}\n")

        prompt_parts.append(f"【最近の会話】\n{conversation_history}\n")
        prompt_parts.append(
            "\n【タスク】\n"
            "この会話の流れから、ユーザーが次に質問しそうな内容を4つ提案してください。\n"
            "\n【条件】\n"
            "- 各質問は20〜50文字程度の簡潔な文にしてください\n"
            "- 会話の文脈に沿った自然な質問にしてください\n"
            "- 具体的で実用的な質問にしてください\n"
            "- バリエーションを持たせてください（似たような質問を避ける）\n"
        )

        return "".join(prompt_parts)

    def _build_conversation_prompt(
        self,
        agent_name: str,
        agent_persona: str,
        system_prompt: Optional[str],
        conversation_history: str,
    ) -> str:
        """1対1会話用プロンプトを構築"""
        prompt_parts = [
            f"AIエージェント「{agent_name}」（ペルソナ: {agent_persona}）との1対1会話を分析してください。\n",
        ]

        if system_prompt:
            prompt_parts.append(f"【エージェントの特性】\n{system_prompt}\n")

        prompt_parts.append(f"【最近の会話】\n{conversation_history}\n")
        prompt_parts.append(
            "\n【タスク】\n"
            f"このAIエージェントとの会話の流れから、ユーザーが次に質問しそうな内容を4つ提案してください。\n"
            f"エージェントの性格や専門性を考慮し、ユーザーが聞きたくなるような質問を生成してください。\n"
            "\n【条件】\n"
            "- 各質問は20〜50文字程度の簡潔な文にしてください\n"
            "- 会話の文脈とエージェントの特性に沿った自然な質問にしてください\n"
            "- 具体的で実用的な質問にしてください\n"
            "- バリエーションを持たせてください\n"
        )

        return "".join(prompt_parts)

    def _parse_suggestions_from_text(self, text: str) -> List[str]:
        """テキストから質問を抽出（フォールバック）"""
        lines = [line.strip() for line in text.split("\n") if line.strip()]
        questions = []

        for line in lines:
            cleaned = line.lstrip("0123456789.-・[] ").strip()
            if cleaned and len(cleaned) >= 10:
                questions.append(cleaned[:100])
                if len(questions) >= 4:
                    break

        default_questions = [
            "もっと詳しく教えてください",
            "具体的な例を教えてください",
            "他にどんな方法がありますか？",
            "注意点はありますか？"
        ]

        while len(questions) < 4:
            questions.append(default_questions[len(questions)])

        return questions[:4]
