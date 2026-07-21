/* ===== giucedParty WebSocket Relay Server =====
 * Minimal relay server for party sync + chat.
 * Deploy: node server.js (or use Fly.io / Railway / Render)
 */

const WebSocket = require('ws');

const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });

// Party rooms: partyId -> Set<WebSocket>
const rooms = new Map();

// User metadata: WebSocket -> { partyId, userId, username, avatarColor }
const users = new Map();

console.log(`[giucedParty] Relay server running on port ${PORT}`);

wss.on('connection', (ws) => {
  console.log('[giucedParty] Client connected');

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    switch (msg.type) {
      case 'create': {
        const partyId = msg.partyId;
        const room = new Set();
        room.add(ws);
        rooms.set(partyId, room);
        users.set(ws, { partyId, userId: msg.userId, username: msg.username });
        ws.send(JSON.stringify({ type: 'created', partyId, userId: msg.userId }));
        console.log(`[giucedParty] Party created: ${partyId} by ${msg.username}`);
        break;
      }

      case 'join': {
        const partyId = msg.partyId;
        const room = rooms.get(partyId);
        if (!room) {
          // Auto-create room if it doesn't exist (for first joiner with code)
          const newRoom = new Set();
          newRoom.add(ws);
          rooms.set(partyId, newRoom);
          users.set(ws, { partyId, userId: msg.userId, username: msg.username });
          ws.send(JSON.stringify({ type: 'joined', partyId, userId: msg.userId }));
          // Notify others (none yet)
          break;
        }
        room.add(ws);
        users.set(ws, { partyId, userId: msg.userId, username: msg.username });
        ws.send(JSON.stringify({ type: 'joined', partyId, userId: msg.userId }));
        // Notify others
        broadcastToRoom(room, ws, {
          type: 'participant-joined',
          userId: msg.userId,
          username: msg.username,
          partyId,
        });
        console.log(`[giucedParty] ${msg.username} joined party ${partyId}`);
        break;
      }

      case 'rejoin': {
        const partyId = msg.partyId;
        const room = rooms.get(partyId);
        if (room) {
          room.add(ws);
          users.set(ws, { partyId, userId: msg.userId, username: msg.username });
          ws.send(JSON.stringify({ type: 'joined', partyId, userId: msg.userId }));
        }
        break;
      }

      case 'broadcast': {
        const userInfo = users.get(ws);
        if (!userInfo) return;
        const room = rooms.get(userInfo.partyId);
        if (!room) return;
        // Relay to all others in the room
        broadcastToRoom(room, ws, {
          ...msg,
          partyId: userInfo.partyId,
          userId: msg.userId || userInfo.userId,
          username: msg.username || userInfo.username,
        });
        break;
      }

      case 'leave': {
        removeFromRoom(ws);
        break;
      }
    }
  });

  ws.on('close', () => {
    removeFromRoom(ws);
    console.log('[giucedParty] Client disconnected');
  });

  ws.on('error', () => {
    removeFromRoom(ws);
  });
});

function broadcastToRoom(room, senderWs, msg) {
  const data = JSON.stringify(msg);
  for (const client of room) {
    if (client !== senderWs && client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}

function removeFromRoom(ws) {
  const userInfo = users.get(ws);
  if (!userInfo) return;
  const room = rooms.get(userInfo.partyId);
  if (room) {
    room.delete(ws);
    // Notify others
    broadcastToRoom(room, ws, {
      type: 'participant-left',
      userId: userInfo.userId,
      username: userInfo.username,
      partyId: userInfo.partyId,
    });
    // Clean up empty rooms
    if (room.size === 0) {
      rooms.delete(userInfo.partyId);
      console.log(`[giucedParty] Party ${userInfo.partyId} closed (empty)`);
    }
  }
  users.delete(ws);
}
