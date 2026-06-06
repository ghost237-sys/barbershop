import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
import queue_app.routing  # we'll create this in Phase 4

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

application = ProtocolTypeRouter({
    # Regular HTTP requests go through Django as normal
    'http': get_asgi_application(),

    # WebSocket connections go through Channels
    # AllowedHostsOriginValidator checks the origin header for security
    'websocket': AllowedHostsOriginValidator(
        URLRouter(queue_app.routing.websocket_urlpatterns)
    ),
})
