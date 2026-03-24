// ============================================================
// STATISTICS  (localStorage-backed)
// ============================================================

const Stats = (() => {
  const KEY = 'arena_stats_v1';

  // Per-game accumulators (reset at game start)
  let _cur = {
    bans:    new Set(),          // heroIds banned this game
    picks:   {},                 // heroId → playerIdx
    damage:  {},                 // heroId → { phys, mag }
    heals:   {},                 // heroId → total heals
    shields: {},                 // heroId → total shields given
    items:   {},                 // heroId → Set of itemIds bought
    kda:     {},                 // heroId → { k, d, a }
  };

  // Persistent data
  let _data = { heroes: {}, items: {} };

  function _heroEntry(id) {
    if (!_data.heroes[id])
      _data.heroes[id] = { games: 0, wins: 0, bans: 0, picks: 0,
                           dmgPhys: 0, dmgMag: 0, heals: 0, shields: 0,
                           kills: 0, deaths: 0, assists: 0 };
    const h = _data.heroes[id];
    if (h.kills   === undefined) h.kills   = 0;
    if (h.deaths  === undefined) h.deaths  = 0;
    if (h.assists === undefined) h.assists = 0;
    return h;
  }

  function _itemEntry(id) {
    if (!_data.items[id]) _data.items[id] = { picks: 0, wins: 0 };
    return _data.items[id];
  }

  return {
    load() {
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) _data = JSON.parse(raw);
        if (!_data.heroes) _data.heroes = {};
        if (!_data.items)  _data.items  = {};
      } catch(e) { _data = { heroes: {}, items: {} }; }
    },

    save() {
      try { localStorage.setItem(KEY, JSON.stringify(_data)); } catch(e) {}
    },

    reset() {
      _data = { heroes: {}, items: {} };
      this.save();
    },

    resetGame() {
      _cur = { bans: new Set(), picks: {}, damage: {}, heals: {}, shields: {}, items: {}, kda: {} };
    },

    // ── In-game event hooks ───────────────────────────────────

    recordBan(heroId) {
      _cur.bans.add(heroId);
    },

    recordPick(heroId, playerIdx) {
      _cur.picks[heroId] = playerIdx;
    },

    recordItemBought(heroId, itemId) {
      if (!heroId || !itemId) return;
      if (!_cur.items[heroId]) _cur.items[heroId] = new Set();
      _cur.items[heroId].add(itemId);
    },

    addDamage(heroId, amount, dmgType) {
      if (!heroId || amount <= 0) return;
      if (!_cur.damage[heroId]) _cur.damage[heroId] = { phys: 0, mag: 0 };
      if (dmgType === 'physical') _cur.damage[heroId].phys += amount;
      else                        _cur.damage[heroId].mag  += amount;
    },

    addHeal(heroId, amount) {
      if (!heroId || amount <= 0) return;
      _cur.heals[heroId] = (_cur.heals[heroId] || 0) + amount;
    },

    addShield(heroId, amount) {
      if (!heroId || amount <= 0) return;
      _cur.shields[heroId] = (_cur.shields[heroId] || 0) + amount;
    },

    recordKDA(heroId, k, d, a) {
      _cur.kda[heroId] = { k, d, a };
    },

    // ── End of game ───────────────────────────────────────────

    recordGameEnd(winnerIdx, players) {
      // Bans
      _cur.bans.forEach(id => { _heroEntry(id).bans++; });

      // Picks → games / wins / damage / heals / shields / kda
      Object.entries(_cur.picks).forEach(([heroId, playerIdx]) => {
        const h   = _heroEntry(heroId);
        const won = winnerIdx !== null && winnerIdx === playerIdx;
        h.games++;
        h.picks++;
        if (won) h.wins++;
        if (_cur.damage[heroId])  { h.dmgPhys += _cur.damage[heroId].phys; h.dmgMag += _cur.damage[heroId].mag; }
        if (_cur.heals[heroId])   h.heals   += _cur.heals[heroId];
        if (_cur.shields[heroId]) h.shields += _cur.shields[heroId];
        if (_cur.kda[heroId])     { h.kills += _cur.kda[heroId].k; h.deaths += _cur.kda[heroId].d; h.assists += _cur.kda[heroId].a; }
      });

      // Items
      Object.entries(_cur.items).forEach(([heroId, itemSet]) => {
        const playerIdx = _cur.picks[heroId];
        if (playerIdx === undefined) return;
        const won = winnerIdx !== null && winnerIdx === playerIdx;
        itemSet.forEach(itemId => {
          const e = _itemEntry(itemId);
          e.picks++;
          if (won) e.wins++;
        });
      });

      this.save();
      this.resetGame();
    },

    // ── Accessors ─────────────────────────────────────────────

    getData() { return _data; },

    getTotalGames() {
      return Object.values(_data.heroes).reduce((m, h) => Math.max(m, h.games), 0);
    },
  };
})();

Stats.load();
Stats.resetGame();

// ============================================================
// MATCH HISTORY  (localStorage-backed, last 20 matches)
// ============================================================

const MatchHistory = (() => {
  const KEY  = 'arena_match_history_v1';
  const MAX  = 20;
  let _matches = [];

  return {
    load() {
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) _matches = JSON.parse(raw);
        if (!Array.isArray(_matches)) _matches = [];
      } catch(e) { _matches = []; }
    },
    save(match) {
      _matches.unshift(match);
      if (_matches.length > MAX) _matches = _matches.slice(0, MAX);
      try { localStorage.setItem(KEY, JSON.stringify(_matches)); } catch(e) {}
    },
    getAll() { return _matches; },
    clear() { _matches = []; try { localStorage.removeItem(KEY); } catch(e) {} },
  };
})();

MatchHistory.load();
