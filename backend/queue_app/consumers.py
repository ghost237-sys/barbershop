import json
import asyncio
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone
from django.core.serializers.json import DjangoJSONEncoder


class QueueConsumer(AsyncWebsocketConsumer):
    """
    Handles WebSocket connections from barber dashboards.
    All dashboards join the same group: 'queue_updates'.
    When any queue mutation happens, all dashboards update simultaneously.
    """

    GROUP_NAME = 'queue_updates'

    async def connect(self):
        # Add this connection to the shared group
        await self.channel_layer.group_add(
            self.GROUP_NAME,
            self.channel_name
        )
        await self.accept()

        # Immediately send the current queue state on connect
        # so the dashboard doesn't show stale data on load
        queue_data = await self.get_queue_state()
        await self.send(text_data=json.dumps({
            'type': 'queue_update',
            'data': queue_data,
        },cls=DjangoJSONEncoder))

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.GROUP_NAME,
            self.channel_name
        )

    async def receive(self, text_data):
        # Dashboards don't send messages to the server via WebSocket
        # All mutations go through the REST API
        # This is intentional — keeps WebSocket as receive-only on client
        pass

    async def queue_update(self, event):
        """
        Handler for messages broadcast to the group.
        Called by the channel layer when broadcast_queue() is invoked.
        'event' matches the type 'queue.update' → 'queue_update' (dots→underscores)
        """
        await self.send(text_data=json.dumps({
            'type': 'queue_update',
            'data': event['data'],
        }))

    @database_sync_to_async
    def get_queue_state(self):
        """
        Fetches and serializes the full queue state.
        Must be wrapped in database_sync_to_async because
        Django ORM is synchronous but consumers run in async context.
        """
        from .models import Barber, QueueEntry
        from .serializers import BarberSerializer, QueueEntrySerializer

        barbers = Barber.objects.all()
        result = []

        for barber in barbers:
            entries = QueueEntry.objects.filter(
                barber=barber,
                status__in=['waiting', 'in_service']
            ).order_by('checked_in_at')

            result.append({
                'barber': BarberSerializer(barber).data,
                'queue': QueueEntrySerializer(entries, many=True).data,
            })

        return result


class EntryConsumer(AsyncWebsocketConsumer):
    """
    Handles WebSocket connections from individual customer wait rooms.
    Each customer connects to their own private channel: 'entry_<token>'.
    Only updates relevant to that specific customer are sent here.
    """

    async def connect(self):
        self.token = self.scope['url_route']['kwargs']['token']
        self.group_name = f'entry_{self.token}'

        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        await self.accept()

        # Send current entry state immediately on connect
        entry_data = await self.get_entry_state(self.token)
        if entry_data:
            await self.send(text_data=json.dumps({
                'type': 'entry_update',
                'data': entry_data,
            }))
        else:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Queue entry not found.',
            }))
            await self.close()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        # Wait room is receive-only — customer doesn't send anything
        pass

    async def entry_update(self, event):
        """Handler for updates pushed to this customer's private channel."""
        await self.send(text_data=json.dumps({
            'type': 'entry_update',
            'data': event['data'],
        }))

    @database_sync_to_async
    def get_entry_state(self, token):
        from .models import QueueEntry
        from .serializers import QueueEntrySerializer
        try:
            entry = QueueEntry.objects.get(token=token)
            return QueueEntrySerializer(entry).data
        except QueueEntry.DoesNotExist:
            return None


# ---------------------------------------------------------------------------
# BROADCAST FUNCTIONS
# Called from views.py after every queue mutation
# ---------------------------------------------------------------------------

async def broadcast_queue():
    """
    Pushes the full updated queue state to all connected barber dashboards.
    Called via broadcast_queue_update() in views.py.
    """
    from channels.layers import get_channel_layer
    from .models import Barber, QueueEntry
    from .serializers import BarberSerializer, QueueEntrySerializer

    channel_layer = get_channel_layer()

    # Build the queue payload
    @database_sync_to_async
    def get_data():
        barbers = Barber.objects.all()
        result = []
        for barber in barbers:
            entries = QueueEntry.objects.filter(
                barber=barber,
                status__in=['waiting', 'in_service']
            ).order_by('checked_in_at')
            result.append({
                'barber': BarberSerializer(barber).data,
                'queue': QueueEntrySerializer(entries, many=True).data,
            })
        return result

    data = await get_data()

    # Fan out to all connected dashboards
    await channel_layer.group_send(
        QueueConsumer.GROUP_NAME,
        {
            'type': 'queue.update',   # maps to queue_update() handler
            'data': data,
        }
    )


async def broadcast_entry_update(token: str):
    """
    Pushes an update to a specific customer's wait room.
    Called whenever that customer's entry changes status, position, or wait time.
    """
    from channels.layers import get_channel_layer
    from .models import QueueEntry
    from .serializers import QueueEntrySerializer

    channel_layer = get_channel_layer()

    @database_sync_to_async
    def get_entry():
        try:
            entry = QueueEntry.objects.get(token=token)
            return QueueEntrySerializer(entry).data
        except QueueEntry.DoesNotExist:
            return None

    data = await get_entry()
    if not data:
        return

    await channel_layer.group_send(
        f'entry_{token}',
        {
            'type': 'entry.update',   # maps to entry_update() handler
            'data': data,
        }
    )

