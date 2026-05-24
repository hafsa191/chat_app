"""
ASGI config — WebSocket + HTTP routing.
'daphne core.asgi:application' se run karo.
"""
import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
import chat.routing

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

application = ProtocolTypeRouter({
    # Normal HTTP requests → Django handle karta hai
    "http": get_asgi_application(),

    # WebSocket requests → AuthMiddlewareStack + chat routing
    "websocket": AuthMiddlewareStack(
        URLRouter(
            chat.routing.websocket_urlpatterns
        )
    ),
})
