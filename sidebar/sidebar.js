/* giucedParty Sidebar Logic */
'use strict';

const $ = (id) => document.getElementById(id);
const messagesEl = $('chat-messages');
const inputEl = $('chat-input');
const sendBtn = $('send-btn');
const participantsEl = $('participants-list');

let participants = [];

/* ---------- Message Handling ---------- */
function addChatMessage(msg) {
  const div = document.createElement('div');
  div.className = 'chat-msg' + (msg.own ? ' own' : '');
  const avatar = msg.avatarColor || '#666';
  div.innerHTML = `
    <div class="msg-header">
      <div class="msg-avatar" style="background:${avatar}"></div>
      <span class="msg-author" style="color:${avatar}">${escapeHtml(msg.username || 'Unknown')}</span>
    </div>
    <div class="msg-bubble">${escapeHtml(msg.text || '')}</div>
  `;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function addSystemMsg(text) {
  const div = document.createElement('div');
  div.className = 'system-msg';
  div.textContent = text;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function addSyncMsg(text) {
  const div = document.createElement('div');
  div.className = 'sync-msg';
  div.textContent = '▶ ' + text;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

/* ---------- Participants ---------- */
function updateParticipants(list) {
  participants = list || [];
  participantsEl.innerHTML = '';
  participants.forEach((p) => {
    const chip = document.createElement('div');
    chip.className = 'participant-chip';
    chip.innerHTML = `
      <span class="participant-dot" style="background:${p.avatarColor || '#666'}"></span>
      ${escapeHtml(p.username || 'Guest')}
    `;
    participantsEl.appendChild(chip);
  });
}

/* ---------- Send Chat ---------- */
function sendChat() {
  const text = inputEl.value.trim();
  if (!text) return;
  window.postMessage({ source: 'giucedparty-sidebar', type: 'chat', text }, '*');
  // Show own message immediately
  addChatMessage({ username: 'You', text, own: true, avatarColor: '#BB86FC' });
  inputEl.value = '';
}

sendBtn.addEventListener('click', sendChat);
inputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendChat();
  }
});

/* ---------- Close ---------- */
$('close-btn').addEventListener('click', () => {
  // Ask parent to hide sidebar
  window.postMessage({ source: 'giucedparty-sidebar', type: 'close-sidebar' }, '*');
});

/* ---------- Listen from Content Script ---------- */
window.addEventListener('message', (event) => {
  // Messages from content script (forwarded via postToSidebar)
  if (event.data && !event.data.source) {
    const msg = event.data;
    if (msg.type === 'chat') {
      addChatMessage(msg);
    } else if (msg.type === 'participant-joined') {
      addSystemMsg(`${msg.username || 'Someone'} joined the party 🎉`);
    } else if (msg.type === 'participant-left') {
      addSystemMsg(`${msg.username || 'Someone'} left the party 👋`);
    } else if (msg.type === 'participant-update') {
      // Update participant list
    } else if (msg.type === 'play') {
      addSyncMsg(`${msg.username} played at ${formatTime(msg.time)}`);
    } else if (msg.type === 'pause') {
      addSyncMsg(`${msg.username} paused at ${formatTime(msg.time)}`);
    } else if (msg.type === 'seek') {
      addSyncMsg(`${msg.username} jumped to ${formatTime(msg.time)}`);
    }
  }
});

/* ---------- Utils ---------- */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatTime(seconds) {
  if (typeof seconds !== 'number') return '?';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
