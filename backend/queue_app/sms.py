import logging
import threading
from django.conf import settings
from .phone_utils import normalize_kenyan_phone, is_valid_kenyan_mobile
from .sms_templates import (
    second_in_line_message,
    your_turn_message,
    requeued_message,
)

logger = logging.getLogger(__name__)


def _get_at_client():
    """
    Initialises the Africa's Talking SDK.
    Uses sandbox automatically when AT_USERNAME is 'sandbox'.
    """
    import africastalking
    africastalking.initialize(
        username=settings.AT_USERNAME,
        api_key=settings.AT_API_KEY,
    )
    return africastalking.SMS


def _send_sms_async(to_number: str, body: str, entry_id: int):
    """
    Sends SMS in a background thread so it never blocks
    the API response.
    """
    def _send():
        try:
            sms = _get_at_client()

            # Sandbox requires the number in a list
            response = sms.send(
                message=body,
                recipients=[to_number],
                # Only include sender_id if configured (production)
                **({"sender_id": settings.AT_SENDER_ID}
                   if getattr(settings, 'AT_SENDER_ID', '') else {})
            )

            # Africa's Talking returns a dict with recipients list
            recipients = response.get('SMSMessageData', {}).get('Recipients', [])
            for recipient in recipients:
                status = recipient.get('status')
                if status == 'Success':
                    logger.info(
                        f"[SMS] Sent to {to_number} | "
                        f"MessageId: {recipient.get('messageId')} | "
                        f"Entry: {entry_id}"
                    )
                else:
                    logger.warning(
                        f"[SMS] Failed to {to_number} | "
                        f"Status: {status} | "
                        f"Entry: {entry_id}"
                    )

        except Exception as e:
            logger.error(
                f"[SMS] Exception sending to {to_number} | "
                f"Entry: {entry_id} | Error: {e}"
            )

    thread = threading.Thread(target=_send, daemon=True)
    thread.start()


def _prepare_and_send(entry, body: str) -> bool:
    """
    Shared logic: normalize number, validate, fire async send.
    """
    # Skip if Africa's Talking not configured
    if not getattr(settings, 'AT_API_KEY', ''):
        print(f"[SMS SKIPPED — no AT config] To: {entry.customer_phone} | {body[:60]}...")
        return False

    normalized = normalize_kenyan_phone(entry.customer_phone)

    if not normalized:
        logger.warning(
            f"[SMS] Could not normalize '{entry.customer_phone}' "
            f"for entry {entry.id} — skipping"
        )
        return False

    if not is_valid_kenyan_mobile(normalized):
        logger.warning(
            f"[SMS] '{normalized}' not a valid Kenyan mobile — skipping"
        )
        return False

    _send_sms_async(normalized, body, entry.id)
    return True


# ── Public functions ─────────────────────────────────────────────────────────

def send_second_in_line_sms(entry) -> bool:
    if entry.sms_sent_second_in_line:
        return False

    body = second_in_line_message(
        customer_name=entry.customer_name,
        barber_name=entry.barber.name if entry.barber else 'your barber',
    )

    sent = _prepare_and_send(entry, body)

    if sent:
        entry.sms_sent_second_in_line = True
        entry.save(update_fields=['sms_sent_second_in_line'])

    return sent


def send_your_turn_sms(entry) -> bool:
    if entry.sms_sent_your_turn:
        return False

    body = your_turn_message(
        customer_name=entry.customer_name,
        barber_name=entry.barber.name if entry.barber else 'your barber',
    )

    sent = _prepare_and_send(entry, body)

    if sent:
        entry.sms_sent_your_turn = True
        entry.save(update_fields=['sms_sent_your_turn'])

    return sent


def send_requeued_sms(entry) -> bool:
    position = entry.queue_position or '?'

    body = requeued_message(
        customer_name=entry.customer_name,
        barber_name=entry.barber.name if entry.barber else 'your barber',
        position=position,
    )

    return _prepare_and_send(entry, body)