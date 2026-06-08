import json
import logging
import threading
from django.conf import settings

logger = logging.getLogger(__name__)

_firebase_initialized = False

def _init_firebase():
    """Initialize Firebase Admin SDK once."""
    global _firebase_initialized
    if _firebase_initialized:
        return True

    try:
        import firebase_admin
        from firebase_admin import credentials

        if not settings.FIREBASE_CREDENTIALS:
            logger.warning('[Push] Firebase credentials not configured')
            return False

        cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS)
        firebase_admin.initialize_app(cred)
        _firebase_initialized = True
        logger.info('[Push] Firebase initialized successfully')
        return True

    except Exception as e:
        logger.error(f'[Push] Firebase init failed: {e}')
        return False


def _send_fcm_notification(fcm_token: str, title: str, body: str, entry_id: int):
    """Send notification via Firebase Admin SDK in background thread."""

    def _send():
        try:
            from firebase_admin import messaging

            message = messaging.Message(
                notification=messaging.Notification(
                    title=title,
                    body=body,
                ),
                token=fcm_token,
                webpush=messaging.WebpushConfig(
                    notification=messaging.WebpushNotification(
                        title=title,
                        body=body,
                        icon='/favicon.ico',
                        badge='/favicon.ico',
                        vibrate=[200, 100, 200],
                        tag='queue-notification',
                        renotify=True,
                    ),
                    fcm_options=messaging.WebpushFCMOptions(
                        link='/',
                    ),
                ),
            )

            response = messaging.send(message)
            logger.info(f'[Push] Sent to entry {entry_id} | Response: {response}')

        except Exception as e:
            logger.error(f'[Push] Failed for entry {entry_id}: {e}')

    thread = threading.Thread(target=_send, daemon=True)
    thread.start()


def send_push_notification(entry, title: str, body: str):
    """
    Main function called from services.py.
    Gets the FCM token from the entry's push subscription and sends.
    """
    if not _init_firebase():
        print(f'[Push SKIPPED — Firebase not configured] {title}')
        return

    try:
        from .models import PushSubscription
        sub = PushSubscription.objects.get(queue_entry=entry)
        fcm_token = sub.fcm_token
        if not fcm_token:
            logger.warning(f'[Push] No FCM token for entry {entry.id}')
            return
    except Exception:
        return  # No subscription — skip silently

    _send_fcm_notification(fcm_token, title, body, entry.id)


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
        body=f"{entry.barber.name} is ready for you now! / {entry.barber.name} anakusubiri."
    )


def push_requeued(entry):
    send_push_notification(
        entry,
        title="🔄 You've been re-queued",
        body=f"You're now at position #{entry.queue_position}. / Uko nafasi #{entry.queue_position}."
    )