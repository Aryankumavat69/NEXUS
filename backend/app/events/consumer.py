import json
import time

from app.events.publisher import get_redis, EVENT_STREAM


def consume_events() -> None:

    client = get_redis()

    last_id = "0-0"

    print(
        f"NEXUS Event Consumer listening on {EVENT_STREAM}"
    )

    while True:

        messages = client.xread(
            {EVENT_STREAM: last_id},
            block=5000,
            count=10,
        )

        if not messages:
            continue

        for _, entries in messages:

            for event_id, data in entries:

                try:
                    event = json.loads(data["event"])

                    print(
                        "\n[NEXUS EVENT]"
                    )

                    print(
                        f"ID: {event['event_id']}"
                    )

                    print(
                        f"TYPE: {event['event_type']}"
                    )

                    print(
                        f"ENTITY: "
                        f"{event['entity_type']}:"
                        f"{event['entity_id']}"
                    )

                    print(
                        f"PAYLOAD: {event['payload']}"
                    )

                except Exception as exc:

                    print(
                        f"Event processing failed: {exc}"
                    )

                last_id = event_id

        time.sleep(0.1)


if __name__ == "__main__":
    consume_events()