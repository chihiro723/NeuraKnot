"""
プロンプト強化サービス
AIを使用してシステムプロンプトを自動生成
"""
from typing import Optional
import logging
from app.core.llm_factory import LLMFactory
from app.core.exceptions import LLMAPIError, ValidationError

logger = logging.getLogger(__name__)


class PromptEnhancementService:
    """プロンプト強化サービス"""
    
    # メタプロンプトテンプレート
    META_PROMPT_TEMPLATE = """あなたはAIエージェントのシステムプロンプトを改善・強化する専門家です。
ユーザーが入力したシステムプロンプトの**意図を最大限尊重**し、その内容をより明確で構造化された形に洗練してください。

【入力されたプロンプト】
{current_prompt}

【重要原則】
- **ユーザーの意図を変えない**: 入力内容の本質的な意味や方向性を維持
- **足りない要素を補完**: 構造化や具体化が必要な部分のみ改善
- **過度な変更は避ける**: 入力が明確な場合は最小限の改善に留める

【生成ルール】
1. **ユーザーの入力内容を過剰なくらい、強調しすぎるくらい組み込む**:
   - キャラクター名が含まれる場合: その特徴を**徹底的に**忠実に反映し、細部まで再現
   - 職業や役割が記載されている場合: その専門性を**極めて具体的に**明確化
   - 具体的な指示がある場合: それを**絶対的な最優先事項として**尊重し、過剰なくらい強調
   - 抽象的な記述の場合: ユーザーの意図を**限界まで深掘りして**具体化
   - 入力が空の場合のみ: 汎用的なアシスタントのプロンプトを提案
   
   **【超重要】ユーザーの指示は1文字1文字が貴重です。すべての要素を漏らさず、むしろ増幅して組み込んでください**

2. 必要に応じて以下の構造で整理（入力に構造がある場合はそれを維持）:
   - 役割定義: 「あなたは〜です」形式で明確化
   - 性格・口調: エージェントの話し方や態度の特徴を**詳細に**記述
   - 行動指針: 対話で心がけること
   - 制約事項: 避けるべき行動

3. 出力要件:
   - 自然で読みやすい日本語
   - 200-1000文字程度（ユーザー入力が詳細な場合は長めに）
   - **入力内容を最優先で反映し、過剰なくらい強調**
   - ユーザーが書いた要素は全て取り入れる
   - システムプロンプトの本文のみ出力（説明や前置きは不要）

【最重要原則】
- ユーザーが書いた内容の意図は**絶対に、何があっても変えないこと**
- ユーザーの指示を薄めたり、一般化したりしない
- むしろユーザーの意図を**増幅し、強調し、具体化すること**
- 「こう書いてあるから、こう解釈した」ではなく「こう書いてあるから、これを最大限尊重し徹底的に反映した」という姿勢
- システムプロンプトの本文のみを出力（「以下のようなプロンプトを提案します」等の前置き不要）"""

    async def enhance_system_prompt(
        self,
        current_prompt: str
    ) -> str:
        """
        システムプロンプトを強化
        
        Args:
            current_prompt: 強化対象のシステムプロンプト
            
        Returns:
            強化されたシステムプロンプト
            
        Raises:
            ValidationError: 入力値が不正
            LLMAPIError: LLM API呼び出しエラー
        """
        # 入力検証
        if len(current_prompt) > 5000:
            raise ValidationError("プロンプトは5000文字以内で入力してください")
        
        # 空の場合も許可（汎用的なプロンプトを生成）
        current_prompt_text = current_prompt.strip() if current_prompt else "（入力なし：汎用的なアシスタントのプロンプトを生成してください）"
        
        logger.info(f"Enhancing prompt (length: {len(current_prompt_text)})")
        
        try:
            # メタプロンプトを構築
            meta_prompt = self.META_PROMPT_TEMPLATE.format(
                current_prompt=current_prompt_text
            )
            
            # LLMを使用してプロンプト生成
            llm = LLMFactory.create_llm(
                provider="openai",
                model="gpt-4o",
                temperature=0.7,
                max_tokens=1000,
                streaming=False
            )
            
            # 同期的に実行（LangChainのinvokeメソッド）
            response = await llm.ainvoke(meta_prompt)
            
            # レスポンスから生成されたプロンプトを取得
            enhanced_prompt = response.content.strip()
            
            if not enhanced_prompt:
                raise LLMAPIError("openai", "空のレスポンスが返されました")
            
            logger.info(f"Successfully enhanced prompt (length: {len(enhanced_prompt)})")
            
            return enhanced_prompt
            
        except Exception as e:
            logger.error(f"Error enhancing prompt: {str(e)}")
            if isinstance(e, (ValidationError, LLMAPIError)):
                raise
            raise LLMAPIError("openai", f"プロンプト生成中にエラーが発生しました: {str(e)}")

