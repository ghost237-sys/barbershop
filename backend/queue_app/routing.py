from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    # Barber dashboards connect here — all share the same queue_updates group
    re_path(r'ws/queue/$', consumers.QueueConsumer.as_asgi()),

    # Customer wait room — each customer has their own private channel
    # token is the UUID from their QueueEntry
    re_path(r'ws/entry/(?P<token>[0-9a-f-]+)/$', consumers.EntryConsumer.as_asgi()),
]
