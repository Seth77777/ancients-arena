// ============================================================
// RÉSEAU DE NEURONES MINIMAL (fait main, sans dépendance) + ENCODAGE D'ÉTAT
//
// Pas de TensorFlow ni équivalent : ce projet n'a aucune dépendance externe, et les bindings
// natifs (@tensorflow/tfjs-node) sont notoirement pénibles à installer sur Windows sans outils de
// compilation. Un petit MLP (~91→32→16→1) est largement assez simple pour une rétropropagation
// manuelle correcte — voir NeuralNet.trainStep.
//
// Usage prévu : encodeState(game, playerIdx) → vecteur fixe (perspective "mon équipe d'abord"),
// NeuralNet.predict(vecteur) → probabilité de victoire estimée pour cette équipe. Entraîné par
// régression supervisée sur des parties déjà jouées par le bot heuristique existant (voir
// sim/nn_train.js) — PAS du self-play RL complet (voir la discussion avec l'utilisateur : hors de
// portée sans calcul massif). C'est un premier échelon réel : une fonction de valeur apprise,
// utilisable ensuite pour choisir parmi les actions RÉELLEMENT légales du moteur (voir
// GameBot._decideMoveNeural dans bot.js) plutôt que parmi les candidats qu'une heuristique
// pré-filtre.
// ============================================================

class NeuralNet {
  constructor(sizes, weights = null) {
    this.sizes = sizes; // [entrée, cachée1, ..., sortie]
    if (weights) {
      this.W = weights.W.map(w => w.map(row => row.slice()));
      this.b = weights.b.map(row => row.slice());
    } else {
      this.W = [];
      this.b = [];
      for (let l = 0; l < sizes.length - 1; l++) {
        const fanIn = sizes[l], fanOut = sizes[l + 1];
        // Init He (adaptée ReLU) : variance 2/fanIn plutôt qu'un intervalle fixe, évite les
        // gradients qui explosent/s'effondrent dès les premières couches.
        const scale = Math.sqrt(2 / fanIn);
        const w = [];
        for (let j = 0; j < fanOut; j++) {
          const row = new Array(fanIn);
          for (let i = 0; i < fanIn; i++) row[i] = (Math.random() * 2 - 1) * scale;
          w.push(row);
        }
        this.W.push(w);
        this.b.push(new Array(fanOut).fill(0));
      }
    }
  }

  static relu(x) { return x > 0 ? x : 0; }
  static sigmoid(x) { return 1 / (1 + Math.exp(-x)); }

  // Renvoie aussi les activations intermédiaires (nécessaires à trainStep) — predict() ci-dessous
  // est le raccourci "je veux juste le résultat".
  forward(input) {
    let a = input;
    const activations = [a];
    for (let l = 0; l < this.W.length; l++) {
      const W = this.W[l], b = this.b[l];
      const isLast = l === this.W.length - 1;
      const out = new Array(W.length);
      for (let j = 0; j < W.length; j++) {
        let sum = b[j];
        const row = W[j];
        for (let i = 0; i < row.length; i++) sum += row[i] * a[i];
        out[j] = isLast ? NeuralNet.sigmoid(sum) : NeuralNet.relu(sum);
      }
      activations.push(out);
      a = out;
    }
    return { activations, output: a };
  }

  predict(input) {
    return this.forward(input).output[0];
  }

  // Un pas de descente de gradient mini-batch, rétropropagation manuelle. Perte = entropie croisée
  // binaire sur la dernière couche (sigmoïde) : le gradient combiné sigmoid+BCE se simplifie
  // exactement en (sortie − cible), l'identité standard qui évite de dériver les deux séparément.
  // Couches cachées ReLU : dérivée récupérée via l'activation elle-même (relu(z)>0 ssi z>0), pas
  // besoin de garder les z bruts séparément.
  trainStep(batch, lr, momentum = 0.9) {
    if (!this._vW) {
      this._vW = this.W.map(w => w.map(row => row.map(() => 0)));
      this._vb = this.b.map(row => row.map(() => 0));
    }
    const gW = this.W.map(w => w.map(row => row.map(() => 0)));
    const gb = this.b.map(row => row.map(() => 0));

    for (const { input, target } of batch) {
      const { activations, output } = this.forward(input);
      let delta = [output[0] - target];
      for (let l = this.W.length - 1; l >= 0; l--) {
        const aPrev = activations[l];
        const W = this.W[l];
        for (let j = 0; j < W.length; j++) {
          gb[l][j] += delta[j];
          const row = W[j], grow = gW[l][j];
          for (let i = 0; i < row.length; i++) grow[i] += delta[j] * aPrev[i];
        }
        if (l > 0) {
          const prevSize = aPrev.length;
          const newDelta = new Array(prevSize).fill(0);
          for (let j = 0; j < W.length; j++) {
            const row = W[j];
            for (let i = 0; i < prevSize; i++) newDelta[i] += row[i] * delta[j];
          }
          for (let i = 0; i < prevSize; i++) newDelta[i] *= aPrev[i] > 0 ? 1 : 0; // dérivée ReLU
          delta = newDelta;
        }
      }
    }

    const n = batch.length;
    for (let l = 0; l < this.W.length; l++) {
      for (let j = 0; j < this.W[l].length; j++) {
        this._vb[l][j] = momentum * this._vb[l][j] - lr * (gb[l][j] / n);
        this.b[l][j] += this._vb[l][j];
        const row = this.W[l][j], grow = gW[l][j], vrow = this._vW[l][j];
        for (let i = 0; i < row.length; i++) {
          vrow[i] = momentum * vrow[i] - lr * (grow[i] / n);
          row[i] += vrow[i];
        }
      }
    }
  }

  toJSON() { return { sizes: this.sizes, W: this.W, b: this.b }; }
  static fromJSON(obj) { return new NeuralNet(obj.sizes, { W: obj.W, b: obj.b }); }
}

// Ordre de rôle fixe pour donner un slot stable à chaque héros dans le vecteur, quelle que soit la
// composition réelle de la partie — sans ça, le réseau devrait aussi apprendre "quel héros est où"
// avant même de pouvoir apprendre quoi que ce soit d'utile sur l'état.
const NN_ROLE_ORDER = ['solo', 'roam', 'mage', 'dpt', 'support'];
const NN_FEATURES_PER_HERO = 14;
const NN_INPUT_SIZE = NN_FEATURES_PER_HERO * NN_ROLE_ORDER.length * 2 + 1; // +1 = tour global

// Duplication minimale de BOT_ROLE_HOME_ZONE (js/bot.js) : nn.js est chargé AVANT bot.js dans
// l'ordre de FILES (voir sim/engine.js FILES), donc pas moyen d'y référer directement ici. Mapping
// stable (quelle zone géographique chaque rôle défend), à garder synchronisé si jamais il change.
const NN_ROLE_HOME_ZONE = { solo: 'N', mage: 'C', dpt: 'S', support: 'S' };
const NN_ZONE_CELLS = {};
(typeof ZONES !== 'undefined' ? ZONES : []).forEach(z => { NN_ZONE_CELLS[z.id] = z.cells; });

function _nnManhattan(a, b) { return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); }
function _nnDistToZone(pos, cells) {
  if (!pos || !cells || !cells.length) return null;
  let min = Infinity;
  for (const c of cells) { const d = _nnManhattan(pos, c); if (d < min) min = d; }
  return min;
}

// Encode l'état du jeu du point de vue de `perspectivePlayerIdx` : SON équipe occupe toujours les
// 5 premiers slots, l'équipe adverse les 5 suivants — le réseau n'a donc jamais à réapprendre la
// symétrie "je suis joueur 0 ou 1", juste "mon camp vs l'autre camp".
//
// Au-delà des stats brutes du héros (PV/mana/or/items/kd/portée), 5 features donnent une
// conscience explicite de la CARTE plutôt que de forcer le réseau à réapprendre la géométrie du
// plateau (murs, zones à gold, qui défend quoi) depuis rien à partir de x/y bruts : distance à sa
// zone maison, dedans ou non, dans une zone à gold ou non, distance à l'ennemi/l'allié le plus
// proche. Ce sont des repères, pas des instructions — le réseau reste libre d'apprendre qu'ignorer
// sa zone est parfois le bon choix, il a juste l'info sous la main pour le décider plutôt que de
// devoir la redécouvrir par le seul signal de victoire/défaite en fin de partie.
function encodeState(game, perspectivePlayerIdx) {
  const features = [];
  const teamOrder = [perspectivePlayerIdx, 1 - perspectivePlayerIdx];
  const heroesByTeam = teamOrder.map(pi => (game.players[pi] ? game.players[pi].heroes.filter(Boolean) : []));

  teamOrder.forEach((pi, side) => {
    const team = game.players[pi];
    const ownHeroes = heroesByTeam[side];
    const enemyHeroes = heroesByTeam[1 - side];
    const byRole = {};
    (team ? team.heroes : []).forEach(h => { if (h) byRole[h.roleId] = h; });
    for (const role of NN_ROLE_ORDER) {
      const h = byRole[role];
      if (!h) { for (let k = 0; k < NN_FEATURES_PER_HERO; k++) features.push(0); continue; }

      const pos = h.position;
      const homeCells = NN_ZONE_CELLS[NN_ROLE_HOME_ZONE[role]] || null;
      const distHome = pos ? _nnDistToZone(pos, homeCells) : null;
      const inHome = !!(pos && homeCells && homeCells.some(c => c.x === pos.x && c.y === pos.y));
      const inGold = !!(pos && typeof ZONE_CELL_SET !== 'undefined' && ZONE_CELL_SET.has(`${pos.x},${pos.y}`));

      const otherAlive = enemyHeroes.filter(e => e.isAlive && e.position);
      const allyAlive   = ownHeroes.filter(a => a !== h && a.isAlive && a.position);
      const distEnemy = pos && otherAlive.length ? Math.min(...otherAlive.map(e => _nnManhattan(pos, e.position))) : null;
      const distAlly  = pos && allyAlive.length  ? Math.min(...allyAlive.map(a => _nnManhattan(pos, a.position)))  : null;

      features.push(
        h.isAlive ? 1 : 0,
        h.maxHP ? h.currentHP / h.maxHP : 0,
        h.maxMana ? h.currentMana / h.maxMana : 0,
        pos ? pos.x / MAP_SIZE : 0.5,
        pos ? pos.y / MAP_SIZE : 0.5,
        Math.min(2, (h.totalGoldEarned || h.gold || 0) / 3000),
        Math.min(1, (h.items ? h.items.length : 0) / 6),
        Math.max(-1, Math.min(1, ((h.kills || 0) - (h.deaths || 0)) / 8)),
        Math.min(1, (h.po || 1) / 10),
        distHome !== null ? Math.min(1, distHome / MAP_SIZE) : 0,
        inHome ? 1 : 0,
        inGold ? 1 : 0,
        // Pas de proche (mort/hors carte) codé comme "loin" (1), pas "à distance 0" — sans quoi un
        // héros seul sur la carte ressemblerait à un héros collé à un ennemi.
        distEnemy !== null ? Math.min(1, distEnemy / MAP_SIZE) : 1,
        distAlly  !== null ? Math.min(1, distAlly  / MAP_SIZE) : 1
      );
    }
  });
  features.push(Math.min(1, (game.globalTurn || 0) / 100));
  return features;
}
