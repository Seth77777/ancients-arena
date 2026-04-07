const express  = require('express');
const http     = require('http');
const { Server } = require('socket.io');
const path     = require('path');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server);

// Serve all static game files
app.use(express.static(path.join(__dirname)));

// rooms[code] = { sockets: [hostSocket|null, guestSocket|null], reconnectTimers: [null, null], lastState: null }
const rooms = {};

function genCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

const RECONNECT_TIMEOUT_MS = 30000; // 30 secondes pour se reconnecter

io.on('connection', socket => {
  console.log('Connexion:', socket.id);

  // Host creates a room
  socket.on('create-room', cb => {
    const code = genCode();
    rooms[code] = { sockets: [socket, null], reconnectTimers: [null, null], lastState: null };
    socket.roomCode  = code;
    socket.playerIdx = 0;
    socket.join(code);
    cb({ code });
    console.log(`Room créée: ${code}`);
  });

  // Guest joins a room
  socket.on('join-room', (code, cb) => {
    const key  = code?.toUpperCase();
    const room = rooms[key];
    if (!room)                      { cb({ error: 'Room introuvable' }); return; }
    if (room.sockets[0] === socket) { cb({ error: 'Tu ne peux pas rejoindre ta propre partie.' }); return; }
    if (room.sockets[1] && room.sockets[1] !== null) { cb({ error: 'Room pleine' }); return; }
    room.sockets[1]  = socket;
    socket.roomCode  = key;
    socket.playerIdx = 1;
    socket.join(key);
    room.sockets[0].emit('guest-joined');
    cb({ ok: true });
    console.log(`Joueur 2 rejoint: ${key}`);
  });

  // Reconnexion à une room existante
  socket.on('reconnect-room', (code, playerIdx, cb) => {
    const key  = code?.toUpperCase();
    const room = rooms[key];
    if (!room) { cb({ error: 'Room introuvable ou expirée' }); return; }

    // Annuler le timer de déconnexion pour ce joueur
    if (room.reconnectTimers[playerIdx]) {
      clearTimeout(room.reconnectTimers[playerIdx]);
      room.reconnectTimers[playerIdx] = null;
    }

    // Remettre le socket dans la room
    room.sockets[playerIdx] = socket;
    socket.roomCode  = key;
    socket.playerIdx = playerIdx;
    socket.join(key);

    // Notifier l'adversaire
    const otherSocket = room.sockets[playerIdx === 0 ? 1 : 0];
    if (otherSocket) otherSocket.emit('opponent-reconnected');

    cb({ ok: true, lastState: room.lastState });
    console.log(`Joueur ${playerIdx} reconnecté à ${key}`);
  });

  // Host broadcasts full state → relay to guest + cache
  socket.on('game-state', state => {
    const code = socket.roomCode;
    if (!code || !rooms[code]) return;
    rooms[code].lastState = state;
    socket.to(code).emit('game-state', state);
  });

  // Guest sends action → relay to host
  socket.on('guest-action', action => {
    const code = socket.roomCode;
    if (!code || !rooms[code]) return;
    const host = rooms[code].sockets[0];
    if (host) host.emit('guest-action', action);
  });

  socket.on('disconnect', () => {
    const code = socket.roomCode;
    if (!code || !rooms[code]) return;
    const idx = socket.playerIdx;
    rooms[code].sockets[idx] = null;

    console.log(`Joueur ${idx} déconnecté de ${code} — attente ${RECONNECT_TIMEOUT_MS / 1000}s`);

    // Notifier l'adversaire qu'on est en train de se reconnecter
    socket.to(code).emit('opponent-reconnecting');

    // Laisser 30s pour se reconnecter avant de fermer la room
    rooms[code].reconnectTimers[idx] = setTimeout(() => {
      if (!rooms[code]) return;
      console.log(`Room ${code} fermée (joueur ${idx} non reconnecté)`);
      socket.to(code).emit('opponent-disconnected');
      delete rooms[code];
    }, RECONNECT_TIMEOUT_MS);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Ancients Arena en ligne : http://localhost:${PORT}`));
