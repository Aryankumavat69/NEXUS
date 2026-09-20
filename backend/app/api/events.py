from fastapi import APIRouter, Depends, HTTPException

from app.core.dependencies import get_current_user
from app.events.schemas import BusinessEvent
from app.events.publisher import publish_event


router = APIRouter(
    prefix="/events",
    tags=["Event System"],
)


@router.post("/publish")
def publish_business_event(
    event: BusinessEvent,
    current_user=Depends(get_current_user),
):

    try:

        stream_id = publish_event(event)

        return {
            "status": "PUBLISHED",
            "stream": "nexus:events",
            "stream_id": stream_id,
            "event_id": event.event_id,
        }

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=f"Event publishing failed: {exc}",
        )