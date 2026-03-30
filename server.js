const express  = require('express');
const http     = require('http');
const { Server } = require('socket.io');
const path     = require('path');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server);

// Serve all static game files
app.use(express.static(path.join(__dirname)));

// rooms[code] = { sockets: [hostSocket, guestSocket|null] }
const rooms = {};

function genCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

io.on('connection', socket => {
  console.log('Connexion:', socket.id);

  // Host creates a room
  socket.on('create-room', cb => {
    const code = genCode();
    rooms[code] = { sockets: [socket, null] };
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
    if (room.sockets[1])            { cb({ error: 'Room pleine' });      return; }
    room.sockets[1]  = socket;
    socket.roomCode  = key;
    socket.playerIdx = 1;
    socket.join(key);
    room.sockets[0].emit('guest-joined');
    cb({ ok: true });
    console.log(`Joueur 2 rejoint: ${key}`);
  });

  // Host broadcasts full state → relay to guest
  socket.on('game-state', state => {
    const code = socket.roomCode;
    if (code) socket.to(code).emit('game-state', state);
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
    socket.to(code).emit('opponent-disconnected');
    delete rooms[code];
    console.log(`Room ${code} fermée`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Ancients Arena en ligne : http://localhost:${PORT}`));
