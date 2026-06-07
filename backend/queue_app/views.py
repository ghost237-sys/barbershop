from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction

from .models import Barber, QueueEntry
from .serializers import BarberSerializer, QueueEntrySerializer, CheckInSerializer
from .services import (
    assign_next_available_barber,
    get_next_waiting_entry,
    handle_no_show,
    reassign_barbers_queue,
    check_and_send_position_sms,
)


# ---------------------------------------------------------------------------
# UTILITY: broadcast queue update via WebSocket
# We define this here so every view can call it after mutating the queue.
# Full implementation in Phase 4 — safe no-op for now.
# ---------------------------------------------------------------------------
def broadcast_queue_update():
    """
    Synchronous wrapper that safely runs the async broadcast
    inside Daphne's already-running event loop.
    """
    from asgiref.sync import async_to_sync
    from .consumers import broadcast_queue
    try:
        async_to_sync(broadcast_queue)()
    except Exception as e:
        print(f"[WebSocket] Broadcast failed: {e}")


def broadcast_entry(token: str):
    """
    Push an update to a specific customer's wait room channel.
    """
    from asgiref.sync import async_to_sync
    from .consumers import broadcast_entry_update
    try:
        async_to_sync(broadcast_entry_update)(str(token))
    except Exception as e:
        print(f"[WebSocket] Entry broadcast failed: {e}")


# ---------------------------------------------------------------------------
# CUSTOMER: Check In
# ---------------------------------------------------------------------------

class CheckInView(APIView):
    """
    POST /api/checkin/
    Called when a customer submits the check-in form.
    """

    def post(self, request):
        serializer = CheckInSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data

        # Determine which barber to assign
        if data['preference'] == 'next_available':
            barber = assign_next_available_barber()
            if not barber:
                return Response(
                    {'error': 'All barbers are currently off duty. Please try again later.'},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE
                )
        else:
            barber = data['barber']  # already validated in serializer

        # Create the queue entry
        entry = QueueEntry.objects.create(
            customer_name=data['customer_name'],
            customer_phone=data['customer_phone'],
            barber=barber,
            preference=data['preference'],
            status='waiting',
        )

        # Check if they're already 2nd or 1st (small shop, short queue)
        check_and_send_position_sms(entry)

        # Notify all connected dashboards of the new customer
        broadcast_queue_update()

        return Response(
            {
                'token': str(entry.token),
                'barber_name': barber.name,
                'queue_position': entry.queue_position,
                'estimated_wait_minutes': entry.estimated_wait_minutes,
                'message': f"You're checked in with {barber.name}. "
                           f"Estimated wait: {entry.estimated_wait_minutes} minutes."
            },
            status=status.HTTP_201_CREATED
        )


# ---------------------------------------------------------------------------
# CUSTOMER: Wait Room — single entry status
# ---------------------------------------------------------------------------

class QueueEntryDetailView(APIView):
    """
    GET /api/queue/entry/<token>/
    The customer's wait room polls this (or receives WebSocket updates).
    Returns their current position and estimated wait.
    """

    def get(self, request, token):
        try:
            entry = QueueEntry.objects.get(token=token)
        except QueueEntry.DoesNotExist:
            return Response(
                {'error': 'Queue entry not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = QueueEntrySerializer(entry)
        return Response(serializer.data)


# ---------------------------------------------------------------------------
# SHARED: Full Queue State (used by barber dashboards)
# ---------------------------------------------------------------------------

class QueueStatusView(APIView):
    """
    GET /api/queue/
    Returns the complete live queue — all barbers, all waiting/in-service entries.
    Called by barber dashboards on load and as HTTP fallback when WS drops.
    """

    def get(self, request):
        barbers = Barber.objects.all()
        barber_data = []

        for barber in barbers:
            entries = QueueEntry.objects.filter(
                barber=barber,
                status__in=['waiting', 'in_service']
            ).order_by('checked_in_at')

            barber_data.append({
                'barber': BarberSerializer(barber).data,
                'queue': QueueEntrySerializer(entries, many=True).data,
            })

        return Response({'barbers': barber_data})


# ---------------------------------------------------------------------------
# BARBERS: List (for check-in form dropdown)
# ---------------------------------------------------------------------------

class BarberListView(APIView):
    """
    GET /api/barbers/
    Returns all barbers with status and wait times.
    Used by the check-in form to populate barber selection.
    """

    def get(self, request):
        barbers = Barber.objects.all()
        serializer = BarberSerializer(barbers, many=True)
        return Response(serializer.data)


# ---------------------------------------------------------------------------
# BARBER DASHBOARD: Next Customer
# ---------------------------------------------------------------------------

class NextCustomerView(APIView):
    """
    POST /api/barber/<id>/next/
    Barber presses "Next Customer".

    What happens:
    1. Mark current in_service entry as completed
    2. Pull the next waiting entry for this barber
    3. Mark it as in_service, set called_at timestamp
    4. Send "It's your turn" SMS
    5. Check if the new 2nd-in-line needs an SMS
    6. Broadcast update
    """
    def post(self, request, barber_id):
        try:
            barber = Barber.objects.get(id=barber_id)
        except Barber.DoesNotExist:
            return Response({'error': 'Barber not found.'}, status=404)
        
    # ── Guard: if no one is waiting and no one in service, nothing to do ──
        has_activity = (
            barber.current_customer is not None or
            QueueEntry.objects.filter(barber=barber, status='waiting').exists()
            )
        if not has_activity:
            return Response({'message': 'Queue is empty. You are now available.'})
    


    def post(self, request, barber_id):
        try:
            barber = Barber.objects.get(id=barber_id)
        except Barber.DoesNotExist:
            return Response({'error': 'Barber not found.'}, status=404)

        # Close out current customer if there is one
        current = barber.current_customer
        if current:
            current.status = 'completed'
            current.service_ended_at = timezone.now()
            current.save()

        # Get next in line
        next_entry = get_next_waiting_entry(barber)

        if not next_entry:
            # Queue is empty — barber becomes available
            barber.status = 'available'
            barber.save()
            broadcast_queue_update()
            return Response({'message': 'Queue is empty. You are now available.'})

        # Call the next customer
        next_entry.status = 'in_service'
        next_entry.called_at = timezone.now()
        next_entry.service_started_at = timezone.now()
        next_entry.save()

        # Barber is now busy
        barber.status = 'busy'
        barber.save()

        # Send SMS to the called customer
        from .sms import send_your_turn_sms
        send_your_turn_sms(next_entry)
        next_entry.sms_sent_your_turn = True
        next_entry.save()

        # Check if the new 2nd-in-line customer needs an SMS
        new_second = QueueEntry.objects.filter(
            barber=barber,
            status='waiting'
        ).order_by('checked_in_at').first()

        if new_second:
            check_and_send_position_sms(new_second)

        broadcast_queue_update()
        broadcast_entry(next_entry.token)

        return Response({
            'message': f"Calling {next_entry.customer_name}.",
            'called': QueueEntrySerializer(next_entry).data,
        })


# ---------------------------------------------------------------------------
# BARBER DASHBOARD: No Show
# ---------------------------------------------------------------------------



class NoShowView(APIView):
    def post(self, request, barber_id):
        try:
            barber = Barber.objects.get(id=barber_id)
        except Barber.DoesNotExist:
            return Response({'error': 'Barber not found.'}, status=404)

        try:
            with transaction.atomic():
                current = barber.current_customer
                if not current:
                    return Response(
                        {'error': 'No customer currently in service.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                new_entry = handle_no_show(current)
                next_entry = get_next_waiting_entry(barber)

                if not next_entry:
                    barber.status = 'available'
                    barber.save()
                    transaction.on_commit(broadcast_queue_update)
                    return Response({
                        'message': f"{current.customer_name} marked as no-show. Queue is now empty.",
                        'requeued': new_entry is not None,
                    })

                next_entry.status = 'in_service'
                next_entry.called_at = timezone.now()
                next_entry.service_started_at = timezone.now()
                next_entry.save()

                barber.status = 'busy'
                barber.save()

                from .sms import send_your_turn_sms
                send_your_turn_sms(next_entry)
                next_entry.sms_sent_your_turn = True
                next_entry.save()

                new_second = QueueEntry.objects.filter(
                    barber=barber,
                    status='waiting'
                ).order_by('checked_in_at').first()

                if new_second:
                    check_and_send_position_sms(new_second)

                transaction.on_commit(broadcast_queue_update)
                transaction.on_commit(lambda: broadcast_entry(current.token))
                if new_entry:
                    transaction.on_commit(lambda: broadcast_entry(new_entry.token))
                transaction.on_commit(lambda: broadcast_entry(next_entry.token))

                return Response({
                    'message': (
                        f"{current.customer_name} marked as no-show. "
                        f"Now calling {next_entry.customer_name}."
                    ),
                    'requeued': new_entry is not None,
                    'now_serving': QueueEntrySerializer(next_entry).data,
                })

        except Exception as e:
            # Log the real error so we can see it in Railway logs
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"NoShow error: {str(e)}", exc_info=True)
            return Response(
                {'error': f'Something went wrong: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

# ---------------------------------------------------------------------------
# BARBER DASHBOARD: Off Duty
# ---------------------------------------------------------------------------

class OffDutyView(APIView):
    """
    POST /api/barber/<id>/offduty/
    Barber goes on break or leaves for the day.

    What happens:
    1. Barber status → off_duty
    2. Their waiting customers are redistributed to other active barbers
    3. Any current in_service customer is NOT interrupted (finish the cut)
    4. Broadcast update
    """

    def post(self, request, barber_id):
        try:
            barber = Barber.objects.get(id=barber_id)
        except Barber.DoesNotExist:
            return Response({'error': 'Barber not found.'}, status=404)

        if barber.status == 'off_duty':
            return Response({'message': 'Already off duty.'})

        # Complete the current in_service customer before going off duty
        current = barber.current_customer
        if current:
            current.status = 'completed'
            current.service_ended_at = timezone.now()
            current.save()
            broadcast_entry(current.token)

        barber.status = 'off_duty'
        barber.went_off_duty_at = timezone.now()
        barber.save()

        # Redistribute waiting customers
        reassigned = reassign_barbers_queue(barber)

        transaction.on_commit(broadcast_queue_update)

        return Response({
            'message': f"{barber.name} is now off duty.",
            'customers_reassigned': len(reassigned),
        })

# ---------------------------------------------------------------------------
# BARBER DASHBOARD: Back On Duty
# ---------------------------------------------------------------------------

class OnDutyView(APIView):
    """
    POST /api/barber/<id>/onduty/
    Barber returns from break and is ready again.
    """

    def post(self, request, barber_id):
        try:
            barber = Barber.objects.get(id=barber_id)
        except Barber.DoesNotExist:
            return Response({'error': 'Barber not found.'}, status=404)

        barber.status = 'available'
        barber.went_off_duty_at = None
        barber.save()

        broadcast_queue_update()

        return Response({'message': f"{barber.name} is back on duty and available."})
