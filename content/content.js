/* ===== giucedParty Content Script =====
 * Detects <video> on supported platforms, syncs playback via background relay,
 * injects sidebar iframe, handles play/pause/seek broadcast.
 */

(function () {
  'use strict';

  let video = null;
  let sidebarFrame = null;
  let partyId = null;
  let userId = null;
  let username = 'Guest' + Math.floor(Math.random() * 9999);
  let avatarColor = randomColor();
  let isSyncing = false; // debounce loops
  let lastSyncTime = 0;

  /* ---------- Video Detection ---------- */
  function findVideo() {
    // Broad selector — works on YT, Netflix, Disney+, etc.
    const candidates = document.querySelectorAll('video');
    if (candidates.length > 0) {
      return candidates[0]; // first video element
    }
    return null;
  }

  function waitForVideo(cb, attempts = 0) {
    const v = findVideo();
    if (v) return cb(v);
    if (attempts > 60) return console.warn('[giucedParty] No video found after 60 attempts');
    setTimeout(() => waitForVideo(cb, attempts + 1), 500);
  }

  /* ---------- Sidebar Injection ---------- */
  function injectSidebar() {
    if (sidebarFrame) return;
    sidebarFrame = document.createElement('iframe');
    sidebarFrame.src = chrome.runtime.getURL('sidebar/sidebar.html');
    sidebarFrame.id = 'giucedparty-sidebar';
    sidebarFrame.style.cssText = `
      position: fixed;
      top: 0;
      right: 0;
      width: 340px;
      height: 100vh;
      border: none;
      z-index: 2147483647;
      display: none;
    `;
    document.body.appendChild(sidebarFrame);
  }

  function toggleSidebar(show) {
    if (!sidebarFrame) injectSidebar();
    sidebarFrame.style.display = show ? 'block' : 'none';
  }

  /* ---------- Sync Logic ---------- */
  function onPlay() {
    if (isSyncing) return;
    broadcast({ type: 'play', time: video.currentTime });
  }

  function onPause() {
    if (isSyncing) return;
    broadcast({ type: 'pause', time: video.currentTime });
  }

  function onSeek() {
    if (isSyncing) return;
    broadcast({ type: 'seek', time: video.currentTime });
  }

  function applySync(msg) {
    if (!video) return;
    isSyncing = true;
    switch (msg.type) {
      case 'play':
        if (Math.abs(video.currentTime - msg.time) > 1) {
          video.currentTime = msg.time;
        }
        video.play().catch(() => {});
        break;
      case 'pause':
        video.pause();
        if (Math.abs(video.currentTime - msg.time) > 1) {
          video.currentTime = msg.time;
        }
        break;
      case 'seek':
        if (Math.abs(video.currentTime - msg.time) > 0.5) {
          video.currentTime = msg.time;
        }
        break;
    }
    setTimeout(() => { isSyncing = false; }, 500);
  }

  /* ---------- Messaging ---------- */
  function broadcast(msg) {
    msg.userId = userId;
    msg.username = username;
    msg.partyId = partyId;
    msg.timestamp = Date.now();
    chrome.runtime.sendMessage({ action: 'party-broadcast', payload: msg });
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'party-message') {
      const msg = message.payload;
      if (msg.partyId !== partyId) return;
      if (msg.userId === userId) return; // skip own
      if (msg.type === 'play' || msg.type === 'pause' || msg.type === 'seek') {
        applySync(msg);
      } else if (msg.type === 'chat') {
        // Forward to sidebar
        postToSidebar(msg);
      } else if (msg.type === 'participant-joined' || msg.type === 'participant-left') {
        postToSidebar(msg);
      }
    } else if (message.action === 'toggle-sidebar') {
      toggleSidebar(message.show);
    } else if (message.action === 'party-joined') {
      partyId = message.partyId;
      userId = message.userId;
      username = message.username || username;
      injectSidebar();
      toggleSidebar(true);
    } else if (message.action === 'party-left') {
      toggleSidebar(false);
      partyId = null;
    }
    sendResponse({ ok: true });
  });

  function postToSidebar(msg) {
    if (sidebarFrame && sidebarFrame.contentWindow) {
      sidebarFrame.contentWindow.postMessage(msg, '*');
    }
  }

  // Listen for messages from sidebar iframe
  window.addEventListener('message', (event) => {
    if (!event.data || event.data.source !== 'giucedparty-sidebar') return;
    const msg = event.data;
    if (msg.type === 'chat') {
      broadcast({ type: 'chat', text: msg.text, avatarColor });
    } else if (msg.type === 'set-username') {
      username = msg.username;
      broadcast({ type: 'participant-update', username, avatarColor });
    }
  });

  /* ---------- Init ---------- */
  function init() {
    waitForVideo((v) => {
      video = v;
      // Attach listeners
      video.addEventListener('play', onPlay);
      video.addEventListener('pause', onPause);
      video.addEventListener('seeked', onSeek);

      console.log('[giucedParty] Video detected and listeners attached');

      // Check if we're on a party page (URL might have party ID)
      const urlParams = new URLSearchParams(window.location.hash);
      const hashPartyId = urlParams.get('giucedparty');
      if (hashPartyId) {
        chrome.runtime.sendMessage({ action: 'join-party', partyId: hashPartyId, username });
      }
    });
  }

  function randomColor() {
    const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#A8E6CF', '#C7CEEA', '#FFB6B6', '#B5EAD7', '#FF9F1C'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  // Start
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(init, 1000);
  } else {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 1000));
  }
})();
