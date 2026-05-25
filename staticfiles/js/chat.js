// ═══════════════════════════════════════════════════════════════
//  ChatSync — Full Collaboration JS
//  Features: Emoji Reactions, Threads, Pin, Read Receipts,
//             Live Cursors, Live Code Editor, Polls, Dark/Light
// ═══════════════════════════════════════════════════════════════

const roomName = JSON.parse(document.getElementById('room-name').textContent);
const currentUser = JSON.parse(document.getElementById('current-user').textContent);
const currentUID = JSON.parse(document.getElementById('current-uid').textContent);

const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
let chatSocket, reconnectTimer;
let replyingTo = null;   // { msg_id, username, text }
let pinnedMsgs = {};     // msg_id → {text, by}
let polls = {};     // poll_id → {question, options:[{text,voters:[]}]}
let reactions = {};     // msg_id → {emoji: [usernames]}
let readBy = {};     // msg_id → [usernames]
let cursors = {};     // user_id → {el, username}
let codeContent = '';
let codeLanguage = 'javascript';
let msgIdCounter = 0;

// ── Theme ─────────────────────────────────────────────────────
const root = document.documentElement;
const savedTheme = localStorage.getItem('theme') || 'dark';
applyTheme(savedTheme);

function applyTheme(theme) {
  root.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
}

document.getElementById('theme-toggle')?.addEventListener('click', () => {
  const cur = root.getAttribute('data-theme') || 'dark';
  applyTheme(cur === 'dark' ? 'light' : 'dark');
});

// ── WebSocket Connect ─────────────────────────────────────────
function connectWS() {
  chatSocket = new WebSocket(`${wsProtocol}://${window.location.host}/ws/chat/${roomName}/`);

  chatSocket.onopen = () => {
    clearTimeout(reconnectTimer);
    console.log('✅ WebSocket connected');
  };

  chatSocket.onmessage = (e) => handleMessage(JSON.parse(e.data));

  chatSocket.onclose = () => {
    console.warn('⚠️ WS closed — reconnecting in 2s...');
    reconnectTimer = setTimeout(connectWS, 2000);
  };
}
connectWS();

// ── Message Handler ───────────────────────────────────────────
function handleMessage(data) {
  switch (data.type) {
    case 'chat_message': renderMessage(data); break;
    case 'typing': renderTyping(data); break;
    case 'emoji_reaction': renderReaction(data); break;
    case 'pin_message': handlePin(data); break;
    case 'read_receipt': renderReadReceipt(data); break;
    case 'cursor_move': renderCursor(data); break;
    case 'cursor_remove': removeCursor(data.user_id); break;
    case 'code_update': renderCodeUpdate(data); break;
    case 'poll_create': renderPoll(data); break;
    case 'poll_vote': renderPollVote(data); break;
    case 'note_update': renderNotes(data); break;
    case 'user_join': renderSystem(`${data.username} room mein aaya 👋`); break;
    case 'user_leave': renderSystem(`${data.username} chala gaya`); break;
  }
}

// ── Send Helper ───────────────────────────────────────────────
function ws(obj) {
  if (chatSocket.readyState === WebSocket.OPEN)
    chatSocket.send(JSON.stringify(obj));
}

// ── Generate IDs ──────────────────────────────────────────────
function genId() {
  return `${currentUID}_${Date.now()}_${msgIdCounter++}`;
}

// ═══════════════════════════════════════════════════════════════
//  CHAT MESSAGES
// ═══════════════════════════════════════════════════════════════
const msgInput = document.getElementById('message-input');
const chatLog = document.getElementById('chat-log');

document.getElementById('send-btn')?.addEventListener('click', sendMessage);
msgInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});

function sendMessage() {
  const text = msgInput.value.trim();
  if (!text) return;
  const msg_id = genId();
  ws({
    type: 'chat_message',
    message: text,
    msg_id,
    reply_to: replyingTo,
    timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
  });
  clearReply();
  msgInput.value = '';
}

function renderMessage(data) {
  const isMine = data.username === currentUser;
  const div = document.createElement('div');
  div.className = `msg ${isMine ? 'msg-mine' : 'msg-other'}`;
  div.id = `msg-${data.msg_id}`;

  let replyHTML = '';
  if (data.reply_to) {
    replyHTML = `<div class="reply-preview">
      ↩️ <strong>${data.reply_to.username}</strong>: ${escHtml(data.reply_to.text.slice(0, 60))}
    </div>`;
  }

  div.innerHTML = `
    ${replyHTML}
    <div class="msg-meta">
      <span class="msg-user">${escHtml(data.username)}</span>
      <span class="msg-time">${data.timestamp || ''}</span>
    </div>
    <div class="msg-text">${escHtml(data.message)}</div>
    <div class="msg-actions">
      <button class="action-btn" onclick="showEmojiPicker('${data.msg_id}')">😊</button>
      <button class="action-btn" onclick="setReply('${data.msg_id}','${escHtml(data.username)}','${escHtml(data.message.slice(0, 80))}')">↩️</button>
      <button class="action-btn" onclick="pinMsg('${data.msg_id}','${escHtml(data.message.slice(0, 80))}')">📌</button>
    </div>
    <div class="reactions-bar" id="reactions-${data.msg_id}"></div>
    <div class="read-bar"      id="read-${data.msg_id}"></div>`;

  chatLog.appendChild(div);
  chatLog.scrollTop = chatLog.scrollHeight;

  // Send read receipt for messages from others
  if (!isMine) {
    ws({ type: 'read_receipt', msg_id: data.msg_id });
  }
}

function renderSystem(text) {
  const div = document.createElement('div');
  div.className = 'system-msg';
  div.textContent = text;
  chatLog.appendChild(div);
  chatLog.scrollTop = chatLog.scrollHeight;
}

// ── Reply / Threads ───────────────────────────────────────────
function setReply(msg_id, username, text) {
  replyingTo = { msg_id, username, text };
  const bar = document.getElementById('reply-bar');
  if (bar) {
    bar.style.display = 'flex';
    bar.innerHTML = `<span>↩️ Replying to <strong>${escHtml(username)}</strong>: ${escHtml(text.slice(0, 50))}</span>
      <button onclick="clearReply()">✕</button>`;
  }
  msgInput.focus();
}

function clearReply() {
  replyingTo = null;
  const bar = document.getElementById('reply-bar');
  if (bar) bar.style.display = 'none';
}

// ── Typing ────────────────────────────────────────────────────
let typingTimer;
msgInput?.addEventListener('input', () => {
  ws({ type: 'typing', is_typing: true });
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => ws({ type: 'typing', is_typing: false }), 1500);
});

function renderTyping(data) {
  if (data.username === currentUser) return;
  const el = document.getElementById('typing-indicator');
  if (!el) return;
  if (data.is_typing) {
    el.textContent = `${data.username} likh raha hai...`;
    el.style.display = 'block';
  } else {
    el.style.display = 'none';
  }
}

// ═══════════════════════════════════════════════════════════════
//  EMOJI REACTIONS
// ═══════════════════════════════════════════════════════════════
const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '🎉', '👏'];

function showEmojiPicker(msg_id) {
  // Remove existing picker
  document.getElementById('emoji-picker')?.remove();
  const picker = document.createElement('div');
  picker.id = 'emoji-picker';
  picker.className = 'emoji-picker';
  picker.innerHTML = EMOJIS.map(e =>
    `<span class="emoji-opt" onclick="sendReaction('${msg_id}','${e}')">${e}</span>`
  ).join('');
  const msgEl = document.getElementById(`msg-${msg_id}`);
  msgEl?.appendChild(picker);
  // Close on outside click
  setTimeout(() => document.addEventListener('click', () => picker.remove(), { once: true }), 50);
}

function sendReaction(msg_id, emoji) {
  ws({ type: 'emoji_reaction', msg_id, emoji });
  document.getElementById('emoji-picker')?.remove();
}

function renderReaction(data) {
  if (!reactions[data.msg_id]) reactions[data.msg_id] = {};
  if (!reactions[data.msg_id][data.emoji]) reactions[data.msg_id][data.emoji] = [];
  const users = reactions[data.msg_id][data.emoji];
  if (!users.includes(data.username)) users.push(data.username);

  const bar = document.getElementById(`reactions-${data.msg_id}`);
  if (!bar) return;
  bar.innerHTML = Object.entries(reactions[data.msg_id]).map(([emoji, users]) =>
    `<span class="reaction-pill" title="${users.join(', ')}">${emoji} ${users.length}</span>`
  ).join('');
}

// ═══════════════════════════════════════════════════════════════
//  PIN MESSAGES
// ═══════════════════════════════════════════════════════════════
function pinMsg(msg_id, message_text) {
  const isPinned = !!pinnedMsgs[msg_id];
  ws({ type: 'pin_message', msg_id, message_text, action: isPinned ? 'unpin' : 'pin' });
}

function handlePin(data) {
  if (data.action === 'pin') {
    pinnedMsgs[data.msg_id] = { text: data.message_text, by: data.pinned_by };
  } else {
    delete pinnedMsgs[data.msg_id];
  }
  renderPinnedBar();
}

function renderPinnedBar() {
  const bar = document.getElementById('pinned-bar');
  if (!bar) return;
  const pins = Object.values(pinnedMsgs);
  if (pins.length === 0) { bar.style.display = 'none'; return; }
  bar.style.display = 'block';
  bar.innerHTML = `<strong>📌 Pinned:</strong> ` +
    pins.map(p => `<span class="pinned-item">${escHtml(p.text.slice(0, 50))} <em>— ${p.by}</em></span>`).join(' | ');
}

// ═══════════════════════════════════════════════════════════════
//  READ RECEIPTS
// ═══════════════════════════════════════════════════════════════
function renderReadReceipt(data) {
  if (!readBy[data.msg_id]) readBy[data.msg_id] = [];
  if (!readBy[data.msg_id].includes(data.username)) readBy[data.msg_id].push(data.username);
  const bar = document.getElementById(`read-${data.msg_id}`);
  if (bar) bar.innerHTML = `<span class="read-receipt">✅ Dekha: ${readBy[data.msg_id].join(', ')}</span>`;
}

// ═══════════════════════════════════════════════════════════════
//  LIVE CURSORS
// ═══════════════════════════════════════════════════════════════
const cursorOverlay = document.getElementById('cursor-overlay');

document.addEventListener('mousemove', throttle((e) => {
  ws({ type: 'cursor_move', x: e.clientX, y: e.clientY });
}, 50));

function renderCursor(data) {
  if (data.user_id === currentUID) return;
  if (!cursors[data.user_id]) {
    const el = document.createElement('div');
    el.className = 'live-cursor';
    el.innerHTML = `<div class="cursor-arrow">▶</div><div class="cursor-label">${escHtml(data.username)}</div>`;
    cursorOverlay?.appendChild(el);
    cursors[data.user_id] = { el, username: data.username };
  }
  cursors[data.user_id].el.style.transform = `translate(${data.x}px, ${data.y}px)`;
}

function removeCursor(user_id) {
  if (cursors[user_id]) {
    cursors[user_id].el.remove();
    delete cursors[user_id];
  }
}

// ═══════════════════════════════════════════════════════════════
//  LIVE CODE EDITOR
// ═══════════════════════════════════════════════════════════════
const codeEditor = document.getElementById('code-editor');
const codeOutput = document.getElementById('code-preview');
const langSelect = document.getElementById('code-lang');

let codeUpdateTimer;
codeEditor?.addEventListener('input', () => {
  codeContent = codeEditor.value;
  clearTimeout(codeUpdateTimer);
  codeUpdateTimer = setTimeout(() => {
    ws({ type: 'code_update', content: codeContent, language: codeLanguage });
  }, 200);
});

langSelect?.addEventListener('change', () => {
  codeLanguage = langSelect.value;
});

function renderCodeUpdate(data) {
  if (data.username === currentUser) return; // don't overwrite own typing
  if (codeEditor) codeEditor.value = data.content;
  codeContent = data.content;
  updateCodeLabel(data.username);
}

function updateCodeLabel(username) {
  const lbl = document.getElementById('code-editor-label');
  if (lbl) lbl.textContent = `✏️ ${username} edit kar raha hai...`;
  setTimeout(() => { if (lbl) lbl.textContent = '💻 Live Code Editor'; }, 2000);
}

document.getElementById('run-code-btn')?.addEventListener('click', () => {
  if (!codeEditor || !codeOutput) return;
  try {
    const result = new Function(codeEditor.value)();
    codeOutput.textContent = result !== undefined ? String(result) : '✅ Code chala (koi output nahi)';
  } catch (err) {
    codeOutput.textContent = `❌ Error: ${err.message}`;
  }
});

// ═══════════════════════════════════════════════════════════════
//  POLLS & VOTING
// ═══════════════════════════════════════════════════════════════
document.getElementById('create-poll-btn')?.addEventListener('click', () => {
  document.getElementById('poll-modal').style.display = 'flex';
});

document.getElementById('poll-cancel')?.addEventListener('click', () => {
  document.getElementById('poll-modal').style.display = 'none';
});

document.getElementById('poll-add-option')?.addEventListener('click', () => {
  const container = document.getElementById('poll-options-container');
  const input = document.createElement('input');
  input.type = 'text'; input.className = 'poll-option-input'; input.placeholder = 'Option...';
  container.appendChild(input);
});

document.getElementById('poll-submit')?.addEventListener('click', () => {
  const question = document.getElementById('poll-question').value.trim();
  const optEls = document.querySelectorAll('.poll-option-input');
  const options = [...optEls].map(el => el.value.trim()).filter(Boolean);
  if (!question || options.length < 2) {
    alert('Question aur kam se kam 2 options chahiye!'); return;
  }
  const poll_id = genId();
  ws({ type: 'poll_create', poll_id, question, options });
  document.getElementById('poll-modal').style.display = 'none';
  document.getElementById('poll-question').value = '';
  document.querySelectorAll('.poll-option-input').forEach((el, i) => { if (i > 0) el.remove(); else el.value = ''; });
});

function renderPoll(data) {
  polls[data.poll_id] = {
    question: data.question,
    options: data.options.map(o => ({ text: o, voters: [] })),
    created_by: data.created_by,
  };
  const div = document.createElement('div');
  div.className = 'poll-card';
  div.id = `poll-${data.poll_id}`;
  div.innerHTML = `
    <div class="poll-header">📊 <strong>${escHtml(data.question)}</strong> <span>— ${data.created_by}</span></div>
    <div class="poll-options" id="poll-opts-${data.poll_id}">
      ${data.options.map((opt, i) => `
        <button class="poll-opt-btn" onclick="vote('${data.poll_id}', ${i})">
          <span class="opt-text">${escHtml(opt)}</span>
          <span class="opt-bar" id="bar-${data.poll_id}-${i}" style="width:0%"></span>
          <span class="opt-count" id="cnt-${data.poll_id}-${i}">0 votes</span>
        </button>`).join('')}
    </div>`;
  chatLog.appendChild(div);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function vote(poll_id, option_index) {
  ws({ type: 'poll_vote', poll_id, option_index });
}

function renderPollVote(data) {
  const poll = polls[data.poll_id];
  if (!poll) return;
  // Remove previous vote by same user
  poll.options.forEach(opt => {
    opt.voters = opt.voters.filter(u => u !== data.username);
  });
  poll.options[data.option_index].voters.push(data.username);

  const total = poll.options.reduce((s, o) => s + o.voters.length, 0);
  poll.options.forEach((opt, i) => {
    const pct = total > 0 ? Math.round((opt.voters.length / total) * 100) : 0;
    const bar = document.getElementById(`bar-${data.poll_id}-${i}`);
    const cnt = document.getElementById(`cnt-${data.poll_id}-${i}`);
    if (bar) bar.style.width = `${pct}%`;
    if (cnt) cnt.textContent = `${opt.voters.length} (${pct}%)`;
  });
}

// ═══════════════════════════════════════════════════════════════
//  COLLABORATIVE NOTES
// ═══════════════════════════════════════════════════════════════
const notesArea = document.getElementById('notes-area');
let notesTimer;
notesArea?.addEventListener('input', () => {
  clearTimeout(notesTimer);
  notesTimer = setTimeout(() => {
    ws({ type: 'note_update', content: notesArea.value });
  }, 300);
});

function renderNotes(data) {
  if (data.username === currentUser) return;
  if (notesArea) notesArea.value = data.content;
}

// ═══════════════════════════════════════════════════════════════
//  TABS (Chat / Code / Notes / Polls)
// ═══════════════════════════════════════════════════════════════
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.style.display = 'none');
    btn.classList.add('active');
    const panel = document.getElementById(`panel-${btn.dataset.tab}`);
    if (panel) panel.style.display = 'flex';
  });
});

// ── Utilities ─────────────────────────────────────────────────
function escHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function throttle(fn, delay) {
  let last = 0;
  return (...args) => { const now = Date.now(); if (now - last >= delay) { last = now; fn(...args); } };
}
