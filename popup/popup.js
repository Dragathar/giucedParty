/* giucedParty Popup Logic */
'use strict';

const $ = (id) => document.getElementById(id);

let currentPartyId = null;
let currentUserId = null;

// Load saved username
chrome.storage.local.get(['username'], (data) => {
  if (data.username) {
    $('username-input').value = data.username;
  }
});

// Check current party state
chrome.runtime.sendMessage({ action: 'get-party-state' }, (state) => {
  if (state && state.partyId) {
    currentPartyId = state.partyId;
    currentUserId = state.userId;
    showInPartyView(state);
  }
});

function showStatus(msg, isError = false) {
  const status = $('status');
  status.textContent = msg;
  status.className = 'status' + (isError ? ' error' : '');
  setTimeout(() => { status.textContent = ''; }, 3000);
}

function showInPartyView(state) {
  $('no-party').style.display = 'none';
  $('in-party').style.display = 'block';
  $('party-code-display').textContent = state.partyId;
}

function showNoPartyView() {
  $('no-party').style.display = 'block';
  $('in-party').style.display = 'none';
  currentPartyId = null;
}

// Save username
function saveUsername(name) {
  chrome.storage.local.set({ username: name });
}

// Create Party
$('create-btn').addEventListener('click', () => {
  const username = $('username-input').value.trim() || 'Guest' + Math.floor(Math.random() * 9999);
  saveUsername(username);
  $('create-btn').disabled = true;
  $('create-btn').textContent = 'Creating...';

  chrome.runtime.sendMessage({ action: 'create-party', username }, (res) => {
    $('create-btn').disabled = false;
    $('create-btn').textContent = '🎟️ Start Party';
    if (res && res.partyId) {
      currentPartyId = res.partyId;
      currentUserId = res.userId;
      showStatus('Party created! Share the code.');
      showInPartyView({ partyId: res.partyId });
      // Toggle sidebar on current tab
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'party-joined',
            partyId: res.partyId,
            userId: res.userId,
            username,
          });
        }
      });
    } else {
      showStatus('Failed to create party', true);
    }
  });
});

// Join Party
$('join-btn').addEventListener('click', () => {
  const partyId = $('party-id-input').value.trim();
  const username = $('username-input').value.trim() || 'Guest' + Math.floor(Math.random() * 9999);
  saveUsername(username);
  if (!partyId) {
    showStatus('Enter a party code', true);
    return;
  }

  $('join-btn').disabled = true;
  $('join-btn').textContent = 'Joining...';

  chrome.runtime.sendMessage({ action: 'join-party', partyId, username }, (res) => {
    $('join-btn').disabled = false;
    $('join-btn').textContent = '🔗 Join Party';
    if (res && res.partyId) {
      currentPartyId = res.partyId;
      currentUserId = res.userId;
      showStatus('Joined party!');
      showInPartyView({ partyId: res.partyId });
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'party-joined',
            partyId: res.partyId,
            userId: res.userId,
            username,
          });
        }
      });
    } else {
      showStatus('Failed to join party', true);
    }
  });
});

// Leave Party
$('leave-btn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'leave-party' }, () => {
    showNoPartyView();
    showStatus('Left party');
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'party-left' });
      }
    });
  });
});

// Copy party code
$('copy-code-btn').addEventListener('click', () => {
  const code = $('party-code-display').textContent;
  navigator.clipboard.writeText(code).then(() => {
    showStatus('Copied!');
  });
});

// Settings
$('set-server-btn').addEventListener('click', () => {
  const url = $('server-url-input').value.trim();
  chrome.runtime.sendMessage({ action: 'set-server', url }, (res) => {
    if (res && res.ok) {
      showStatus('Server updated: ' + res.server);
    }
  });
});

$('local-server-btn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'use-local-server' }, (res) => {
    if (res && res.ok) {
      showStatus('Using local server');
    }
  });
});
