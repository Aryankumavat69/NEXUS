import json

import redis

from app.events.schemas import BusinessEvent


REDIS_HOST = "localhost"
REDIS_PORT = 6379
EVENT_STREAM = "nexus:events"


def get_redis() -> redis.Redis:
    return redis.Redis(
        host=REDIS_HOST,
        port=REDIS_PORT,
        decode_responses=True,
    )


def publish_event(event: BusinessEvent) -> str:
    client = get_redis()

    event_id = client.xadd(
        EVENT_STREAM,
        {
            "event": event.model_dump_json()
        },
    )

    return event_id