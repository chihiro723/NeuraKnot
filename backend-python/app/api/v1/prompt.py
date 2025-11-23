"""
プロンプト強化API
システムプロンプトの自動生成
"""
from fastapi import APIRouter, HTTPException
from app.models.request import EnhancePromptRequest, SuggestQuestionsRequest, SuggestConversationQuestionsRequest
from app.models.response import EnhancePromptResponse, SuggestQuestionsResponse
from app.services.prompt_enhancement_service import PromptEnhancementService
from app.services.question_suggestion_service import QuestionSuggestionService
from app.core.exceptions import ValidationError, LLMAPIError
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/enhance-prompt", response_model=EnhancePromptResponse)
async def enhance_prompt(request: EnhancePromptRequest):
    """
    システムプロンプトを強化
    
    Args:
        request: プロンプト強化リクエスト
        
    Returns:
        EnhancePromptResponse: 強化されたプロンプト
        
    Raises:
        HTTPException: バリデーションエラーまたはLLMエラー
    """
    logger.info(f"Prompt enhancement request (length: {len(request.current_prompt)})")
    
    try:
        service = PromptEnhancementService()
        enhanced_prompt = await service.enhance_system_prompt(
            request.current_prompt
        )
        
        return EnhancePromptResponse(
            enhanced_prompt=enhanced_prompt,
            metadata={
                "original_length": len(request.current_prompt),
                "generated_length": len(enhanced_prompt)
            }
        )
        
    except ValidationError as e:
        logger.warning(f"Validation error: {e.message}")
        raise HTTPException(status_code=400, detail=e.message)
    
    except LLMAPIError as e:
        logger.error(f"LLM API error: {e.message}")
        raise HTTPException(status_code=503, detail=e.message)
    
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="プロンプト生成中に予期しないエラーが発生しました"
        )


@router.post("/group-chat/suggest-questions", response_model=SuggestQuestionsResponse)
async def suggest_questions(request: SuggestQuestionsRequest):
    """
    グループチャットの会話履歴から次に聞きそうな質問を4つ生成

    Args:
        request: 質問候補生成リクエスト

    Returns:
        SuggestQuestionsResponse: 質問候補リスト
    """
    logger.info(f"Question suggestion request for group chat: {request.group_chat_id}")

    try:
        service = QuestionSuggestionService()
        suggestions, token_usage = await service.generate_suggestions(
            group_chat_name=request.group_chat_name,
            system_prompt=request.system_prompt,
            recent_messages=request.recent_messages,
        )

        return SuggestQuestionsResponse(
            suggestions=suggestions,
            token_usage=token_usage,
            metadata={
                "model": "gpt-4.1",
                "provider": "openai",
                "group_chat_id": request.group_chat_id,
            }
        )

    except ValidationError as e:
        logger.warning(f"Validation error: {e.message}")
        raise HTTPException(status_code=400, detail=e.message)

    except LLMAPIError as e:
        logger.error(f"LLM API error: {e.message}")
        raise HTTPException(status_code=503, detail=e.message)

    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="質問候補生成中に予期しないエラーが発生しました"
        )


@router.post("/conversation/suggest-questions", response_model=SuggestQuestionsResponse)
async def suggest_conversation_questions(request: SuggestConversationQuestionsRequest):
    """
    1対1会話の履歴から次に聞きそうな質問を4つ生成

    Args:
        request: 1対1会話の質問候補生成リクエスト

    Returns:
        SuggestQuestionsResponse: 質問候補リスト
    """
    logger.info(f"Question suggestion request for conversation: {request.conversation_id}")

    try:
        service = QuestionSuggestionService()
        suggestions, token_usage = await service.generate_conversation_suggestions(
            agent_name=request.agent_name,
            agent_persona=request.agent_persona,
            system_prompt=request.system_prompt,
            recent_messages=request.recent_messages,
        )

        return SuggestQuestionsResponse(
            suggestions=suggestions,
            token_usage=token_usage,
            metadata={
                "model": "gpt-4.1",
                "provider": "openai",
                "conversation_id": request.conversation_id,
            }
        )

    except ValidationError as e:
        logger.warning(f"Validation error: {e.message}")
        raise HTTPException(status_code=400, detail=e.message)

    except LLMAPIError as e:
        logger.error(f"LLM API error: {e.message}")
        raise HTTPException(status_code=503, detail=e.message)

    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="質問候補生成中に予期しないエラーが発生しました"
        )

