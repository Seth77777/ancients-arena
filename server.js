const express  = require('express');
const http     = require('http');
const { Server } = require('socket.io');
const path     = require('path');
const fs       = require('fs');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server);

app.use(express.json());

// Serve all static game files
app.use(express.static(path.join(__dirname)));

// ============================================================
// SIMULATIONS — liste des parties bot-vs-bot (js/sim/run.js) + retours sur des mouvements
// ============================================================

// Données de simulation stockées sur D: (pas sur le projet, sur C:) — des centaines/milliers
// de parties simulées représentent plusieurs Go, et C: est à l'étroit.
const SIM_DIR      = 'D:\\AncientsArena-Simulations';
const GAMES_DIR     = path.join(SIM_DIR, 'games');
const FLAGS_FILE    = path.join(SIM_DIR, 'feedback.json');

// Le détail d'une partie (fetch('/simulations/games/' + file) côté simulations.html) était
// servi jusqu'ici par le middleware static au-dessus, qui ne sert QUE le dossier du projet
// (C:) — cassé depuis que les replays vivent sur D: (voir SIM_DIR). Route dédiée à la place,
// avec basename() pour ne jamais sortir de GAMES_DIR quel que soit le nom de fichier reçu.
app.get('/simulations/games/:file', (req, res) => {
  const file = path.basename(req.params.file);
  const filePath = path.join(GAMES_DIR, file);
  if (!filePath.startsWith(GAMES_DIR) || !fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Partie introuvable' });
  }
  res.sendFile(filePath);
});

app.get('/api/simulations', (req, res) => {
  try {
    // Index léger tenu à jour par sim/run.js à chaque partie écrite (voir sim/run.js) : évite de
    // relire+parser les JSON complets de chaque partie (logs + snapshots) juste pour la liste.
    // Sur D: (disque dur, voir SIM_DIR ci-dessus) ce scan complet prenait ~50s pour ~650 parties.
    if (fs.existsSync(INDEX_FILE)) {
      const list = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'))
        .slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      return res.json(list);
    }
    if (!fs.existsSync(GAMES_DIR)) return res.json([]);
    const files = fs.readdirSync(GAMES_DIR).filter(f => f.endsWith('.json'));
    const list = files.map(f => {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(GAMES_DIR, f), 'utf8'));
        return {
          file: f, id: data.id, date: data.date,
          winner: data.winner, turns: data.turns, picks: data.picks,
        };
      } catch (e) { return null; }
    }).filter(Boolean).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/simulations/flags', (req, res) => {
  try {
    if (!fs.existsSync(FLAGS_FILE)) return res.json([]);
    res.json(JSON.parse(fs.readFileSync(FLAGS_FILE, 'utf8')));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/simulations/flag', (req, res) => {
  try {
    const { file, lineIndex, line, note } = req.body || {};
    if (!file || typeof lineIndex !== 'number' || !line) {
      return res.status(400).json({ error: 'file, lineIndex, line requis' });
    }
    let flags = [];
    try { flags = JSON.parse(fs.readFileSync(FLAGS_FILE, 'utf8')); } catch (e) { flags = []; }
    flags.unshift({ file, lineIndex, line, note: note || '', date: new Date().toISOString() });
    fs.mkdirSync(SIM_DIR, { recursive: true });
    fs.writeFileSync(FLAGS_FILE, JSON.stringify(flags, null, 2));
    res.json({ ok: true, count: flags.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Lancer une simulation depuis l'interface (node sim/run.js N, ou "continuous" pour le
// bouton Simuler/Pause — tourne jusqu'à l'appel de /run/stop, voir sim/run.js) ──
const { spawn } = require('child_process');
const STOP_FILE = path.join(SIM_DIR, '.stop_requested');
let simRun = { running: false, continuous: false, stopping: false, count: 0, done: 0, log: [], error: null, startedAt: null };

app.post('/api/simulations/run', (req, res) => {
  if (simRun.running) return res.status(409).json({ error: 'Une simulation est déjà en cours' });
  if (fs.existsSync(STOP_FILE)) { try { fs.unlinkSync(STOP_FILE); } catch (e) {} }

  const continuous = !!req.body?.continuous;
  const count = continuous ? null : Math.max(1, Math.min(500, parseInt(req.body?.count, 10) || 20));
  simRun = {
    running: true, continuous, stopping: false, count, done: 0,
    log: [], error: null, startedAt: new Date().toISOString(),
  };

  const child = spawn(process.execPath, [path.join(__dirname, 'sim', 'run.js'), continuous ? 'continuous' : String(count)], {
    cwd: __dirname,
  });

  const onChunk = (data) => {
    const text = data.toString();
    simRun.log.push(...text.split('\n').filter(Boolean));
    // "partie N/X — ..." (mode compté) ou "partie N — ..." (mode continu, voir sim/run.js)
    const matches = text.match(/partie \d+(?:\/\d+)?/g);
    if (matches) {
      const last = matches[matches.length - 1];
      simRun.done = parseInt(last.replace('partie ', '').split('/')[0], 10) || simRun.done;
    }
  };
  child.stdout.on('data', onChunk);
  child.stderr.on('data', onChunk);

  child.on('close', (code) => {
    simRun.running = false;
    simRun.stopping = false;
    if (code !== 0) simRun.error = `Le script s'est arrêté avec le code ${code}`;
  });
  child.on('error', (err) => {
    simRun.running = false;
    simRun.stopping = false;
    simRun.error = err.message;
  });

  res.json({ started: true, continuous, count });
});

// Pause propre du mode continu : pose un fichier signal que sim/run.js vérifie ENTRE deux
// parties (jamais en plein milieu — voir sim/run.js) et efface avant de s'arrêter de lui-même.
app.post('/api/simulations/run/stop', (req, res) => {
  if (!simRun.running || !simRun.continuous) return res.status(409).json({ error: 'Aucune simulation continue en cours' });
  fs.mkdirSync(SIM_DIR, { recursive: true });
  fs.writeFileSync(STOP_FILE, '1');
  simRun.stopping = true;
  res.json({ stopping: true });
});

app.get('/api/simulations/run/status', (req, res) => {
  res.json(simRun);
});

// Stats cumulées (winrate/dégâts/etc par héros, item, rune) accumulées par js/stats.js
// pendant les simulations (voir sim/run.js) — stockage séparé de la vraie partie du joueur.
const SIM_LS_FILE = path.join(SIM_DIR, 'sim_localStorage.json');
const META_FILE    = path.join(SIM_DIR, 'meta.json');
const INDEX_FILE   = path.join(SIM_DIR, 'index.json');
const EVOLUTION_FILE = path.join(SIM_DIR, 'evolution_log.json');

// Journal léger {date,turns,winner,picks} tenu par sim/run.js, fenêtre bien plus large que
// INDEX_FILE (voir MAX_EVOLUTION_ENTRIES côté sim/run.js) puisqu'il ne porte pas de replay complet
// à conserver — sert de source aux tendances de l'onglet "📈 Évolution" (simulations.html).
app.get('/api/simulations/evolution', (req, res) => {
  try {
    if (!fs.existsSync(EVOLUTION_FILE)) return res.json([]);
    res.json(JSON.parse(fs.readFileSync(EVOLUTION_FILE, 'utf8')));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/simulations/stats', (req, res) => {
  try {
    if (!fs.existsSync(SIM_LS_FILE)) return res.json({ heroes: {}, items: {}, runes: {}, heroItems: {}, heroRunes: {}, totalGames: 0 });
    const raw = JSON.parse(fs.readFileSync(SIM_LS_FILE, 'utf8'));
    const stats = raw.arena_stats_v1 ? JSON.parse(raw.arena_stats_v1) : { heroes: {}, items: {}, runes: {}, heroItems: {}, heroRunes: {} };
    let totalGames = 0;
    try { totalGames = JSON.parse(fs.readFileSync(META_FILE, 'utf8')).totalGames || 0; } catch (e) {}
    res.json({
      heroes: stats.heroes || {}, items: stats.items || {}, runes: stats.runes || {},
      heroItems: stats.heroItems || {}, heroRunes: stats.heroRunes || {}, totalGames,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Build recommandé pour un héros donné : réutilise le vrai scoring du bot (js/bot.js
// _scoreItemForHero), 100% EV historique (js/stats.js heroItems, aucune formule écrite à la
// main), sans dépendre d'une partie en cours ni d'un adversaire connu (vue "générale", pas
// matchup-spécifique).
const { loadEngine, STYLE_FILE, readStyleConfig, writeJsonAtomic, NN_ENABLED_FILE, readNnConfig } = require('./sim/engine');
let _heroBuildEngine = null;
function getHeroBuildEngine() {
  if (!_heroBuildEngine) _heroBuildEngine = loadEngine({ lsFile: SIM_LS_FILE });
  return _heroBuildEngine;
}

// Style de jeu (voir js/bot.js computeStyleParams + simulations.html) : lu/écrit ici, appliqué
// par sim/engine.js au chargement de tout nouveau process (sim/run.js continu ou ponctuel). Cette
// page ne lance pas de partie elle-même — son moteur mis en cache est juste réappliqué à chaque
// requête (coût négligeable) pour que le build recommandé reflète le style choisi sans redémarrage.
const DEFAULT_STYLE = { evVsExploration: 0.5, aggression: 0.5, forceRandomDraft: false };

app.get('/api/simulations/style', (req, res) => {
  res.json({ ...DEFAULT_STYLE, ...(readStyleConfig() || {}) });
});

app.post('/api/simulations/style', (req, res) => {
  const { evVsExploration, aggression, forceRandomDraft } = req.body || {};
  if (typeof evVsExploration !== 'number' || typeof aggression !== 'number' ||
      evVsExploration < 0 || evVsExploration > 1 || aggression < 0 || aggression > 1) {
    return res.status(400).json({ error: 'evVsExploration et aggression doivent être des nombres entre 0 et 1' });
  }
  const style = { evVsExploration, aggression, forceRandomDraft: !!forceRandomDraft };
  try {
    fs.mkdirSync(SIM_DIR, { recursive: true });
    writeJsonAtomic(STYLE_FILE, style);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
  res.json({ ok: true, style });
});

app.get('/api/simulations/hero/:typeId/build', (req, res) => {
  try {
    const engine = getHeroBuildEngine();
    engine.Stats.load(); // recharge depuis le disque : les stats évoluent entre deux requêtes
    const style = readStyleConfig();
    if (style) engine.setBotParams(engine.computeStyleParams(style));
    const { HERO_TYPES, EQUIPMENT, RUNES, GameBot } = engine;
    const hero = HERO_TYPES[req.params.typeId];
    if (!hero) return res.status(404).json({ error: 'Héros inconnu' });

    const bot = new GameBot(null, () => {});

    // Vue "meilleur EV à ce jour" : sélection séquentielle déterministe (meilleur score exact,
    // pas le tirage pondéré qu'utilise le bot en partie — voulu là-bas pour explorer/varier les
    // builds au fil des parties simulées, mais ici recliquer doit redonner la même réponse
    // stable), objet par objet comme _pickBuildTargets, pour que la synergie avec les objets déjà
    // choisis (voir _itemSynergyEV) compte aussi dans ce classement.
    const bootsId = bot._pickBootsDeterministic(hero, []);
    const itemIds = bot._pickBuildTargetsDeterministic(hero, []);
    const starterId = bot._pickStarterDeterministic(hero, []);

    const describeItem = (id, ownedContext = []) => {
      const it = EQUIPMENT[id];
      return it ? { id, name: it.name, icon: it.icon, score: Math.round(bot._scoreItemForHero(id, hero, [], ownedContext) * 10) / 10 } : null;
    };

    const statsData = engine.Stats.getData();
    // heroItems/heroRunes sont maintenant ventilés par contexte adverse (vsAP/vsAD/vsMixed/all) —
    // le récapitulatif affiché ici prend l'agrégat "all" (tous matchups confondus), le détail par
    // contexte n'est utilisé qu'en interne par le scoring du bot (voir _historicalItemStats).
    const heroItemHist = (statsData.heroItems && statsData.heroItems[req.params.typeId]) || {};
    const historicalItems = Object.entries(heroItemHist)
      .map(([id, ctxs]) => [id, ctxs && ctxs.all])
      .filter(([, e]) => e && e.picks > 0)
      .map(([id, e]) => {
        const it = EQUIPMENT[id];
        return { id, name: it ? it.name : id, icon: it ? it.icon : null, picks: e.picks, wins: e.wins, winrate: Math.round(100 * e.wins / e.picks) };
      })
      .sort((a, b) => b.winrate - a.winrate);

    // Tier list des runes pour CE héros : les 16 runes existent toutes, donc contrairement aux
    // objets (pool trop large pour être toutes listées) on peut les classer intégralement.
    const runeTierList = Object.keys(RUNES)
      .map(id => {
        const r = RUNES[id];
        return { id, name: r.name, icon: r.img || null, emoji: r.icon || null, score: Math.round(bot._scoreRuneForHero(r, hero) * 10) / 10 };
      })
      .sort((a, b) => b.score - a.score);

    const heroRuneHist = (statsData.heroRunes && statsData.heroRunes[req.params.typeId]) || {};
    const historicalRunes = Object.entries(heroRuneHist)
      .map(([id, ctxs]) => [id, ctxs && ctxs.all])
      .filter(([, e]) => e && e.picks > 0)
      .map(([id, e]) => {
        const r = RUNES[id];
        return { id, name: r ? r.name : id, icon: r ? (r.img || null) : null, picks: e.picks, wins: e.wins, winrate: Math.round(100 * e.wins / e.picks) };
      })
      .sort((a, b) => b.winrate - a.winrate);

    // Décisions génériques apprises (economyVsEngage, focusRole, engageDistance, comboFirstPick,
    // roamPriority, spellTiming:<sortId>, wolfPriority — voir js/bot.js _recordDecision/_decisionEV)
    // : EV combinée (partie entière + effet local, même formule que ce que le bot utilise
    // réellement en jeu — bot._decisionEV) par option, agrégat "all" tous matchups confondus (même
    // simplification que historicalItems/historicalRunes ci-dessus).
    const heroDecisionHist = (statsData.heroDecisions && statsData.heroDecisions[req.params.typeId]) || {};
    const heroRegretHist = (statsData.heroRegret && statsData.heroRegret[req.params.typeId]) || {};
    // bot._regretSum ne lit que le bucket de matchup EXACT (voir js/bot.js — comportement voulu en
    // jeu, où enemies/allies sont toujours connus) : ici, sans matchup réel (page générale), on
    // agrège plutôt TOUS les buckets accumulés pour rester informatif au lieu de toujours lire 0.
    const totalRegret = (key, optionId) => {
      const bucketMap = heroRegretHist[key] && heroRegretHist[key][optionId];
      if (!bucketMap) return 0;
      return Object.values(bucketMap).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
    };
    const decisions = Object.entries(heroDecisionHist)
      .map(([key, optionsMap]) => {
        const options = Object.entries(optionsMap)
          .map(([optionId, ctxs]) => {
            const e = ctxs && ctxs.all;
            if (!e || !e.picks) return null;
            return {
              optionId,
              picks: Math.round(e.picks),
              winrate: Math.round(100 * e.wins / e.picks),
              ev: Math.round(bot._decisionEV(hero, key, optionId, [], []) * 10) / 10,
              // Regret cumulé sur tous les contextes de matchup confondus (voir totalRegret
              // ci-dessus) : positif = cette option aurait dû être choisie plus souvent au vu des
              // instants réels où elle a été comparée aux autres.
              regret: Math.round(totalRegret(key, optionId) * 10) / 10,
            };
          })
          .filter(Boolean)
          .sort((a, b) => b.ev - a.ev);
        return { key, options };
      })
      .filter(d => d.options.length)
      .sort((a, b) => a.key.localeCompare(b.key));

    res.json({
      typeId: req.params.typeId,
      name: hero.name,
      roleId: hero.roleId,
      boots: describeItem(bootsId, []),
      starter: describeItem(starterId, []),
      // ownedContext = objets choisis AVANT celui-ci dans la séquence (voir _pickBuildTargetsDeterministic) —
      // reproduit le score exact qui a mené à ce choix, synergie comprise. Note : Array#map passe
      // (élément, index) au callback, donc pas de itemIds.map(describeItem) direct (index écraserait ownedContext).
      items: itemIds.map((id, i) => describeItem(id, itemIds.slice(0, i))).filter(Boolean),
      historicalItems,
      runeTierList,
      historicalRunes,
      decisions,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Réinitialise les parties + stats cumulées (utile après un changement de comportement du bot,
// pour ne pas mélanger des données d'avant/après dans le winrate). Ne touche pas à feedback.json.
app.post('/api/simulations/reset', (req, res) => {
  try {
    if (simRun.running) return res.status(409).json({ error: 'Une simulation est en cours' });
    if (fs.existsSync(GAMES_DIR)) {
      fs.readdirSync(GAMES_DIR).filter(f => f.endsWith('.json')).forEach(f => fs.unlinkSync(path.join(GAMES_DIR, f)));
    }
    if (fs.existsSync(SIM_LS_FILE)) fs.unlinkSync(SIM_LS_FILE);
    if (fs.existsSync(META_FILE)) fs.unlinkSync(META_FILE);
    if (fs.existsSync(INDEX_FILE)) fs.unlinkSync(INDEX_FILE);
    if (fs.existsSync(EVOLUTION_FILE)) fs.unlinkSync(EVOLUTION_FILE);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
// RÉSEAU DE VALEUR (js/nn.js + sim/nn_train.js) — même principe start/stop/status que la
// simulation principale ci-dessus (simRun/STOP_FILE), processus et fichiers totalement séparés :
// n'interfère ni avec sim_localStorage.json ni avec la simulation continue en cours.
// ============================================================
const NN_STOP_FILE = path.join(SIM_DIR, '.nn_stop_requested');
const NN_LOG_FILE = path.join(SIM_DIR, 'nn_train_log.json');
const NN_WEIGHTS_FILE = path.join(SIM_DIR, 'nn_weights.json');
let nnRun = { running: false, continuous: false, round: 0, log: [], error: null, startedAt: null };

app.post('/api/nn/train/run', (req, res) => {
  if (nnRun.running) return res.status(409).json({ error: 'Un entraînement est déjà en cours' });
  if (fs.existsSync(NN_STOP_FILE)) { try { fs.unlinkSync(NN_STOP_FILE); } catch (e) {} }

  const continuous = !!req.body?.continuous;
  const rounds = continuous ? null : Math.max(1, Math.min(200, parseInt(req.body?.rounds, 10) || 10));
  // Défauts abaissés (20 → 4/6) : la génération de données est maintenant du vrai self-play
  // (mouvement+sorts+achats des deux côtés cherchés par clonage, voir sim/nn_train.js) — mesuré
  // ~300ms/tour de héros en moyenne contre quasi instantané pour l'ancien bot heuristique pur ; un
  // round à 20/20 prendrait potentiellement plus d'une heure.
  const gamesPerRound = Math.max(2, Math.min(200, parseInt(req.body?.gamesPerRound, 10) || 2));
  const evalGames = Math.max(2, Math.min(200, parseInt(req.body?.evalGames, 10) || 6));
  nnRun = {
    running: true, continuous, stopping: false, round: 0,
    log: [], error: null, startedAt: new Date().toISOString(),
  };

  const child = spawn(process.execPath, [
    path.join(__dirname, 'sim', 'nn_train.js'),
    continuous ? 'continuous' : String(rounds), String(gamesPerRound), String(evalGames),
  ], { cwd: __dirname });

  const onChunk = (data) => {
    const text = data.toString();
    nnRun.log.push(...text.split('\n').filter(Boolean));
    const matches = text.match(/Round \d+/g);
    if (matches) nnRun.round = parseInt(matches[matches.length - 1].replace('Round ', ''), 10) || nnRun.round;
  };
  child.stdout.on('data', onChunk);
  child.stderr.on('data', onChunk);

  child.on('close', (code) => {
    nnRun.running = false;
    nnRun.stopping = false;
    if (code !== 0) nnRun.error = `Le script s'est arrêté avec le code ${code}`;
  });
  child.on('error', (err) => {
    nnRun.running = false;
    nnRun.stopping = false;
    nnRun.error = err.message;
  });

  res.json({ started: true, continuous, rounds, gamesPerRound, evalGames });
});

// Pause propre du mode continu : voir sim/nn_train.js, vérifié ENTRE deux rounds seulement.
app.post('/api/nn/train/stop', (req, res) => {
  if (!nnRun.running || !nnRun.continuous) return res.status(409).json({ error: 'Aucun entraînement continu en cours' });
  fs.mkdirSync(SIM_DIR, { recursive: true });
  fs.writeFileSync(NN_STOP_FILE, '1');
  nnRun.stopping = true;
  res.json({ stopping: true });
});

app.get('/api/nn/train/status', (req, res) => {
  res.json(nnRun);
});

// Poids entraînés (js/nn.js NeuralNet.toJSON()) — servis à part du middleware static du haut de ce
// fichier car nn_weights.json vit sur D: (voir SIM_DIR), pas dans le dossier du projet (C:). Utilisé
// par index.html/js/main.js pour charger le réseau côté navigateur quand on joue contre lui
// directement (voir la case "Faire jouer le bot par le réseau entraîné" du menu principal).
app.get('/api/nn/weights', (req, res) => {
  if (!fs.existsSync(NN_WEIGHTS_FILE)) return res.status(404).json({ error: 'Aucun poids entraîné pour le moment' });
  res.sendFile(NN_WEIGHTS_FILE);
});

// Historique round par round (dataset, perte, taux de victoire éval vs bot standard) — voir
// sim/nn_train.js recordGameEnd-équivalent, écrit sur disque après CHAQUE round (pas seulement à
// l'arrêt), donc lisible même pendant qu'un entraînement continu tourne.
app.get('/api/nn/train/log', (req, res) => {
  try {
    if (!fs.existsSync(NN_LOG_FILE)) return res.json({ rounds: [], totalGamesGenerated: 0 });
    res.json(JSON.parse(fs.readFileSync(NN_LOG_FILE, 'utf8')));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Bascule "faire jouer le réseau entraîné (nn_weights.json) en Joueur 2 dans la simulation
// continue" (voir sim/run.js simulateOneGame + sim/engine.js readNnConfig/loadTrainedNet) — c'est
// l'étape qui fait qu'un réseau entraîné finit par jouer de VRAIES parties (comptées dans les
// stats/l'évolution) au lieu de rester cantonné à son propre tête-à-tête d'évaluation isolé dans
// nn_train.js. Relu à chaque partie par sim/run.js, donc effectif immédiatement, même sur une
// simulation continue déjà en cours — pas besoin de la redémarrer.
app.get('/api/nn/config', (req, res) => {
  res.json({ enabled: !!(readNnConfig() || {}).enabled });
});

app.post('/api/nn/config', (req, res) => {
  const enabled = !!req.body?.enabled;
  try {
    fs.mkdirSync(SIM_DIR, { recursive: true });
    writeJsonAtomic(NN_ENABLED_FILE, { enabled });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
  res.json({ ok: true, enabled });
});

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
