#!/usr/bin/env node
// ============================================================
// ENTRAÎNEMENT DU RÉSEAU DE VALEUR (js/nn.js) + ÉVALUATION EN TÊTE-À-TÊTE
//
// Boucle par ROUNDS, chacun :
//  1. Génère des parties FRAÎCHES jouées par le bot heuristique standard des deux côtés (comme
//     sim/run.js) — c'est la partie "garder un exemple de comment la base joue" : on ne touche
//     jamais à ce bot, on se contente d'observer ses parties pour construire les données
//     d'entraînement. À chaque tour de héros, l'état est encodé (encodeState) et mis de côté ;
//     une fois la partie terminée (hors égalités, ignorées comme partout ailleurs dans ce projet),
//     chaque état est étiqueté par le résultat final (1 si ce camp a gagné, 0 sinon) — cible de
//     type Monte-Carlo/TD(1), la plus simple qui existe pour apprendre une fonction de valeur.
//  2. Ajoute ces exemples à un jeu de données glissant (borné : les plus anciens sont écartés).
//  3. Entraîne le réseau sur ce jeu de données (mini-batches, plusieurs époques).
//  4. ÉVALUE : fait jouer le réseau tout juste entraîné (mouvement uniquement — voir
//     GameBot._decideMoveNeural dans js/bot.js, tout le reste inchangé) contre le bot heuristique
//     standard, en tête-à-tête, moitié de chaque côté. Le taux de victoire de cette évaluation,
//     round après round, EST la réponse concrète à "voit-on une amélioration dans le temps ?".
//
// Volontairement isolé de sim_localStorage.json (pas de lsFile, comme sim/tune.js) : ces parties
// d'entraînement ne doivent pas interférer avec la simulation continue en cours ni son propre
// apprentissage EV/regret.
//
// Usage : node sim/nn_train.js [rounds] [gamesParRound] [partiesEval]
// ============================================================

const fs = require('fs');
const path = require('path');
const { loadEngine, writeJsonAtomic } = require('./engine');

const SIM_DIR = 'D:\\AncientsArena-Simulations';
const WEIGHTS_FILE = path.join(SIM_DIR, 'nn_weights.json');
const DATASET_FILE = path.join(SIM_DIR, 'nn_dataset.json');
const LOG_FILE = path.join(SIM_DIR, 'nn_train_log.json');
// Fichier distinct de .stop_requested (simulation principale, voir sim/run.js) : les deux
// processus tournent indépendamment, arrêter l'un ne doit pas arrêter l'autre.
const STOP_FILE = path.join(SIM_DIR, '.nn_stop_requested');

// "continuous" = tourne indéfiniment jusqu'à STOP_FILE, vérifié ENTRE deux rounds (jamais en plein
// milieu) — même principe que sim/run.js pour la simulation principale.
const CONTINUOUS = process.argv[2] === 'continuous';
const ROUNDS = CONTINUOUS ? Infinity : Math.max(1, parseInt(process.argv[2], 10) || 10);
// Défauts abaissés (20 → 4/6) depuis que la génération de données est du vrai self-play (mouvement
// ET sorts ET achats des DEUX côtés, chacun cherchant par clonage — voir playAndCapture/evaluate) :
// mesuré ~300ms/tour de héros en moyenne (contre quasi instantané pour l'ancien bot heuristique
// pur), soit jusqu'à ~5 min pour une partie complète de 100 tours — un round à 20 parties/20 évals
// serait passé de quelques minutes à potentiellement plus d'une heure.
const GAMES_PER_ROUND = Math.max(2, parseInt(process.argv[3], 10) || 4);
const EVAL_GAMES = Math.max(2, Math.round((parseInt(process.argv[4], 10) || 6) / 2) * 2); // pair

const MAX_DATASET_SIZE = 50000; // ~50k exemples × ~141 floats — fichier JSON encore raisonnable
const EPOCHS_PER_ROUND = 15;
const BATCH_SIZE = 64;
const LEARNING_RATE = 0.05;
// Température de tirage softmax pendant l'auto-jeu (data ET éval-tête-à-tête EXCLUES, toujours en
// argmax pur — voir GameBot._neuralExploreTemp) : sans ça, les deux bots pilotés par EXACTEMENT le
// même réseau (self-play, voir playAndCapture ci-dessous) rejoueraient une partie quasi identique à
// chaque round, sans jamais explorer d'alternative meilleure que ce que le réseau croit déjà
// optimal — même risque de collapse que celui déjà rencontré côté objets avant l'ajout du
// regret/EV heuristique. Échelle volontairement petite : predict() sort une probabilité dans [0,1],
// pas un score heuristique étalé sur des dizaines de points — un point de départ, pas une valeur
// calibrée sur des données réelles (voir sim/tune.js pour ce genre de calibration).
const SELFPLAY_EXPLORE_TEMP = 0.15;

fs.mkdirSync(SIM_DIR, { recursive: true });
if (fs.existsSync(STOP_FILE)) fs.unlinkSync(STOP_FILE); // signal éventuel d'un lancement précédent

const engine = loadEngine({ instantBot: true, applyStyle: false });
const { GameState, GameBot, NeuralNet, encodeState, NN_INPUT_SIZE } = engine;
const NET_SHAPE = [NN_INPUT_SIZE, 48, 24, 1];

// Si des poids/données existants ont une dimension d'entrée différente (ex. après un changement de
// encodeState — voir js/nn.js, passé de 91 à 141 features en ajoutant la conscience de carte/zones/
// proximité), ils sont incompatibles avec le réseau/dataset courants : repartir proprement à zéro
// plutôt que planter au premier forward() (multiplication matricielle de tailles incompatibles) ou,
// pire, mélanger silencieusement des exemples à deux dimensions différentes dans le même dataset.
function loadNet() {
  try {
    const obj = JSON.parse(fs.readFileSync(WEIGHTS_FILE, 'utf8'));
    if (!obj.sizes || obj.sizes[0] !== NN_INPUT_SIZE) {
      console.log(`  poids existants incompatibles (entrée ${obj.sizes?.[0]} ≠ ${NN_INPUT_SIZE}) — réseau réinitialisé.`);
      return new NeuralNet(NET_SHAPE);
    }
    return NeuralNet.fromJSON(obj);
  } catch (e) {
    return new NeuralNet(NET_SHAPE);
  }
}

function loadDataset() {
  try {
    const ds = JSON.parse(fs.readFileSync(DATASET_FILE, 'utf8'));
    if (ds.length && ds[0].input.length !== NN_INPUT_SIZE) {
      console.log(`  jeu de données existant incompatible (entrée ${ds[0].input.length} ≠ ${NN_INPUT_SIZE}) — repart de zéro.`);
      return [];
    }
    return ds;
  } catch (e) { return []; }
}

function saveDataset(ds) {
  if (ds.length > MAX_DATASET_SIZE) ds.splice(0, ds.length - MAX_DATASET_SIZE);
  writeJsonAtomic(DATASET_FILE, ds);
}

function loadLog() {
  try { return JSON.parse(fs.readFileSync(LOG_FILE, 'utf8')); } catch (e) { return { rounds: [], totalGamesGenerated: 0 }; }
}

// ── AUTO-JEU : les DEUX côtés sont pilotés par le réseau en cours d'entraînement (mouvement +
// sorts + achats, voir GameBot._neuralNet dans bot.js) — pas le bot heuristique. C'est ce qui rend
// l'entraînement du round suivant réellement "self-play" : chaque round affronte la version de
// LUI-MÊME issue du round précédent (une cible mobile), pas un adversaire fixe qui ne changera
// jamais — contrairement à evaluate() plus bas, qui elle continue de mesurer le réseau contre le
// bot heuristique standard, inchangé, comme repère absolu de progression au fil des rounds.
// Température d'exploration active ICI (voir SELFPLAY_EXPLORE_TEMP) pour ne pas rejouer une partie
// quasi identique à chaque round ; capture (état, playerIdx) à chaque tour de héros, étiqueté par
// le résultat final une fois la partie terminée.
async function playAndCapture(net) {
  const game = new GameState();
  const bots = [new GameBot(game, () => {}, 0), new GameBot(game, () => {}, 1)];
  bots.forEach(b => { b._neuralNet = net; b._neuralExploreTemp = SELFPLAY_EXPLORE_TEMP; });
  const captured = [];

  let guard = 0;
  const GUARD_MAX = 20000;
  while (game.phase === 'draft') {
    if (++guard > GUARD_MAX) throw new Error('Draft bloqué');
    const pi = game.draftCurrentPlayer();
    if (pi < 0) break;
    bots[pi].decideDraft();
  }
  while (game.phase === 'playing') {
    if (++guard > GUARD_MAX) throw new Error('Partie bloquée');
    const hero = game.currentHero;
    if (!hero) break;
    captured.push({ input: encodeState(game, hero.playerIdx), playerIdx: hero.playerIdx });
    await bots[hero.playerIdx].executeTurn();
  }
  if (game.phase !== 'gameover') game.endGame(game.winner ?? null);
  game._stopTimer();

  if (game.winner === null) return { examples: [], turns: game.globalTurn, winner: null };
  const examples = captured.map(c => ({ input: c.input, target: c.playerIdx === game.winner ? 1 : 0 }));
  return { examples, turns: game.globalTurn, winner: game.winner };
}

// ── Tête-à-tête : le réseau juste entraîné pilote le MOUVEMENT du joueur 0, le joueur 1 reste le
// bot heuristique standard. Alterne les côtés sur la moitié des parties pour ne pas favoriser un
// siège (léger avantage structurel de position, même souci que sim/tune.js). ──
async function evaluate(net, nGames) {
  let neuralWins = 0, baselineWins = 0, draws = 0;
  const half = nGames / 2;
  for (let i = 0; i < nGames; i++) {
    const neuralIsP0 = i < half;
    const game = new GameState();
    const bots = [new GameBot(game, () => {}, 0), new GameBot(game, () => {}, 1)];
    bots[neuralIsP0 ? 0 : 1]._neuralNet = net;

    let guard = 0;
    while (game.phase === 'draft') {
      if (++guard > 20000) throw new Error('Draft bloqué');
      const pi = game.draftCurrentPlayer();
      if (pi < 0) break;
      bots[pi].decideDraft();
    }
    while (game.phase === 'playing') {
      if (++guard > 20000) throw new Error('Partie bloquée');
      const hero = game.currentHero;
      if (!hero) break;
      await bots[hero.playerIdx].executeTurn();
    }
    if (game.phase !== 'gameover') game.endGame(game.winner ?? null);
    game._stopTimer();

    if (game.winner === null) { draws++; continue; }
    const neuralWon = neuralIsP0 ? game.winner === 0 : game.winner === 1;
    if (neuralWon) neuralWins++; else baselineWins++;
  }
  return { neuralWins, baselineWins, draws };
}

function trainOnDataset(net, dataset) {
  if (!dataset.length) return null;
  let lastLoss = null;
  for (let epoch = 0; epoch < EPOCHS_PER_ROUND; epoch++) {
    const shuffled = [...dataset].sort(() => Math.random() - 0.5);
    for (let i = 0; i < shuffled.length; i += BATCH_SIZE) {
      net.trainStep(shuffled.slice(i, i + BATCH_SIZE), LEARNING_RATE, 0.9);
    }
  }
  // Perte finale sur un échantillon (pas tout le dataset, juste pour le log — coûteux sinon)
  const sample = dataset.slice(0, Math.min(500, dataset.length));
  let sum = 0;
  for (const { input, target } of sample) {
    const p = Math.min(0.9999, Math.max(0.0001, net.predict(input)));
    sum += -(target * Math.log(p) + (1 - target) * Math.log(1 - p));
  }
  lastLoss = sum / sample.length;
  return lastLoss;
}

(async () => {
  console.log(`Entraînement réseau de valeur : ${ROUNDS} round(s), ${GAMES_PER_ROUND} parties de données/round, ${EVAL_GAMES} parties d'évaluation/round.`);
  const net = loadNet();
  let dataset = loadDataset();
  const log = loadLog();
  console.log(`Reprise : ${dataset.length} exemples déjà en jeu de données, ${log.rounds.length} round(s) déjà loggé(s).\n`);

  for (let r = 0; r < ROUNDS; r++) {
    if (CONTINUOUS && fs.existsSync(STOP_FILE)) {
      fs.unlinkSync(STOP_FILE);
      console.log(`  pause demandée — arrêt après ${r} round(s).`);
      break;
    }
    const t0 = Date.now();

    // 1. Génération de données par SELF-PLAY (le réseau courant contre lui-même, voir
    // playAndCapture) — la cible que le round suivant devra battre a donc changé dès que
    // l'entraînement de CE round (étape 2) met net à jour, contrairement à un adversaire fixe.
    let newExamples = 0, drawsGen = 0;
    for (let i = 0; i < GAMES_PER_ROUND; i++) {
      const { examples, winner } = await playAndCapture(net);
      if (winner === null) { drawsGen++; continue; }
      dataset.push(...examples);
      newExamples += examples.length;
    }
    saveDataset(dataset);
    log.totalGamesGenerated = (log.totalGamesGenerated || 0) + GAMES_PER_ROUND;

    // 2. Entraînement
    const loss = trainOnDataset(net, dataset);

    // 3. Évaluation en tête-à-tête contre le bot standard
    const { neuralWins, baselineWins, draws } = await evaluate(net, EVAL_GAMES);

    // 4. Sauvegarde + log
    writeJsonAtomic(WEIGHTS_FILE, net.toJSON());
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    const entry = {
      round: log.rounds.length + 1,
      date: new Date().toISOString(),
      elapsedSec: Number(elapsed),
      datasetSize: dataset.length,
      newExamples, drawsInGeneration: drawsGen,
      trainLoss: loss !== null ? Math.round(loss * 1000) / 1000 : null,
      eval: { neuralWins, baselineWins, draws },
    };
    log.rounds.push(entry);
    if (log.rounds.length > 300) log.rounds.shift();
    writeJsonAtomic(LOG_FILE, log);

    const evalTotal = neuralWins + baselineWins;
    const winPct = evalTotal ? Math.round(100 * neuralWins / evalTotal) : 0;
    console.log(
      `Round ${entry.round} [${elapsed}s] dataset=${dataset.length} (+${newExamples}) loss=${entry.trainLoss} ` +
      `— éval réseau vs standard : ${neuralWins}-${baselineWins} (${draws} nulles) = ${winPct}% pour le réseau`
    );
  }

  console.log(`\nTerminé. Poids : ${WEIGHTS_FILE}\nJournal : ${LOG_FILE}`);
})().catch(err => {
  console.error('Erreur d\'entraînement :', err);
  process.exit(1);
});
