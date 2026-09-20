from uuid import UUID, uuid4

from app.ai.config import ai_settings
from app.ai.schemas import AIResponse
from app.ai.validators import validate_ai_result


class AIService:
    """
    Central service for NEXUS AI functionality.

    Future modules such as RAG, forecasting, anomaly detection,
    ETA prediction and recommendations will use this service layer.
    """

    MODULE_NAME = "nexus-ai"
    VERSION = "1.0.0"

    @staticmethod
    def health() -> dict:
        return {
            "status": "online" if ai_settings.ai_enabled else "disabled",
            "service": AIService.MODULE_NAME,
            "version": AIService.VERSION,
        }

    @staticmethod
    def create_request_id() -> UUID:
        return uuid4()

    @staticmethod
    def build_response(
        *,
        ai_module: str,
        recommendation: str,
        confidence: float,
        reasoning: list[str] | None = None,
        data: dict | None = None,
        requires_human_approval: bool = False,
        request_id: UUID | None = None,
        status: str = "SUCCESS",
    ) -> AIResponse:

        result = {
            "request_id": request_id or uuid4(),
            "ai_module": ai_module,
            "status": status,
            "confidence": confidence,
            "recommendation": recommendation,
            "reasoning": reasoning or [],
            "data": data or {},
            "requires_human_approval": requires_human_approval,
        }

        validate_ai_result(result)

        return AIResponse(**result)


ai_service = AIService()