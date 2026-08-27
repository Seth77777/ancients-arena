#!/usr/bin/env node
// ============================================================
// SIMULATION HEADLESS BOT-VS-BOT
// Fait tourner le vrai moteur de jeu (js/game.js + js/bot.js) dans un
// contexte Node isolé, sans navigateur ni délais d'animation, pour
// jouer des parties bot-vs-bot très rapidement.
//
// Usage : node sim/run.js [nombreDeParties]
// ============================================================

const fs = require('fs');
const path = require('path');
const { loadEngine, writeJsonAtomic, readNnConfig, loadTrainedNet } = require('./engine');

const ROOT       = path.join(__dirname, '..');
// Sur D:, pas sur le projet (C:) — voir server.js pour le détail (espace disque C: limité).
const SIM_DIR     = 'D:\\AncientsArena-Simulations';
const GAMES_DIR   = path.join(SIM_DIR, 'games');
const LS_FILE     = path.join(SIM_DIR, 'sim_localStorage.json');
const META_FILE   = path.join(SIM_DIR, 'meta.json');
const INDEX_FILE  = path.join(SIM_DIR, 'index.json');
const EVOLUTION_FILE = path.join(SIM_DIR, 'evolution_log.json');

// Index léger {file,id,date,winner,turns,picks} par partie, tenu à jour en même temps que les
// fichiers de partie. Sert à /api/simulations côté serveur pour éviter de relire+parser TOUS les
// JSON de parties (logs + snapshots complets, potentiellement gros) juste pour afficher la liste —
// coût déjà négligeable sur C: (SSD), mais D: (disque dur, voir SIM_DIR) rend ce genre de scan à
// beaucoup de petits fichiers nettement plus lent.
let _gameIndex = [];
try { _gameIndex = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8')); } catch (e) { _gameIndex = []; }

// writeJsonAtomic (écriture atomique + retry EPERM/EBUSY Windows) vient de sim/engine.js — même
// fonction que pour sim_localStorage.json, appliquée ici aussi par précaution (voir son commentaire).

// Ne garde que les MAX_KEPT_GAMES replays complets les plus récents (logs + snapshots — le gros
// de l'espace disque). Les stats cumulées (Stats.recordGameEnd → sim_localStorage.json, voir
// js/stats.js) ne dépendent PAS des fichiers de partie : elles s'incrémentent au moment où la
// partie se joue et ne sont jamais recalculées depuis les replays. Supprimer un vieux replay
// n'efface donc aucun apprentissage — seul le detail rejouable de cette partie précise disparaît.
// La confiance de l'EV appris (voir _scoreItemForHero/_decisionEV dans bot.js) grandit avec le
// nombre total de parties jouées, pas avec le nombre de replays conservés sur disque.
const MAX_KEPT_GAMES = 100;

function appendToIndex(entry) {
  _gameIndex.push(entry);
  if (_gameIndex.length > MAX_KEPT_GAMES) {
    _gameIndex.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const toRemove = _gameIndex.splice(0, _gameIndex.length - MAX_KEPT_GAMES);
    for (const old of toRemove) {
      try { fs.unlinkSync(path.join(GAMES_DIR, old.file)); } catch (e) {}
    }
  }
  writeJsonAtomic(INDEX_FILE, _gameIndex);
}

// Journal léger séparé de l'index ci-dessus : {date,turns,winner,picks} SANS `file`/`id`, donc pas
// lié aux replays complets (voir MAX_KEPT_GAMES) — peut couvrir une fenêtre bien plus large
// (MAX_EVOLUTION_ENTRIES) pour les tendances de l'onglet "📈 Évolution" (simulations.html) sans
// avoir à conserver des centaines de replays complets (logs+snapshots, le gros de l'espace disque)
// juste pour ça. Coût négligeable : ~1000 entrées ≈ quelques centaines de Ko.
const MAX_EVOLUTION_ENTRIES = 1000;
let _evolutionLog = [];
try { _evolutionLog = JSON.parse(fs.readFileSync(EVOLUTION_FILE, 'utf8')); } catch (e) { _evolutionLog = []; }

function appendToEvolutionLog(entry) {
  _evolutionLog.push(entry);
  if (_evolutionLog.length > MAX_EVOLUTION_ENTRIES) {
    _evolutionLog.splice(0, _evolutionLog.length - MAX_EVOLUTION_ENTRIES);
  }
  writeJsonAtomic(EVOLUTION_FILE, _evolutionLog);
}

// Compteur fiable du nombre total de parties simulées, indépendant de tout héros en particulier —
// inférer ce total depuis les stats par héros (max des `games`) sous-estime dès qu'un héros donné
// n'apparaît pas dans 100% des parties, ce qui faussait les taux de pick/ban (parfois >100%).
function bumpTotalGamesCounter() {
  let meta = { totalGames: 0 };
  try { meta = JSON.parse(fs.readFileSync(META_FILE, 'utf8')); } catch (e) {}
  meta.totalGames = (meta.totalGames || 0) + 1;
  fs.mkdirSync(SIM_DIR, { recursive: true });
  writeJsonAtomic(META_FILE, meta);
}

// "continuous" = tourne indéfiniment jusqu'à ce que le fichier STOP_FILE apparaisse (voir la
// boucle plus bas). Utilisé par le bouton "Simuler"/"Pause" de simulations.html — server.js pose
// le fichier au clic sur pause, ce script le voit et s'arrête proprement ENTRE deux parties
// (jamais en plein milieu, pour ne jamais laisser un fichier de partie tronqué sur disque).
const CONTINUOUS = process.argv[2] === 'continuous';
const N = CONTINUOUS ? Infinity : Math.max(1, parseInt(process.argv[2], 10) || 1);
const STOP_FILE = path.join(SIM_DIR, '.stop_requested');
if (fs.existsSync(STOP_FILE)) fs.unlinkSync(STOP_FILE); // signal éventuel d'un lancement précédent

fs.mkdirSync(GAMES_DIR, { recursive: true });

// Charge le moteur (js/stats.js → bot.js) dans un contexte Node isolé, avec le localStorage
// adossé à un fichier disque pour que Stats/MatchHistory accumulent entre les lancements du
// script, et les délais d'animation du bot supprimés (parties instantanées).
const engine = loadEngine({ lsFile: LS_FILE, instantBot: true });
const { GameState, GameBot } = engine;

// game.log est un buffer circulaire plafonné à 200 lignes (voir js/game.js addLog) — un choix
// raisonnable pour l'UI en direct, mais qui tronque silencieusement le début de toute partie simulée
// de plus de 200 lignes si on le lit seulement à la fin. On capte donc chaque ligne au fil de l'eau
// dans un tableau séparé et illimité, sans toucher au comportement du jeu en direct.
const _originalAddLog = GameState.prototype.addLog;
GameState.prototype.addLog = function (msg) {
  if (!this._fullLog) this._fullLog = [];
  this._fullLog.push(msg);
  return _originalAddLog.call(this, msg);
};

// ── Simulation d'une partie complète (draft + partie) ──
async function simulateOneGame(gameId) {
  const game = new GameState();
  const bots = [
    new GameBot(game, () => {}, 0),
    new GameBot(game, () => {}, 1),
  ];

  // Relu à chaque partie (pas juste au démarrage du script) : voir readNnConfig/loadTrainedNet
  // dans sim/engine.js — permet d'activer/désactiver le réseau, ou de profiter de poids fraîchement
  // entraînés par sim/nn_train.js, sans avoir à redémarrer la simulation continue. Toujours le
  // Joueur 2 (jamais les deux côtés) pour garder un adversaire de référence stable — même principe
  // que le tête-à-tête d'évaluation dans sim/nn_train.js.
  const nnConfig = readNnConfig();
  let neuralSide = null;
  if (nnConfig && nnConfig.enabled) {
    const net = loadTrainedNet(engine);
    if (net) { bots[1]._neuralNet = net; neuralSide = 1; }
  }

  let guard = 0;
  const GUARD_MAX = 20000; // garde-fou : ne devrait jamais être atteint (MAX_TURNS force endGame)

  while (game.phase === 'draft') {
    if (++guard > GUARD_MAX) throw new Error('Draft bloqué (garde-fou atteint)');
    const pi = game.draftCurrentPlayer();
    if (pi < 0) break;
    bots[pi].decideDraft();
  }

  // Une snapshot par tour de héros : positions/PV de tout le monde après ce tour,
  // avec l'index de fin dans le journal complet pour resynchroniser replay texte ↔ plateau visuel.
  const snapshots = [];

  while (game.phase === 'playing') {
    if (++guard > GUARD_MAX) throw new Error('Partie bloquée (garde-fou atteint)');
    const hero = game.currentHero;
    if (!hero) break;
    const actingHero = { id: hero.instanceId, name: hero.name, playerIdx: hero.playerIdx, roleId: hero.roleId };
    await bots[hero.playerIdx].executeTurn();
    snapshots.push({
      globalTurn: game.globalTurn,
      actingHero,
      logEndIndex: (game._fullLog || game.log).length,
      positions: [...game.players[0].heroes, ...game.players[1].heroes].filter(Boolean).map(h => ({
        id: h.instanceId, name: h.name, playerIdx: h.playerIdx, roleId: h.roleId,
        x: h.position ? h.position.x : null, y: h.position ? h.position.y : null,
        hp: h.currentHP, maxHp: h.maxHP, alive: h.isAlive,
      })),
      // Or du Roam : taches générées aléatoirement sur la carte, pas une zone fixe — se déplacent/
      // regénèrent au fil de la partie, donc capturées par snapshot comme les héros plutôt que
      // dessinées comme un décor statique du plateau.
      brownSpots: (game.brownSpots || []).map(s => ({ x: s.x, y: s.y })),
      // Loups de Noyala : unité mobile invoquée/déplacée en cours de partie (voir js/bot.js
      // _decideWolfMoves), pas un décor statique — même traitement que brownSpots.
      wolves: (game.noyalaWolves || []).map(w => ({
        id: w.id, x: w.x, y: w.y, hp: w.hp, maxHp: w.maxHp, playerIdx: w.playerIdx,
      })),
    });
  }

  if (game.phase !== 'gameover') game.endGame(game.winner ?? null);
  game._stopTimer();

  return {
    id: gameId,
    date: new Date().toISOString(),
    winner: game.winner,
    turns: game.globalTurn,
    neuralSide,
    bans: [...game.draft.banned],
    picks: game.draft.picks,
    log: game._fullLog || game.log,
    snapshots,
    heroes: game.players.map((p, pi) => ({
      playerIdx: pi,
      heroes: p.heroes.filter(Boolean).map(h => ({
        id: h.id, name: h.name, roleId: h.roleId,
        kills: h.kills || 0, deaths: h.deaths || 0, assists: h.assists || 0,
        items: [...h.items],
        runeId: h.runeId || null,
        totalGold: h.totalGoldEarned || h.gold,
      })),
    })),
  };
}

(async () => {
  console.log(CONTINUOUS ? 'Simulation continue (jusqu\'à pause)...' : `Simulation de ${N} partie(s) bot-vs-bot...`);
  const results = [];
  const t0 = Date.now();

  for (let i = 0; i < N; i++) {
    if (CONTINUOUS && fs.existsSync(STOP_FILE)) {
      fs.unlinkSync(STOP_FILE);
      console.log(`  pause demandée — arrêt après ${i} partie(s).`);
      break;
    }
    const gameId = `${Date.now()}_${i}`;
    let result;
    try {
      result = await simulateOneGame(gameId);
    } catch (err) {
      console.error(`  partie ${i + 1}${CONTINUOUS ? '' : '/' + N} — échec : ${err.message}`);
      continue;
    }
    results.push(result);
    const fileName = `${gameId}.json`;
    fs.writeFileSync(path.join(GAMES_DIR, fileName), JSON.stringify(result, null, 2));
    appendToIndex({
      file: fileName, id: result.id, date: result.date,
      winner: result.winner, turns: result.turns, picks: result.picks, neuralSide: result.neuralSide,
    });
    appendToEvolutionLog({
      date: result.date, winner: result.winner, turns: result.turns, picks: result.picks, neuralSide: result.neuralSide,
    });
    // Les égalités sont exclues des stats (Stats.recordGameEnd, voir js/stats.js) — le compteur
    // qui sert de dénominateur aux taux de pick/ban doit suivre la même règle, sinon ces taux se
    // retrouvent divisés par un total plus grand que le nombre de parties réellement comptées.
    if (result.winner !== null) bumpTotalGamesCounter();
    const winnerLabel = result.winner === null ? 'égalité' : `Joueur ${result.winner + 1}`;
    console.log(`  partie ${i + 1}${CONTINUOUS ? '' : '/' + N} — vainqueur : ${winnerLabel} (${result.turns} tours)`);
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  if (results.length === 0) {
    console.log('\nAucune partie simulée avec succès.');
    process.exit(1);
  }
  const p0Wins = results.filter(r => r.winner === 0).length;
  const p1Wins = results.filter(r => r.winner === 1).length;
  const draws  = results.length - p0Wins - p1Wins;
  const avgTurns = (results.reduce((s, r) => s + r.turns, 0) / results.length).toFixed(1);

  console.log(`\n${results.length} partie(s) simulée(s) en ${elapsed}s.`);
  console.log(`Joueur 1 : ${p0Wins} victoire(s) (${(100 * p0Wins / results.length).toFixed(0)}%)`);
  console.log(`Joueur 2 : ${p1Wins} victoire(s) (${(100 * p1Wins / results.length).toFixed(0)}%)`);
  if (draws) console.log(`Égalités : ${draws}`);
  console.log(`Durée moyenne : ${avgTurns} tours`);
  console.log(`\nParties détaillées : ${GAMES_DIR}`);
  console.log(`Stats cumulées (héros/runes/items) : ${LS_FILE}`);

  process.exit(0);
})().catch(err => {
  console.error('Erreur de simulation :', err);
  process.exit(1);
});
