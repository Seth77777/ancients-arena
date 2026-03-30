// ============================================================
// ONLINE MODE — gestionnaire de socket côté client
// ============================================================

window.OnlineMode = {
  socket:    null,
  playerIdx: null,
  roomCode:  null,
  isHost:    false,
  active:    false,

  connect(cb) {
    this.socket = io();
    this.socket.on('connect', cb);
    this._listen();
  },

  createRoom(cb) {
    this.socket.emit('create-room', res => {
      if (res.code) {
        this.roomCode  = res.code;
        this.playerIdx = 0;
        this.isHost    = true;
        this.active    = true;
      }
      cb(res);
    });
  },

  joinRoom(code, cb) {
    this.socket.emit('join-room', code, res => {
      if (res.ok) {
        this.roomCode  = code.toUpperCase();
        this.playerIdx = 1;
        this.isHost    = false;
        this.active    = true;
      }
      cb(res);
    });
  },

  sendState(state) {
    if (this.socket && this.active) this.socket.emit('game-state', state);
  },

  sendGuestAction(action) {
    if (this.socket && this.active) this.socket.emit('guest-action', action);
  },

  _listen() {
    this.socket.on('guest-joined', () =>
      document.dispatchEvent(new CustomEvent('online:guest-joined')));

    this.socket.on('game-state', state =>
      document.dispatchEvent(new CustomEvent('online:state', { detail: state })));

    this.socket.on('guest-action', action =>
      document.dispatchEvent(new CustomEvent('online:guest-action', { detail: action })));

    this.socket.on('opponent-disconnected', () =>
      document.dispatchEvent(new CustomEvent('online:disconnected')));
  }
};
