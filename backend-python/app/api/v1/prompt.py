"""
プロンプト強化API
システムプロンプトの自動生成
"""
from fastapi import APIRouter, HTTPException
from app.models.request import EnhancePromptRequest
from app.models.response import EnhancePromptResponse
from app.services.prompt_enhancement_service import PromptEnhancementService
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

