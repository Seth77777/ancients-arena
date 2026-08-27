#!/usr/bin/env node
// ============================================================
// AUTO-RÉGLAGE DES CONSTANTES DU BOT PAR AUTO-JEU
// Fait évoluer BOT_DEFAULT_PARAMS (js/bot.js) par essai-erreur : à chaque génération, une
// variante ("challenger") d'un paramètre courant ("champion") est testée en tête-à-tête sur
// un lot de parties, moitié en Joueur 1 moitié en Joueur 2 (pour ne pas favoriser le second
// joueur, qui a un léger avantage structurel de position). Si le challenger gagne plus souvent,
// il devient le nouveau champion. Le résultat est écrit dans simulations/tuned_params.json —
// rien n'est appliqué automatiquement au jeu réel, c'est à toi de relire et d'adopter les
// valeurs qui te semblent bonnes dans js/bot.js.
//
// Usage : node sim/tune.js [générations] [partiesParGénération]
// ============================================================

const fs = require('fs');
const path = require('path');
const { loadEngine, playOneGame } = require('./engine');

const ROOT = path.join(__dirname, '..');
// Sur D:, pas sur le projet (C:) — voir server.js pour le détail (espace disque C: limité).
const SIM_DIR = 'D:\\AncientsArena-Simulations';
const TUNE_FILE = path.join(SIM_DIR, 'tuned_params.json');

const GENERATIONS = Math.max(1, parseInt(process.argv[2], 10) || 20);
const GAMES_PER_GEN = Math.max(2, Math.round((parseInt(process.argv[3], 10) || 20) / 2) * 2); // pair
const MUTATION_RATE = 0.3;   // amplitude de la mutation (±30% de la valeur d'origine)
const MAX_MUTATED_KEYS = 3;  // nb de paramètres modifiés simultanément par challenger

fs.mkdirSync(SIM_DIR, { recursive: true });

// pas de lsFile (le tuning n'a pas besoin de Stats) ; applyStyle:false — le tuning compare des
// constantes BRUTES les unes aux autres, un style choisi ailleurs (voir sim/engine.js) fausserait
// la base de comparaison.
const engine = loadEngine({ instantBot: true, applyStyle: false });
const PARAM_KEYS = Object.keys(engine.BOT_DEFAULT_PARAMS);

function loadState() {
  try {
    const s = JSON.parse(fs.readFileSync(TUNE_FILE, 'utf8'));
    if (s && s.params) return s;
  } catch (e) {}
  return { params: { ...engine.BOT_DEFAULT_PARAMS }, generation: 0, log: [] };
}

function saveState(state) {
  fs.writeFileSync(TUNE_FILE, JSON.stringify(state, null, 2));
}

function mutate(params) {
  const challenger = { ...params };
  const nKeys = 1 + Math.floor(Math.random() * MAX_MUTATED_KEYS);
  const shuffled = [...PARAM_KEYS].sort(() => Math.random() - 0.5);
  const keys = shuffled.slice(0, nKeys);

  for (const key of keys) {
    const old = challenger[key];
    const factor = 1 + (Math.random() * 2 - 1) * MUTATION_RATE;
    let next = old * factor;
    next = Number.isInteger(old) ? Math.round(next) : Math.round(next * 100) / 100;
    // Les compteurs de tour/rayon ne doivent pas tomber à 0 ou en dessous
    if (/turn|Radius|leash|Leash/i.test(key)) next = Math.max(1, next);
    challenger[key] = next;
  }

  return { challenger, mutatedKeys: keys };
}

async function evaluate(championParams, challengerParams, nGames) {
  let challengerWins = 0, championWins = 0, draws = 0;
  const half = nGames / 2;

  for (let i = 0; i < nGames; i++) {
    const challengerIsP0 = i < half; // moitié des parties de chaque côté
    const paramsP0 = challengerIsP0 ? challengerParams : championParams;
    const paramsP1 = challengerIsP0 ? championParams : challengerParams;

    let result;
    try {
      result = await playOneGame(engine, paramsP0, paramsP1);
    } catch (e) {
      continue; // partie ratée (garde-fou) : ignorée, ne compte pour personne
    }

    if (result.winner === null) { draws++; continue; }
    const challengerWon = challengerIsP0 ? result.winner === 0 : result.winner === 1;
    if (challengerWon) challengerWins++; else championWins++;
  }

  return { challengerWins, championWins, draws };
}

(async () => {
  const state = loadState();
  console.log(`Auto-réglage : ${GENERATIONS} génération(s), ${GAMES_PER_GEN} parties/génération (mutation ±${Math.round(MUTATION_RATE * 100)}%)`);
  console.log(`Reprise à la génération ${state.generation}.\n`);

  for (let g = 0; g < GENERATIONS; g++) {
    const { challenger, mutatedKeys } = mutate(state.params);
    const t0 = Date.now();
    const { challengerWins, championWins, draws } = await evaluate(state.params, challenger, GAMES_PER_GEN);
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

    const promoted = challengerWins > championWins;
    const mutSummary = mutatedKeys.map(k => `${k}: ${state.params[k]}→${challenger[k]}`).join(', ');

    console.log(
      `Gen ${state.generation + 1} [${elapsed}s] challenger ${challengerWins} — champion ${championWins}` +
      (draws ? ` (${draws} nulles)` : '') +
      ` — ${promoted ? '✅ PROMU' : '✗ rejeté'} — ${mutSummary}`
    );

    state.log.unshift({
      generation: state.generation + 1,
      mutatedKeys, promoted, challengerWins, championWins, draws,
      date: new Date().toISOString(),
    });
    if (state.log.length > 200) state.log.length = 200;

    if (promoted) state.params = challenger;
    state.generation++;
    saveState(state);
  }

  console.log(`\nTerminé. Paramètres actuels dans ${TUNE_FILE}`);
  console.log('Rien n\'est appliqué automatiquement — relis les valeurs et reporte-les dans BOT_DEFAULT_PARAMS (js/bot.js) si elles te semblent bonnes.');
})().catch(err => {
  console.error('Erreur de réglage :', err);
  process.exit(1);
});
