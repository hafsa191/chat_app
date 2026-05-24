# 💬 ChatSync — Real-Time Chat & Collaboration App

Django Channels + WebSockets se bana hua real-time chat app.
**Redis ki zaroorat nahi** — seedha run ho jata hai!

---

## ✨ Features

| Feature | Details |
|---|---|
| 💬 Real-time Chat | Instant message delivery via WebSocket |
| 👥 User Presence | Join/leave notifications, online list |
| ✍️ Typing Indicators | "Ali likh raha hai..." |
| 📝 Collaborative Notes | Shared notepad — sab milke edit karein |
| 🔐 Auth | Login / Register system |
| 🎨 Modern UI | Dark theme, responsive design |
| 🔄 Auto-reconnect | Network drop? Automatic reconnect |
| 🏠 Multiple Rooms | general, tech, random, project + custom |

---

## 🚀 Quick Start (3 Commands)

```bash
# 1. Dependencies install karo
pip install -r requirements.txt

# 2. Database setup karo
python manage.py migrate

# 3. Server start karo (WebSocket support ke saath)
daphne core.asgi:application
```

Ya ek command mein sab:
```bash
python setup.py
```

Browser mein kholen: **http://localhost:8000**

---

## ⚠️ Zaroori — `daphne` use karo, `runserver` nahi

```bash
# ❌ GALAT — WebSocket kaam nahi karega
python manage.py runserver

# ✅ SAHI — WebSocket fully support hota hai
daphne core.asgi:application
```

---

## 🧪 Collaboration Test Kaise Karein

1. Server start karo: `daphne core.asgi:application`
2. Browser mein jaao: `http://localhost:8000`
3. Register/Login karo (User A)
4. **Nayi tab/window** mein jaao, doosra account banao (User B)
5. Dono ko **same room** mein join karo (e.g., #general)
6. Messages real-time dikhenge dono sides pe!
7. **📝 Notes** tab click karo — shared notepad test karo

---

## 📁 Project Structure

```
chat_app/
├── core/
│   ├── settings.py    ← InMemoryChannelLayer (Redis-free!)
│   ├── asgi.py        ← WebSocket routing
│   └── urls.py
├── chat/
│   ├── consumers.py   ← WebSocket handler (main logic)
│   ├── routing.py     ← WS URL patterns
│   ├── views.py
│   └── urls.py
├── templates/
│   ├── base.html
│   ├── chat/
│   │   ├── lobby.html ← Room selection
│   │   └── room.html  ← Chat + Notes
│   └── registration/
│       ├── login.html
│       └── register.html
├── static/
│   ├── css/style.css  ← Complete dark UI
│   └── js/chat.js     ← WebSocket client
├── manage.py
├── requirements.txt
└── setup.py           ← One-click setup
```

---

## 🔧 WebSocket Messages (Protocol)

```javascript
// Chat message
{ type: "chat_message", message: "Hello!" }

// Typing indicator
{ type: "typing", is_typing: true }

// Collaborative notes
{ type: "note_update", content: "Meeting notes..." }
```

---

## 🏭 Production ke liye

```python
# settings.py mein Redis channel layer use karo:
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": { "hosts": [("127.0.0.1", 6379)] },
    }
}
```

```bash
# Extra packages install karo:
pip install channels_redis redis
```

---

## 🐛 Common Errors

| Error | Solution |
|---|---|
| WebSocket connect nahi ho raha | `daphne` use karo, `runserver` nahi |
| `ModuleNotFoundError: channels` | `pip install channels daphne` |
| Port already in use | `daphne core.asgi:application -p 8001` |
| Login redirect loop | `python manage.py migrate` chalao |
