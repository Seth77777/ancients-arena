#!/usr/bin/env node
// ============================================================
// EXPORT DES STATS APPRISES POUR LE NAVIGATEUR
//
// sim_localStorage.json (accumulé par sim/run.js, voir SIM_DIR) fait des dizaines de Mo — bien plus
// que le quota de localStorage d'un vrai navigateur (~5-10Mo par site). Ce script produit une
// version allégée, chargée par js/main.js au clic sur "Jouer vs Bot" pour que le bot heuristique
// affronté bénéficie de tout l'historique appris par la simulation continue, en :
//  1. Ne gardant, dans chaque table ventilée par contexte de matchup (heroItems/heroRunes/
//     heroDecisions/heroLocalOutcomes/heroRegret — voir js/stats.js _matchupBuckets), QUE les
//     buckets 'all' et '<archétype ennemi>|allyAny' — bot.js retombe déjà sur ces buckets quand le
//     plus précis ('combined', croisé avec l'archétype allié + la rune) est absent (même logique de
//     repli que côté écriture). Perd la précision la plus fine, garde le signal principal.
//  2. Excluant entièrement heroItemPairs (synergie objet+objet) et heroItemCounters (objet vs objet
//     adverse) — ~32Mo à eux deux même après (1), et bot.js les lit déjà avec repli à 0 si absentes
//     (_itemSynergyEV/_itemCounterEV) : aucun crash, juste un peu moins affiné sur ces deux axes.
//
// Usage : node sim/export_browser_stats.js
// Sortie : data/bot_stats_browser.json (committable normalement, pas besoin de Git LFS)
// ============================================================

const fs = require('fs');
const path = require('path');

const SIM_LS_FILE = 'D:\\AncientsArena-Simulations\\sim_localStorage.json';
const OUT_FILE = path.join(__dirname, '..', 'data', 'bot_stats_browser.json');

function isContextMap(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
  const keys = Object.keys(obj);
  if (!keys.length) return false;
  return keys.every(k => k === 'all' || /^vs(AP|AD|Mixed)\|/.test(k));
}
function trimContextMap(obj) {
  const out = {};
  for (const k of Object.keys(obj)) {
    if (k === 'all' || /^vs(AP|AD|Mixed)\|allyAny$/.test(k)) out[k] = obj[k];
  }
  return out;
}
function walk(node) {
  if (Array.isArray(node)) return node.map(walk);
  if (node && typeof node === 'object') {
    if (isContextMap(node)) return trimContextMap(node);
    const out = {};
    for (const k of Object.keys(node)) out[k] = walk(node[k]);
    return out;
  }
  return node;
}

const raw = JSON.parse(fs.readFileSync(SIM_LS_FILE, 'utf8'));
const stats = JSON.parse(raw.arena_stats_v1);

const trimmed = walk(stats);
trimmed.heroItemPairs = {};
trimmed.heroItemCounters = {};

const outStr = JSON.stringify(trimmed);
fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
fs.writeFileSync(OUT_FILE, JSON.stringify({ arena_stats_v1: outStr }));

console.log(`Écrit ${OUT_FILE} — ${(outStr.length / 1024 / 1024).toFixed(2)} Mo (source : ${(raw.arena_stats_v1.length / 1024 / 1024).toFixed(1)} Mo).`);
