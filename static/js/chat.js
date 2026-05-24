/**
 * ChatSync — WebSocket Client
 * Features: Real-time chat, typing indicators, presence, collaborative notes
 */

const messagesEl = document.getElementById('messages');
const msgInput = document.getElementById('msg-input');
const sendBtn = document.getElementById('send-btn');
const typingBar = document.getElementById('typing-bar');
const typingText = document.getElementById('typing-text');
const membersList = document.getElementById('members-list');
const connStatus = document.getElementById('conn-status');
const collabNotes = document.getElementById('collab-notes');
const notesStatus = document.getElementById('notes-status');

let socket = null;
let typingTimer = null;
let isTyping = false;
let reconnectDelay = 1000;
let typingUsers = new Set();

// ─── WebSocket Connection ────────────────────────────────────────────────

function connect() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws/chat/${ROOM_NAME}/`;

  setStatus('connecting');
  socket = new WebSocket(wsUrl);

  socket.onopen = () => {
    setStatus('connected');
    reconnectDelay = 1000;
    console.log('✅ WebSocket connected to room:', ROOM_NAME);
  };

  socket.onclose = (e) => {
    setStatus('disconnected');
    console.warn('WebSocket closed. Reconnecting in', reconnectDelay, 'ms...');
    setTimeout(connect, reconnectDelay);
    reconnectDelay = Math.min(reconnectDelay * 2, 10000); // Exponential backoff
  };

  socket.onerror = (e) => {
    console.error('WebSocket error:', e);
  };

  socket.onmessage = (e) => {
    const data = JSON.parse(e.data);
    handleMessage(data);
  };
}

function handleMessage(data) {
  switch (data.type) {
    case 'chat_message':
      addMessage(data);
      break;
    case 'typing':
      handleTyping(data);
      break;
    case 'user_join':
      updateMembers(data.members);
      if (data.username !== USERNAME) {
        addSystemMessage(`${data.username} room mein aa gaya 👋`);
      }
      break;
    case 'user_leave':
      updateMembers(data.members);
      addSystemMessage(`${data.username} chala gaya`);
      break;
    case 'note_sync':
    case 'note_update':
      // Sirf tab update karo jab user khud type nahi kar raha
      if (document.activeElement !== collabNotes) {
        collabNotes.value = data.content;
      }
      flashNotesStatus('↓ Received');
      break;
  }
}

// ─── Sending Messages ────────────────────────────────────────────────────

function sendMessage() {
  const message = msgInput.value.trim();
  if (!message || !socket || socket.readyState !== WebSocket.OPEN) return;

  socket.send(JSON.stringify({ type: 'chat_message', message }));
  msgInput.value = '';
  msgInput.focus();

  // Typing stop karo
  sendTyping(false);
}

function sendTyping(state) {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;
  if (isTyping === state) return;
  isTyping = state;
  socket.send(JSON.stringify({ type: 'typing', is_typing: state }));
}

// ─── UI: Messages ────────────────────────────────────────────────────────

function addMessage(data) {
  // Welcome message hatao
  const welcome = messagesEl.querySelector('.messages__welcome');
  if (welcome) welcome.remove();

  const isSelf = data.username === USERNAME;
  const div = document.createElement('div');
  div.className = `message ${isSelf ? 'message--self' : 'message--other'}`;

  const avatar = data.username.charAt(0).toUpperCase();
  div.innerHTML = `
    ${!isSelf ? `<div class="message__avatar">${avatar}</div>` : ''}
    <div class="message__body">
      ${!isSelf ? `<span class="message__name">${escHtml(data.username)}</span>` : ''}
      <div class="message__bubble">${escHtml(data.message)}</div>
      <span class="message__time">${data.timestamp}</span>
    </div>
    ${isSelf ? `<div class="message__avatar message__avatar--self">${avatar}</div>` : ''}
  `;

  messagesEl.appendChild(div);
  scrollToBottom();
}

function addSystemMessage(text) {
  const div = document.createElement('div');
  div.className = 'message message--system';
  div.innerHTML = `<span>${escHtml(text)}</span>`;
  messagesEl.appendChild(div);
  scrollToBottom();
}

function updateMembers(members) {
  membersList.innerHTML = '';
  members.forEach(name => {
    const li = document.createElement('li');
    li.className = 'member-item';
    const isSelf = name === USERNAME;
    li.innerHTML = `
      <div class="member-avatar ${isSelf ? 'member-avatar--self' : ''}">${name.charAt(0).toUpperCase()}</div>
      <span>${escHtml(name)}${isSelf ? ' <em>(you)</em>' : ''}</span>
      <span class="member-online-dot"></span>
    `;
    membersList.appendChild(li);
  });
}

function handleTyping(data) {
  if (data.is_typing) {
    typingUsers.add(data.username);
  } else {
    typingUsers.delete(data.username);
  }

  if (typingUsers.size > 0) {
    const names = [...typingUsers].join(', ');
    typingText.textContent = `${names} likh raha hai...`;
    typingBar.style.display = 'flex';
  } else {
    typingBar.style.display = 'none';
  }
}

// ─── UI: Status ──────────────────────────────────────────────────────────

function setStatus(state) {
  const dot = connStatus.querySelector('.status-dot');
  dot.className = `status-dot status-dot--${state}`;
  const labels = { connected: 'Connected', disconnected: 'Reconnecting...', connecting: 'Connecting...' };
  connStatus.lastChild.textContent = ' ' + labels[state];
}

function scrollToBottom() {
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function escHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

// ─── Tab Switching ────────────────────────────────────────────────────────

function switchTab(tab) {
  const chatPanel = document.getElementById('chat-panel');
  const notesPanel = document.getElementById('notes-panel');
  const tabs = document.querySelectorAll('.tab-btn');

  tabs.forEach(t => t.classList.remove('active'));

  if (tab === 'notes') {
    chatPanel.style.display = 'none';
    notesPanel.style.display = 'flex';
    tabs[1].classList.add('active');
    collabNotes.focus();
  } else {
    chatPanel.style.display = 'flex';
    notesPanel.style.display = 'none';
    tabs[0].classList.add('active');
    msgInput.focus();
  }
}

// ─── Collaborative Notes ─────────────────────────────────────────────────

let notesSyncTimer = null;

function flashNotesStatus(msg) {
  notesStatus.textContent = msg;
  setTimeout(() => { notesStatus.textContent = '✓ Synced'; }, 1500);
}

collabNotes.addEventListener('input', () => {
  notesStatus.textContent = '⏳ Syncing...';
  clearTimeout(notesSyncTimer);
  notesSyncTimer = setTimeout(() => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'note_update',
        content: collabNotes.value,
      }));
      flashNotesStatus('✓ Synced');
    }
  }, 300); // 300ms debounce — har keypress pe nahi bhejte
});

// ─── Event Listeners ─────────────────────────────────────────────────────

sendBtn.addEventListener('click', sendMessage);

msgInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

msgInput.addEventListener('input', () => {
  if (msgInput.value.trim()) {
    sendTyping(true);
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => sendTyping(false), 2000);
  } else {
    sendTyping(false);
  }
});

// ─── Start ───────────────────────────────────────────────────────────────
connect();
