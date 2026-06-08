from django.utils import timezone
from .models import Barber, QueueEntry


def assign_next_available_barber():
    """
    Finds the best barber to assign a new 'next_available' customer to.

    Strategy:
    - Only considers barbers who are 'available' or 'busy' (not off_duty)
    - Picks the barber with the shortest estimated wait time
    - If tied, picks the one with fewer people waiting
    - Returns None if all barbers are off duty
    """
    active_barbers = Barber.objects.filter(
        status__in=['available', 'busy']
    )

    if not active_barbers.exists():
        return None

    # Sort by estimated wait time (our computed property)
    # We convert to list because you can't order querysets by properties
    sorted_barbers = sorted(
        active_barbers,
        key=lambda b: (b.estimated_wait_minutes, b.waiting_count)
    )

    return sorted_barbers[0]


def get_next_waiting_entry(barber):
    """
    Gets the next customer in line for a given barber.
    Returns the earliest 'waiting' QueueEntry for this barber.
    """
    return QueueEntry.objects.filter(
        barber=barber,
        status='waiting'
    ).order_by('checked_in_at').first()


def handle_no_show(entry):
    entry.no_show_count += 1

    if entry.no_show_count >= 2:
        entry.status = 'cancelled'
        entry.save()
        return None

    entry.status = 'no_show'
    # Don't save yet — we'll save after linking

    new_entry = QueueEntry.objects.create(
        customer_name=entry.customer_name,
        customer_phone=entry.customer_phone,
        barber=entry.barber,
        preference=entry.preference,
        status='waiting',
        sms_sent_second_in_line=False,
        sms_sent_your_turn=False,
    )

    # Link old entry to new one so the wait room can follow
    entry.requeued_as = new_entry
    entry.save()

    from .sms import send_requeued_sms
    send_requeued_sms(new_entry)

    return new_entry
    """
    When a barber marks a customer as no-show:
    1. Mark the entry as no_show
    2. Re-add them to the BACK of the same barber's queue
       (gives them one more chance rather than dropping them entirely)
    3. But if they've already been a no-show twice, cancel them
    """
    entry.no_show_count += 1

    if entry.no_show_count >= 2:
        # Two strikes — cancel them entirely
        entry.status = 'cancelled'
        entry.save()
        return None

    # First no-show — re-queue at the back
    entry.status = 'no_show'
    entry.save()

    # Create a brand new entry for them at the back of the queue
    # We carry over their name, phone, barber, and preference
    new_entry = QueueEntry.objects.create(
        customer_name=entry.customer_name,
        customer_phone=entry.customer_phone,
        barber=entry.barber,
        preference=entry.preference,
        status='waiting',
        # Reset SMS flags — they'll get notified again
        sms_sent_second_in_line=False,
        sms_sent_your_turn=False,
    )

    from .push_notifications import push_requeued
    push_requeued(new_entry)

    return new_entry


def reassign_barbers_queue(barber):
    """
    When a barber goes off duty, redistribute their waiting customers
    to the next available barbers using next_available logic.
    Called from the OffDutyView.
    """
    waiting_entries = QueueEntry.objects.filter(
        barber=barber,
        status='waiting'
    ).order_by('checked_in_at')

    reassigned = []

    for entry in waiting_entries:
        # Find the best available barber (excluding the one going off duty)
        active_barbers = Barber.objects.filter(
            status__in=['available', 'busy']
        ).exclude(id=barber.id)

        if not active_barbers.exists():
            # No one available — leave them in the queue
            # They'll be reassigned when a barber comes on duty
            break

        sorted_barbers = sorted(
            active_barbers,
            key=lambda b: (b.estimated_wait_minutes, b.waiting_count)
        )
        best_barber = sorted_barbers[0]

        entry.barber = best_barber
        entry.save()
        reassigned.append(entry)

    return reassigned


def check_and_send_position_sms(entry):
    from .sms import send_second_in_line_sms, send_your_turn_sms
    from .push_notifications import push_second_in_line, push_your_turn

    if entry.status != 'waiting':
        return

    position = entry.queue_position

    if position == 2 and not entry.sms_sent_second_in_line:
        send_second_in_line_sms(entry)
        push_second_in_line(entry)  # ← push alongside SMS

    if position == 1 and not entry.sms_sent_your_turn:
        send_your_turn_sms(entry)
        push_your_turn(entry)       # ← push alongside SMS



