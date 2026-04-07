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
    this.socket.on('connect', () => {
      // Reconnexion automatique si on était déjà dans une room
      if (this.active && this.roomCode !== null && this.playerIdx !== null) {
        this._doReconnect();
      } else {
        cb();
      }
    });
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

  _doReconnect() {
    this.socket.emit('reconnect-room', this.roomCode, this.playerIdx, res => {
      if (res.ok) {
        document.dispatchEvent(new CustomEvent('online:reconnected'));
        if (res.lastState) {
          document.dispatchEvent(new CustomEvent('online:state', { detail: res.lastState }));
        }
      } else {
        // Room expirée, la partie est perdue
        document.dispatchEvent(new CustomEvent('online:disconnected'));
      }
    });
  },

  _listen() {
    this.socket.on('disconnect', () => {
      if (this.active) {
        document.dispatchEvent(new CustomEvent('online:reconnecting'));
      }
    });

    this.socket.on('guest-joined', () =>
      document.dispatchEvent(new CustomEvent('online:guest-joined')));

    this.socket.on('game-state', state =>
      document.dispatchEvent(new CustomEvent('online:state', { detail: state })));

    this.socket.on('guest-action', action =>
      document.dispatchEvent(new CustomEvent('online:guest-action', { detail: action })));

    this.socket.on('opponent-reconnecting', () =>
      document.dispatchEvent(new CustomEvent('online:opponent-reconnecting')));

    this.socket.on('opponent-reconnected', () =>
      document.dispatchEvent(new CustomEvent('online:opponent-reconnected')));

    this.socket.on('opponent-disconnected', () =>
      document.dispatchEvent(new CustomEvent('online:disconnected')));
  }
};
