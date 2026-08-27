// ============================================================
// CHARGEUR PARTAGÉ DU MOTEUR DE JEU (Node, hors navigateur)
// Utilisé par sim/run.js (simulation bot-vs-bot) et server.js (endpoints
// qui ont besoin d'appeler la vraie logique du bot, ex. build recommandé
// par héros) — évite de dupliquer le bootstrap vm à deux endroits.
// ============================================================

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT  = path.join(__dirname, '..');
const JS_DIR = path.join(ROOT, 'js');

// Écriture atomique (fichier temporaire propre à ce process + rename) — jamais writeFileSync
// direct sur le fichier final : ça le tronque puis écrit, laissant une fenêtre où un lecteur
// concurrent (un autre "Simuler", un redémarrage serveur, une requête sur la page de build) tombe
// sur du JSON invalide, échoue silencieusement à le parser et repart sur des données VIDES au lieu
// de l'historique réel — pour sim_localStorage.json en particulier, ça veut dire une session
// entière de bot qui joue sans aucune EV apprise, tout en continuant d'écrire ses propres résultats.
// fs.renameSync peut échouer avec EPERM sur Windows si la cible est momentanément verrouillée
// (antivirus qui scanne le fichier fraîchement écrit, lecteur qui vient de l'ouvrir) — retente
// quelques fois avec un court délai plutôt que de faire planter toute la simulation pour un verrou
// transitoire qui se libère de lui-même en général sous la seconde.
function writeJsonAtomic(file, data) {
  const tmpFile = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(data));
  const MAX_ATTEMPTS = 6;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      fs.renameSync(tmpFile, file);
      return;
    } catch (e) {
      if (attempt === MAX_ATTEMPTS || !/EPERM|EBUSY/.test(e.code)) { try { fs.unlinkSync(tmpFile); } catch (e2) {} throw e; }
      const until = Date.now() + attempt * 50; // recul progressif : 50, 100, 150...ms
      while (Date.now() < until) { /* attente synchrone volontaire, écriture doit rester atomique */ }
    }
  }
}

// localStorage shim en mémoire, optionnellement adossé à un fichier disque
// (voir sim/run.js pour la persistance entre lancements du script).
//
// getItem relit le fichier à CHAQUE appel (pas juste au premier chargement) : server.js garde son
// moteur en cache pour toute la durée du process (voir getHeroBuildEngine) et appelle
// Stats.load() → localStorage.getItem(...) à chaque requête /api/simulations/hero/:typeId/build
// pour voir les données à jour — sans cette relecture, Stats.load() rappelait indéfiniment le
// même instantané figé au premier chargement du moteur, et la page de build recommandé ne
// reflétait plus jamais aucune partie simulée après coup (il fallait redémarrer le serveur).
// Coût négligeable : ce fichier ne fait que quelques Mo et n'est lu qu'à l'ouverture de la page,
// pas à chaque tour d'une simulation (sim/run.js n'appelle Stats.load() qu'une fois au démarrage).
function makeLocalStorageShim(lsFile) {
  let store = {};
  const reload = () => {
    if (!lsFile) return;
    try { store = JSON.parse(fs.readFileSync(lsFile, 'utf8')); } catch (e) { /* fichier absent/vide : garde le dernier état connu */ }
  };
  reload();
  const save = () => {
    if (!lsFile) return;
    fs.mkdirSync(path.dirname(lsFile), { recursive: true });
    writeJsonAtomic(lsFile, store);
  };
  return {
    getItem:    (k)    => { reload(); return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem:    (k, v) => { store[k] = String(v); save(); },
    removeItem: (k)    => { delete store[k]; save(); },
  };
}

// Style de jeu choisi depuis la page (voir simulations.html + POST /api/simulations/style) :
// {evVsExploration, aggression}, deux curseurs 0-1 traduits en constantes concrètes par
// js/bot.js computeStyleParams. Persisté sur D: pour survivre aux redémarrages serveur et être
// repris par tout nouveau process sim/run.js (continu ou ponctuel).
const STYLE_FILE = 'D:\\AncientsArena-Simulations\\bot_style.json';
function readStyleConfig() {
  try { return JSON.parse(fs.readFileSync(STYLE_FILE, 'utf8')); } catch (e) { return null; }
}

// Charge js/stats.js, runes.js, heroes.js, equipment.js, game.js, bot.js dans un contexte vm
// partagé (reproduit le chargement classique <script> du navigateur : les `const`/`class` de
// premier niveau d'un fichier restent visibles par les fichiers suivants) et renvoie les
// symboles utiles. Optionnellement, patche GameBot._delay pour jouer les tours instantanément
// (utile pour la simulation, pas pour un simple calcul de build hors-partie).
// applyStyle (true par défaut) : applique le style de jeu persisté (voir STYLE_FILE) via
// setBotParams. sim/tune.js le désactive explicitement — il compare des constantes brutes,
// influencer sa base de comparaison par un style choisi ailleurs fausserait la recherche.
function loadEngine({ lsFile = null, instantBot = false, applyStyle = true } = {}) {
  const sandbox = {
    window: {},
    localStorage: makeLocalStorageShim(lsFile),
    console,
    setTimeout, clearTimeout, setInterval, clearInterval,
  };
  vm.createContext(sandbox);

  const FILES = ['stats.js', 'runes.js', 'heroes.js', 'equipment.js', 'game.js', 'nn.js', 'bot.js'];
  for (const file of FILES) {
    const filePath = path.join(JS_DIR, file);
    vm.runInContext(fs.readFileSync(filePath, 'utf8'), sandbox, { filename: filePath });
  }

  vm.runInContext(
    'globalThis.__EXPORTS__ = { GameState, GameBot, HERO_TYPES, EQUIPMENT, RUNES, ZONES, WALL_SET, Stats, MatchHistory, ' +
    'BOT_DEFAULT_PARAMS, setBotParams, getBotParams, BOT_BOOT_IDS, computeStyleParams, NeuralNet, encodeState, NN_INPUT_SIZE };',
    sandbox, { filename: 'export-shim.js' }
  );
  const exp = sandbox.__EXPORTS__;

  if (instantBot) {
    exp.GameBot.prototype._delay = function () { return Promise.resolve(); };
  }

  if (applyStyle) {
    const style = readStyleConfig();
    if (style) exp.setBotParams(exp.computeStyleParams(style));
  }

  return exp;
}

// Joue une partie complète (draft + partie) jusqu'au bout avec deux jeux de paramètres bot
// potentiellement différents par joueur (paramsP0/paramsP1, null = défaut). Utilisé par
// sim/tune.js pour des comparaisons champion-vs-challenger en tête-à-tête. Version "légère" sans
// enregistrement de replay (contrairement à sim/run.js qui a ses propres besoins de traçabilité).
async function playOneGame(engine, paramsP0 = null, paramsP1 = null) {
  const { GameState, GameBot } = engine;
  const game = new GameState();
  const bots = [
    new GameBot(game, () => {}, 0, paramsP0),
    new GameBot(game, () => {}, 1, paramsP1),
  ];

  let guard = 0;
  const GUARD_MAX = 20000;

  while (game.phase === 'draft') {
    if (++guard > GUARD_MAX) throw new Error('Draft bloqué (garde-fou atteint)');
    const pi = game.draftCurrentPlayer();
    if (pi < 0) break;
    bots[pi].decideDraft();
  }

  while (game.phase === 'playing') {
    if (++guard > GUARD_MAX) throw new Error('Partie bloquée (garde-fou atteint)');
    const hero = game.currentHero;
    if (!hero) break;
    await bots[hero.playerIdx].executeTurn();
  }

  if (game.phase !== 'gameover') game.endGame(game.winner ?? null);
  game._stopTimer();

  return { winner: game.winner, turns: game.globalTurn };
}

// Bascule "faire jouer le réseau de valeur entraîné (voir sim/nn_train.js) en Joueur 2 dans la
// simulation continue" (voir simulations.html, onglet 🧠 Réseau) + poids sauvegardés par ce même
// entraînement. Fichiers distincts de STYLE_FILE : activer/désactiver le réseau n'a rien à voir
// avec le curseur exploration/agressivité du bot heuristique.
const NN_ENABLED_FILE = 'D:\\AncientsArena-Simulations\\nn_enabled.json';
const NN_WEIGHTS_FILE = 'D:\\AncientsArena-Simulations\\nn_weights.json';
function readNnConfig() {
  try { return JSON.parse(fs.readFileSync(NN_ENABLED_FILE, 'utf8')); } catch (e) { return null; }
}

// Relit nn_weights.json à CHAQUE appel (pas de cache) : un entraînement continu (sim/nn_train.js)
// réécrit ce fichier round après round pendant que la simulation continue tourne en parallèle —
// sans cette relecture, activer le réseau figerait ses poids à l'état du moment de l'activation
// au lieu de suivre l'apprentissage en cours. Renvoie null si aucun round n'a encore été entraîné.
function loadTrainedNet(engine) {
  try {
    const obj = JSON.parse(fs.readFileSync(NN_WEIGHTS_FILE, 'utf8'));
    return engine.NeuralNet.fromJSON(obj);
  } catch (e) {
    return null;
  }
}

module.exports = {
  loadEngine, playOneGame, writeJsonAtomic, STYLE_FILE, readStyleConfig,
  NN_ENABLED_FILE, readNnConfig, loadTrainedNet,
};
