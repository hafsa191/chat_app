import json
from channels.generic.websocket import AsyncWebsocketConsumer


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = f'chat_{self.room_name}'
        self.user = self.scope['user']
        self.cursor_id = f"cursor_{self.user.id}"

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

        # Notify room that user joined
        await self.channel_layer.group_send(self.room_group_name, {
            'type': 'user_join',
            'username': self.user.username,
            'user_id': self.user.id,
        })

    async def disconnect(self, close_code):
        # Remove cursor on disconnect
        await self.channel_layer.group_send(self.room_group_name, {
            'type': 'cursor_remove',
            'user_id': self.user.id,
            'username': self.user.username,
        })
        await self.channel_layer.group_send(self.room_group_name, {
            'type': 'user_leave',
            'username': self.user.username,
        })
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        msg_type = data.get('type')

        # ── Chat Message ──────────────────────────────────────────
        if msg_type == 'chat_message':
            await self.channel_layer.group_send(self.room_group_name, {
                'type': 'chat_message',
                'message': data['message'],
                'username': self.user.username,
                'user_id': self.user.id,
                'msg_id': data.get('msg_id', ''),
                'reply_to': data.get('reply_to', None),  # 🧵 Thread/Reply
                'timestamp': data.get('timestamp', ''),
            })

        # ── Typing Indicator ──────────────────────────────────────
        elif msg_type == 'typing':
            await self.channel_layer.group_send(self.room_group_name, {
                'type': 'typing',
                'username': self.user.username,
                'is_typing': data.get('is_typing', False),
            })

        # ── Emoji Reaction ────────────────────────────────────────
        elif msg_type == 'emoji_reaction':
            await self.channel_layer.group_send(self.room_group_name, {
                'type': 'emoji_reaction',
                'msg_id': data['msg_id'],
                'emoji': data['emoji'],
                'username': self.user.username,
                'user_id': self.user.id,
            })

        # ── Pin Message ───────────────────────────────────────────
        elif msg_type == 'pin_message':
            await self.channel_layer.group_send(self.room_group_name, {
                'type': 'pin_message',
                'msg_id': data['msg_id'],
                'message_text': data.get('message_text', ''),
                'pinned_by': self.user.username,
                'action': data.get('action', 'pin'),  # pin or unpin
            })

        # ── Read Receipt ──────────────────────────────────────────
        elif msg_type == 'read_receipt':
            await self.channel_layer.group_send(self.room_group_name, {
                'type': 'read_receipt',
                'msg_id': data['msg_id'],
                'username': self.user.username,
                'user_id': self.user.id,
            })

        # ── Live Cursor ───────────────────────────────────────────
        elif msg_type == 'cursor_move':
            await self.channel_layer.group_send(self.room_group_name, {
                'type': 'cursor_move',
                'user_id': self.user.id,
                'username': self.user.username,
                'x': data.get('x', 0),
                'y': data.get('y', 0),
            })

        # ── Live Code Editor ──────────────────────────────────────
        elif msg_type == 'code_update':
            await self.channel_layer.group_send(self.room_group_name, {
                'type': 'code_update',
                'content': data['content'],
                'language': data.get('language', 'javascript'),
                'username': self.user.username,
                'cursor_pos': data.get('cursor_pos', 0),
            })

        # ── Poll Create ───────────────────────────────────────────
        elif msg_type == 'poll_create':
            await self.channel_layer.group_send(self.room_group_name, {
                'type': 'poll_create',
                'poll_id': data['poll_id'],
                'question': data['question'],
                'options': data['options'],
                'created_by': self.user.username,
            })

        # ── Poll Vote ─────────────────────────────────────────────
        elif msg_type == 'poll_vote':
            await self.channel_layer.group_send(self.room_group_name, {
                'type': 'poll_vote',
                'poll_id': data['poll_id'],
                'option_index': data['option_index'],
                'username': self.user.username,
                'user_id': self.user.id,
            })

        # ── Collaborative Notes ───────────────────────────────────
        elif msg_type == 'note_update':
            await self.channel_layer.group_send(self.room_group_name, {
                'type': 'note_update',
                'content': data['content'],
                'username': self.user.username,
            })

    # ── Event Handlers (broadcast to clients) ─────────────────────

    async def chat_message(self, event):
        await self.send(text_data=json.dumps(event))

    async def typing(self, event):
        await self.send(text_data=json.dumps(event))

    async def emoji_reaction(self, event):
        await self.send(text_data=json.dumps(event))

    async def pin_message(self, event):
        await self.send(text_data=json.dumps(event))

    async def read_receipt(self, event):
        await self.send(text_data=json.dumps(event))

    async def cursor_move(self, event):
        await self.send(text_data=json.dumps(event))

    async def cursor_remove(self, event):
        await self.send(text_data=json.dumps(event))

    async def code_update(self, event):
        await self.send(text_data=json.dumps(event))

    async def poll_create(self, event):
        await self.send(text_data=json.dumps(event))

    async def poll_vote(self, event):
        await self.send(text_data=json.dumps(event))

    async def note_update(self, event):
        await self.send(text_data=json.dumps(event))

    async def user_join(self, event):
        await self.send(text_data=json.dumps(event))

    async def user_leave(self, event):
        await self.send(text_data=json.dumps(event))


# import json
# from channels.generic.websocket import AsyncWebsocketConsumer
# from django.utils import timezone

# # In-memory store (per-room state)
# # Production mein Redis ya database use karo
# room_notes = {}      # room_name -> str (shared notes content)
# room_members = {}    # room_name -> {username: channel_name}


# class ChatConsumer(AsyncWebsocketConsumer):
#     """
#     WebSocket consumer jo handle karta hai:
#     - Real-time chat messages
#     - Typing indicators
#     - User presence (join/leave)
#     - Collaborative shared notes
#     """

#     async def connect(self):
#         self.room_name = self.scope['url_route']['kwargs']['room_name']
#         self.room_group_name = f'chat_{self.room_name}'
#         self.user = self.scope['user']

#         # Anonymous users ko reject karo
#         if not self.user.is_authenticated:
#             await self.close()
#             return

#         self.username = self.user.username

#         # Room members dict initialize karo agar pehli baar hai
#         if self.room_name not in room_members:
#             room_members[self.room_name] = {}
#         if self.room_name not in room_notes:
#             room_notes[self.room_name] = ''

#         # Room group mein join karo
#         await self.channel_layer.group_add(
#             self.room_group_name,
#             self.channel_name
#         )

#         # Accept the WebSocket connection
#         await self.accept()

#         # Apna naam room mein add karo
#         room_members[self.room_name][self.username] = self.channel_name

#         # Sarko batao naya user aaya
#         await self.channel_layer.group_send(
#             self.room_group_name,
#             {
#                 'type': 'user_join',
#                 'username': self.username,
#                 'members': list(room_members[self.room_name].keys()),
#             }
#         )

#         # Naye user ko current notes bhejo (sync karo)
#         await self.send(text_data=json.dumps({
#             'type': 'note_sync',
#             'content': room_notes[self.room_name],
#         }))

#     async def disconnect(self, close_code):
#         if not hasattr(self, 'username'):
#             return

#         # Room se remove karo
#         if self.room_name in room_members:
#             room_members[self.room_name].pop(self.username, None)

#         # Sarko batao user chala gaya
#         await self.channel_layer.group_send(
#             self.room_group_name,
#             {
#                 'type': 'user_leave',
#                 'username': self.username,
#                 'members': list(room_members.get(self.room_name, {}).keys()),
#             }
#         )

#         # Group se remove karo
#         await self.channel_layer.group_discard(
#             self.room_group_name,
#             self.channel_name
#         )

#     async def receive(self, text_data):
#         """Client se message aaya."""
#         try:
#             data = json.loads(text_data)
#         except json.JSONDecodeError:
#             return

#         msg_type = data.get('type', 'chat_message')

#         if msg_type == 'chat_message':
#             message = data.get('message', '').strip()
#             if not message:
#                 return

#             await self.channel_layer.group_send(
#                 self.room_group_name,
#                 {
#                     'type': 'chat_message',
#                     'message': message,
#                     'username': self.username,
#                     'timestamp': timezone.now().strftime('%H:%M'),
#                 }
#             )

#         elif msg_type == 'typing':
#             is_typing = data.get('is_typing', False)
#             await self.channel_layer.group_send(
#                 self.room_group_name,
#                 {
#                     'type': 'typing_indicator',
#                     'username': self.username,
#                     'is_typing': is_typing,
#                 }
#             )

#         elif msg_type == 'note_update':
#             content = data.get('content', '')
#             # Notes update karo room ke liye
#             room_notes[self.room_name] = content

#             # Sab doosro ko bhejo (sirf sender ko nahi)
#             await self.channel_layer.group_send(
#                 self.room_group_name,
#                 {
#                     'type': 'note_broadcast',
#                     'content': content,
#                     'username': self.username,
#                 }
#             )

#     # ─── Group send handlers ───────────────────────────────────────────────

#     async def chat_message(self, event):
#         """Chat message sab clients ko bhejo."""
#         await self.send(text_data=json.dumps({
#             'type': 'chat_message',
#             'message': event['message'],
#             'username': event['username'],
#             'timestamp': event['timestamp'],
#             'is_self': event['username'] == self.username,
#         }))

#     async def typing_indicator(self, event):
#         """Typing status bhejo (khud ko nahi)."""
#         if event['username'] == self.username:
#             return
#         await self.send(text_data=json.dumps({
#             'type': 'typing',
#             'username': event['username'],
#             'is_typing': event['is_typing'],
#         }))

#     async def user_join(self, event):
#         """User join notification."""
#         await self.send(text_data=json.dumps({
#             'type': 'user_join',
#             'username': event['username'],
#             'members': event['members'],
#         }))

#     async def user_leave(self, event):
#         """User leave notification."""
#         await self.send(text_data=json.dumps({
#             'type': 'user_leave',
#             'username': event['username'],
#             'members': event['members'],
#         }))

#     async def note_broadcast(self, event):
#         """Collaborative notes update (sender ko nahi bhejo)."""
#         if event['username'] == self.username:
#             return
#         await self.send(text_data=json.dumps({
#             'type': 'note_update',
#             'content': event['content'],
#         }))
