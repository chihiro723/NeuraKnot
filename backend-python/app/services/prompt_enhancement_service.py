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
ユーザーが入力したシステムプロンプトの**意図を最大限尊重**し、その内容を**極めて詳細で具体的**な形に洗練してください。

【入力されたプロンプト】
{current_prompt}

【最優先原則: 詳細性を最重視】
- **簡潔さよりも詳細さを優先**: 十分すぎるほど詳しく記述することを恐れない
- **具体例を豊富に含める**: 抽象的な指示には必ず具体的な実例や行動パターンを追加
- **多層的な説明**: 役割、性格、口調、振る舞い、思考プロセスなど多角的に詳述
- **長文を恐れない**: 500-1500文字程度の充実したプロンプトを目指す

【重要原則】
- **ユーザーの意図を変えない**: 入力内容の本質的な意味や方向性を維持
- **詳細に展開する**: 構造化や具体化を積極的に行い、情報を豊かに補完
- **最小限の改善ではなく、最大限の詳細化**: 入力が明確でも、より詳しく具体的に展開

【生成ルール】
1. **ユーザーの入力内容を過剰なくらい、強調しすぎるくらい組み込み、さらに詳細化**:
   - キャラクター名が含まれる場合: その特徴を**徹底的に**忠実に反映し、細部まで再現し、具体的なシーンや台詞例も含める
   - 職業や役割が記載されている場合: その専門性を**極めて具体的に**明確化し、専門用語や業界知識、具体的な業務内容まで記述
   - 具体的な指示がある場合: それを**絶対的な最優先事項として**尊重し、過剰なくらい強調し、実践例を複数追加
   - 抽象的な記述の場合: ユーザーの意図を**限界まで深掘りして**具体化し、様々なシチュエーションでの振る舞いを詳述
   - 入力が空の場合のみ: 詳細で汎用的なアシスタントのプロンプトを提案
   
   **【超重要】ユーザーの指示は1文字1文字が貴重です。すべての要素を漏らさず、むしろ増幅し、詳細に展開してください**

2. 以下の構造で**詳細に**整理（各セクションを充実させる）:
   - 役割定義: 「あなたは〜です」形式で明確化し、背景や経験も含める
   - 性格・口調: エージェントの話し方や態度の特徴を**極めて詳細に**記述し、具体的な言い回しや表現パターンを例示
   - 行動指針: 対話で心がけることを複数の観点から詳述し、具体的なシナリオでの対応例を含める
   - 専門知識: 持っている知識やスキルを具体的に列挙
   - 制約事項: 避けるべき行動を明確に、理由とともに説明
   - 対応例: 典型的な質問やシチュエーションに対する理想的な応答例を含める

3. 出力要件:
   - 自然で読みやすい日本語
   - **500-1500文字程度（詳細であればあるほど良い）**
   - **入力内容を最優先で反映し、過剰なくらい強調し、さらに詳細化**
   - ユーザーが書いた要素は全て取り入れ、それぞれを深掘りして展開
   - 具体例、シナリオ、応答パターンなどを豊富に含める
   - システムプロンプトの本文のみ出力（説明や前置きは不要）

【最重要原則】
- ユーザーが書いた内容の意図は**絶対に、何があっても変えないこと**
- ユーザーの指示を薄めたり、一般化したりせず、**むしろ詳細化・具体化すること**
- ユーザーの意図を**増幅し、強調し、詳細に具体化すること**
- **詳細性こそが価値**: 簡潔にまとめるのではなく、豊かに展開すること
- 「こう書いてあるから、こう解釈した」ではなく「こう書いてあるから、これを最大限尊重し徹底的に反映し、さらに詳しく具体化した」という姿勢
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
            
            # LLMを使用してプロンプト生成（詳細性を重視するため max_tokens を増加）
            llm = LLMFactory.create_llm(
                provider="openai",
                model="gpt-4.1",
                temperature=0.7,
                max_tokens=2000,
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

