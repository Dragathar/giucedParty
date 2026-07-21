/* ===== giucedParty Background Service Worker =====
 * Manages WebSocket connection to relay server, party state, messaging.
 */

const DEFAULT_SERVER = 'wss://giucedparty-server.fly.dev';
const LOCAL_SERVER = 'ws://localhost:8080';

let ws = null;
let partyId = null;
let userId = null;
let username = null;
let reconnectTimer = null;
let serverUrl = DEFAULT_SERVER;

/* ---------- WebSocket Management ---------- */
function connect() {
  if (ws && ws.readyState === WebSocket.OPEN) return;
  console.log('[giucedParty] Connecting to', serverUrl);
  ws = new WebSocket(serverUrl);

  ws.onopen = () => {
    console.log('[giucedParty] WebSocket connected');
    if (partyId) {
      ws.send(JSON.stringify({ type: 'rejoin', partyId, userId, username }));
    }
  };

  ws.onmessage = (event) => {
    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch {
      return;
    }

    if (msg.type === 'joined' || msg.type === 'created') {
      partyId = msg.partyId;
      userId = msg.userId;
      // Notify content script
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'party-joined',
            partyId,
            userId,
            username,
          });
        }
      });
    } else if (msg.type === 'party-message' || msg.type === 'chat' || msg.type === 'participant-joined' || msg.type === 'participant-left') {
      // Broadcast to content script
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'party-message',
            payload: msg,
          });
        }
      });
    }
  };

  ws.onclose = () => {
    console.log('[giucedParty] WebSocket closed, reconnecting in 5s...');
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connect, 5000);
  };

  ws.onerror = (err) => {
    console.error('[giucedParty] WebSocket error:', err);
  };
}

function send(msg) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  } else {
    console.warn('[giucedParty] Cannot send — WebSocket not open');
  }
}

/* ---------- Party Management ---------- */
function createParty(username) {
  const id = 'party-' + Math.random().toString(36).substring(2, 10);
  const uid = 'user-' + Math.random().toString(36).substring(2, 10);
  send({ type: 'create', partyId: id, userId: uid, username });
  return { partyId: id, userId: uid };
}

function joinParty(pid, uname) {
  const uid = 'user-' + Math.random().toString(36).substring(2, 10);
  send({ type: 'join', partyId: pid, userId: uid, username: uname });
  return { partyId: pid, userId: uid };
}

function leaveParty() {
  if (partyId) {
    send({ type: 'leave', partyId, userId });
  }
  partyId = null;
  userId = null;
}

/* ---------- Message Listener from Content Script / Popup ---------- */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'create-party':
      connect(); // ensure WS
      const result = createParty(message.username);
      sendResponse(result);
      break;

    case 'join-party':
      connect();
      const joined = joinParty(message.partyId, message.username);
      sendResponse(joined);
      break;

    case 'leave-party':
      leaveParty();
      sendResponse({ ok: true });
      break;

    case 'party-broadcast':
      // Relay sync events via WebSocket
      send({
        type: 'broadcast',
        ...message.payload,
      });
      sendResponse({ ok: true });
      break;

    case 'toggle-sidebar':
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'toggle-sidebar', show: message.show });
        }
      });
      sendResponse({ ok: true });
      break;

    case 'get-party-state':
      sendResponse({ partyId, userId, username });
      break;

    case 'set-server':
      serverUrl = message.url || DEFAULT_SERVER;
      if (ws) ws.close();
      connect();
      sendResponse({ ok: true, server: serverUrl });
      break;

    case 'use-local-server':
      serverUrl = LOCAL_SERVER;
      if (ws) ws.close();
      connect();
      sendResponse({ ok: true, server: serverUrl });
      break;
  }

  return true; // async response
});

/* ---------- Install / Startup ---------- */
chrome.runtime.onInstalled.addListener(() => {
  console.log('[giucedParty] Extension installed');
  chrome.storage.local.get(['serverUrl', 'username'], (data) => {
    if (data.serverUrl) serverUrl = data.serverUrl;
    if (data.username) username = data.username;
  });
});

// Connect on startup
connect();
