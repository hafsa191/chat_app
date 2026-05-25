# 💬 ChatSync

> **Real-time collaborative chat application** built with Django Channels, WebSockets, and a modern dark UI.

![Python](https://img.shields.io/badge/Python-3.12-blue?style=flat-square&logo=python)
![Django](https://img.shields.io/badge/Django-5.1-green?style=flat-square&logo=django)
![Channels](https://img.shields.io/badge/Django--Channels-4.x-purple?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)

---

## ✨ Features

| Feature | Description |
|---|---|
| 💬 **Real-time Chat** | WebSocket-powered instant messaging |
| 👍 **Emoji Reactions** | React to any message with emojis |
| 🧵 **Reply / Threads** | Reply to specific messages inline |
| 📌 **Pin Messages** | Pin important messages for the room |
| ✅ **Read Receipts** | See who has read your messages |
| 👆 **Live Cursors** | See other users' cursors in real-time |
| 💻 **Live Code Editor** | Collaborate on code together (JS + Python) |
| 📊 **Polls & Voting** | Create polls and vote in real-time |
| 📝 **Shared Notes** | Collaborative notes for the whole room |
| 🌙 **Dark / Light Theme** | Toggle between themes |
| ⌨️ **Typing Indicators** | See when someone is typing |

---

## 🛠️ Tech Stack

- **Backend** — Django 5.1, Django Channels 4.x, Daphne (ASGI)
- **Frontend** — Vanilla JavaScript, CSS3 (custom dark/light theme)
- **WebSockets** — Django Channels with InMemoryChannelLayer
- **Auth** — Django built-in authentication
- **Static Files** — WhiteNoise

---

## 📁 Project Structure

```
chat_app/
├── core/
│   ├── settings.py          # Django settings
│   ├── urls.py              # URL routing
│   └── asgi.py              # ASGI config (WebSocket support)
├── chat/
│   ├── consumers.py         # WebSocket consumer (all real-time logic)
│   ├── views.py             # HTTP views (lobby, room)
│   ├── routing.py           # WebSocket URL routing
│   └── urls.py              # App URLs
├── templates/
│   ├── base.html            # Base template
│   └── chat/
│       ├── lobby.html       # Room selection page
│       ├── room.html        # Main chat room
│       ├── login.html       # Login page
│       └── register.html    # Register page
├── static/
│   ├── css/
│   │   └── style.css        # Complete stylesheet
│   └── js/
│       └── chat.js          # All frontend logic
├── manage.py
├── run.bat                  # Quick start script (Windows)
└── requirements.txt
```

---

## ⚡ Quick Start

### 1. Clone the repository
```bash
git clone https://github.com/hafsa191/chat_app.git
cd chat_app
```

### 2. Create & activate virtual environment
```bash
python -m venv venv

# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Run migrations
```bash
python manage.py migrate
```

### 5. Create superuser (optional)
```bash
python manage.py createsuperuser
```

### 6. Collect static files
```bash
set DJANGO_SETTINGS_MODULE=core.settings   # Windows
python manage.py collectstatic --noinput
```

### 7. Start the server
```bash
set DJANGO_SETTINGS_MODULE=core.settings
python manage.py runserver
```

Open `http://127.0.0.1:8000` in your browser. 🚀

---

## 🪟 Windows Shortcut

Create a `run.bat` file in the project root:

```bat
@echo off
cd /d "E:\your\path\to\chat_app"
call venv\Scripts\activate
set DJANGO_SETTINGS_MODULE=core.settings
python manage.py runserver
pause
```

Double-click `run.bat` to start instantly.

---

## 📦 Requirements

```
django>=5.1
channels>=4.0
daphne>=4.0
whitenoise>=6.0
```

Install all:
```bash
pip install django channels daphne whitenoise
```

---

## 🌐 WebSocket Events

| Event | Direction | Description |
|---|---|---|
| `chat_message` | send/receive | Send or receive a chat message |
| `typing` | send/receive | Typing indicator |
| `emoji_reaction` | send/receive | React to a message |
| `pin_message` | send/receive | Pin/unpin a message |
| `read_receipt` | send/receive | Mark message as read |
| `cursor_move` | send/receive | Live cursor position |
| `code_update` | send/receive | Live code editor sync |
| `poll_create` | send/receive | Create a new poll |
| `poll_vote` | send/receive | Vote on a poll option |
| `note_update` | send/receive | Collaborative notes sync |
| `user_join` | receive | User joined the room |
| `user_leave` | receive | User left the room |

---

## 🔧 Settings

Key settings in `core/settings.py`:

```python
INSTALLED_APPS = [
    ...
    'django.contrib.staticfiles',
    'channels',
    'chat',
]

ASGI_APPLICATION = 'core.asgi.application'

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels.layers.InMemoryChannelLayer',
    }
}

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    ...
]
```

---

## 🎨 Theme

The app supports **dark and light themes** toggled via a button in the sidebar. Theme preference is saved in `localStorage` and applied via `data-theme` attribute on the `<html>` element.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch — `git checkout -b feature/amazing-feature`
3. Commit your changes — `git commit -m 'Add amazing feature'`
4. Push to the branch — `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 👩‍💻 Author

**Hafsa Noor**
- GitHub: [@hafsa191](https://github.com/hafsa191)

---

## 📄 License

This project is licensed under the MIT License.

---

<div align="center">
  Made with ❤️ using Django + WebSockets
</div>
