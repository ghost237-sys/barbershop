import json
import logging
from django.conf import settings

logger = logging.getLogger(__name__)


def send_push_notification(entry, title: str, body: str):
    """
    Sends a web push notification to the customer's browser.
    Silently skips if they have no push subscription.
    Never crashes the queue on failure.
    """
    try:
        from .models import PushSubscription
        sub = PushSubscription.objects.get(queue_entry=entry)
    except Exception:
        return  # No subscription — skip silently

    if not getattr(settings, 'VAPID_PUBLIC_KEY', ''):
        print(f"[PUSH SKIPPED] {title} → {entry.customer_name}")
        return

    try:
        from pywebpush import webpush, WebPushException

        webpush(
            subscription_info={
                "endpoint": sub.endpoint,
                "keys": {
                    "p256dh": sub.p256dh,
                    "auth":   sub.auth,
                }
            },
            data=json.dumps({
                "title": title,
                "body":  body,
                "icon":  "/favicon.ico",
            }),
            vapid_private_key=settings.VAPID_PRIVATE_KEY,
            vapid_claims={
                "sub": settings.VAPID_EMAIL
            }
        )
        logger.info(f"[PUSH] Sent '{title}' to {entry.customer_name}")

    except Exception as e:
        # Never let a push failure crash the queue
        logger.error(f"[PUSH] Failed for {entry.customer_name}: {e}")


def push_second_in_line(entry):
    send_push_notification(
        entry,
        title="💈 You're 2nd in line!",
        body=f"Head back to the shop — {entry.barber.name} will call you soon. / Rudi dukani hivi karibuni."
    )


def push_your_turn(entry):
    send_push_notification(
        entry,
        title="✂️ It's your turn!",
        body=f"{entry.barber.name} is ready for you now. Come on in! / {entry.barber.name} anakusubiri."
    )


def push_requeued(entry):
    send_push_notification(
        entry,
        title="🔄 You've been re-queued",
        body=f"You're now at position #{entry.queue_position}. We'll notify you again. / Uko nafasi #{entry.queue_position}."
    )