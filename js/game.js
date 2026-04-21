// ============================================================
// CONSTANTS
// ============================================================

const MAP_SIZE    = 30;
const CELL_SIZE   = 34;
const MAX_TURNS   = 200;
const MAX_ACTIONS = 30;
const TURN_TIME   = 120;
const KILL_GOLD   = 200;
const PASSIVE_GOLD = 200;
const ZONE_GOLD   = 500;
const START_GOLD  = 500;

function buildZoneCells(x1, y1, x2, y2) {
  const cells = [];
  for (let x = x1; x <= x2; x++)
    for (let y = y1; y <= y2; y++)
      cells.push({ x, y });
  return cells;
}

// ============================================================
// MAP — WALLS, SPAWNS, DECORATIVE AREAS
// ============================================================

function buildWallSet() {
  const set = new Set();
  // Outer border
  for (let i = 0; i < MAP_SIZE; i++) {
    set.add(`${i},0`); set.add(`${i},${MAP_SIZE - 1}`);
    set.add(`0,${i}`); set.add(`${MAP_SIZE - 1},${i}`);
  }
  // Internal walls — symmetric left-right (x → 29-x) and top-bottom (y → 29-y)
  [
    // Top arch below Zone Nord (narrows passage to x=11-18)
    {x:10,y:5},{x:19,y:5},
    {x:9,y:6},{x:10,y:6},{x:19,y:6},{x:20,y:6},
    // Bottom arch (mirror)
    {x:10,y:24},{x:19,y:24},
    {x:9,y:23},{x:10,y:23},{x:19,y:23},{x:20,y:23},
    // Nord zone cover walls — flanking pillars + split low wall
    {x:11,y:2},{x:11,y:3},   // left pillar
    {x:18,y:2},{x:18,y:3},   // right pillar  [29-11=18]
    {x:12,y:4},{x:13,y:4},   // left bottom wall
    {x:16,y:4},{x:17,y:4},   // right bottom wall [29-12=17, 29-13=16]
    // Sud zone cover walls (mirror: y → 29-y)
    {x:11,y:26},{x:11,y:27},
    {x:18,y:26},{x:18,y:27},
    {x:12,y:25},{x:13,y:25},
    {x:16,y:25},{x:17,y:25},
    // Left outer-top diagonal
    {x:6,y:7},{x:7,y:8},
    // Left vertical wall — gap of 4 in the middle (y=13-16)
    {x:5,y:9},{x:5,y:10},{x:5,y:11},{x:5,y:12},
    {x:5,y:17},{x:5,y:18},{x:5,y:19},{x:5,y:20},
    // Left outer-bottom diagonal
    {x:7,y:21},{x:6,y:22},
    // Right outer-top diagonal (mirror: 29-x)
    {x:23,y:7},{x:22,y:8},
    // Right vertical wall — gap of 4 in the middle (y=13-16)
    {x:24,y:9},{x:24,y:10},{x:24,y:11},{x:24,y:12},
    {x:24,y:17},{x:24,y:18},{x:24,y:19},{x:24,y:20},
    // Right outer-bottom diagonal
    {x:22,y:21},{x:23,y:22},
    // Diamond walls centered at (14.5,14.5), double thickness — perfect symmetry
    // Openings (2 cells wide) N/S/E/W cut through both layers
    // Inner ring (a+b=2, corners only):
    {x:13,y:13},{x:16,y:13},{x:13,y:16},{x:16,y:16},
    // Outer ring (a+b=3, diagonals only):
    {x:13,y:12},{x:16,y:12},{x:12,y:13},{x:17,y:13},
    {x:12,y:16},{x:17,y:16},{x:13,y:17},{x:16,y:17},
  ].forEach(({x, y}) => set.add(`${x},${y}`));
  return set;
}
const WALL_SET = buildWallSet();
function isWall(x, y) { return WALL_SET.has(`${x},${y}`); }

const ZONES = [
  // Nord: x=9-20, y=1-4, excluding cover walls
  { id: 'N', name: 'Zone Nord', cells: (() => {
    const r = [];
    for (let x = 9; x <= 20; x++)
      for (let y = 1; y <= 4; y++)
        if (!isWall(x, y)) r.push({ x, y });
    return r;
  })() },
  // Centre: ring autour du losange (distance ≤ 5 du centre, hors murs)
  { id: 'C', name: 'Zone Centre', cells: (() => {
    const r = [];
    for (let x = 8; x <= 21; x++)
      for (let y = 8; y <= 21; y++)
        if (Math.abs(x - 14.5) + Math.abs(y - 14.5) <= 7 && !isWall(x, y)) r.push({ x, y });
    return r;
  })() },
  // Sud: mirror de Nord (y → 29-y)
  { id: 'S', name: 'Zone Sud', cells: (() => {
    const r = [];
    for (let x = 9; x <= 20; x++)
      for (let y = 25; y <= 28; y++)
        if (!isWall(x, y)) r.push({ x, y });
    return r;
  })() }
];

const ZONE_CELL_SET = new Set();
ZONES.forEach(z => z.cells.forEach(c => ZONE_CELL_SET.add(`${c.x},${c.y}`)));

function inZone(zone, pos) {
  return zone.cells.some(c => c.x === pos.x && c.y === pos.y);
}

// Starting positions per player — order matches roleOrder: [Solo, Roam, Mage, DPT, Support]
// Solo & Roam: top area, colonnes séparées (Solo joue avant Roam, pas de blocage)
// Mage: couloir gauche/droit proche de la zone centre
// DPT & Support: bas, colonnes séparées (DPT joue avant Support, pas de blocage)
const SPAWN_POSITIONS = [
  // Player 0 (P1) — côté gauche
  [{x:3,y:2},{x:1,y:2},{x:8,y:14},{x:3,y:26},{x:1,y:26}],
  // Player 1 (P2) — côté droit (miroir)
  [{x:26,y:2},{x:28,y:2},{x:21,y:14},{x:26,y:26},{x:28,y:26}]
];

const SPAWN_CELL_SET = [
  new Set(SPAWN_POSITIONS[0].map(c => `${c.x},${c.y}`)),
  new Set(SPAWN_POSITIONS[1].map(c => `${c.x},${c.y}`))
];

// ============================================================
// DRAFT CONFIGURATION
// ============================================================

// Ban order: alternating, P1 first  (6 bans total)
const BAN_ORDER = [0, 1, 0, 1, 0, 1];

// Pick order: 1-2-2-2-2-1  (10 picks total, 5 each)
const PICK_SEQUENCE = [
  { p: 0, n: 1 },
  { p: 1, n: 2 },
  { p: 0, n: 2 },
  { p: 1, n: 2 },
  { p: 0, n: 2 },
  { p: 1, n: 1 }
];

// ============================================================
// GAME STATE
// ============================================================

class GameState {
  constructor() {
    this.phase = 'draft';  // 'draft' | 'playing' | 'gameover'

    this.players = [
      { id: 1, heroes: [] },
      { id: 2, heroes: [] }
    ];

    // Draft state
    this.draft = {
      phase:        'ban',   // 'ban' | 'pick'
      banned:       new Set(),
      picks:        [[], []],
      banIdx:       0,
      pickRound:    0,
      pickInRound:  0
    };

    // Brown spots — generated in startGame() after heroes are placed
    this.brownSpots = [];

    // Batteries de Pibot (une par héros Pibot, générée chaque tour)
    this.pibotBatteries = [];

    // Pièges posés sur la carte
    this.traps = [];

    // Loups de Noyala
    this.noyalaWolves = [];

    // Glyphes de Shallah
    this.glyphs = [];

    // Zones de bombardement (Stank - Appel)
    this.bombZones = [];

    // Murs de haine (Sharagoth - Mur de haine)
    this.hateWalls = [];

    // Zones de lame d'eau (Ondine)
    this.lameEauZones = [];

    // Zones d'amour fou (Cupidon - L'amour fou)
    this.amourFouZones = [];

    // Gold total gagné par équipe depuis le début
    this.teamGoldEarned = [0, 0];

    // Playing state
    this.globalTurn    = 1;
    this.heroTurnIndex = 0;
    this.log           = [];
    this.winner        = null;

    // Per-hero-turn state
    this.currentHero    = null;
    this.actionMode     = null;
    this.selectedSpell  = null;
    this.selectedWolf   = null;
    this.pushTarget     = null;
    this.actionsUsed       = 0;
    this.movementLeft      = 0;
    this.autoAttacksUsed   = 0;
    this.autoAttacksAllowed = 1;
    this.spellsUsed        = {};
    this.canBuy         = true;

    // Timer
    this.timeLeft      = TURN_TIME;
    this._timerHandle  = null;
  }

  // ============================================================
  // DRAFT
  // ============================================================

  draftCurrentPlayer() {
    const d = this.draft;
    if (d.phase === 'ban')  return BAN_ORDER[d.banIdx];
    if (d.phase === 'pick') return PICK_SEQUENCE[d.pickRound].p;
    return -1;
  }

  draftStatus() {
    // Returns a human-readable string for the UI
    const d   = this.draft;
    const p   = this.draftCurrentPlayer() + 1;
    if (d.phase === 'ban') {
      const myBansDone = [...Array(d.banIdx)].filter((_, i) => BAN_ORDER[i] === this.draftCurrentPlayer()).length;
      return `Joueur ${p} — Bannissement ${myBansDone + 1}/3`;
    }
    if (d.phase === 'pick') {
      const seq  = PICK_SEQUENCE[d.pickRound];
      const done = this.players[seq.p].heroes.length; // picks done so far for that player
      return `Joueur ${p} — Sélection ${done + 1}/5`;
    }
    return '';
  }

  _isUnavailable(typeId) {
    const d = this.draft;
    if (d.banned.has(typeId)) return true;
    if (d.picks[0].includes(typeId) || d.picks[1].includes(typeId)) return true;
    // Pendant le pick : un joueur ne peut pas prendre 2 héros du même rôle
    if (d.phase === 'pick') {
      const seq = PICK_SEQUENCE[d.pickRound];
      if (seq) {
        const takenRoles = d.picks[seq.p].map(id => HERO_TYPES[id].roleId);
        if (takenRoles.includes(HERO_TYPES[typeId].roleId)) return true;
      }
    }
    return false;
  }

  banHero(typeId) {
    const d = this.draft;
    if (d.phase !== 'ban') return false;
    if (this._isUnavailable(typeId)) return false;

    d.banned.add(typeId);
    Stats.recordBan(typeId);
    d.banIdx++;
    this.addLog(`Joueur ${BAN_ORDER[d.banIdx - 1] + 1} bannit ${HERO_TYPES[typeId].name}`);

    if (d.banIdx >= BAN_ORDER.length) d.phase = 'pick';
    return true;
  }

  pickHero(typeId) {
    const d = this.draft;
    if (d.phase !== 'pick') return false;
    if (this._isUnavailable(typeId)) return false;

    const seq  = PICK_SEQUENCE[d.pickRound];
    d.picks[seq.p].push(typeId);
    Stats.recordPick(typeId, seq.p);
    this.addLog(`Joueur ${seq.p + 1} choisit ${HERO_TYPES[typeId].name}`);

    d.pickInRound++;
    if (d.pickInRound >= seq.n) {
      d.pickRound++;
      d.pickInRound = 0;
    }

    if (d.pickRound >= PICK_SEQUENCE.length) {
      // Draft complete → start game
      this.startGame(d.picks[0], d.picks[1]);
    }
    return true;
  }

  // ============================================================
  // GAME START
  // ============================================================

  startGame(p1Types, p2Types) {
    const sortByRole = types =>
      [...types].sort((a, b) => HERO_TYPES[a].roleOrder - HERO_TYPES[b].roleOrder);

    const s1 = sortByRole(p1Types);
    const s2 = sortByRole(p2Types);

    this.players[0].heroes = s1.map((t, i) => createHeroInstance(t, 0, i));
    this.players[1].heroes = s2.map((t, i) => createHeroInstance(t, 1, i));

    // Place heroes at corner spawn positions and save spawn for solo_recall
    this.players[0].heroes.forEach((h, i) => { h.position = { ...SPAWN_POSITIONS[0][i] }; h.spawnPosition = { ...SPAWN_POSITIONS[0][i] }; });
    this.players[1].heroes.forEach((h, i) => { h.position = { ...SPAWN_POSITIONS[1][i] }; h.spawnPosition = { ...SPAWN_POSITIONS[1][i] }; });

    this._generateBrownSpots(8);
    this.phase = 'playing';
    this.heroTurnIndex = 0;
    this._startHeroTurn();
  }

  // ============================================================
  // TURN MANAGEMENT
  // ============================================================

  _currentPlayerIdx() { return this.heroTurnIndex % 2; }
  _currentHeroSlot()  { return Math.floor(this.heroTurnIndex / 2); }

  _startHeroTurn() {
    const pi   = this._currentPlayerIdx();
    const slot = this._currentHeroSlot();
    const hero = this.players[pi].heroes[slot];

    if (!hero || !hero.isAlive) { this._advance(); return; }

    // Invincibilité (Gabriel R) : immunité stun
    // Stun: skip this hero's turn entirely
    const stunIdx = (hero.invincibleTurnsLeft > 0) ? -1 : (hero.statusEffects || []).findIndex(e => e.type === 'stun');
    if (stunIdx !== -1) {
      hero.statusEffects[stunIdx].turns--;
      if (hero.statusEffects[stunIdx].turns <= 0) hero.statusEffects.splice(stunIdx, 1);
      this.addLog(`${hero.name} est étourdi — tour annulé !`);
      if (window.renderer) { renderer.render(); renderer.updateUI(); }
      this._advance();
      return;
    }

    // Retirer le bonus temporaire de Tueur
    if (hero.tueurBonus || hero.tueurBonusAD || hero.tueurBonusAP) {
      const expAD = (hero.tueurBonusAD || 0) + (hero.tueurBonus || 0);
      const expAP = (hero.tueurBonusAP || 0) + (hero.tueurBonus || 0);
      hero.ad -= expAD;
      hero.ap -= expAP;
      this.addLog(`${hero.name} — bonus Tueur expiré (−${expAD} AD, −${expAP} AP)`);
      hero.tueurBonus = 0;
      hero.tueurBonusAD = 0;
      hero.tueurBonusAP = 0;
    }

    // Retirer le bonus temporaire du passif Decigeno
    if (hero.decigenoDmgPct) {
      this.addLog(`${hero.name} — bonus Passif expiré (−${hero.decigenoDmgPct}% dégâts)`);
      hero.decigenoDmgPct = 0;
    }

    // Passif Protection Divine : décrémenter le cooldown
    if (hero.items.includes('protection_divine') && (hero.protectionDivineCooldown || 0) > 0) {
      hero.protectionDivineCooldown--;
    }

    // Passif Épées Croisées : décrémenter le cooldown
    if (hero.items.includes('epees_croisees') && (hero.epeesCroiseesCooldown || 0) > 0) {
      hero.epeesCroiseesCooldown--;
    }

    // Passif Alternateur de Puissance : décrémenter le cooldown
    if (hero.items.includes('alternateur_de_puissance') && (hero.alternateurCooldown || 0) > 0) {
      hero.alternateurCooldown--;
    }

    // Passif Lame Électrique : décrémenter le cooldown
    if (hero.items.includes('lame_electrique') && (hero.lameElectriqueCooldown || 0) > 0) {
      hero.lameElectriqueCooldown--;
    }

    // Hornet passif: réinitialiser le tracking (bonus PM appliqué après movementLeft)
    if (hero.passive === 'hornet_passive') {
      hero.hornetDidNotUsePMThisTurn = true;
      // Nettoyer les marques expirées
      Object.keys(hero.hornetHarpoonedTargets).forEach(targetId => {
        if ((hero.hornetHarpoonedTargets[targetId] || 0) <= this.globalTurn) {
          delete hero.hornetHarpoonedTargets[targetId];
        }
      });
    }

    this.currentHero        = hero;
    this.actionsUsed        = 0;
    this.movementLeft       = hero.pm;

    // Hornet passif Suture : ajouter les PM bonus à movementLeft seulement (pas permanent)
    if (hero.passive === 'hornet_passive' && hero.hornetPMBonusNextTurn > 0) {
      this.movementLeft += hero.hornetPMBonusNextTurn;
      this.addLog(`${hero.name} — Passif Suture : +${hero.hornetPMBonusNextTurn} PM ce tour`);
      hero.hornetPMBonusNextTurn = 0;
    }
    this.autoAttacksUsed    = 0;
    this.autoAttacksAllowed = 1 + (hero.extraAutoAttacks || 0);
    this.spellsUsed         = {};
    hero.hornetIsReactivation = {};
    this.canBuy             = true;
    this.actionMode         = null;
    this.selectedSpell      = null;
    this.selectedWolf       = null;

    // Apply and tick status effects
    hero.maledictionTurns = 0;
    hero.mutedThisTurn = false;
    for (const e of (hero.statusEffects || [])) {
      if (e.type === 'slow') {
        this.movementLeft = Math.max(0, this.movementLeft - e.pmReduction);
        this.addLog(`${hero.name} est ralenti (-${e.pmReduction} PM ce tour)`);
      }
      if (e.type === 'hemorrhage') {
        hero.hemorrhageTurns = Math.max(hero.hemorrhageTurns, e.turns);
        this.addLog(`${hero.name} est en hémorragie (soins -50%)`);
      }
      if (e.type === 'malediction') {
        hero.maledictionTurns = Math.max(hero.maledictionTurns, e.turns);
        this.addLog(`${hero.name} est maudit (portée sorts -3)`);
      }
      if (e.type === 'mute') {
        hero.mutedThisTurn = true;
        this.addLog(`${hero.name} est muet — sorts bloqués ce tour`);
      }
      e.turns--;
    }
    hero.statusEffects = (hero.statusEffects || []).filter(e => e.turns >= 0);

    // Reset bouclier Dague du Soldat
    hero.daggerShield = 0;

    // Tick bouclier temporisé (Barrière Protectrice)
    if (hero.shieldTurnsLeft > 0) {
      hero.shieldTurnsLeft--;
      if (hero.shieldTurnsLeft === 0 && hero.shield > 0) {
        hero.shield = 0;
        this.addLog(`${hero.name} — Bouclier expiré`);
      }
    }

    // Épée Cinglante : expiration de la réduction d'armure
    if (hero.armorShredTurns > 0) {
      hero.armorShredTurns--;
      if (hero.armorShredTurns === 0 && hero.armorShred > 0) {
        hero.armor += hero.armorShred;
        hero.armorShred = 0;
        this.addLog(`${hero.name} — Armure restaurée (Épée Cinglante expirée)`);
      }
    }

    // Expiration des glyphes ultime quand Shallah commence son tour
    if (hero.passive === 'shallah_passive') {
      const expired = this.glyphs.filter(g => g.type === 'ultimate' && g.ownerHero === hero);
      if (expired.length) this.addLog(`${hero.name} — Glyphe Ultime expirée`);
      this.glyphs = this.glyphs.filter(g => !(g.type === 'ultimate' && g.ownerHero === hero));
    }

    // Zone de bombardement (Stank - Appel) : dégâts en début de tour si dans la zone
    if (hero.position) {
      this.bombZones.forEach(bz => {
        if (!hero.isAlive) return;
        if (hero.playerIdx !== bz.caster.playerIdx && Math.abs(hero.position.x - bz.cx) + Math.abs(hero.position.y - bz.cy) <= bz.radius) {
          const raw = Math.floor(bz.baseDamage + bz.caster.ad * bz.adRatio);
          const dmg = this._reduceDmg(raw, 'physical', hero, bz.caster.armorPenPct || 0);
          this._applyDamage(hero, dmg, bz.caster, 'physical');
          this.addLog(`${hero.name} — Zone de bombardement : −${dmg} HP`);
        }
      });
      if (!hero.isAlive) { this._advance(); return; }
    }

    // Zone d'amour fou (Cupidon - L'amour fou) : déplacement aléatoire des ennemis
    if (hero.position) {
      this.amourFouZones.forEach(zone => {
        if (!hero.isAlive || hero.playerIdx === zone.caster.playerIdx) return;
        if (Math.abs(hero.position.x - zone.cx) + Math.abs(hero.position.y - zone.cy) <= zone.size) {
          // Déplacement aléatoire dans une direction orthogonale
          const directions = [
            { dx: 1, dy: 0 },   // Est
            { dx: -1, dy: 0 },  // Ouest
            { dx: 0, dy: 1 },   // Sud
            { dx: 0, dy: -1 }   // Nord
          ];
          let moved = false;
          for (let attempt = 0; attempt < 4; attempt++) {
            const dir = directions[Math.floor(Math.random() * directions.length)];
            const nx = hero.position.x + dir.dx;
            const ny = hero.position.y + dir.dy;
            if (!isWall(nx, ny) && !this.getHeroAt(nx, ny)) {
              hero.position = { x: nx, y: ny };
              this.addLog(`${hero.name} — L'amour fou : déplacé aléatoirement à (${nx}, ${ny})`);
              moved = true;
              break;
            }
          }
          if (!moved) {
            this.addLog(`${hero.name} — L'amour fou : aucune direction disponible`);
          }
        }
      });
      if (!hero.isAlive) { this._advance(); return; }
    }

    // Vaillance (Ondine) : réinitialisation du bouclier de débuff chaque tour de héros
    if (hero.passive === 'vaillance') hero.debuffDodgedThisTurn = false;


    // Buff PM Tour (Miaou Miaou ! de Shana)
    if (hero.bonusPMNextTurn > 0) {
      this.movementLeft += hero.bonusPMNextTurn;
      this.addLog(`${hero.name} — Buff : +${hero.bonusPMNextTurn} PM ce tour (Miaou Miaou !)`);
      hero.bonusPMNextTurn = 0;
    }

    // Passif Gabriel — Pas Léger : +1 PM si un Gabriel allié est à ≤7 cases
    if (hero.position) {
      const gabrielNearby = this._getAllies(hero.playerIdx).find(a =>
        a !== hero && a.isAlive && a.passive === 'gabriel_passive' && a.position &&
        this._manhattan(hero.position, a.position) <= 7
      );
      if (gabrielNearby) {
        this.movementLeft++;
        this.addLog(`${hero.name} — Passif Pas Léger (${gabrielNearby.name}) : +1 PM`);
      }
    }

    // Chronos : mémoriser la position de début de tour pour Rollback
    if (hero.passive === 'chronos_passive' && hero.position) {
      hero.chronosStartPos = { ...hero.position };
    }

    // Passif Faëna : reset bonus PO du W
    if (hero.passive === 'faena_passive') hero.faenaBonusPOTurn = 0;

    // Salena — reset Découpage
    if (hero.passive === 'salena_passive') hero.decoupageActive = false;

    // Passif Noyala — Chasse : +1 PM si adjacent à un mur
    if (hero.passive === 'noyala_passive' && hero.position) {
      const _wallDirs = [{dx:1,dy:0},{dx:-1,dy:0},{dx:0,dy:1},{dx:0,dy:-1}];
      if (_wallDirs.some(d => isWall(hero.position.x + d.dx, hero.position.y + d.dy))) {
        this.movementLeft++;
        this.addLog(`${hero.name} — Chasse : +1 PM (adjacent à un mur)`);
      }
      // Refresh PM des loups
      this.noyalaWolves.filter(w => w.ownerInstanceId === hero.instanceId).forEach(w => {
        w.pmLeft = hero.pm;
      });
    }

    // Passif Grolith — Pierre qui roule : +70 bouclier permanent par tour
    if (hero.passive === 'grolith_passive') {
      hero.shield = (hero.shield || 0) + 70;
      this.addLog(`${hero.name} — Pierre qui roule : bouclier +70 (total ${hero.shield})`);
    }

    // Passif Pibot — Batterie : supprime l'ancienne et génère une nouvelle chaque tour
    if (hero.passive === 'pibot_passive' && hero.position) {
      // Supprimer l'ancienne batterie de ce Pibot
      const oldIdx = this.pibotBatteries.findIndex(b => b.heroInstanceId === hero.instanceId);
      if (oldIdx !== -1) this.pibotBatteries.splice(oldIdx, 1);

      const occSet = new Set([
        ...this.brownSpots.map(s => `${s.x},${s.y}`),
        ...this.pibotBatteries.map(b => `${b.x},${b.y}`),
      ]);
      this.players.forEach(p => p.heroes.forEach(h => { if (h.position) occSet.add(`${h.position.x},${h.position.y}`); }));
      const cands = [];
      for (let bx = 0; bx < MAP_SIZE; bx++) for (let by = 0; by < MAP_SIZE; by++) {
        if (!isWall(bx, by) && !occSet.has(`${bx},${by}`) && this._manhattan(hero.position, {x:bx,y:by}) <= 5)
          cands.push({x:bx, y:by});
      }
      if (cands.length) {
        const pick = cands[Math.floor(Math.random() * cands.length)];
        this.pibotBatteries.push({ x: pick.x, y: pick.y, heroInstanceId: hero.instanceId });
      }
    }

    // Passif Layia : reset bonus PO temporaire
    if (hero.passive === 'layia_passive') {
      hero.layiaBonusPOTurn = 0;
    }

    // Passif Cupidon : les attaques de ce tour deviennent protection pour le prochain
    if (hero.passive === 'cupidon_passive') {
      hero.cupidonAttackedLastTurn = new Set([...hero.cupidonAttackedThisTurn]);
      hero.cupidonAttackedThisTurn = new Set();
    }

    // Blason Glorieux : réinitialiser le flag d'utilisation par tour
    if (hero.items.includes('blason_glorieux')) {
      hero.blasonGlorieuxUsedThisTurn = false;
    }

    // Passif Épées Croisées — Jambes de Feu : +1 PM si CD = 0
    if (hero.items.includes('epees_croisees') && !(hero.epeesCroiseesCooldown > 0)) {
      this.movementLeft++;
      hero.epeesCroiseesCooldown = 3;
      this.addLog(`${hero.name} — Jambes de Feu : +1 PM`);
    }

    // Passif Bottes de Grande Vitesse : +1 PM si aucun dégât infligé au tour précédent
    if (hero.items.includes('speed_boots') && !hero.dealtDamageLastTurn) {
      this.movementLeft++;
      this.addLog(`${hero.name} — Passif Bottes : +1 PM`);
    }

    // Passif Lame du Ninja : +1 PM si aucun dégât infligé au tour précédent
    if (hero.items.includes('lame_du_ninja') && !hero.dealtDamageLastTurn) {
      this.movementLeft++;
      this.addLog(`${hero.name} — Lame du Ninja : +1 PM`);
    }
    hero.dealtDamageLastTurn = false;

    // Passif Bouclier Basique : récupère 8% des HP manquants si HP < 50% max
    if (hero.items.includes('basic_shield') && hero.currentHP < hero.maxHP * 0.50) {
      const gain = Math.max(1, Math.floor((hero.maxHP - hero.currentHP) * 0.08));
      hero.currentHP = Math.min(hero.maxHP, hero.currentHP + gain);
      this.addLog(`${hero.name} — Passif Bouclier Basique : +${gain} HP`);
    }

    // Passif Anneau du Mage Mineur : récupère 8% du mana max si mana < 40% max
    if (hero.items.includes('minor_mage_ring') && hero.currentMana < hero.maxMana * 0.40) {
      const gain = Math.max(1, Math.floor(hero.maxMana * 0.08));
      hero.currentMana = Math.min(hero.maxMana, hero.currentMana + gain);
      this.addLog(`${hero.name} — Passif Anneau du Mage Mineur : +${gain} Mana`);
    }

    // Passif Masello : +1 PM par allié à ≤ 7 cases (Manhattan)
    if (hero.passive === 'masello_passive' && hero.position) {
      const nearby = this._getAllies(hero.playerIdx)
        .filter(a => a !== hero && a.isAlive && a.position && this._manhattan(hero.position, a.position) <= 7);
      if (nearby.length > 0) {
        this.movementLeft += nearby.length;
        this.addLog(`${hero.name} — Passif : +${nearby.length} PM (${nearby.length} allié${nearby.length > 1 ? 's' : ''} à portée)`);
      }
    }

    // Passif Sharagoth : bouclier de 10% HP max par allié à ≤ 10 cases (Manhattan)
    if (hero.passive === 'sharagoth_passive' && hero.position) {
      const nearby = this._getAllies(hero.playerIdx)
        .filter(a => a !== hero && a.isAlive && a.position && this._manhattan(hero.position, a.position) <= 10);
      if (nearby.length > 0) {
        const shieldAmt = nearby.length * Math.floor(hero.maxHP * 0.10);
        hero.shield = shieldAmt;
        hero.shieldTurnsLeft = 2;
        this.addLog(`${hero.name} — Passif : Bouclier +${shieldAmt} HP (${nearby.length} allié${nearby.length > 1 ? 's' : ''} à portée)`);
      }
    }

    this._resetTimer();
    this.addLog(`── Tour de ${hero.name} (Joueur ${pi + 1}) — 💰 ${hero.gold}g`);

    if (window.renderer) { renderer.render(); renderer.updateUI(); renderer.openShop(); }
  }

  endHeroTurn() {
    this._stopTimer();
    this.actionMode    = null;
    this.selectedSpell = null;
    this.selectedWolf  = null;

    // Passif Anneau Magique : +15% or si seul dans une zone à gold
    const hero = this.currentHero;
    if (hero && hero.items.includes('magic_ring') && hero.position) {
      const zone = ZONES.find(z => inZone(z, hero.position));
      if (zone) {
        const allyInZone = this._getAllies(hero.playerIdx)
          .some(a => a !== hero && a.isAlive && a.position && inZone(zone, a.position));
        if (!allyInZone) {
          const bonus = Math.max(1, Math.floor(hero.gold * 0.15));
          this._giveGold(hero, bonus);
          this.addLog(`${hero.name} — Passif Anneau Magique : +${bonus}g (zone solitaire)`);
        }
      }
    }

    // Passif Nos Noms Sont Liés : +100g si hors zone à gold en fin de tour
    if (hero && hero.items.includes('linked_names') && hero.position) {
      if (!ZONE_CELL_SET.has(`${hero.position.x},${hero.position.y}`)) {
        this._giveGold(hero, 100);
        this.addLog(`${hero.name} — Nos Noms Sont Liés : +100g (hors zone)`);
      }
    }

    // Lame d'eau : fin du tour d'Ondine → dégâts + déplacement
    if (hero && hero.passive === 'vaillance' && this.lameEauZones.length) {
      this.lameEauZones.forEach(zone => {
        if (zone.caster !== hero) return;
        this._applyLameEauDamage(zone);
        zone.cx += zone.dx;
        zone.cy += zone.dy;
        zone.turnsLeft--;
      });
      this.lameEauZones = this.lameEauZones.filter(z => z.turnsLeft > 0);
    }

    // Purge des effets de statut expirés (turns=0 conservés pendant le tour pour l'affichage)
    if (hero) hero.statusEffects = (hero.statusEffects || []).filter(e => e.turns > 0);

    // Passif Grimoire Magique : +50 mana si au moins 1 PM restant
    if (hero && hero.items.includes('grimoire_magique') && this.movementLeft >= 1) {
      hero.currentMana = Math.min(hero.maxMana, hero.currentMana + 50);
      this.addLog(`${hero.name} — Passif Grimoire Magique : +50 mana`);
    }

    // Décrément hémorragie, root, invincibilité en fin de tour
    if (hero && hero.hemorrhageTurns > 0) hero.hemorrhageTurns--;
    if (hero && hero.rootTurns > 0) hero.rootTurns--;
    if (hero && hero.invincibleTurnsLeft > 0) hero.invincibleTurnsLeft--;

    // Noyala R — Loup et Moi : dégâts si adjacent à un ennemi en fin de tour
    if (hero && hero.noyalaRUsedThisTurn && hero.position) {
      hero.noyalaRUsedThisTurn = false;
      const rSpell = hero.spells.find(s => s.id === 'noyala_r');
      if (rSpell) {
        const _rDirs = [{dx:1,dy:0},{dx:-1,dy:0},{dx:0,dy:1},{dx:0,dy:-1}];
        this._getEnemies(hero.playerIdx).forEach(e => {
          if (!e.isAlive || !e.position) return;
          if (_rDirs.some(d => e.position.x === hero.position.x + d.dx && e.position.y === hero.position.y + d.dy)) {
            const raw = Math.floor(rSpell.baseDamage + hero.ad * rSpell.adRatio);
            const dmg = this._reduceDmg(raw, rSpell.damageType, e);
            this._applyDamage(e, dmg, hero, rSpell.damageType);
            this.addLog(`${hero.name} — Loup et Moi : ${e.name} subit −${dmg} dégâts !`);
          }
        });
        this._checkGameOver();
      }
    }

    // Flamme Intense / Flamme du Soleil Flamboyant : dégâts adjacents en fin de tour
    if (hero && hero.position) {
      const flammeItem = hero.items.includes('flamme_du_soleil_flamboyant') ? 'flamme_du_soleil_flamboyant'
                       : hero.items.includes('flamme_intense') ? 'flamme_intense' : null;
      if (flammeItem) {
        const flammesPct = flammeItem === 'flamme_du_soleil_flamboyant' ? 0.03 : 0.01;
        this._getEnemies(hero.playerIdx).forEach(e => {
          if (!e.isAlive || !e.position) return;
          if (this._chebyshev(hero.position, e.position) <= 1) {
            const raw = Math.floor(hero.maxHP * flammesPct);
            const dmg = this._reduceDmg(raw, 'magical', e);
            if (dmg > 0) {
              this._applyDamage(e, dmg, hero, 'magical');
              this.addLog(`${hero.name} — Flamme : ${e.name} subit −${dmg} dégâts magiques`);
            }
          }
        });
        this._checkGameOver();
      }
    }

    // Hornet — Passif Suture : si aucun PM utilisé ce tour
    if (hero && hero.passive === 'hornet_passive' && hero.hornetDidNotUsePMThisTurn && hero.isAlive) {
      let healed = false;
      // Retirer l'hémorragie
      if (hero.hemorrhageTurns > 0) {
        hero.hemorrhageTurns = 0;
        this.addLog(`${hero.name} — Passif Suture : hémorragie retirée`);
        healed = true;
      }
      // Se soigner
      const healAmount = Math.floor(80 + hero.ad * 1);
      hero.currentHP = Math.min(hero.maxHP, hero.currentHP + healAmount);
      this.addLog(`${hero.name} — Passif Suture : +${healAmount} HP (${hero.currentHP}/${hero.maxHP})`);
      // Bonus PM au prochain tour
      hero.hornetPMBonusNextTurn = 3;
      this.addLog(`${hero.name} — Passif Suture : +3 PM au prochain tour`);
    }

    this.currentHero  = null;
    this._advance();
  }

  _advance() {
    this.heroTurnIndex++;
    if (this.heroTurnIndex >= 10) { this._endGlobalTurn(); return; }
    const pi   = this._currentPlayerIdx();
    const slot = this._currentHeroSlot();
    const hero = this.players[pi].heroes[slot];
    if (!hero || !hero.isAlive) { this._advance(); return; }
    this._startHeroTurn();
  }

  _endGlobalTurn() {
    this.globalTurn++;
    if (this.globalTurn > MAX_TURNS) { this.endGame(null); return; }

    // Passive gold + regen + cooldowns per hero
    this.players.forEach(player => {
      player.heroes.forEach(hero => {
        if (!hero.isAlive) return;
        this._giveGold(hero, PASSIVE_GOLD);
        if (hero.goldPerTurn > 0) this._giveGold(hero, hero.goldPerTurn);
        if (hero.items.includes('compagnon_fidele') && hero.position && !ZONE_CELL_SET.has(`${hero.position.x},${hero.position.y}`)) {
          this._giveGold(hero, 80);
          this.addLog(`${hero.name} — Compagnon Fidèle : +80g (hors zone)`);
        }
        if ((hero.items.includes('couronne_de_la_reine') || hero.items.includes('diademe_de_la_reine')) && hero.position && !ZONE_CELL_SET.has(`${hero.position.x},${hero.position.y}`)) {
          this._giveGold(hero, 80);
          this.addLog(`${hero.name} — Couronne de la Reine : +80g (hors zone)`);
        }
        // Passif Le Voyageur : +50g aux alliés à ≤6 cases si hors zone
        if (hero.items.includes('le_voyageur') && hero.position && !ZONE_CELL_SET.has(`${hero.position.x},${hero.position.y}`)) {
          this._getAllies(hero.playerIdx).forEach(ally => {
            if (ally === hero || !ally.isAlive || !ally.position) return;
            if (this._manhattan(hero.position, ally.position) <= 6) {
              this._giveGold(ally, 50);
              this.addLog(`${ally.name} — Le Voyageur (${hero.name}) : +50g`);
            }
          });
        }
        const _healEffMult = 1 + (hero.healEfficiency || 0) / 100;
        const _hpRegenMult = ((hero.items.includes('anti_spell_boots') || hero.items.includes('reinforced_boots') || hero.items.includes('boots_of_celerity')) ? 1.5
                           : hero.items.includes('speed_boots') ? 1.25 : 1) * _healEffMult;
        hero.currentHP   = Math.min(hero.maxHP,   hero.currentHP   + Math.floor(hero.hpRegen * (hero.hemorrhageTurns > 0 ? 0.5 : 1) * _hpRegenMult));
        // Passif Armure de la Vie : +10% HP manquants si aucun dégât reçu ce tour
        if (hero.items.includes('armure_de_la_vie') && !hero.tookDmgThisGlobalTurn) {
          const regen = Math.floor((hero.maxHP - hero.currentHP) * 0.10);
          if (regen > 0) {
            hero.currentHP = Math.min(hero.maxHP, hero.currentHP + regen);
            this.addLog(`${hero.name} — Armure de la Vie : +${regen} HP (pas de dégâts)`);
          }
        }
        // Passif Voile Antimagie : diminuer le cooldown
        if (hero.items.includes('voile_antimagie') && hero.voileCooldown > 0) {
          hero.voileCooldown--;
        }
        hero.tookDmgThisGlobalTurn = false;
        // Tick DOTs (Nuisance noire, etc.)
        if (hero.dots && hero.dots.length) {
          hero.dots.forEach(dot => {
            if (!hero.isAlive) return;
            const dotType = dot.type || 'magical';
            const dmg = dotType === 'raw' ? dot.dmgPerTurn : this._reduceDmg(dot.dmgPerTurn, dotType, hero);
            this._applyDamage(hero, dmg, dot.caster, dotType);
            const typeLabel = dotType === 'raw' ? 'bruts' : 'magiques';
            this.addLog(`${hero.name} — ${dot.label || 'Nuisance noire'} : −${dmg} dégâts ${typeLabel}`);
            dot.turns--;
          });
          hero.dots = hero.dots.filter(d => d.turns > 0);
        }
        const _manaRegenMult = ((hero.items.includes('sorcerer_boots') ? 1.5
                             : hero.items.includes('speed_boots') ? 1.25 : 1)) * _healEffMult
                             * (1 + (hero.manaRegenPct || 0) / 100);
        hero.currentMana = Math.min(hero.maxMana, hero.currentMana + Math.floor(hero.manaRegen * _manaRegenMult));
        hero.spells.forEach(sp => { if (hero.cooldowns[sp.id] > 0) hero.cooldowns[sp.id]--; });
      });
    });

    // Zone gold → per hero in zone
    ZONES.forEach(zone => {
      const present = [];
      this.players.forEach((player, pi) => {
        player.heroes.forEach(hero => {
          if (hero.isAlive && hero.position && inZone(zone, hero.position))
            present.push({ hero, pi });
        });
      });
      if (!present.length) return;
      const zoneGold = zone.id === 'S' ? 700 : ZONE_GOLD;
      const share = Math.floor(zoneGold / present.length);
      present.forEach(({ hero, pi }) => {
        const gold = hero.roleId === 'roam' ? Math.floor(share / 3) : share;
        this._giveGold(hero, gold);
        this.addLog(`${hero.name} (J${pi + 1}) +${gold}g (Zone ${zone.name})`);
      });
    });

    // Pièges — décompte
    this.traps.forEach(t => { if (!t.permanent) t.turnsLeft--; });
    this.traps = this.traps.filter(t => t.turnsLeft > 0);

    // Glyphes — décompte (turnsLeft === -1 = ultime, expire au tour de Shallah seulement)
    this.glyphs.forEach(g => { if (g.turnsLeft > 0) g.turnsLeft--; });
    this.glyphs = this.glyphs.filter(g => g.turnsLeft !== 0);

    // Zones de bombardement — décompte
    this.bombZones.forEach(bz => bz.turnsLeft--);
    this.bombZones = this.bombZones.filter(bz => {
      if (bz.turnsLeft <= 0) { this.addLog('💥 Zone de bombardement expirée'); return false; }
      return true;
    });

    // Murs de haine — décompte
    this.hateWalls.forEach(w => w.turnsLeft--);
    this.hateWalls = this.hateWalls.filter(w => {
      if (w.turnsLeft <= 0) { this.addLog('Mur de haine expiré'); return false; }
      return true;
    });

    // Lame d'eau — réinitialisation des dégâts du tour
    this.lameEauZones.forEach(z => z.damagedThisTurn = new Set());
    this.lameEauZones = this.lameEauZones.filter(z => z.turnsLeft > 0);

    // Zones d'amour fou — décompte
    this.amourFouZones.forEach(z => z.turnsLeft--);
    this.amourFouZones = this.amourFouZones.filter(z => {
      if (z.turnsLeft <= 0) { this.addLog('💕 Zone d\'amour fou expirée'); return false; }
      return true;
    });

    // Enchanteur Rouge : mise à jour de l'aura
    this._recalcEnchanteurAura();

    this.addLog(`═══ Fin tour ${this.globalTurn - 1} ═══`);
    this.heroTurnIndex = 0;
    this._startHeroTurn();
  }

  // ============================================================
  // TIMER
  // ============================================================

  _resetTimer() {
    this._stopTimer();
    this.timeLeft = TURN_TIME;
    this._timerHandle = setInterval(() => {
      this.timeLeft--;
      if (window.renderer) renderer.updateTimer(this.timeLeft);
      if (this.timeLeft <= 0) {
        this.addLog('⏱ Temps écoulé — fin de tour automatique');
        this.endHeroTurn();
      }
    }, 1000);
  }

  _stopTimer() {
    if (this._timerHandle) { clearInterval(this._timerHandle); this._timerHandle = null; }
  }

  // ============================================================
  // SHOP  (hero pays from their own gold)
  // ============================================================

  // Returns true if hero owns all items in recipe (handles duplicates)
  _hasComponents(hero, recipe) {
    const owned = [...hero.items];
    for (const cId of recipe) {
      const idx = owned.indexOf(cId);
      if (idx === -1) return false;
      owned.splice(idx, 1);
    }
    return true;
  }

  // Cost to buy: combineCost + coût des composants manquants (les possédés seront consommés)
  getBuyCost(hero, itemId) {
    const item = EQUIPMENT[itemId];
    if (!item.recipe.length) return item.combineCost;
    const ownedCopy = [...hero.items];
    let missingCost = 0;
    for (const cId of item.recipe) {
      const idx = ownedCopy.indexOf(cId);
      if (idx !== -1) {
        ownedCopy.splice(idx, 1); // possédé → sera consommé, pas de coût
      } else {
        missingCost += _itemTotalCost(cId); // manquant → ajouter au coût
      }
    }
    return item.combineCost + missingCost;
  }

  buyItem(itemId) {
    const item = EQUIPMENT[itemId];
    const hero = this.currentHero;

    if (!this.canBuy)                 { this.addLog('Achat impossible après une action !'); return false; }
    if (this.actionsUsed >= MAX_ACTIONS) { this.addLog('Limite d\'actions atteinte !');     return false; }

    if (item.roleRestriction && hero.roleId !== item.roleRestriction)
      { this.addLog(`${item.name} est réservé aux ${item.roleRestriction}s !`); return false; }
    if (item.isStarter && hero.items.some(id => EQUIPMENT[id]?.isStarter))
      { this.addLog('Vous possédez déjà un item Starter !'); return false; }
    // Calculer les composants possédés (seront toujours consommés, même si incomplet)
    const _ownedComps = [...hero.items];
    let slotsFreed = 0, bootsFreed = 0;
    for (const cId of item.recipe) {
      const idx = _ownedComps.indexOf(cId);
      if (idx !== -1) { _ownedComps.splice(idx, 1); slotsFreed++; if (EQUIPMENT[cId]?.isBoots) bootsFreed++; }
    }
    const bootsInInv = hero.items.filter(id => EQUIPMENT[id]?.isBoots).length;
    if (item.isBoots && bootsInInv - bootsFreed >= 1)
      { this.addLog('Vous portez déjà des bottes !'); return false; }
    if (hero.items.length - slotsFreed >= 6)
      { this.addLog('Inventaire plein (6 items maximum) !'); return false; }

    const cost = this.getBuyCost(hero, itemId);
    if (hero.gold < cost) { this.addLog('Pas assez d\'or !'); return false; }

    // Consommer tous les composants possédés (toujours, même si recipe incomplet)
    item.recipe.forEach(cId => {
      const idx = hero.items.indexOf(cId);
      if (idx === -1) return;
      hero.items.splice(idx, 1);
      const comp = EQUIPMENT[cId];
      Object.entries(comp.stats).forEach(([stat, val]) => {
        hero[stat] -= val;
        if (stat === 'pm') this.movementLeft = Math.max(0, this.movementLeft - val);
        if (stat === 'extraAutoAttacks') this.autoAttacksAllowed = Math.max(1, this.autoAttacksAllowed - val);
      });
      hero.currentHP   = Math.min(hero.maxHP,   hero.currentHP);
      hero.currentMana = Math.min(hero.maxMana, hero.currentMana);
    });

    hero.gold -= cost;

    Object.entries(item.stats).forEach(([stat, val]) => {
      hero[stat] += val;
      if (stat === 'maxHP')           hero.currentHP   = Math.min(hero.maxHP,   hero.currentHP   + val);
      if (stat === 'maxMana')         hero.currentMana = Math.min(hero.maxMana, hero.currentMana + val);
      if (stat === 'pm')              this.movementLeft += val;
      if (stat === 'extraAutoAttacks') this.autoAttacksAllowed += val;
    });

    if (item.instant?.currentHP)
      hero.currentHP = Math.min(hero.maxHP, hero.currentHP + item.instant.currentHP);

    if (!item.consumable) {
      hero.items.push(itemId);
      Stats.recordItemBought(hero.id, itemId);
    }

    this.actionsUsed++;
    const verb = slotsFreed === item.recipe.length ? 'forge' : slotsFreed > 0 ? 'assemble' : 'achète';
    this.addLog(`${hero.name} ${verb} ${item.name} (−${cost}g) → reste ${hero.gold}g`);
    this._recalcEnchanteurAura();
    if (window.renderer) renderer.closeShop();
    return true;
  }

  sellItem(itemId) {
    const hero = this.currentHero;
    const item = EQUIPMENT[itemId];
    if (!item) return false;
    const idx = hero.items.indexOf(itemId);
    if (idx === -1) return false;
    hero.items.splice(idx, 1);
    Object.entries(item.stats).forEach(([stat, val]) => {
      hero[stat] -= val;
      if (stat === 'pm') this.movementLeft = Math.max(0, this.movementLeft - val);
    });
    hero.currentHP   = Math.min(hero.maxHP,   hero.currentHP);
    hero.currentMana = Math.min(hero.maxMana, hero.currentMana);
    const refund = Math.floor(item.totalCost * 0.8);
    hero.gold += refund;
    this.addLog(`${hero.name} vend ${item.name} → +${refund}g`);
    this._recalcEnchanteurAura();
    return true;
  }

  // ============================================================
  // MOVEMENT
  // ============================================================

  moveHero(tx, ty) {
    const hero = this.currentHero;
    if (!hero) return false;
    if (hero.rootTurns > 0)             { this.addLog(`${hero.name} est immobilisé — déplacement bloqué !`); return false; }
    if (this.movementLeft <= 0)         { this.addLog('Plus de PM !');                   return false; }
    if (this.actionsUsed >= MAX_ACTIONS) { this.addLog('Limite d\'actions atteinte !'); return false; }

    // Cupidon R — Zone d'amour fou : forcer le déplacement aléatoire
    const amourZone = this.amourFouZones.find(z =>
      hero.playerIdx !== z.caster.playerIdx &&
      Math.abs(hero.position.x - z.cx) + Math.abs(hero.position.y - z.cy) <= z.size
    );
    if (amourZone) {
      const directions = [
        { dx: 1, dy: 0 },   // Est
        { dx: -1, dy: 0 },  // Ouest
        { dx: 0, dy: 1 },   // Sud
        { dx: 0, dy: -1 }   // Nord
      ];
      let moved = false;
      for (let attempt = 0; attempt < 4; attempt++) {
        const dir = directions[Math.floor(Math.random() * directions.length)];
        const nx = hero.position.x + dir.dx;
        const ny = hero.position.y + dir.dy;
        if (!isWall(nx, ny) && !this.getHeroAt(nx, ny)) {
          hero.position = { x: nx, y: ny };
          this.movementLeft = Math.max(0, this.movementLeft - 1);
          this.actionsUsed++;
          this.addLog(`${hero.name} — Zone d'amour fou : déplacé aléatoirement en (${nx},${ny})`);
          moved = true;
          break;
        }
      }
      if (!moved) {
        this.addLog(`${hero.name} — Zone d'amour fou : pas de case libre !`);
      }
      if (hero.roleId === 'roam') this._checkBrownCollection(hero);
      this._checkPibotBattery(hero);
      this._checkTrap(hero);
      this._checkBombZone(hero);
      return true;
    }

    if (isWall(tx, ty))               { this.addLog('Destination invalide !'); return false; }
    const _heroTrapBlocked = new Set(
      this.traps.filter(t => t.playerIdx !== hero.playerIdx && !(t.x === tx && t.y === ty))
               .map(t => `${t.x},${t.y}`)
    );
    const result = this._dijkstraPath(hero.position, { x: tx, y: ty }, _heroTrapBlocked);
    if (!result)                      { this.addLog('Chemin inaccessible !'); return false; }
    if (result.cost > this.movementLeft) { this.addLog('Pas assez de PM !'); return false; }

    hero.position     = { x: tx, y: ty };
    this.movementLeft -= result.cost;
    this.actionsUsed++;
    this.canBuy = false;
    // Hornet — marquer qu'elle a utilisé des PM
    if (hero.passive === 'hornet_passive') hero.hornetDidNotUsePMThisTurn = false;
    this.addLog(`${hero.name} → (${tx},${ty}) [−${result.cost} PM, reste ${this.movementLeft}]`);
    if (hero.roleId === 'roam') this._checkBrownCollection(hero);
    this._checkPibotBattery(hero);
    this._checkTrap(hero);
    this._checkBombZone(hero);
    return true;
  }

  // Dijkstra: orthogonal = 1 PM, diagonal = 2 PM. Heroes (allies & enemies) bloquent le passage.
  _dijkstraPath(from, to, extraBlocked = null) {
    if (from.x === to.x && from.y === to.y) return { cost: 0 };
    const ghost = !!(this.currentHero?.items.includes('danse_des_morts'));
    const blocked = new Set();
    this.players.forEach(p => p.heroes.forEach(h => {
      if (h.isAlive && h !== this.currentHero && h.position)
        blocked.add(`${h.position.x},${h.position.y}`);
    }));
    // Destination ne peut pas être sur un héros ni un mur (même en ghost)
    if (blocked.has(`${to.x},${to.y}`)) return null;
    if (isWall(to.x, to.y)) return null;

    const cost = new Map([[`${from.x},${from.y}`, 0]]);
    const pq = [{ c: 0, pos: from }];
    while (pq.length) {
      pq.sort((a, b) => a.c - b.c);
      const { c, pos } = pq.shift();
      if (pos.x === to.x && pos.y === to.y) return { cost: c };
      if (c > (cost.get(`${pos.x},${pos.y}`) ?? Infinity)) continue;
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
        if (!dx && !dy) continue;
        const nx = pos.x + dx, ny = pos.y + dy;
        if (nx < 0 || nx >= MAP_SIZE || ny < 0 || ny >= MAP_SIZE) continue;
        if (!ghost && isWall(nx, ny)) continue;
        const key = `${nx},${ny}`;
        if (!ghost && blocked.has(key)) continue; // bodyblock sans ghost
        if (extraBlocked?.has(key)) continue;
        const moveCost = (dx !== 0 && dy !== 0) ? 2 : 1;
        const newCost  = c + moveCost;
        if (newCost < (cost.get(key) ?? Infinity)) {
          cost.set(key, newCost);
          pq.push({ c: newCost, pos: { x: nx, y: ny } });
        }
      }
    }
    return null;
  }

  getReachableCells(blockTraps = true) {
    const hero = this.currentHero;
    if (!hero || this.movementLeft === 0) return [];
    const ghost = !!(hero.items.includes('danse_des_morts'));
    const blocked = new Set();
    this.players.forEach(p => p.heroes.forEach(h => {
      if (h.isAlive && h !== hero && h.position)
        blocked.add(`${h.position.x},${h.position.y}`);
    }));
    const enemyTraps = blockTraps
      ? new Set(this.traps.filter(t => t.playerIdx !== hero.playerIdx).map(t => `${t.x},${t.y}`))
      : new Set();
    const cost  = new Map([[`${hero.position.x},${hero.position.y}`, 0]]);
    const pq    = [{ c: 0, pos: hero.position }];
    const cells = [];
    while (pq.length) {
      pq.sort((a, b) => a.c - b.c);
      const { c, pos } = pq.shift();
      const posKey = `${pos.x},${pos.y}`;
      if (c > (cost.get(posKey) ?? Infinity)) continue;
      const isOnTrap = enemyTraps.has(posKey);
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
        if (!dx && !dy) continue;
        const nx = pos.x + dx, ny = pos.y + dy;
        if (nx < 0 || nx >= MAP_SIZE || ny < 0 || ny >= MAP_SIZE) continue;
        const key = `${nx},${ny}`;
        // En ghost : traverser murs/héros mais ne pas proposer comme destination finale
        if (!ghost && (blocked.has(key) || isWall(nx, ny))) continue;
        if (ghost && isWall(nx, ny) && !(nx === hero.position.x && ny === hero.position.y)) {
          // Mur traversable mais pas destination : on continue l'expansion sans l'ajouter aux cellules
        }
        if (isOnTrap) continue;
        const moveCost = (dx !== 0 && dy !== 0) ? 2 : 1;
        const newCost  = c + moveCost;
        if (newCost <= this.movementLeft && newCost < (cost.get(key) ?? Infinity)) {
          cost.set(key, newCost);
          // N'ajouter comme destination que si la case est libre (pas mur, pas héros)
          if (!isWall(nx, ny) && !blocked.has(key)) cells.push({ x: nx, y: ny });
          pq.push({ c: newCost, pos: { x: nx, y: ny } });
        }
      }
    }
    return cells;
  }

  getTrapBlockedCells() {
    const hero = this.currentHero;
    if (!hero || this.movementLeft === 0 || !this.traps.some(t => t.playerIdx !== hero.playerIdx)) return [];
    const withTraps    = new Set(this.getReachableCells(true).map(c => `${c.x},${c.y}`));
    const withoutTraps = this.getReachableCells(false);
    return withoutTraps.filter(c => !withTraps.has(`${c.x},${c.y}`));
  }

  // ============================================================
  // AUTO-ATTACK
  // ============================================================

  autoAttack(targetHero) {
    const attacker = this.currentHero;
    if (!attacker) return false;
    if (this.autoAttacksUsed >= this.autoAttacksAllowed) { this.addLog('Attaque de base déjà utilisée !'); return false; }
    if (this.actionsUsed >= MAX_ACTIONS)  { this.addLog('Limite d\'actions atteinte !');    return false; }
    if (targetHero.playerIdx === attacker.playerIdx) { this.addLog('Cible alliée !');       return false; }

    const effectivePO = attacker.po + (attacker.layiaBonusPOTurn || 0) + (attacker.faenaBonusPOTurn || 0);
    if (this._manhattan(attacker.position, targetHero.position) > effectivePO)
      { this.addLog('Cible hors de portée !'); return false; }
    if (!this._hasLineOfSight(attacker.position, targetHero.position))
      { this.addLog('Pas de ligne de vue !'); return false; }

    // Passif Decigeno : consume PM restants → +5% dégâts par PM
    if (attacker.passive === 'decigeno_passive' && this.movementLeft > 0) {
      const pmLeft = this.movementLeft;
      const bonus  = 5 * pmLeft;
      attacker.decigenoDmgPct = (attacker.decigenoDmgPct || 0) + bonus;
      this.movementLeft       = 0;
      this.addLog(`${attacker.name} — Passif : consume ${pmLeft} PM → +${bonus}% dégâts`);
    }

    // Passif Layia : frappe tous les ennemis à portée effective
    if (attacker.passive === 'layia_passive') {
      const targets = this._getEnemies(attacker.playerIdx).filter(e =>
        e.position && this._manhattan(attacker.position, e.position) <= effectivePO
      );
      const bonusFlat = attacker.layiaBonusNextAttack || 0;
      attacker.layiaBonusNextAttack = 0;
      const wasEmpowered  = !!attacker.empoweredAttack;
      const empowered     = attacker.empoweredAttack;
      const hadSpellBonus = wasEmpowered || bonusFlat > 0;
      if (wasEmpowered) attacker.empoweredAttack = null;
      const armorPen = (attacker.items.includes('dague_destructrice') ? 5 : 0) + (attacker.items.includes('lame_tueuse_boucliers') ? 7 : 0) + (attacker.items.includes('lame_du_ninja') ? 7 : 0);
      const armorPenPct = ((attacker.items.includes('arc_perforant_anges') || attacker.items.includes('arc_des_morts')) ? 35 : attacker.items.includes('arc_percant') ? 20 : 0) + (attacker.items.includes('revolver_d_or') ? 7 : 0) + (attacker.items.includes('lame_de_nargoth') ? 7 : 0) + (attacker.items.includes('bottes_assassin') ? 5 : 0);
      targets.forEach(e => {
        const isCrit = (attacker.critChance || 0) > 0 && Math.random() * 100 < attacker.critChance;
        const _critMult = (attacker.items.includes('lame_d_infini') ? 4.5 : 3.5) + (attacker.passive === 'faena_passive' ? Math.floor(attacker.ad / 10) / 100 : 0);
        const rawBase = Math.floor((attacker.ad * 0.25 + bonusFlat) * (isCrit ? _critMult : 1));
        // Passif Équilibre des abysses : 40% phys, 40% mag, 20% bruts
        if (attacker.passive === 'abyss_passive') {
          const physDmg = this._reduceDmg(Math.floor(rawBase * 0.4), 'physical', e, armorPen, 0, armorPenPct);
          const magDmg  = this._reduceDmg(Math.floor(rawBase * 0.4), 'magical',  e, 0, 0);
          const rawDmg  = Math.floor(rawBase * 0.2);
          this._applyDamage(e, physDmg, attacker, 'physical');
          if (e.isAlive) this._applyDamage(e, magDmg, attacker, 'magical');
          if (e.isAlive) this._applyDamage(e, rawDmg, attacker, 'raw');
          this.addLog(`${attacker.name} → ${e.name}: −${physDmg} phys −${magDmg} mag −${rawDmg} bruts (Abysses)${isCrit ? ' CRITIQUE' : ''}`);
          this._applyHemorrhage(attacker, e);
          return;
        }
        const _tdRawL = attacker.items.includes('tueur_de_dieux') ? Math.floor(rawBase * 0.30) : 0;
        let dmg = this._reduceDmg(_tdRawL > 0 ? Math.floor(rawBase * 0.70) : rawBase, 'physical', e, armorPen, 0, armorPenPct);
        let empMagicalDmg = 0;
        if (wasEmpowered) {
          if (empowered.damageType === 'magical') {
            const rawEmp = Math.floor(
              (empowered.baseDamage || 0) +
              this._effectiveAP(attacker) * (empowered.apRatio || 0) +
              (attacker.shield || 0) * (empowered.shieldRatio || 0)
            );
            empMagicalDmg = this._reduceDmg(rawEmp, 'magical', e, 0, 0);
          } else {
            const empBonus = this._reduceDmg(
              Math.floor(attacker.ad * (empowered.adRatio || 0) + this._effectiveAP(attacker) * (empowered.apRatio || 0)),
              'physical', e, armorPen, 0, armorPenPct
            );
            dmg += empBonus;
          }
        }
        // Passif Lame Bleue / Trinité Sacrée / Gantelet Refroidissant : +15% si attaque boostée
        const hasBlade = hadSpellBonus && attacker.items.some(id => ['blue_blade', 'holy_trinity', 'gantelet_refroidissant'].includes(id));
        if (hasBlade) {
          dmg = Math.floor(dmg * 1.22);
          empMagicalDmg = Math.floor(empMagicalDmg * 1.22);
        }
        if (empMagicalDmg > 0) {
          this._applyDamage(e, empMagicalDmg, attacker, 'magical');
          this.addLog(`${attacker.name} — Rock and Roll : +${empMagicalDmg} dégâts magiques${hasBlade ? ' (Lame Bleue)' : ''}`);
        }
        // Passif Vigilance Sombre (Lame de Nargoth) : +10% si armure effective cible < 15
        if (attacker.items.includes('lame_de_nargoth') && Math.floor(e.armor * (1 - 7 / 100)) < 15) dmg = Math.floor(dmg * 1.1);
        this._applyDamage(e, dmg, attacker);
        // Passif Arc Perforant des Anges : 0–30% bonus selon HP max cible (0% à 1000, 30% à 4000)
        if (attacker.items.includes('arc_perforant_anges') && e.isAlive) {
          const _apaBonusPct = Math.min(30, Math.max(0, (e.maxHP - 1000) / 3000 * 30)) / 100;
          if (_apaBonusPct > 0) {
            const _apaBonusDmg = this._reduceDmg(Math.floor(dmg * _apaBonusPct), 'physical', e, armorPen, 0, armorPenPct);
            if (_apaBonusDmg > 0) { this._applyDamage(e, _apaBonusDmg, attacker, 'physical'); this.addLog(`${attacker.name} — Arc des Anges : +${_apaBonusDmg} dégâts (${Math.round(_apaBonusPct * 100)}%)`); }
          }
        }
        this._applyHemorrhage(attacker, e);
        // Passif Gelure (Gantelet Refroidissant) : slow + zone si attaque boostée
        if (hadSpellBonus && attacker.items.includes('gantelet_refroidissant') && e.isAlive) {
          this._applyGelure(attacker, e, dmg + empMagicalDmg);
        }
        // Passif Mana Renforçant (Épée de l'Ange)
        if (attacker.items.includes('epee_ange') && e.isAlive) {
          const manaDmg = this._reduceDmg(Math.floor(attacker.maxMana * 0.03), 'physical', e, armorPen);
          if (manaDmg > 0) { this._applyDamage(e, manaDmg, attacker, 'physical'); this.addLog(`${attacker.name} — Mana Renforçant : −${manaDmg} HP`); }
        }
        // Passif Lame Électrique : 25 dégâts magiques en chaîne
        if (attacker.items.includes('lame_electrique') && e.position) {
          this._applyLameElectrique(attacker, e);
        }
        // Passif Épée Magique : dégâts magiques bonus si attaque boostée
        const hasMagicSword = hadSpellBonus && attacker.items.includes('magic_sword');
        if (hasMagicSword) {
          const pct = (15 + 0.05 * this._effectiveAP(attacker)) / 100;
          const magicBonusDmg = this._reduceDmg(Math.floor(attacker.ad * pct), 'magical', e, 0, attacker.items.includes('sorcerer_boots') ? 5 : 0);
          this._applyDamage(e, magicBonusDmg, attacker, 'magical');
          this.addLog(`${attacker.name} — Épée Magique : +${magicBonusDmg} dégâts magiques`);
        }
        const tag = [isCrit ? 'CRITIQUE' : null, wasEmpowered ? 'renforcé' : null, bonusFlat > 0 ? 'Petit Bond' : null, hasBlade ? 'Lame Bleue' : null, hasMagicSword ? 'Épée Magique' : null, armorPen > 0 ? 'Nargoth' : null].filter(Boolean).join(', ');
        this.addLog(`${attacker.name} → ${e.name}: −${dmg} HP${tag ? ` (${tag})` : ''}`);
        const _doubleOnHitL = attacker.items.includes('epee_double_feu');
        const _onHitPassesL = _doubleOnHitL ? 2 : 1;
        // Passif Poignard de Dieu : 0.35×AP dégâts magiques bonus
        for (let _h = 0; _h < _onHitPassesL; _h++) {
          if (!attacker.items.includes('poignard_de_dieu') || !e.isAlive) break;
          const pdgRaw = Math.floor(0.35 * this._effectiveAP(attacker));
          const pdgDmg = this._reduceDmg(pdgRaw, 'magical', e);
          if (pdgDmg > 0) { this._applyDamage(e, pdgDmg, attacker, 'magical'); this.addLog(`${attacker.name} — Poignard de Dieu : −${pdgDmg} dégâts magiques`); }
        }
        // Passif Salena : 0.3×AP dégâts magiques bonus
        for (let _h = 0; _h < _onHitPassesL; _h++) {
          if (attacker.passive !== 'salena_passive' || !e.isAlive) break;
          const salRaw = Math.floor(0.2 * this._effectiveAP(attacker));
          const salDmg = this._reduceDmg(salRaw, 'magical', e);
          if (salDmg > 0) { this._applyDamage(e, salDmg, attacker, 'magical'); this.addLog(`${attacker.name} — Passif : −${salDmg} dégâts magiques`); }
        }
        // Découpage : 3%+0.02×AP HP max cible en dégâts bruts
        if (attacker.decoupageActive && e.isAlive) {
          const decRaw = Math.floor(0.03 * e.maxHP + 0.02 * this._effectiveAP(attacker));
          if (decRaw > 0) { this._applyDamage(e, decRaw, attacker, 'raw'); this.addLog(`${attacker.name} — Découpage : −${decRaw} dégâts bruts`); }
        }
        // Passif Tueur de Dieux : 30% bruts
        for (let _h = 0; _h < _onHitPassesL; _h++) {
          if (_tdRawL <= 0 || !e.isAlive) break;
          this._applyDamage(e, _tdRawL, attacker, 'raw');
          this.addLog(`${attacker.name} — Tueur de Dieux : −${_tdRawL} dégâts bruts`);
        }
      });
      if (!targets.length) this.addLog(`${attacker.name} — Aucune cible à portée`);
      // Dague du Soldat : seulement si encore au corps à corps (po ≤ 1)
      if (attacker.items.includes('soldier_dagger') && attacker.po <= 1) {
        if (targets.some(e => this._manhattan(attacker.position, e.position) <= 1)) {
          attacker.daggerShield = (attacker.daggerShield || 0) + 25;
          this.addLog(`${attacker.name} — Passif Dague : bouclier +25`);
        }
      }
      // Passif Lame du Diable : 7% HP max en dégâts magiques sur chaque cible
      if (attacker.items.includes('lame_du_diable')) {
        targets.forEach(e => {
          if (!e.isAlive) return;
          const diableDmg = this._reduceDmg(Math.floor(e.currentHP * 0.07), 'magical', e);
          this._applyDamage(e, diableDmg, attacker, 'magical');
          this.addLog(`${attacker.name} — Lame du Diable : −${diableDmg} dégâts magiques`);
        });
      }
      if (attacker.items.some(id => ['white_walker_hammer', 'holy_trinity', 'lame_de_nargoth', 'couperet_du_demon'].includes(id))) {
        this.movementLeft = Math.min(attacker.pm, this.movementLeft + 1);
        this.addLog(`${attacker.name} — Passif : +1 PM`);
      }
      // Passif Cupidon : tracker les ennemis attaqués pour le passif Amour fou
      if (attacker.passive === 'cupidon_passive') {
        targets.forEach(e => attacker.cupidonAttackedThisTurn.add(e.instanceId));
      }

      // Passif Quackshot : Marque du Chasseur (Layia frappe plusieurs ennemis)
      if (attacker.passive === 'quackshot_passive' && targets.length > 0) {
        const mainTarget = targets[0];
        // Si change de cible, retirer les charges de l'ancienne cible
        if (attacker.quackshotCurrentTarget && attacker.quackshotCurrentTarget !== mainTarget.instanceId) {
          delete attacker.quackshotCharges[attacker.quackshotCurrentTarget];
          this.addLog(`${attacker.name} — Marque retirée de l'ancienne cible`);
        }
        // Ajouter une charge à chaque cible touchée (2 si Épée de Double Feu)
        const _quackCharges = attacker.items.includes('epee_double_feu') ? 2 : 1;
        targets.forEach(e => {
          attacker.quackshotCharges[e.instanceId] = (attacker.quackshotCharges[e.instanceId] || 0) + _quackCharges;
          this.addLog(`${attacker.name} → ${e.name} — Marque: +${_quackCharges} charge(s) (total: ${attacker.quackshotCharges[e.instanceId]})`);
        });
        attacker.quackshotCurrentTarget = mainTarget.instanceId;
      }

      if (attacker._skjerPassiveFired) { delete attacker._skjerPassiveFired; } else { this.autoAttacksUsed++; }
      this.actionsUsed++;
      this.canBuy = false;
      this._checkGameOver();
      return true;
    }

    // Attaque de base normale (cible unique)
    const bonusFlat2    = attacker.layiaBonusNextAttack || 0;
    attacker.layiaBonusNextAttack = 0;
    const wasEmpowered  = !!attacker.empoweredAttack;
    const hadSpellBonus = wasEmpowered || bonusFlat2 > 0;
    const armorPen2 = (attacker.items.includes('dague_destructrice') ? 5 : 0) + (attacker.items.includes('lame_tueuse_boucliers') ? 7 : 0) + (attacker.items.includes('lame_du_ninja') ? 7 : 0);
    const armorPenPct2 = ((attacker.items.includes('arc_perforant_anges') || attacker.items.includes('arc_des_morts')) ? 35 : attacker.items.includes('arc_percant') ? 20 : 0) + (attacker.items.includes('revolver_d_or') ? 7 : 0) + (attacker.items.includes('lame_de_nargoth') ? 7 : 0) + (attacker.items.includes('bottes_assassin') ? 5 : 0);
    const isCrit2 = (attacker.critChance || 0) > 0 && Math.random() * 100 < attacker.critChance;
    const _critMult2 = (attacker.items.includes('lame_d_infini') ? 4.5 : 3.5) + (attacker.passive === 'faena_passive' ? Math.floor(attacker.ad / 10) / 100 : 0);
    const rawBase2 = Math.floor((attacker.ad * 0.25 + bonusFlat2) * (isCrit2 ? _critMult2 : 1));
    // Passif Équilibre des abysses : 40% phys, 40% mag, 20% bruts
    if (attacker.passive === 'abyss_passive') {
      const physDmg2 = this._reduceDmg(Math.floor(rawBase2 * 0.4), 'physical', targetHero, armorPen2, 0, armorPenPct2);
      const magDmg2  = this._reduceDmg(Math.floor(rawBase2 * 0.4), 'magical',  targetHero, 0, 0);
      const rawDmg2  = Math.floor(rawBase2 * 0.2);
      this.addLog(`${attacker.name} attaque ${targetHero.name} — ${physDmg2} phys + ${magDmg2} mag + ${rawDmg2} bruts (Abysses)${isCrit2 ? ' CRITIQUE' : ''}`);
      this._applyDamage(targetHero, physDmg2, attacker, 'physical');
      if (targetHero.isAlive) this._applyDamage(targetHero, magDmg2, attacker, 'magical');
      if (targetHero.isAlive) this._applyDamage(targetHero, rawDmg2, attacker, 'raw');
      this._applyHemorrhage(attacker, targetHero);
      if (attacker._skjerPassiveFired) { delete attacker._skjerPassiveFired; } else { this.autoAttacksUsed++; }
      this.actionsUsed++;
      this.canBuy = false;
      this._checkGameOver();
      return true;
    }
    const _tdRaw = attacker.items.includes('tueur_de_dieux') ? Math.floor(rawBase2 * 0.30) : 0;
    let dmg = this._reduceDmg(_tdRaw > 0 ? Math.floor(rawBase2 * 0.70) : rawBase2, 'physical', targetHero, armorPen2, 0, armorPenPct2);
    let empMagicalDmg2 = 0;
    if (wasEmpowered) {
      const emp2 = attacker.empoweredAttack;
      if (emp2.damageType === 'magical') {
        const rawEmp2 = Math.floor(
          (emp2.baseDamage || 0) +
          this._effectiveAP(attacker) * (emp2.apRatio || 0) +
          (attacker.shield || 0) * (emp2.shieldRatio || 0)
        );
        empMagicalDmg2 = this._reduceDmg(rawEmp2, 'magical', targetHero, 0, 0);
      } else {
        const bonus = this._reduceDmg(
          Math.floor(attacker.ad * (emp2.adRatio || 0) + this._effectiveAP(attacker) * (emp2.apRatio || 0)),
          'physical', targetHero, armorPen2, 0, armorPenPct2
        );
        dmg += bonus;
      }
      attacker.empoweredAttack = null;
    }
    // Passif Lame Bleue / Trinité Sacrée / Gantelet Refroidissant : +15% si attaque boostée
    const hasBlade2 = hadSpellBonus && attacker.items.some(id => ['blue_blade', 'holy_trinity', 'gantelet_refroidissant'].includes(id));
    if (hasBlade2) {
      dmg = Math.floor(dmg * 1.22);
      empMagicalDmg2 = Math.floor(empMagicalDmg2 * 1.22);
    }
    // Passif Vigilance Sombre (Lame de Nargoth) : +10% si armure effective cible < 15
    if (attacker.items.includes('lame_de_nargoth') && Math.floor(targetHero.armor * (1 - 7 / 100)) < 15) dmg = Math.floor(dmg * 1.1);
    const hasMagicSword2 = hadSpellBonus && attacker.items.includes('magic_sword');
    const tag2 = [isCrit2 ? 'CRITIQUE' : null, wasEmpowered ? 'renforcé' : null, bonusFlat2 > 0 ? 'Petit Bond' : null, hasBlade2 ? 'Lame Bleue' : null, hasMagicSword2 ? 'Épée Magique' : null, armorPen2 > 0 ? 'Nargoth' : null].filter(Boolean).join(', ');
    this.addLog(`${attacker.name} attaque ${targetHero.name} — ${dmg} dégâts physiques${tag2 ? ` (${tag2})` : ''}`);
    this._applyDamage(targetHero, dmg, attacker);
    // Passif Arc Perforant des Anges : 0–30% bonus selon HP max cible (0% à 1000, 30% à 4000)
    if (attacker.items.includes('arc_perforant_anges') && targetHero.isAlive) {
      const _apaBonusPct2 = Math.min(30, Math.max(0, (targetHero.maxHP - 1000) / 3000 * 30)) / 100;
      if (_apaBonusPct2 > 0) {
        const _apaBonusDmg2 = this._reduceDmg(Math.floor(dmg * _apaBonusPct2), 'physical', targetHero, armorPen2, 0, armorPenPct2);
        if (_apaBonusDmg2 > 0) { this._applyDamage(targetHero, _apaBonusDmg2, attacker, 'physical'); this.addLog(`${attacker.name} — Arc des Anges : +${_apaBonusDmg2} dégâts (${Math.round(_apaBonusPct2 * 100)}%)`); }
      }
    }
    if (empMagicalDmg2 > 0 && targetHero.isAlive) {
      this._applyDamage(targetHero, empMagicalDmg2, attacker, 'magical');
      this.addLog(`${attacker.name} — Rock and Roll : +${empMagicalDmg2} dégâts magiques${hasBlade2 ? ' (Lame Bleue)' : ''}`);
    }
    this._applyHemorrhage(attacker, targetHero);
    // Passif Gelure (Gantelet Refroidissant) : slow + zone si attaque boostée
    if (hadSpellBonus && attacker.items.includes('gantelet_refroidissant') && targetHero.isAlive) {
      this._applyGelure(attacker, targetHero, dmg + empMagicalDmg2);
    }
    // Passif Mana Renforçant (Épée de l'Ange)
    if (attacker.items.includes('epee_ange') && targetHero.isAlive) {
      const manaDmg = this._reduceDmg(Math.floor(attacker.maxMana * 0.03), 'physical', targetHero, armorPen2);
      if (manaDmg > 0) { this._applyDamage(targetHero, manaDmg, attacker, 'physical'); this.addLog(`${attacker.name} — Mana Renforçant : −${manaDmg} HP`); }
    }
    // Passif Lame Électrique : 25 dégâts magiques en chaîne
    if (attacker.items.includes('lame_electrique') && targetHero.position) {
      this._applyLameElectrique(attacker, targetHero);
    }
    // Passif Gros Calibre (Stank) : splash aux ennemis adjacents à la cible
    if (attacker.passive === 'gros_calibre' && targetHero.position) {
      this._getEnemies(attacker.playerIdx)
        .filter(e => e !== targetHero && e.isAlive && e.position && this._chebyshev(targetHero.position, e.position) <= 4)
        .forEach(e => {
          const splashDmg = this._reduceDmg(Math.floor(attacker.ad * (isCrit2 ? _critMult2 : 1)), 'physical', e, armorPen2);
          this._applyDamage(e, splashDmg, attacker);
          this.addLog(`${attacker.name} — Passif : Gros Calibre → ${e.name}: −${splashDmg} HP (splash)`);
        });
    }
    // Passif Épée Magique : dégâts magiques bonus si attaque boostée
    if (hasMagicSword2) {
      const pct = (15 + 0.05 * attacker.ap) / 100;
      const magicBonusDmg = this._reduceDmg(Math.floor(attacker.ad * pct), 'magical', targetHero);
      this._applyDamage(targetHero, magicBonusDmg, attacker, 'magical');
      this.addLog(`${attacker.name} — Épée Magique : +${magicBonusDmg} dégâts magiques`);
    }
    // Passif Dague du Soldat : bouclier +25 si attaque corps à corps (distance ≤ 1)
    if (attacker.items.includes('soldier_dagger') && this._manhattan(attacker.position, targetHero.position) <= 1) {
      attacker.daggerShield = (attacker.daggerShield || 0) + 25;
      this.addLog(`${attacker.name} — Passif Dague : bouclier +25`);
    }
    const doubleOnHit = attacker.items.includes('epee_double_feu');
    const _onHitPasses = doubleOnHit ? 2 : 1;
    // Passif Lame du Diable : 7% HP actuels de la cible en dégâts magiques
    for (let _h = 0; _h < _onHitPasses; _h++) {
      if (!attacker.items.includes('lame_du_diable') || !targetHero.isAlive) break;
      const diableDmg = this._reduceDmg(Math.floor(targetHero.currentHP * 0.07), 'magical', targetHero);
      this._applyDamage(targetHero, diableDmg, attacker, 'magical');
      this.addLog(`${attacker.name} — Lame du Diable : −${diableDmg} dégâts magiques`);
    }
    // Passif Poignard de Dieu : 0.35×AP dégâts magiques bonus
    for (let _h = 0; _h < _onHitPasses; _h++) {
      if (!attacker.items.includes('poignard_de_dieu') || !targetHero.isAlive) break;
      const pdgRaw = Math.floor(0.35 * this._effectiveAP(attacker));
      const pdgDmg = this._reduceDmg(pdgRaw, 'magical', targetHero);
      if (pdgDmg > 0) { this._applyDamage(targetHero, pdgDmg, attacker, 'magical'); this.addLog(`${attacker.name} — Poignard de Dieu : −${pdgDmg} dégâts magiques`); }
    }
    // Passif Salena : 0.3×AP dégâts magiques bonus
    for (let _h = 0; _h < _onHitPasses; _h++) {
      if (attacker.passive !== 'salena_passive' || !targetHero.isAlive) break;
      const salRaw = Math.floor(0.2 * this._effectiveAP(attacker));
      const salDmg = this._reduceDmg(salRaw, 'magical', targetHero);
      if (salDmg > 0) { this._applyDamage(targetHero, salDmg, attacker, 'magical'); this.addLog(`${attacker.name} — Passif : −${salDmg} dégâts magiques`); }
    }
    // Découpage : 3%+0.02×AP HP max cible en dégâts bruts
    if (attacker.decoupageActive && targetHero.isAlive) {
      const decRaw = Math.floor(0.03 * targetHero.maxHP + 0.02 * this._effectiveAP(attacker));
      if (decRaw > 0) { this._applyDamage(targetHero, decRaw, attacker, 'raw'); this.addLog(`${attacker.name} — Découpage : −${decRaw} dégâts bruts`); }
    }
    // Passif Tueur de Dieux : 30% bruts
    for (let _h = 0; _h < _onHitPasses; _h++) {
      if (_tdRaw <= 0 || !targetHero.isAlive) break;
      this._applyDamage(targetHero, _tdRaw, attacker, 'raw');
      this.addLog(`${attacker.name} — Tueur de Dieux : −${_tdRaw} dégâts bruts`);
    }
    // Passif Marteau du Marcheur Blanc / Trinité Sacrée / Lame de Nargoth / Lame du Diable : +1 PM après attaque de base
    if (attacker.items.some(id => ['white_walker_hammer', 'holy_trinity', 'lame_de_nargoth', 'couperet_du_demon'].includes(id))) {
      this.movementLeft = Math.min(attacker.pm, this.movementLeft + 1);
      this.addLog(`${attacker.name} — Passif : +1 PM`);
    }
    // Passif Cupidon : tracker les ennemis attaqués pour le passif Amour fou
    if (attacker.passive === 'cupidon_passive' && targetHero) {
      attacker.cupidonAttackedThisTurn.add(targetHero.instanceId);
    }

    // Passif Quackshot : Marque du Chasseur
    if (attacker.passive === 'quackshot_passive' && targetHero) {
      // Si change de cible, retirer les charges de l'ancienne cible
      if (attacker.quackshotCurrentTarget && attacker.quackshotCurrentTarget !== targetHero.instanceId) {
        delete attacker.quackshotCharges[attacker.quackshotCurrentTarget];
        this.addLog(`${attacker.name} — Marque retirée de l'ancienne cible`);
      }
      // Ajouter une charge à la cible (2 si Épée de Double Feu)
      const _quackCharges2 = doubleOnHit ? 2 : 1;
      attacker.quackshotCharges[targetHero.instanceId] = (attacker.quackshotCharges[targetHero.instanceId] || 0) + _quackCharges2;
      attacker.quackshotCurrentTarget = targetHero.instanceId;
      this.addLog(`${attacker.name} → ${targetHero.name} — Marque: +${_quackCharges2} charge(s) (total: ${attacker.quackshotCharges[targetHero.instanceId]})`);
    }

    if (attacker._skjerPassiveFired) { delete attacker._skjerPassiveFired; } else { this.autoAttacksUsed++; }
    this.actionsUsed++;
    this.canBuy = false;
    this._checkGameOver();
    return true;
  }

  getAttackTargets() {
    const hero = this.currentHero;
    if (!hero) return [];
    const effectivePO = hero.po + (hero.layiaBonusPOTurn || 0) + (hero.faenaBonusPOTurn || 0);
    return this._getEnemies(hero.playerIdx).filter(e =>
      this._manhattan(hero.position, e.position) <= effectivePO
    );
  }

  getAttackRangeCells() {
    const hero = this.currentHero;
    if (!hero?.position) return [];
    const effectivePO = hero.po + (hero.layiaBonusPOTurn || 0) + (hero.faenaBonusPOTurn || 0);
    const cells = [];
    for (let x = 0; x < MAP_SIZE; x++)
      for (let y = 0; y < MAP_SIZE; y++)
        if (!isWall(x, y) && this._manhattan(hero.position, { x, y }) <= effectivePO)
          cells.push({ x, y });
    return cells;
  }

  // ============================================================
  // SPELLS
  // ============================================================

  castSpell(spell, target) {
    const caster = this.currentHero;
    if (!caster) return false;

    const _usedCount = typeof this.spellsUsed[spell.id] === 'number' ? this.spellsUsed[spell.id] : (this.spellsUsed[spell.id] ? 999 : 0);
    if (_usedCount >= (spell.maxUsesPerTurn || 1)) { this.addLog(`${spell.name} déjà utilisé !`); return false; }
    // Hornet Q — Lance Soyeuse : peut être relancée immédiatement si une cible est marquée
    if (spell.id === 'hornet_q') {
      const targetHero = target?.hero;
      if (targetHero && (caster.hornetHarpoonedTargets[targetHero.instanceId] || 0) > this.globalTurn) {
        // Réactivation sur cible marquée - ignorer le CD
      } else if (caster.cooldowns[spell.id] > 0) {
        this.addLog(`${spell.name} en recharge (${caster.cooldowns[spell.id]})`); return false;
      }
    // Solo Rappel : réactivation autorisée même avec CD (retour au spawn)
    } else if (spell.id === 'solo_recall' && caster.soloRecallActive) {
      // Réactivation — pas de vérification de CD
    } else if (caster.cooldowns[spell.id] > 0) {
      this.addLog(`${spell.name} en recharge (${caster.cooldowns[spell.id]})`); return false;
    }
    const _hasManaDisco = caster.items.includes('sceptre_ange') || caster.items.includes('epee_ange');
    const _effectiveManaCost = _hasManaDisco ? Math.floor(spell.manaCost * 0.85) : spell.manaCost;
    const _isRecallReactivation = spell.id === 'solo_recall' && caster.soloRecallActive;
    if (!_isRecallReactivation && caster.currentMana < _effectiveManaCost){ this.addLog('Pas assez de mana !'); return false; }
    if (this.actionsUsed >= MAX_ACTIONS)    { this.addLog('Limite d\'actions atteinte !');               return false; }
    if (caster.mutedThisTurn || (caster.statusEffects || []).some(e => e.type === 'mute')) {
      this.addLog(`${caster.name} est muet — sorts bloqués !`); return false;
    }
    const _dashTypes = ['stealth_dash','dash_to_enemy','dash_to_ally','dash_behind_enemy','swap_enemy','swap_ally','faena_w','pibot_w'];
    if ((caster.rootTurns || 0) > 0 && _dashTypes.includes(spell.targetType)) {
      this.addLog(`${caster.name} est immobilisé — dash bloqué !`); return false;
    }

    // Range check (malediction reduces effective range by 3, min 1)
    const _effectiveRange = spell.range > 0 ? Math.max(1, spell.range + (caster.bonusSpellRange || 0) - (caster.maledictionTurns > 0 ? 3 : 0)) : spell.range;
    if (spell.targetType !== 'self' && spell.targetType !== 'no_target' && spell.targetType !== 'line_zone' && spell.range > 0 && !spell.targetAll) {
      const tx = target?.x ?? target?.hero?.position?.x ?? caster.position.x;
      const ty = target?.y ?? target?.hero?.position?.y ?? caster.position.y;
      if (this._manhattan(caster.position, { x: tx, y: ty }) > _effectiveRange) {
        this.addLog('Hors de portée !'); return false;
      }
      if (spell.lineOnly) {
        const dx = Math.abs(tx - caster.position.x), dy = Math.abs(ty - caster.position.y);
        if (dx !== 0 && dy !== 0) { this.addLog('Ce sort ne peut être lancé qu\'en ligne droite !'); return false; }
      }
    }

    if (!_isRecallReactivation) caster.currentMana -= _effectiveManaCost;

    // Passif Toucher Magique (casque_necrometien) — prêt à se déclencher pour ce sort
    this._toucherMagiqueReady = caster.items.includes('casque_necrometien');

    // Passif Decigeno : consume PM restants → +5% dégâts par PM (avant calcul des dégâts)
    if (caster.passive === 'decigeno_passive' && this.movementLeft > 0) {
      const pmLeft = this.movementLeft;
      const bonus  = 5 * pmLeft;
      caster.decigenoDmgPct = (caster.decigenoDmgPct || 0) + bonus;
      this.movementLeft     = 0;
      this.addLog(`${caster.name} — Passif : consume ${pmLeft} PM → +${bonus}% dégâts`);
    }

    let success = true;

    switch (spell.targetType) {
      case 'enemy_hero': {
        const enemy = target?.hero;
        if (!enemy || enemy.playerIdx === caster.playerIdx) { success = false; break; }

        // Hornet Q — Lance Soyeuse : logique spéciale
        if (spell.id === 'hornet_q') {
          const hasActiveMarks = Object.values(caster.hornetHarpoonedTargets || {}).some(expiry => expiry > this.globalTurn);
          const targetIsMarked = (caster.hornetHarpoonedTargets[enemy.instanceId] || 0) > this.globalTurn;

          if (hasActiveMarks && !targetIsMarked) {
            // Une marque existe sur quelqu'un d'autre — pas possible de marquer une nouvelle cible
            this.addLog('Une cible est déjà marquée — ne peut réactiver que sur elle!'); success = false; break;
          }
          // Si c'est une réactivation, ignorer portée et ligne de vue
          if (!targetIsMarked) {
            // Première utilisation — portée + ligne droite obligatoire (pas de LoS)
            if (this._manhattan(caster.position, enemy.position) > spell.range) {
              this.addLog('Hors de portée !'); success = false; break;
            }
            const _qdx = enemy.position.x - caster.position.x;
            const _qdy = enemy.position.y - caster.position.y;
            if (_qdx !== 0 && _qdy !== 0) {
              this.addLog('Lance Soyeuse doit être lancée en ligne droite !'); success = false; break;
            }
          }
          // Réactivation : pas de check de portée ni ligne de vue
        } else if (spell.targetAll) {
          // From Downtown — bypass range, target any enemy
        } else if (this._manhattan(caster.position, enemy.position) > spell.range) {
          this.addLog('Hors de portée !'); success = false; break;
        }
        // Ligne de vue (sauf sorts globaux et ignoresLoS)
        if (spell.id !== 'hornet_q' && !spell.targetAll && !spell.ignoresLoS) {
          if (!this._hasLineOfSight(caster.position, enemy.position)) {
            this.addLog('Ligne de vue bloquée !'); success = false; break;
          }
        }
        // Filet (Stank) : exige une ligne droite orthogonale
        if (spell.requiresLine) {
          const rdx = enemy.position.x - caster.position.x;
          const rdy = enemy.position.y - caster.position.y;
          if (rdx !== 0 && rdy !== 0) {
            this.addLog('Sort en ligne droite uniquement !'); success = false; break;
          }
        }
        // Condition : cible doit avoir plus de HP max que le lanceur (Appel du chevalier)
        if (spell.conditionHigherHP && enemy.maxHP <= caster.maxHP) {
          this.addLog(`${caster.name} → ${spell.name} : la cible n'a pas plus de HP max !`);
          success = false; break;
        }
        if (spell.splitRawPct) {
          // Dégâts mixtes : splitRawPct% bruts, reste en physiques
          const totalRaw = Math.floor(spell.baseDamage + caster.ad * (spell.adRatio || 0));
          const physRaw  = Math.floor(totalRaw * (1 - spell.splitRawPct));
          const rawPart  = totalRaw - physRaw;
          const physDmg  = this._reduceDmg(physRaw, 'physical', enemy, caster.armorPenPct || 0, 0);
          this._applySpellDamage(caster, spell, enemy, physDmg);
          if (enemy.isAlive) this._applyDamage(enemy, rawPart, caster, 'raw');
          this.addLog(`${caster.name} → ${spell.name} → ${enemy.name}: −${physDmg} phys + −${rawPart} bruts`);
        } else {
          const dmg = this._calcSpellDmg(caster, spell, enemy);
          this._applySpellDamage(caster, spell, enemy, dmg);
          this.addLog(`${caster.name} → ${spell.name} → ${enemy.name}: −${dmg} HP`);
        }
        this._applySpellEffects(spell, [enemy]);
        if (caster.passive === 'electro_passive') { caster.ap += 5; this.addLog(`${caster.name} — Passif : +5 AP`); }

        // Quackshot Q — Chasse à l'épuisement : effets basés sur les charges
        if (spell.id === 'quackshot_q' && enemy.isAlive) {
          const charges = caster.quackshotCharges[enemy.instanceId] || 0;
          if (charges >= 16) {
            enemy.rootTurns = Math.max(enemy.rootTurns, 1);
            this.addLog(`${enemy.name} — Root appliqué (16+ charges)`);
          } else if (charges >= 8) {
            if (!enemy.statusEffects) enemy.statusEffects = [];
            const existingSlow = enemy.statusEffects.find(e => e.type === 'slow' && e.pmReduction === 2);
            if (!existingSlow) {
              enemy.statusEffects.push({ type: 'slow', pmReduction: 2, turns: 1 });
            }
            this.addLog(`${enemy.name} — Ralenti de 2 PM pendant 1 tour (8+ charges)`);
          }
        }

        // Quackshot W — Changement de proie : transférer 50% (min 1) des charges de la cible actuelle
        if (spell.id === 'quackshot_w') {
          if (!caster.quackshotCurrentTarget) {
            this.addLog(`${caster.name} → ${spell.name} : aucune cible marquée`); success = false; break;
          }
          if (caster.quackshotCurrentTarget === enemy.instanceId) {
            this.addLog(`${caster.name} → ${spell.name} : sélectionnez une cible différente`); success = false; break;
          }
          const currentTarget = [...this._getEnemies(caster.playerIdx), ...this._getAllies(caster.playerIdx)].find(h => h.instanceId === caster.quackshotCurrentTarget);
          if (!currentTarget || !currentTarget.isAlive) {
            this.addLog(`${caster.name} → ${spell.name} : cible actuelle introuvable`); success = false; break;
          }
          const charges = caster.quackshotCharges[currentTarget.instanceId] || 0;
          if (charges === 0) {
            this.addLog(`${caster.name} → ${spell.name} : aucune charge à transférer`); success = false; break;
          }
          const transferred = Math.max(1, Math.floor(charges * 0.5));
          delete caster.quackshotCharges[currentTarget.instanceId];
          caster.quackshotCharges[enemy.instanceId] = (caster.quackshotCharges[enemy.instanceId] || 0) + transferred;
          caster.quackshotCurrentTarget = enemy.instanceId;
          this.addLog(`${caster.name} — Changement de proie: ${transferred} charge(s) transférée(s) de ${currentTarget.name} à ${enemy.name}`);
        }

        // Quackshot R — Coup de grâce : consomme toutes les charges
        if (spell.id === 'quackshot_r') {
          const charges = caster.quackshotCharges[enemy.instanceId] || 0;
          if (charges > 0) {
            const bonusDmg = charges * Math.floor(caster.ad * 0.25);
            this._applyDamage(enemy, bonusDmg, caster, 'physical');
            delete caster.quackshotCharges[enemy.instanceId];
            this.addLog(`${enemy.name} — Coup de grâce: +${bonusDmg} dégâts (${charges} charges consommées)`);
          } else {
            this.addLog(`${caster.name} → ${spell.name} : la cible n'a pas de charges`);
          }
        }

        // Hornet Q — Lance Soyeuse : marquer la cible
        if (spell.id === 'hornet_q' && enemy.isAlive) {
          const hadMarkBefore = (caster.hornetHarpoonedTargets[enemy.instanceId] || 0) > this.globalTurn;
          caster.hornetHarpoonedTargets[enemy.instanceId] = this.globalTurn + 2;
          this.addLog(`${enemy.name} — Harponné par Lance Soyeuse (marque jusqu'au tour ${this.globalTurn + 2})`);
          // Tracker: si la cible avait déjà une marque, c'est une réactivation
          if (!caster.hornetIsReactivation) caster.hornetIsReactivation = {};
          caster.hornetIsReactivation[enemy.instanceId] = hadMarkBefore;
          caster.hornetDidNotUsePMThisTurn = false;

          // Réactivation : dégâts supplémentaires + téléportation
          if (hadMarkBefore) {
            const bonusDmg = Math.floor(25 + caster.ad * 0.4);
            this._applyDamage(enemy, bonusDmg, caster, 'physical');
            this.addLog(`${caster.name} — Lance Soyeuse (réactivation) : +${bonusDmg} dégâts bonus`);

            // Téléporter Hornet sur une case adjacente (non-diagonale) à l'ennemi marqué
            const adjacentCells = [
              { x: enemy.position.x, y: enemy.position.y - 1 }, // haut
              { x: enemy.position.x, y: enemy.position.y + 1 }, // bas
              { x: enemy.position.x - 1, y: enemy.position.y }, // gauche
              { x: enemy.position.x + 1, y: enemy.position.y }  // droite
            ];
            // Vérifier les cases valides (pas de mur, pas de héros)
            const allHeroPositions = new Set();
            for (const player of this.players) {
              for (const h of player.heroes) {
                if (h && h.isAlive) allHeroPositions.add(`${h.position.x},${h.position.y}`);
              }
            }
            const validCells = adjacentCells.filter(cell =>
              cell.x >= 0 && cell.x < MAP_SIZE && cell.y >= 0 && cell.y < MAP_SIZE &&
              !isWall(cell.x, cell.y) &&
              !allHeroPositions.has(`${cell.x},${cell.y}`)
            );

            if (validCells.length > 0) {
              const randomCell = validCells[Math.floor(Math.random() * validCells.length)];
              caster.position.x = randomCell.x;
              caster.position.y = randomCell.y;
              this.addLog(`${caster.name} — Téléporté sur case adjacente`);
            } else {
              this.addLog(`${caster.name} — Aucune case adjacente disponible`);
            }
          }
        }

        // Hornet W — Pourfandage aiguisé : dégâts supplémentaires et vol de PM si marqué
        if (spell.id === 'hornet_w' && enemy.isAlive) {
          const isHarpooned = (caster.hornetHarpoonedTargets[enemy.instanceId] || 0) > this.globalTurn;
          if (isHarpooned) {
            const bonusDmg = Math.floor(15 + caster.ad * 0.5);
            this._applyDamage(enemy, bonusDmg, caster, 'physical');
            this.movementLeft += 1;
            enemy.movementLeft = Math.max(0, (enemy.movementLeft || 0) - 1);
            this.addLog(`${caster.name} — Pourfandage: +${bonusDmg} dégâts, vol 1 PM`);
          }
          caster.hornetDidNotUsePMThisTurn = false;
        }

        // Pibot — Pinces robotiques : attirer la cible de pullCells cases
        if (spell.pullCells && enemy.isAlive) {
          const pdx = Math.sign(caster.position.x - enemy.position.x);
          const pdy = Math.sign(caster.position.y - enemy.position.y);
          for (let step = 0; step < spell.pullCells; step++) {
            const nx = enemy.position.x + pdx, ny = enemy.position.y + pdy;
            if (nx < 0 || nx >= MAP_SIZE || ny < 0 || ny >= MAP_SIZE) break;
            if (isWall(nx, ny) || this.getHeroAt(nx, ny)) break;
            enemy.position = { x: nx, y: ny };
          }
          this.addLog(`${enemy.name} attiré de ${spell.pullCells} case(s) vers ${caster.name}`);
          this._checkTrap(enemy);
          if (enemy.roleId === 'roam') this._checkBrownCollection(enemy);
          this._checkPibotBattery(enemy);
        }
        break;
      }
      case 'swap_enemy': {
        const enemy = target?.hero;
        if (!enemy || enemy.playerIdx === caster.playerIdx) { success = false; break; }
        if (this._manhattan(caster.position, enemy.position) > spell.range) {
          this.addLog('Hors de portée !'); success = false; break;
        }
        const casterPos = { ...caster.position };
        const enemyPos  = { ...enemy.position };
        caster.position = enemyPos;
        enemy.position  = casterPos;
        const dmgSwap = this._calcSpellDmg(caster, spell, enemy);
        this._applySpellDamage(caster, spell, enemy, dmgSwap);
        this.addLog(`${caster.name} → ${spell.name} → ${enemy.name}: échange + −${dmgSwap} HP`);
        this._applySpellEffects(spell, [enemy]);
        // Les deux héros peuvent déclencher des pièges/glyphes sur leur nouvelle case
        this._checkTrap(caster);
        if (caster.roleId === 'roam') this._checkBrownCollection(caster);
        this._checkTrap(enemy);
        if (enemy.roleId === 'roam') this._checkBrownCollection(enemy);
        break;
      }
      case 'trap': {
        const { x, y } = target;
        if (isWall(x, y))               { this.addLog('Impossible sur un mur !');           success = false; break; }
        if (this.getHeroAt(x, y))       { this.addLog('Un héros est sur cette case !');      success = false; break; }
        if (this.traps.some(t => t.x === x && t.y === y)) { this.addLog('Piège déjà posé ici !'); success = false; break; }
        if (this._manhattan(caster.position, { x, y }) > spell.range) { this.addLog('Hors de portée !'); success = false; break; }
        if (!spell.ignoresLoS && !this._hasLineOfSight(caster.position, { x, y })) {
          this.addLog('Ligne de vue bloquée !'); success = false; break;
        }
        this.traps.push({ x, y, turnsLeft: 3, permanent: !!spell.permanent,
          playerIdx: caster.playerIdx, ownerHero: caster,
          baseDamage: spell.baseDamage, adRatio: spell.adRatio, apRatio: spell.apRatio, damageType: spell.damageType });
        this.addLog(`${caster.name} pose un piège en (${x},${y})${spell.permanent ? ' (permanent)' : ' — 3 tours'}`);
        break;
      }
      case 'cone_zone': {
        const { x: cx2, y: cy2 } = target;
        const cdx = cx2 - caster.position.x, cdy = cy2 - caster.position.y;
        if (cdx !== 0 && cdy !== 0) { this.addLog('Cône : direction orthogonale requise !'); success = false; break; }
        if (cdx === 0 && cdy === 0) { this.addLog('Cible invalide !'); success = false; break; }
        const fdx = Math.sign(cdx), fdy = Math.sign(cdy);
        const coneHit = [];
        for (let gx = 0; gx < MAP_SIZE; gx++) {
          for (let gy = 0; gy < MAP_SIZE; gy++) {
            const fwd = fdx !== 0 ? (gx - caster.position.x) * fdx : (gy - caster.position.y) * fdy;
            const lat = fdx !== 0 ? Math.abs(gy - caster.position.y) : Math.abs(gx - caster.position.x);
            if (fwd >= 1 && fwd <= spell.range && lat <= fwd && !isWall(gx, gy)) {
              const e = this.getHeroAt(gx, gy);
              if (e && e.playerIdx !== caster.playerIdx) coneHit.push(e);
            }
          }
        }
        if (!coneHit.length) { this.addLog('Aucune cible dans le cône !'); success = false; break; }
        coneHit.forEach(e => {
          const dmg = this._calcSpellDmg(caster, spell, e);
          this._applySpellDamage(caster, spell, e, dmg);
          this.addLog(`${caster.name} → ${spell.name} → ${e.name}: −${dmg} HP`);
        });
        this._applySpellEffects(spell, coneHit);
        break;
      }
      case 'bomb_zone': {
        const { x: bx, y: by } = target;
        if (isWall(bx, by)) { this.addLog('Position invalide !'); success = false; break; }
        this.bombZones.push({ cx: bx, cy: by, radius: 2, turnsLeft: 3, caster,
          baseDamage: spell.baseDamage, adRatio: spell.adRatio });
        this.addLog(`${caster.name} → ${spell.name} : zone de bombardement en (${bx},${by}) — 3 tours`);
        break;
      }
      case 'push_enemy': {
        const pushEnemy = target?.hero;
        if (!pushEnemy || pushEnemy.playerIdx === caster.playerIdx) { success = false; break; }
        if (this._manhattan(caster.position, pushEnemy.position) > spell.range) {
          this.addLog('Hors de portée !'); success = false; break;
        }
        const { dx: pdx, dy: pdy } = target;
        let _px = pushEnemy.position.x, _py = pushEnemy.position.y;
        for (let step = 1; step <= 3; step++) {
          const nx2 = _px + pdx, ny2 = _py + pdy;
          if (nx2 < 0 || nx2 >= MAP_SIZE || ny2 < 0 || ny2 >= MAP_SIZE) break;
          if (isWall(nx2, ny2) || this.getHeroAt(nx2, ny2)) break;
          _px = nx2; _py = ny2;
        }
        pushEnemy.position = { x: _px, y: _py };
        this.addLog(`${caster.name} → ${spell.name} → ${pushEnemy.name} poussé en (${_px},${_py})`);
        if (spell.damageType && spell.baseDamage) {
          const pdmg = this._calcSpellDmg(caster, spell, pushEnemy);
          this._applySpellDamage(caster, spell, pushEnemy, pdmg);
          this.addLog(`${caster.name} → ${spell.name} → ${pushEnemy.name}: −${pdmg} HP`);
        }
        this._applySpellEffects(spell, [pushEnemy]);
        this._checkTrap(pushEnemy);
        this._checkBombZone(pushEnemy);
        this._checkGameOver();
        break;
      }
      case 'hate_wall': {
        const { x: hwx, y: hwy } = target;
        const hwdx = hwx - caster.position.x, hwdy = hwy - caster.position.y;
        if ((hwdx !== 0 && hwdy !== 0) || (hwdx === 0 && hwdy === 0)) {
          this.addLog('Direction orthogonale requise !'); success = false; break;
        }
        if (Math.abs(hwdx) + Math.abs(hwdy) !== spell.range) {
          this.addLog(`Portée exacte ${spell.range} requise !`); success = false; break;
        }
        const perpDx = hwdy !== 0 ? 1 : 0, perpDy = hwdx !== 0 ? 1 : 0;
        const hwCells = [];
        for (let off = -1; off <= 1; off++) {
          const wx = hwx + perpDx * off, wy = hwy + perpDy * off;
          if (wx >= 0 && wx < MAP_SIZE && wy >= 0 && wy < MAP_SIZE && !isWall(wx, wy))
            hwCells.push({ x: wx, y: wy });
        }
        if (!hwCells.length) { this.addLog('Aucune case disponible pour le mur !'); success = false; break; }
        this.hateWalls.push({ cells: hwCells, ownerPlayerIdx: caster.playerIdx, turnsLeft: 2 });
        this.addLog(`${caster.name} → ${spell.name} : mur de haine posé (${hwCells.length} cases, 2 tours)`);
        break;
      }
      case 'swap_ally': {
        const ally = target?.hero;
        if (!ally || ally.playerIdx !== caster.playerIdx || ally === caster) {
          this.addLog('Cible invalide !'); success = false; break;
        }
        const _cPos = { ...caster.position };
        const _aPos = { ...ally.position };
        caster.position = _aPos;
        ally.position   = _cPos;
        this.addLog(`${caster.name} → ${spell.name} → ${ally.name} : échange de positions`);
        this._checkTrap(caster);
        if (caster.roleId === 'roam') this._checkBrownCollection(caster);
        this._checkTrap(ally);
        if (ally.roleId === 'roam') this._checkBrownCollection(ally);
        break;
      }
      case 'line_zone': {
        const { x, y } = target;
        const ldx = x - caster.position.x, ldy = y - caster.position.y;
        if (ldx !== 0 && ldy !== 0) { this.addLog('Doit être en ligne droite (orthogonale) !'); success = false; break; }
        const ldist = Math.abs(ldx) + Math.abs(ldy);
        if (ldist < spell.minRange || ldist > spell.maxRange) { this.addLog(`Portée invalide (${spell.minRange}–${spell.maxRange} cases) !`); success = false; break; }
        const udx = ldx === 0 ? 0 : Math.sign(ldx);
        const udy = ldy === 0 ? 0 : Math.sign(ldy);
        const hit = [];
        for (let step = spell.minRange; step <= spell.maxRange; step++) {
          const cx = caster.position.x + udx * step, cy = caster.position.y + udy * step;
          if (cx < 0 || cx >= MAP_SIZE || cy < 0 || cy >= MAP_SIZE) break;
          const e = this.getHeroAt(cx, cy);
          if (e && e.playerIdx !== caster.playerIdx) hit.push(e);
        }
        if (!hit.length) { this.addLog('Aucune cible sur la ligne !'); success = false; break; }
        hit.forEach(e => {
          const dmg = this._calcSpellDmg(caster, spell, e);
          this._applySpellDamage(caster, spell, e, dmg);
          this.addLog(`${caster.name} → ${spell.name} → ${e.name}: −${dmg} HP`);
        });
        this._applySpellEffects(spell, hit);
        if (caster.passive === 'electro_passive') { caster.ap += 5 * hit.length; this.addLog(`${caster.name} — Passif : +${5 * hit.length} AP`); }
        break;
      }
      case 'ally_hero': {
        const ally = target?.hero;
        if (!ally || ally.playerIdx !== caster.playerIdx) { success = false; break; }
        // Destinée (Gabriel R) : invincibilité
        if (spell.invincibility) {
          ally.invincibleTurnsLeft = 1;
          ally.statusEffects = [];
          ally.rootTurns = 0;
          ally.hemorrhageTurns = 0;
          ally.maledictionTurns = 0;
          this.addLog(`${caster.name} → ${spell.name} → ${ally.name} : invincible jusqu'à la fin de son prochain tour !`);
          break;
        }
        // Buff PM (Miaou Miaou ! de Shana)
        if (spell.pmBuff) {
          ally.bonusPMNextTurn = (ally.bonusPMNextTurn || 0) + spell.pmBuff;
          this.addLog(`${caster.name} → ${spell.name} → ${ally.name}: +${spell.pmBuff} PM au prochain tour`);
          break;
        }
        const baseHeal = Math.floor((spell.healBase || 0) + this._effectiveAP(caster) * (spell.healApRatio || 0))
                       + (caster.items.includes('diademe_de_la_reine') ? Math.floor(caster.maxMana * 0.03) : 0);
        const healFactor = ally.hemorrhageTurns > 0 ? 0.5 : 1;
        const heal = Math.floor(baseHeal * healFactor * (1 + (ally.healEfficiency || 0) / 100));
        ally.currentHP = Math.min(ally.maxHP, ally.currentHP + heal);
        Stats.addHeal(caster.id, heal);
        if (ally !== caster) { if (!ally.buffedBy) ally.buffedBy = {}; ally.buffedBy[caster.id] = this.globalTurn; }
        this.addLog(`${caster.name} soigne ${ally.name} +${heal} HP${ally.hemorrhageTurns > 0 ? ' (hémorragie -50%)' : ''}`);
        // Passif Anastasia : +50 PO par soin (allié ou soi-même)
        if (caster.passive === 'anastasia_passive') {
          this._giveGold(caster, 50);
          this.addLog(`${caster.name} — Passif : +50 PO`);
        }
        // Passif Shana — Félin pour l'autre : se soigne du même montant
        if (caster.passive === 'shana_passive' && ally !== caster) {
          const selfHealFactor = caster.hemorrhageTurns > 0 ? 0.5 : 1;
          const selfHeal = Math.floor(heal * selfHealFactor);
          caster.currentHP = Math.min(caster.maxHP, caster.currentHP + selfHeal);
          Stats.addHeal(caster.id, selfHeal);
          this.addLog(`${caster.name} — Passif : auto-soin +${selfHeal} HP`);
        }
        break;
      }
      case 'self': {
        if (spell.empoweredAttack) {
          caster.empoweredAttack = typeof spell.empoweredAttack === 'object'
            ? { ...spell.empoweredAttack }
            : { adRatio: spell.adRatio, apRatio: spell.apRatio };
          this.addLog(`${caster.name} → ${spell.name}: prochaine attaque renforcée`);
        } else {
          const shield = Math.floor(
            (spell.shieldAmount || 0) +
            caster.ad * (spell.adShieldRatio || 0) +
            this._effectiveAP(caster) * (spell.apShieldRatio || 0)
          );
          caster.shield += shield;
          if (spell.shieldTurns) caster.shieldTurnsLeft = spell.shieldTurns;
          Stats.addShield(caster.id, shield);
          this.addLog(`${caster.name} → ${spell.name}: bouclier +${shield}`);
        }
        break;
      }
      case 'stealth_dash': {
        const { x, y } = target;
        const dx = x - caster.position.x, dy = y - caster.position.y;
        // Must be orthogonal (not diagonal) and within range
        if ((dx !== 0 && dy !== 0) || Math.abs(dx) + Math.abs(dy) > spell.range) {
          this.addLog('Destination invalide (en ligne droite uniquement) !'); success = false; break;
        }
        if (this.getHeroAt(x, y)) { this.addLog('Case occupée !'); success = false; break; }
        // Cupidon W — Vérifier qu'il y a un mur sur le chemin
        if (spell.throughWallOnly) {
          let hasWallOnPath = false;
          const stepCount = Math.abs(dx) + Math.abs(dy);
          const stepDx = dx === 0 ? 0 : dx / Math.abs(dx);
          const stepDy = dy === 0 ? 0 : dy / Math.abs(dy);
          for (let step = 1; step < stepCount; step++) {
            const checkX = caster.position.x + stepDx * step;
            const checkY = caster.position.y + stepDy * step;
            if (isWall(checkX, checkY)) {
              hasWallOnPath = true;
              break;
            }
          }
          if (!hasWallOnPath) { this.addLog('Pas de mur sur le chemin !'); success = false; break; }
        }
        caster.position = { x, y };
        // Bonus next attack (Layia Petit Bond)
        if (spell.bonusNextAttackAP) {
          caster.layiaBonusNextAttack = Math.floor(this._effectiveAP(caster) * spell.bonusNextAttackAP);
          this.addLog(`${caster.name} → ${spell.name}: prochaine attaque +${caster.layiaBonusNextAttack}`);
        }
        if (!spell.noDamageOnLand) {
          // Damage all adjacent enemies (chebyshev 1)
          const hit = this._getEnemies(caster.playerIdx).filter(e =>
            e.position && this._chebyshev(caster.position, e.position) <= 1
          );
          if (hit.length) {
            hit.forEach(e => {
              const dmg = this._calcSpellDmg(caster, spell, e);
              this._applySpellDamage(caster, spell, e, dmg);
              this.addLog(`${caster.name} → ${spell.name} → ${e.name}: −${dmg} HP`);
            });
            if (caster.passive === 'electro_passive') { caster.ap += 5 * hit.length; this.addLog(`${caster.name} — Passif : +${5 * hit.length} AP`); }
          } else {
            this.addLog(`${caster.name} → ${spell.name} (aucune cible adjacente)`);
          }
        } else if (!spell.bonusNextAttackAP) {
          this.addLog(`${caster.name} → ${spell.name}`);
        }
        this._checkBrownCollection(caster);
        this._checkTrap(caster);
        break;
      }
      case 'abyss_w': {
        // Dash en ligne droite (orthogonal, max spell.range cases)
        const { x: wx, y: wy } = target;
        const wdx = wx - caster.position.x, wdy = wy - caster.position.y;
        if ((wdx !== 0 && wdy !== 0) || Math.abs(wdx) + Math.abs(wdy) > spell.range) {
          this.addLog('Nuisance noire : destination en ligne droite uniquement !'); success = false; break;
        }
        if (this.getHeroAt(wx, wy)) { this.addLog('Case occupée !'); success = false; break; }
        caster.position = { x: wx, y: wy };
        this._checkBrownCollection(caster);
        this._checkTrap(caster);
        // Appliquer DOT aux ennemis à ≤ 3 cases (manhattan)
        const dotDmgPerTurn = Math.floor(spell.baseDamage + this._effectiveAP(caster) * spell.apRatio);
        const dotTargets = this._getEnemies(caster.playerIdx).filter(e =>
          e.isAlive && e.position && this._manhattan(caster.position, e.position) <= 3
        );
        dotTargets.forEach(e => {
          (e.dots = e.dots || []).push({ dmgPerTurn: dotDmgPerTurn, turns: 3, caster, type: 'magical' });
          this.addLog(`${e.name} subit Nuisance noire : −${dotDmgPerTurn} dégâts magiques/tour pendant 3 tours`);
          if (!e.debuffContributors) e.debuffContributors = {};
          e.debuffContributors[caster.id] = this.globalTurn;
        });
        if (!dotTargets.length) this.addLog(`${caster.name} → Nuisance noire (aucune cible à portée)`);
        break;
      }
      case 'abyss_r': {
        // Nuit infinie : dash sur un ennemi à 8-10 cases (sans ligne de vue)
        const rEnemy = target?.hero;
        if (!rEnemy || rEnemy.playerIdx === caster.playerIdx) { success = false; break; }
        const rDist = this._manhattan(caster.position, rEnemy.position);
        if (rDist < (spell.minRange || 8) || rDist > spell.range) {
          this.addLog(`Nuit infinie : la cible doit être à ${spell.minRange || 8}–${spell.range} cases !`);
          success = false; break;
        }
        const rFreeAdj = this._getAdjacentFreeCells(rEnemy.position, caster);
        if (!rFreeAdj.length) { this.addLog('Aucune case libre autour de la cible !'); success = false; break; }
        caster.position = rFreeAdj.reduce((best, c) =>
          this._manhattan(caster.position, c) < this._manhattan(caster.position, best) ? c : best
        );
        this._checkBrownCollection(caster);
        this._checkTrap(caster);
        const rDmg = this._calcSpellDmg(caster, spell, rEnemy);
        this._applySpellDamage(caster, spell, rEnemy, rDmg);
        this.addLog(`${caster.name} → Nuit infinie → ${rEnemy.name}: −${rDmg} HP`);
        break;
      }
      case 'faena_w': {
        // Boost : se déplace d'une case (sans PM) + +1 PO ce tour
        const { x: fwx, y: fwy } = target;
        if (this._manhattan(caster.position, { x: fwx, y: fwy }) !== 1) {
          this.addLog('Boost : case adjacente requise !'); success = false; break;
        }
        if (isWall(fwx, fwy)) { this.addLog('Case invalide !'); success = false; break; }
        if (this.getHeroAt(fwx, fwy)) { this.addLog('Case occupée !'); success = false; break; }
        caster.position = { x: fwx, y: fwy };
        caster.faenaBonusPOTurn = (caster.faenaBonusPOTurn || 0) + 1;
        this.addLog(`${caster.name} → ${spell.name}: déplacement en (${fwx},${fwy}) +1 PO ce tour`);
        this._checkTrap(caster);
        break;
      }
      case 'faena_r': {
        // Flèches de douleur : zone 1-3-1, peut critiquer selon le % de chance de coup critique
        const { x: frx, y: fry } = target;
        if (this._manhattan(caster.position, { x: frx, y: fry }) > spell.range) {
          this.addLog('Hors de portée !'); success = false; break;
        }
        const frHit = this._getEnemies(caster.playerIdx).filter(e =>
          Math.abs(e.position.x - frx) + Math.abs(e.position.y - fry) <= 1
        );
        if (!frHit.length) { this.addLog('Aucune cible dans la zone !'); success = false; break; }
        const frCritChance  = caster.critChance || 0;
        const frIsCrit      = frCritChance > 0 && Math.random() * 100 < frCritChance;
        const frCritMult    = (caster.items.includes('lame_d_infini') ? 2.5 : 2.0) + (caster.passive === 'faena_passive' ? Math.floor(caster.ad / 10) / 100 : 0);
        const armorPenFr    = (caster.items.includes('dague_destructrice') ? 5 : 0) + (caster.items.includes('lame_tueuse_boucliers') ? 7 : 0) + (caster.items.includes('lame_du_ninja') ? 7 : 0);
        const armorPenPctFr = ((caster.items.includes('arc_perforant_anges') || caster.items.includes('arc_des_morts')) ? 35 : caster.items.includes('arc_percant') ? 20 : 0) + (caster.items.includes('lame_de_nargoth') ? 7 : 0) + (caster.items.includes('bottes_assassin') ? 5 : 0);
        frHit.forEach(e => {
          const baseRaw = spell.baseDamage + spell.adRatio * caster.ad + frCritChance;
          const rawFr   = Math.floor(baseRaw * (frIsCrit ? frCritMult : 1));
          const dmgFr   = this._reduceDmg(rawFr, 'physical', e, armorPenFr, 0, armorPenPctFr);
          this._applySpellDamage(caster, spell, e, dmgFr);
          this.addLog(`${caster.name} → ${spell.name}${frIsCrit ? ' CRITIQUE' : ''} → ${e.name}: −${dmgFr} HP`);
        });
        this._applySpellEffects(spell, frHit);
        break;
      }
      case 'pibot_w': {
        // Station de recharge : actif sur soi-même, empowered next AA
        caster.empoweredAttack = { adRatio: 0, apRatio: spell.apRatio };
        this.addLog(`${caster.name} → ${spell.name}: prochaine AA renforcée (+${spell.apRatio} AP)`);
        break;
      }
      case 'pibot_r': {
        // Méga-Pibot : zone 1-3-1 en ligne droite + bouclier AP
        const { x: prx, y: pry } = target;
        const prdx = prx - caster.position.x, prdy = pry - caster.position.y;
        if (prdx !== 0 && prdy !== 0) {
          this.addLog('Méga-Pibot : ligne droite orthogonale requise !'); success = false; break;
        }
        if (this._manhattan(caster.position, { x: prx, y: pry }) > spell.range) {
          this.addLog('Hors de portée !'); success = false; break;
        }
        const prHit = this._getEnemies(caster.playerIdx).filter(e =>
          Math.abs(e.position.x - prx) + Math.abs(e.position.y - pry) <= 1
        );
        if (!prHit.length) { this.addLog('Aucune cible dans la zone !'); success = false; break; }
        prHit.forEach(e => {
          const dmg = this._calcSpellDmg(caster, spell, e);
          this._applySpellDamage(caster, spell, e, dmg);
          this.addLog(`${caster.name} → ${spell.name} → ${e.name}: −${dmg} HP`);
        });
        const shieldVal = Math.floor(this._effectiveAP(caster));
        if (shieldVal > 0) {
          caster.shield = Math.max(caster.shield || 0, shieldVal);
          caster.shieldTurnsLeft = 2;
          this.addLog(`${caster.name} → ${spell.name}: bouclier +${shieldVal} (2 tours)`);
        }
        this._applySpellEffects(spell, prHit);
        break;
      }
      case 'pm_sacrifice': {
        const sacrificed = this.movementLeft;
        if (sacrificed === 0) { this.addLog('Aucun PM à sacrifier !'); success = false; break; }
        const bonusAD = Math.floor(sacrificed * caster.ad * 0.20);
        const bonusAP = Math.floor(sacrificed * caster.ap * 0.20);
        caster.ad         += bonusAD;
        caster.ap         += bonusAP;
        caster.tueurBonusAD = (caster.tueurBonusAD || 0) + bonusAD;
        caster.tueurBonusAP = (caster.tueurBonusAP || 0) + bonusAP;
        this.movementLeft = 0;
        this.addLog(`${caster.name} → ${spell.name}: sacrifie ${sacrificed} PM → +${bonusAD} AD & +${bonusAP} AP (jusqu'au prochain tour)`);
        break;
      }
      case 'cell': {
        const { x, y } = target;
        if (isWall(x, y))         { this.addLog('Destination invalide !'); success = false; break; }
        if (this.getHeroAt(x, y)) { this.addLog('Case occupée !');         success = false; break; }
        caster.position = { x, y };
        this.addLog(`${caster.name} → ${spell.name}`);
        if (caster.roleId === 'roam') this._checkBrownCollection(caster);
        this._checkTrap(caster);
        break;
      }
      case 'zone': {
        const { x, y } = target;
        if (!spell.ignoresLoS && !this._hasLineOfSight(caster.position, { x, y })) {
          this.addLog('Ligne de vue bloquée !'); success = false; break;
        }
        const sz  = spell.zone.size;
        const hit = this._getEnemies(caster.playerIdx).filter(e =>
          Math.abs(e.position.x - x) <= sz && Math.abs(e.position.y - y) <= sz
        );
        if (!hit.length) { this.addLog('Aucune cible dans la zone !'); success = false; break; }
        hit.forEach(e => {
          const dmg = this._calcSpellDmg(caster, spell, e);
          this._applySpellDamage(caster, spell, e, dmg);
          this.addLog(`${caster.name} → ${spell.name} → ${e.name}: −${dmg} HP`);
        });
        this._applySpellEffects(spell, hit);
        if (caster.passive === 'electro_passive') { caster.ap += 5 * hit.length; this.addLog(`${caster.name} — Passif : +${5 * hit.length} AP`); }
        break;
      }
      case 'dash_to_ally': {
        const ally = target?.hero;
        if (!ally || ally.playerIdx !== caster.playerIdx || ally === caster) { success = false; break; }
        const freeAdj = this._getAdjacentFreeCells(ally.position, caster);
        if (!freeAdj.length) { this.addLog('Aucune case libre autour de l\'allié !'); success = false; break; }
        const dest = freeAdj.reduce((best, c) =>
          this._chebyshev(caster.position, c) < this._chebyshev(caster.position, best) ? c : best
        );
        caster.position = dest;
        if (caster.roleId === 'roam') this._checkBrownCollection(caster);
        this._checkTrap(caster);
        this.addLog(`${caster.name} → ${spell.name} → aux côtés de ${ally.name}`);
        break;
      }
      case 'no_target': {
        // Grolith — Éboulement : tous les ennemis adjacents à un mur
        if (spell.grolihtEboulement) {
          const dirs = [{dx:1,dy:0},{dx:-1,dy:0},{dx:0,dy:1},{dx:0,dy:-1}];
          const hit = this._getEnemies(caster.playerIdx).filter(e => {
            if (!e.position) return false;
            return dirs.some(d => {
              const nx = e.position.x + d.dx, ny = e.position.y + d.dy;
              return isWall(nx, ny);
            });
          });
          if (!hit.length) { this.addLog('Aucun ennemi adjacent à un mur !'); success = false; break; }
          hit.forEach(e => {
            const dmg = this._calcSpellDmg(caster, spell, e);
            this._applySpellDamage(caster, spell, e, dmg);
            this.addLog(`${caster.name} → ${spell.name} → ${e.name}: −${dmg} HP`);
          });
          this._applySpellEffects(spell, hit);
          this._checkGameOver();
          break;
        }
        // Shana — À la Rescousse : soigne tous les alliés
        if (spell.healAllAllies) {
          const baseHeal = Math.floor((spell.healBase || 0) + this._effectiveAP(caster) * (spell.healApRatio || 0))
                         + (caster.items.includes('diademe_de_la_reine') ? Math.floor(caster.maxMana * 0.03) : 0);
          const targets  = this._getAllies(caster.playerIdx);
          targets.forEach(ally => {
            const healFactor = ally.hemorrhageTurns > 0 ? 0.5 : 1;
            const heal = Math.floor(baseHeal * healFactor * (1 + (ally.healEfficiency || 0) / 100));
            ally.currentHP = Math.min(ally.maxHP, ally.currentHP + heal);
            this.addLog(`${caster.name} → ${spell.name} → ${ally.name}: +${heal} HP${ally.hemorrhageTurns > 0 ? ' (hémorragie -50%)' : ''}`);
            // Passif Anastasia : +50 PO par soin
            if (caster.passive === 'anastasia_passive') {
              this._giveGold(caster, 50);
              this.addLog(`${caster.name} — Passif : +50 PO`);
            }
            // Passif Shana : se soigne pour chaque allié soigné (hors soi-même)
            if (caster.passive === 'shana_passive' && ally !== caster) {
              const selfFactor = caster.hemorrhageTurns > 0 ? 0.5 : 1;
              const selfHeal = Math.floor(heal * selfFactor);
              caster.currentHP = Math.min(caster.maxHP, caster.currentHP + selfHeal);
              this.addLog(`${caster.name} — Passif : +${selfHeal} HP`);
            }
          });
          break;
        }
        // Salena — Découpage : auto-attaques infligent 10%+0.04*AP HP max en dégâts bruts ce tour
        if (spell.decoupage) {
          caster.decoupageActive = true;
          this.addLog(`${caster.name} → ${spell.name}: attaques de base renforcées ce tour`);
          break;
        }
        // Chronos — Rollback : retour à la position de début de tour
        if (spell.rollback) {
          const dest = caster.chronosStartPos;
          if (!dest) { this.addLog('Position de départ inconnue !'); success = false; break; }
          if (!this.getHeroAt(dest.x, dest.y)) {
            caster.position = { ...dest };
            this.addLog(`${caster.name} → ${spell.name}: retour en (${dest.x},${dest.y})`);
          } else {
            const adj = this._getAdjacentFreeCells(dest, caster);
            if (!adj.length) { this.addLog(`${spell.name} : aucune case disponible !`); success = false; break; }
            const closest = adj.reduce((best, c) =>
              this._chebyshev(dest, c) < this._chebyshev(dest, best) ? c : best
            );
            caster.position = closest;
            this.addLog(`${caster.name} → ${spell.name}: position de départ occupée, case adjacente (${closest.x},${closest.y})`);
          }
          this._checkTrap(caster);
          if (caster.roleId === 'roam') this._checkBrownCollection(caster);
          // Rollback — dégâts AoE autour du point de réapparition
          if (spell.damageType && spell.baseDamage) {
            const _rbPos = caster.position;
            this._getEnemies(caster.playerIdx).filter(e =>
              e.isAlive && e.position && this._manhattan(_rbPos, e.position) <= 3
            ).forEach(e => {
              const rdmg = this._calcSpellDmg(caster, spell, e);
              this._applySpellDamage(caster, spell, e, rdmg);
              this.addLog(`${caster.name} → ${spell.name} → ${e.name}: −${rdmg} HP`);
            });
          }
          break;
        }
        // Layia — Vision : +PO d'attaque ce tour
        if (spell.layiaBonusPO) {
          caster.layiaBonusPOTurn = (caster.layiaBonusPOTurn || 0) + spell.layiaBonusPO;
          this.addLog(`${caster.name} → ${spell.name}: +${spell.layiaBonusPO} PO d'attaque ce tour`);
          break;
        }
        // Layia — Double Cibles : double le nombre d'attaques de base autorisées ce tour
        if (spell.layiaDoubleAttacks) {
          this.autoAttacksAllowed *= 2;
          this.addLog(`${caster.name} → ${spell.name}: attaques de base doublées (${this.autoAttacksAllowed} disponibles)`);
          break;
        }
        if (spell.nearestAllyCleanse) {
          const allies = this._getAllies(caster.playerIdx).filter(a => a !== caster && a.isAlive && a.position);
          if (!allies.length) { this.addLog('Aucun allié vivant !'); success = false; break; }
          const nearest = allies.reduce((best, a) =>
            this._manhattan(caster.position, a.position) < this._manhattan(caster.position, best.position) ? a : best
          );
          if (this._manhattan(caster.position, nearest.position) > spell.range) { this.addLog('Aucun allié à portée !'); success = false; break; }
          const hadDebuff = (nearest.statusEffects || []).length > 0 || nearest.hemorrhageTurns > 0 || nearest.maledictionTurns > 0;
          nearest.statusEffects    = [];
          nearest.hemorrhageTurns  = 0;
          nearest.maledictionTurns = 0;
          if (hadDebuff) {
            this.addLog(`${caster.name} → ${spell.name} → ${nearest.name}: tous les débuffs supprimés !`);
          } else {
            const baseHeal  = Math.floor((spell.healBase || 0) + this._effectiveAP(caster) * (spell.healApRatio || 0))
                            + (caster.items.includes('diademe_de_la_reine') ? Math.floor(caster.maxMana * 0.03) : 0);
            const heal      = Math.floor(baseHeal * (1 + (nearest.healEfficiency || 0) / 100));
            nearest.currentHP = Math.min(nearest.maxHP, nearest.currentHP + heal);
            this.addLog(`${caster.name} → ${spell.name} → ${nearest.name}: +${heal} HP`);
          }
          break;
        }
        // Hornet R — Tisse-tempête : zone autour et vol de PM
        if (spell.id === 'hornet_r') {
          const hit = this._getEnemies(caster.playerIdx).filter(e =>
            this._manhattan(caster.position, e.position) <= 1
          );
          if (!hit.length) { this.addLog('Aucun ennemi adjacent !'); success = false; break; }
          hit.forEach(e => {
            const dmg = this._calcSpellDmg(caster, spell, e);
            this._applySpellDamage(caster, spell, e, dmg);
            if (e.isAlive) {
              e.movementLeft = Math.max(0, (e.movementLeft || 0) - 3);
              this.addLog(`${caster.name} → ${spell.name} → ${e.name}: −${dmg} HP, −3 PM`);
            } else {
              this.addLog(`${caster.name} → ${spell.name} → ${e.name}: −${dmg} HP`);
            }
          });
          caster.hornetDidNotUsePMThisTurn = false;
          this._checkGameOver();
          break;
        }

        const hit = spell.targetAll
          ? this._getEnemies(caster.playerIdx)
          : spell.adjacentHit
            ? this._getEnemies(caster.playerIdx).filter(e => this._chebyshev(caster.position, e.position) <= 1)
            : this._getEnemies(caster.playerIdx).filter(e => this._manhattan(caster.position, e.position) <= spell.range);
        if (!hit.length) { this.addLog('Aucune cible à portée !'); success = false; break; }
        hit.forEach(e => {
          const dmg = this._calcSpellDmg(caster, spell, e);
          this._applySpellDamage(caster, spell, e, dmg);
          this.addLog(`${caster.name} → ${spell.name} → ${e.name}: −${dmg} HP`);
        });
        this._applySpellEffects(spell, hit);
        if (caster.passive === 'electro_passive') { caster.ap += 5 * hit.length; this.addLog(`${caster.name} — Passif : +${5 * hit.length} AP`); }
        break;
      }
      case 'dash_to_enemy': {
        const enemy = target?.hero;
        if (!enemy || enemy.playerIdx === caster.playerIdx) { success = false; break; }
        const freeAdj = this._getAdjacentFreeCells(enemy.position, caster);
        if (!freeAdj.length) { this.addLog('Aucune case libre autour de la cible !'); success = false; break; }
        // Move to the closest free adjacent cell
        const dest = freeAdj.reduce((best, c) =>
          this._chebyshev(caster.position, c) < this._chebyshev(caster.position, best) ? c : best
        );
        caster.position = dest;
        if (caster.roleId === 'roam') this._checkBrownCollection(caster);
        const dmgW = this._calcSpellDmg(caster, spell, enemy);
        this._applySpellDamage(caster, spell, enemy, dmgW);
        this.addLog(`${caster.name} → ${spell.name} → ${enemy.name}: −${dmgW} HP`);
        this._applySpellEffects(spell, [enemy]);
        if (caster.passive === 'electro_passive') { caster.ap += 5; this.addLog(`${caster.name} — Passif : +5 AP`); }
        break;
      }
      case 'dash_behind_enemy': {
        const enemy = target?.hero;
        if (!enemy || enemy.playerIdx === caster.playerIdx) { success = false; break; }
        const rdx = enemy.position.x - caster.position.x;
        const rdy = enemy.position.y - caster.position.y;
        if (rdx !== 0 && rdy !== 0) { this.addLog('Sort en ligne droite uniquement !'); success = false; break; }
        if (Math.abs(rdx) + Math.abs(rdy) > spell.range) { this.addLog('Hors de portée !'); success = false; break; }
        const ddx = Math.sign(rdx), ddy = Math.sign(rdy);
        const bx = enemy.position.x + ddx, by = enemy.position.y + ddy;
        let dest;
        if (bx >= 0 && bx < MAP_SIZE && by >= 0 && by < MAP_SIZE && !isWall(bx, by) && !this.getHeroAt(bx, by)) {
          dest = { x: bx, y: by };
        } else {
          const freeAdj = this._getAdjacentFreeCells(enemy.position, caster);
          if (!freeAdj.length) { this.addLog('Aucune case libre autour de la cible !'); success = false; break; }
          dest = freeAdj.reduce((best, c) =>
            (Math.abs(c.x - bx) + Math.abs(c.y - by)) < (Math.abs(best.x - bx) + Math.abs(best.y - by)) ? c : best
          );
        }
        caster.position = dest;
        if (caster.roleId === 'roam') this._checkBrownCollection(caster);
        this._checkTrap(caster);
        const physRaw = Math.floor(spell.baseDamage + caster.ad * (spell.adRatio || 0));
        const physDmg = this._reduceDmg(physRaw, 'physical', enemy, caster.armorPenPct || 0);
        this._applySpellDamage(caster, spell, enemy, physDmg);
        if (enemy.isAlive) {
          const rawDmg = Math.floor((spell.rawBase || 0) + this._effectiveAP(caster) * (spell.rawApRatio || 0));
          if (rawDmg > 0) this._applyDamage(enemy, rawDmg, caster, 'raw');
          this.addLog(`${caster.name} → ${spell.name} → ${enemy.name}: −${physDmg} phys + −${rawDmg} bruts`);
        } else {
          this.addLog(`${caster.name} → ${spell.name} → ${enemy.name}: −${physDmg} phys`);
        }
        this._applySpellEffects(spell, [enemy]);
        break;
      }
      case 'lame_eau': {
        const { x, y } = target;
        const rdx = x - caster.position.x, rdy = y - caster.position.y;
        if (rdx !== 0 && rdy !== 0) { this.addLog('Lame d\'eau : direction orthogonale requise !'); success = false; break; }
        if (Math.abs(rdx) + Math.abs(rdy) !== 2) { this.addLog('Lame d\'eau : portée exacte 2 requise !'); success = false; break; }
        const _leZone = {
          cx: x, cy: y,
          dx: Math.sign(rdx), dy: Math.sign(rdy),
          turnsLeft: 3,
          baseDamage: spell.baseDamage,
          adRatio: spell.adRatio,
          caster,
          playerIdx: caster.playerIdx,
          damagedThisTurn: new Set()
        };
        this.lameEauZones.push(_leZone);
        // Dégâts immédiats à la pose
        this._applyLameEauDamage(_leZone);
        this.addLog(`${caster.name} → Lame d'eau lancée en (${x},${y}) — 3 tours !`);
        break;
      }
      case 'diamond_zone': {
        const { x, y } = target;
        if (!spell.ignoresLoS && !this._hasLineOfSight(caster.position, { x, y })) {
          this.addLog('Ligne de vue bloquée !'); success = false; break;
        }
        const sz = spell.zone?.size ?? 2;
        // Anastasia — Barrière Protectrice / Gabriel — Bénédiction : bouclier sur les alliés dans la zone
        if (spell.allyShield) {
          const alliesInZone = this._getAllies(caster.playerIdx).filter(a =>
            a.position && Math.abs(a.position.x - x) + Math.abs(a.position.y - y) <= sz
          );
          const enemiesInZone = this._getEnemies(caster.playerIdx).filter(e =>
            e.position && Math.abs(e.position.x - x) + Math.abs(e.position.y - y) <= sz
          );
          if (!alliesInZone.length && !enemiesInZone.length) { this.addLog('Aucune cible dans la zone !'); success = false; break; }
          if (alliesInZone.length) {
            const shieldVal = Math.floor((spell.shieldBase || 0) + this._effectiveAP(caster) * (spell.shieldAPRatio || 0));
            alliesInZone.forEach(a => {
              a.shield = Math.max(a.shield, shieldVal);
              a.shieldTurnsLeft = spell.shieldTurns || 3;
              this.addLog(`${caster.name} → ${spell.name} → ${a.name}: bouclier +${shieldVal} (${spell.shieldTurns || 3} tours)`);
            });
          }
        }
        const hit = this._getEnemies(caster.playerIdx).filter(e =>
          Math.abs(e.position.x - x) + Math.abs(e.position.y - y) <= sz
        );
        if (hit.length && spell.damageType) {
          hit.forEach(e => {
            const dmg = this._calcSpellDmg(caster, spell, e);
            this._applySpellDamage(caster, spell, e, dmg);
            this.addLog(`${caster.name} → ${spell.name} → ${e.name}: −${dmg} HP`);
          });
          if (caster.passive === 'electro_passive') { caster.ap += 5 * hit.length; this.addLog(`${caster.name} — Passif : +${5 * hit.length} AP`); }
        } else if (hit.length) {
          this.addLog(`${caster.name} → ${spell.name} (${hit.map(e => e.name).join(', ')})`);
        }
        if (hit.length || spell.allyShield) this._applySpellEffects(spell, hit);
        // Gabriel — Parole Divine : centre fait root, autres cases font -2PM
        if (spell.id === 'gabriel_w') {
          hit.forEach(e => {
            const dist = Math.abs(e.position.x - x) + Math.abs(e.position.y - y);
            if (dist === 0) {
              // Centre : root appliqué via _applySpellEffects
            } else {
              // Autres cases : retirer 2 PM
              e.movementLeft = Math.max(0, (e.movementLeft || 0) - 2);
              this.addLog(`${e.name} — Parole Divine : −2 PM`);
            }
          });
        }
        // Cupidon R — L'amour fou : crée une zone de déplacement aléatoire
        if (spell.id === 'cupidon_r') {
          const amourZone = {
            cx: x, cy: y, size: sz, turnsLeft: 4, caster,
            cellsEntered: new Set()  // track which heroes entered this turn
          };
          this.amourFouZones.push(amourZone);
          this.addLog(`${caster.name} → ${spell.name} : zone créée (les ennemis seront déplacés aléatoirement)`);
        }
        break;
      }
      case 'place_glyph': {
        const { x: gx, y: gy } = target;
        if (!spell.ignoresLoS && !this._hasLineOfSight(caster.position, { x: gx, y: gy })) {
          this.addLog('Ligne de vue bloquée !'); success = false; break;
        }
        const glyphSize  = spell.glyphZoneSize ?? 2;
        const glyphCells = this._diamondCells(gx, gy, glyphSize);
        if (spell.glyphType === 'pain') {
          this.glyphs.push({ type: 'pain', centerX: gx, centerY: gy, cells: glyphCells,
            turnsLeft: 3, playerIdx: caster.playerIdx, ownerHero: caster,
            baseDamage: spell.baseDamage, apRatio: spell.apRatio, damageType: spell.damageType });
          this.addLog(`${caster.name} → ${spell.name} posée`);
        } else if (spell.glyphType === 'ultimate') {
          this.glyphs = this.glyphs.filter(g => !(g.type === 'ultimate' && g.ownerHero === caster));
          this.glyphs.push({ type: 'ultimate', centerX: gx, centerY: gy, cells: glyphCells,
            turnsLeft: -1, playerIdx: caster.playerIdx, ownerHero: caster });
          this.addLog(`${caster.name} → ${spell.name} posée`);
        }
        break;
      }
      case 'wind_glyph': {
        const { x: wx, y: wy } = target;
        const zSize     = spell.glyphZoneSize ?? 1;
        const zoneCells = this._diamondCells(wx, wy, zSize);
        const enemies   = this._getEnemies(caster.playerIdx).filter(e =>
          e.position && zoneCells.some(c => c.x === e.position.x && c.y === e.position.y)
        );
        if (!enemies.length) { this.addLog('Aucun ennemi dans la zone !'); success = false; break; }
        const myGlyphs = this.glyphs.filter(g => g.playerIdx === caster.playerIdx && g.type === 'pain');
        enemies.forEach(enemy => {
          let pushDir;
          if (myGlyphs.length > 0) {
            const nearest = myGlyphs.reduce((best, g) =>
              this._manhattan(enemy.position, { x: g.centerX, y: g.centerY }) <
              this._manhattan(enemy.position, { x: best.centerX, y: best.centerY }) ? g : best
            );
            const dx = nearest.centerX - enemy.position.x, dy = nearest.centerY - enemy.position.y;
            pushDir = Math.abs(dx) >= Math.abs(dy) ? { dx: dx > 0 ? 1 : -1, dy: 0 } : { dx: 0, dy: dy > 0 ? 1 : -1 };
          } else {
            const dirs = [{dx:1,dy:0},{dx:-1,dy:0},{dx:0,dy:1},{dx:0,dy:-1}];
            pushDir = dirs[Math.floor(Math.random() * 4)];
          }
          const nx = enemy.position.x + pushDir.dx, ny = enemy.position.y + pushDir.dy;
          if (nx >= 0 && nx < MAP_SIZE && ny >= 0 && ny < MAP_SIZE && !isWall(nx, ny) && !this.getHeroAt(nx, ny)) {
            enemy.position = { x: nx, y: ny };
            this.addLog(`${enemy.name} repoussé vers (${nx},${ny})`);
            this._checkTrap(enemy);
            if (enemy.roleId === 'roam') this._checkBrownCollection(enemy);
          }
        });
        this.addLog(`${caster.name} → ${spell.name}`);
        break;
      }
      case 'noyala_q': {
        const { x: qx, y: qy } = target;
        if (isWall(qx, qy)) { this.addLog('Case invalide !'); success = false; break; }
        if (this.getHeroAt(qx, qy)) { this.addLog('Case occupée !'); success = false; break; }
        if (this.noyalaWolves.some(w => w.x === qx && w.y === qy)) { this.addLog('Un loup est déjà là !'); success = false; break; }
        if (this._manhattan(caster.position, {x: qx, y: qy}) > spell.range) { this.addLog('Hors de portée !'); success = false; break; }
        this.noyalaWolves.push({
          x: qx, y: qy, hp: 100, maxHp: 100,
          pmLeft: caster.pm, pm: caster.pm,
          ownerInstanceId: caster.instanceId,
          playerIdx: caster.playerIdx,
          baseDamage: spell.baseDamage,
          adRatio: spell.adRatio,
          id: `wolf_${this.globalTurn}_${Math.random().toString(36).substring(2,6)}`
        });
        this.addLog(`${caster.name} → ${spell.name} : loup invoqué en (${qx},${qy})`);
        break;
      }
      case 'noyala_r': {
        const { x: rx, y: ry } = target;
        const wolf = this.noyalaWolves.find(w => w.x === rx && w.y === ry && w.ownerInstanceId === caster.instanceId);
        if (!wolf) { this.addLog('Aucun loup à cet endroit !'); success = false; break; }
        const oldCasterPos = { ...caster.position };
        caster.position = { x: wolf.x, y: wolf.y };
        wolf.x = oldCasterPos.x; wolf.y = oldCasterPos.y;
        caster.noyalaRUsedThisTurn = true;
        this.addLog(`${caster.name} → ${spell.name} : échange de position avec un loup !`);
        this._checkTrap(caster);
        this._checkBrownCollection(caster);
        break;
      }
      case 'solo_recall': {
        if (caster.soloRecallActive) {
          // Réactivation : retour au point de spawn
          const sp = caster.spawnPosition;
          if (!sp) { this.addLog('Position de départ inconnue !'); success = false; break; }
          let finalDest = sp;
          if (this.getHeroAt(sp.x, sp.y) && this.getHeroAt(sp.x, sp.y) !== caster) {
            const adj = this._getAdjacentFreeCells(sp, caster);
            if (!adj.length) { this.addLog('Case de départ occupée !'); success = false; break; }
            finalDest = adj[0];
          }
          caster.position = { ...finalDest };
          caster.soloRecallActive = false;
          this.addLog(`${caster.name} → ${spell.name} : retour au point de départ`);
        } else {
          // 1er lancer : téléportation adjacente à un allié
          const ally = target?.hero;
          if (!ally || ally.playerIdx !== caster.playerIdx || ally === caster) { success = false; break; }
          const freeAdj = this._getAdjacentFreeCells(ally.position, caster);
          if (!freeAdj.length) { this.addLog('Aucune case libre autour de l\'allié !'); success = false; break; }
          const dest = freeAdj.reduce((best, c) =>
            this._chebyshev(caster.position, c) < this._chebyshev(caster.position, best) ? c : best
          );
          caster.position = { ...dest };
          caster.soloRecallActive = true;
          this.addLog(`${caster.name} → ${spell.name} → téléportation aux côtés de ${ally.name}`);
        }
        break;
      }
      default: success = false;
    }

    if (success) {
      // Passif Skjer : si kill pendant ce sort, CD et spellsUsed déjà remis à zéro — ne pas écraser
      const _skjerReset = !!caster._skjerPassiveFired;
      if (_skjerReset) delete caster._skjerPassiveFired;
      // CD 0 = pas de rechargement ; sinon réduction normale
      if (!_skjerReset && spell.cooldown > 0) {
        const _hasStun = spell.effects?.some(e => e.type === 'stun');
        const _minCd   = _hasStun ? 2 : 1;
        const _timeGlassCount = caster.items.filter(id => id === 'time_glass').length;
        const _effectiveCdRed = (caster.cdReduction || 0) - Math.max(0, _timeGlassCount - 1);
        let _cd = Math.max(_minCd, spell.cooldown - _effectiveCdRed);
        // Bottes de Célérité : -1 CD supplémentaire sur tous les sorts
        if (caster.items.includes('boots_of_celerity') && _cd > _minCd) _cd--;
        // Sceptre du Malin : -1 CD ultime (index 2)
        if (caster.items.includes('sceptre_du_malin')) {
          const _spellIdx = caster.spells.findIndex(s => s.id === spell.id);
          if (_spellIdx === 2 && _cd > _minCd) _cd--;
        }
        // Solo Rappel : CD seulement sur le 1er lancer (pas la réactivation)
        if (spell.id === 'solo_recall') {
          if (_isRecallReactivation) {
            // Réactivation : CD continue de tourner, on ne le modifie pas
          } else {
            caster.cooldowns[spell.id] = _cd;
          }
        // Hornet Q — Lance Soyeuse : CD seulement si réactivation (mark consommée)
        } else if (spell.id === 'hornet_q') {
          const targetHero = target?.hero;
          const isReactivation = targetHero && (caster.hornetIsReactivation?.[targetHero.instanceId] || false);
          if (isReactivation) {
            // Consommer la marque et appliquer le CD
            delete caster.hornetHarpoonedTargets[targetHero.instanceId];
            caster.cooldowns[spell.id] = _cd;
          } else {
            // Premier lancement : pas de CD, juste la marque
            caster.cooldowns[spell.id] = 0;
          }
        } else {
          caster.cooldowns[spell.id] = _cd;
        }
      } else {
        caster.cooldowns[spell.id] = 0;
      }
      // Suivi des utilisations (maxUsesPerTurn ou boolean classique) — ignoré si passif Skjer a reset
      if (!_skjerReset) {
        if (spell.maxUsesPerTurn) {
          this.spellsUsed[spell.id] = (typeof this.spellsUsed[spell.id] === 'number' ? this.spellsUsed[spell.id] : 0) + 1;
        } else {
          this.spellsUsed[spell.id] = true;
        }
      }
      this.actionsUsed++;
      this.canBuy = false;
      // Passif Chronos : +50 PO par sort lancé
      if (caster.passive === 'chronos_passive') {
        this._giveGold(caster, 50);
        this.addLog(`${caster.name} — Passif : +50 PO`);
      }
      // Passive : Larme de Mana / Sceptre / Épée — +manaOnSpell maxMana par sort (plafonné)
      if (caster.manaOnSpell > 0 && caster.manaOnSpellGained < caster.manaOnSpellMax) {
        const gain = Math.min(caster.manaOnSpell, caster.manaOnSpellMax - caster.manaOnSpellGained);
        caster.maxMana           += gain;
        caster.manaOnSpellGained += gain;
        // Transformation au cap
        if (caster.manaOnSpellGained >= caster.manaOnSpellMax) {
          if (caster.items.includes('sceptre_de_mana')) this._transformItem(caster, 'sceptre_de_mana', 'sceptre_ange');
          else if (caster.items.includes('epee_de_mana')) this._transformItem(caster, 'epee_de_mana', 'epee_ange');
          else if (caster.items.includes('couronne_de_la_reine')) this._transformItem(caster, 'couronne_de_la_reine', 'diademe_de_la_reine');
        }
      }
      this._checkGameOver();
    } else {
      caster.currentMana += _effectiveManaCost; // refund
    }
    return success;
  }

  getSpellTargets(spell) {
    const hero = this.currentHero;
    if (!hero) return { heroes: [], cells: [], heroesOutOfRange: [] };

    const effRange = spell.range > 0 ? Math.max(1, spell.range + (hero.bonusSpellRange || 0) - (hero.maledictionTurns > 0 ? 3 : 0)) : spell.range;
    const _rangeCells = () => {
      const cells = [];
      for (let x = 0; x < MAP_SIZE; x++)
        for (let y = 0; y < MAP_SIZE; y++)
          if (!isWall(x, y) && this._manhattan(hero.position, { x, y }) <= effRange)
            cells.push({ x, y });
      return cells;
    };

    switch (spell.targetType) {
      case 'swap_enemy':
      case 'enemy_hero': {
        const all = this._getEnemies(hero.playerIdx);
        if (spell.targetAll) return { heroes: all, heroesOutOfRange: [], cells: [] };
        // Hornet Q — logique spéciale selon si une marque est active
        if (spell.id === 'hornet_q') {
          const hasActiveMarks = Object.values(hero.hornetHarpoonedTargets || {}).some(expiry => expiry > this.globalTurn);
          if (hasActiveMarks) {
            // Réactivation : afficher uniquement la cible marquée (de n'importe où)
            const marked = all.filter(e => (hero.hornetHarpoonedTargets[e.instanceId] || 0) > this.globalTurn);
            return { heroes: marked, heroesOutOfRange: [], cells: [] };
          }
          // 1er lancer : ligne droite uniquement, pas de LoS
          const inLine = all.filter(e => e.position.x === hero.position.x || e.position.y === hero.position.y);
          return {
            heroes:           inLine.filter(e => this._manhattan(hero.position, e.position) <= effRange),
            heroesOutOfRange: inLine.filter(e => this._manhattan(hero.position, e.position) >  effRange),
            cells: _rangeCells()
          };
        }
        let _inRange  = all.filter(e => this._manhattan(hero.position, e.position) <= effRange);
        let _outRange = all.filter(e => this._manhattan(hero.position, e.position) >  effRange);
        if (spell.requiresLine) {
          _inRange  = _inRange.filter(e => e.position.x === hero.position.x || e.position.y === hero.position.y);
          _outRange = _outRange.filter(e => e.position.x === hero.position.x || e.position.y === hero.position.y);
        }
        // LOS : héros hors ligne de vue → anneau rouge (heroesOutOfRange)
        if (!spell.targetAll && !spell.ignoresLoS) {
          const _losOk  = _inRange.filter(e => this._hasLineOfSight(hero.position, e.position));
          const _losKo  = _inRange.filter(e => !this._hasLineOfSight(hero.position, e.position));
          _outRange = [..._outRange, ..._losKo];
          _inRange  = _losOk;
        }
        return { heroes: _inRange, heroesOutOfRange: _outRange, cells: _rangeCells() };
      }
      case 'ally_hero': {
        const all = this._getAllies(hero.playerIdx);
        return {
          heroes:           all.filter(a => this._manhattan(hero.position, a.position) <= effRange),
          heroesOutOfRange: all.filter(a => this._manhattan(hero.position, a.position) >  effRange),
          cells: _rangeCells()
        };
      }
      case 'cell':
      case 'zone':
        return { heroes: [], heroesOutOfRange: [], cells: spell.ignoresLoS ? _rangeCells() : _rangeCells().filter(c => this._hasLineOfSight(hero.position, c)) };
      case 'dash_to_enemy': {
        const all = this._getEnemies(hero.playerIdx);
        let _dtInRange  = all.filter(e => this._manhattan(hero.position, e.position) <= effRange);
        let _dtOutRange = all.filter(e => this._manhattan(hero.position, e.position) >  effRange);
        if (spell.lineOnly) {
          _dtInRange  = _dtInRange.filter(e => e.position.x === hero.position.x || e.position.y === hero.position.y);
          _dtOutRange = _dtOutRange.filter(e => e.position.x === hero.position.x || e.position.y === hero.position.y);
        }
        return { heroes: _dtInRange, heroesOutOfRange: _dtOutRange, cells: _rangeCells() };
      }
      case 'diamond_zone':
        return { heroes: [], heroesOutOfRange: [], cells: spell.ignoresLoS ? _rangeCells() : _rangeCells().filter(c => this._hasLineOfSight(hero.position, c)) };
      case 'stealth_dash': {
        const cells = [];
        const dirs = [{dx:1,dy:0},{dx:-1,dy:0},{dx:0,dy:1},{dx:0,dy:-1}];
        dirs.forEach(({dx, dy}) => {
          for (let step = 1; step <= spell.range; step++) {
            const x = hero.position.x + dx * step, y = hero.position.y + dy * step;
            if (x < 0 || x >= MAP_SIZE || y < 0 || y >= MAP_SIZE) break;
            if (!this.getHeroAt(x, y)) {
              // Cupidon W — Vérifier qu'il y a un mur sur le chemin pour throughWallOnly
              if (spell.throughWallOnly) {
                let hasWallOnPath = false;
                for (let s = 1; s < step; s++) {
                  const checkX = hero.position.x + dx * s;
                  const checkY = hero.position.y + dy * s;
                  if (isWall(checkX, checkY)) {
                    hasWallOnPath = true;
                    break;
                  }
                }
                if (hasWallOnPath) cells.push({ x, y });
              } else {
                cells.push({ x, y });
              }
            }
          }
        });
        return { heroes: [], heroesOutOfRange: [], cells };
      }
      case 'dash_to_ally': {
        const all = this._getAllies(hero.playerIdx).filter(a => a !== hero && a.isAlive);
        return {
          heroes:           all.filter(a => this._manhattan(hero.position, a.position) <= effRange),
          heroesOutOfRange: all.filter(a => this._manhattan(hero.position, a.position) >  effRange),
          cells: _rangeCells()
        };
      }
      case 'trap':
        return { heroes: [], heroesOutOfRange: [], cells: _rangeCells().filter(c => !this.getHeroAt(c.x, c.y) && !this.traps.some(t => t.x === c.x && t.y === c.y)) };
      case 'line_zone': {
        const cells = [];
        const dirs = [{dx:1,dy:0},{dx:-1,dy:0},{dx:0,dy:1},{dx:0,dy:-1}];
        dirs.forEach(({dx, dy}) => {
          for (let step = spell.minRange ?? 1; step <= (spell.maxRange ?? spell.range); step++) {
            const cx = hero.position.x + dx * step, cy = hero.position.y + dy * step;
            if (cx >= 0 && cx < MAP_SIZE && cy >= 0 && cy < MAP_SIZE && !isWall(cx, cy))
              cells.push({ x: cx, y: cy });
          }
        });
        return { heroes: [], heroesOutOfRange: [], cells };
      }
      case 'cone_zone': {
        const coneCells = [];
        const seen = new Set();
        const coneDirs = [{fdx:1,fdy:0},{fdx:-1,fdy:0},{fdx:0,fdy:1},{fdx:0,fdy:-1}];
        coneDirs.forEach(({fdx, fdy}) => {
          for (let gx = 0; gx < MAP_SIZE; gx++) {
            for (let gy = 0; gy < MAP_SIZE; gy++) {
              const fwd = fdx !== 0 ? (gx - hero.position.x) * fdx : (gy - hero.position.y) * fdy;
              const lat = fdx !== 0 ? Math.abs(gy - hero.position.y) : Math.abs(gx - hero.position.x);
              if (fwd >= 1 && fwd <= spell.range && lat <= fwd && !isWall(gx, gy)) {
                const k = `${gx},${gy}`;
                if (!seen.has(k)) { seen.add(k); coneCells.push({ x: gx, y: gy }); }
              }
            }
          }
        });
        return { heroes: [], heroesOutOfRange: [], cells: coneCells };
      }
      case 'bomb_zone': {
        const allCells = [];
        for (let gx = 0; gx < MAP_SIZE; gx++)
          for (let gy = 0; gy < MAP_SIZE; gy++)
            if (!isWall(gx, gy)) allCells.push({ x: gx, y: gy });
        return { heroes: [], heroesOutOfRange: [], cells: allCells };
      }
      case 'place_glyph': {
        const cells = [];
        for (let x = 0; x < MAP_SIZE; x++) {
          for (let y = 0; y < MAP_SIZE; y++) {
            if (!isWall(x, y) && this._manhattan(hero.position, { x, y }) <= effRange
                && (x !== hero.position.x || y !== hero.position.y)
                && (spell.ignoresLoS || this._hasLineOfSight(hero.position, { x, y }))) {
              cells.push({ x, y });
            }
          }
        }
        return { heroes: [], heroesOutOfRange: [], cells };
      }
      case 'wind_glyph': {
        const cells = [];
        const dirs = [{dx:1,dy:0},{dx:-1,dy:0},{dx:0,dy:1},{dx:0,dy:-1}];
        dirs.forEach(({dx, dy}) => {
          for (let step = 1; step <= effRange; step++) {
            const x = hero.position.x + dx * step, y = hero.position.y + dy * step;
            if (x < 0 || x >= MAP_SIZE || y < 0 || y >= MAP_SIZE) break;
            if (isWall(x, y)) break;
            cells.push({ x, y });
          }
        });
        return { heroes: [], heroesOutOfRange: [], cells };
      }
      case 'push_enemy': {
        const _peAll = this._getEnemies(hero.playerIdx);
        return {
          heroes:           _peAll.filter(e => this._manhattan(hero.position, e.position) <= effRange),
          heroesOutOfRange: _peAll.filter(e => this._manhattan(hero.position, e.position) >  effRange),
          cells: []
        };
      }
      case 'hate_wall': {
        const _hwDirs = [{dx:1,dy:0},{dx:-1,dy:0},{dx:0,dy:1},{dx:0,dy:-1}];
        const _hwCells = _hwDirs.map(({dx, dy}) => ({
          x: hero.position.x + dx * spell.range,
          y: hero.position.y + dy * spell.range
        })).filter(c => c.x >= 0 && c.x < MAP_SIZE && c.y >= 0 && c.y < MAP_SIZE && !isWall(c.x, c.y));
        return { heroes: [], heroesOutOfRange: [], cells: _hwCells };
      }
      case 'swap_ally': {
        const _saAll = this._getAllies(hero.playerIdx).filter(a => a !== hero && a.isAlive);
        if (spell.targetAll) return { heroes: _saAll, heroesOutOfRange: [], cells: [] };
        return {
          heroes:           _saAll.filter(a => this._manhattan(hero.position, a.position) <= effRange),
          heroesOutOfRange: _saAll.filter(a => this._manhattan(hero.position, a.position) >  effRange),
          cells: []
        };
      }
      case 'dash_behind_enemy': {
        const _dbeAll = this._getEnemies(hero.playerIdx);
        const _dbeValid = _dbeAll.filter(e => {
          const ex = e.position.x - hero.position.x, ey = e.position.y - hero.position.y;
          if (ex !== 0 && ey !== 0) return false;
          return Math.abs(ex) + Math.abs(ey) <= effRange;
        });
        return {
          heroes:           _dbeValid,
          heroesOutOfRange: _dbeAll.filter(e => !_dbeValid.includes(e)),
          cells: []
        };
      }
      case 'lame_eau': {
        const _leCells = [];
        [{dx:1,dy:0},{dx:-1,dy:0},{dx:0,dy:1},{dx:0,dy:-1}].forEach(({dx, dy}) => {
          const tx = hero.position.x + dx * 2, ty = hero.position.y + dy * 2;
          if (tx >= 0 && tx < MAP_SIZE && ty >= 0 && ty < MAP_SIZE && !isWall(tx, ty))
            _leCells.push({ x: tx, y: ty });
        });
        return { heroes: [], heroesOutOfRange: [], cells: _leCells };
      }
      case 'no_target':
        if (spell.targetAll) return { heroes: this._getEnemies(hero.playerIdx), heroesOutOfRange: [], cells: [] };
        if (spell.adjacentHit) {
          const all = this._getEnemies(hero.playerIdx);
          return {
            heroes:           all.filter(e => this._chebyshev(hero.position, e.position) <= 1),
            heroesOutOfRange: all.filter(e => this._chebyshev(hero.position, e.position) >  1),
            cells: []
          };
        }
        return { heroes: this._getEnemies(hero.playerIdx).filter(e => this._manhattan(hero.position, e.position) <= spell.range), heroesOutOfRange: [], cells: [] };
      case 'abyss_w': {
        // Dash orthogonal en ligne droite jusqu'à range cases
        const _awCells = [];
        const _awDirs = [{dx:1,dy:0},{dx:-1,dy:0},{dx:0,dy:1},{dx:0,dy:-1}];
        _awDirs.forEach(({dx, dy}) => {
          for (let step = 1; step <= effRange; step++) {
            const cx = hero.position.x + dx * step, cy = hero.position.y + dy * step;
            if (cx < 0 || cx >= MAP_SIZE || cy < 0 || cy >= MAP_SIZE) break;
            if (isWall(cx, cy)) break;
            if (!this.getHeroAt(cx, cy)) _awCells.push({ x: cx, y: cy });
          }
        });
        return { heroes: [], heroesOutOfRange: [], cells: _awCells };
      }
      case 'abyss_r': {
        // Ennemi à distance 8-10 (sans ligne de vue)
        const _arAll = this._getEnemies(hero.playerIdx);
        const _arMin = spell.minRange || 8;
        const _arValid = _arAll.filter(e => {
          const d = this._manhattan(hero.position, e.position);
          return d >= _arMin && d <= effRange;
        });
        return {
          heroes:           _arValid,
          heroesOutOfRange: _arAll.filter(e => !_arValid.includes(e)),
          cells: []
        };
      }
      case 'pibot_w':
        return { heroes: [], heroesOutOfRange: [], cells: [] };
      case 'solo_recall': {
        if (hero.soloRecallActive) {
          // Réactivation : pas de cible à sélectionner
          return { heroes: [], heroesOutOfRange: [], cells: [] };
        }
        // 1er lancer : tous les alliés vivants
        const allies = this._getAllies(hero.playerIdx).filter(a => a !== hero && a.isAlive && a.position);
        return { heroes: allies, heroesOutOfRange: [], cells: [] };
      }
      case 'pibot_r': {
        // Cellules orthogonales dans la portée (ligne droite)
        const prCells = [];
        const prDirs = [{dx:1,dy:0},{dx:-1,dy:0},{dx:0,dy:1},{dx:0,dy:-1}];
        prDirs.forEach(({dx, dy}) => {
          for (let step = 1; step <= spell.range; step++) {
            const cx = hero.position.x + dx * step, cy = hero.position.y + dy * step;
            if (cx < 0 || cx >= MAP_SIZE || cy < 0 || cy >= MAP_SIZE) break;
            if (isWall(cx, cy)) break;
            prCells.push({ x: cx, y: cy });
          }
        });
        return { heroes: [], heroesOutOfRange: [], cells: prCells };
      }
      case 'faena_w': {
        // Cellules adjacentes libres (range 1)
        const fwCells = [];
        const fwDirs = [{dx:1,dy:0},{dx:-1,dy:0},{dx:0,dy:1},{dx:0,dy:-1},{dx:1,dy:1},{dx:1,dy:-1},{dx:-1,dy:1},{dx:-1,dy:-1}];
        fwDirs.forEach(({dx, dy}) => {
          const cx = hero.position.x + dx, cy = hero.position.y + dy;
          if (cx >= 0 && cx < MAP_SIZE && cy >= 0 && cy < MAP_SIZE && !isWall(cx, cy) && !this.getHeroAt(cx, cy))
            fwCells.push({ x: cx, y: cy });
        });
        return { heroes: [], heroesOutOfRange: [], cells: fwCells };
      }
      case 'faena_r':
        // Zone diamond size 1, portée 5 — même highlight que diamond_zone
        return { heroes: [], heroesOutOfRange: [], cells: _rangeCells() };
      case 'noyala_q': {
        // Cases adjacentes libres (range 1)
        const nqCells = [];
        [{dx:1,dy:0},{dx:-1,dy:0},{dx:0,dy:1},{dx:0,dy:-1}].forEach(({dx, dy}) => {
          const cx = hero.position.x + dx, cy = hero.position.y + dy;
          if (cx >= 0 && cx < MAP_SIZE && cy >= 0 && cy < MAP_SIZE &&
              !isWall(cx, cy) && !this.getHeroAt(cx, cy) &&
              !this.noyalaWolves.some(w => w.x === cx && w.y === cy))
            nqCells.push({ x: cx, y: cy });
        });
        return { heroes: [], heroesOutOfRange: [], cells: nqCells };
      }
      case 'noyala_r':
        // Positions des loups de Noyala sur toute la carte
        return {
          heroes: [], heroesOutOfRange: [],
          cells: this.noyalaWolves
            .filter(w => w.ownerInstanceId === hero.instanceId)
            .map(w => ({ x: w.x, y: w.y }))
        };
      default:
        return { heroes: [], heroesOutOfRange: [], cells: [] };
    }
  }

  // ============================================================
  // DAMAGE
  // ============================================================

  _calcSpellDmg(caster, spell, target) {
    let raw = spell.baseDamage + caster.ad * (spell.adRatio || 0) + this._effectiveAP(caster) * (spell.apRatio || 0);
    if (caster.items.includes('pistolet_magique') && (spell.adRatio || 0) > 0 && (spell.apRatio || 0) > 0)
      raw = Math.floor(raw * 1.2);
    const armorPen    = (caster.items.includes('dague_destructrice') ? 5 : 0) + (caster.items.includes('lame_tueuse_boucliers') ? 7 : 0) + (caster.items.includes('lame_du_ninja') ? 7 : 0);
    const mrPen       = (caster.items.includes('sorcerer_boots') ? 5 : 0) + (caster.items.includes('furie_magique') ? 5 : 0);
    const armorPenPct = ((caster.items.includes('arc_perforant_anges') || caster.items.includes('arc_des_morts')) ? 35 : caster.items.includes('arc_percant') ? 20 : 0) + (caster.items.includes('revolver_d_or') ? 7 : 0) + (caster.items.includes('lame_de_nargoth') ? 7 : 0) + (caster.items.includes('bottes_assassin') ? 5 : 0);
    const mrPenPct    = caster.items.includes('baton_des_abysses') ? 35 : caster.items.includes('cristal_de_vide') ? 15 : 0;
    let dmg = this._reduceDmg(raw, spell.damageType, target, armorPen, mrPen, armorPenPct, mrPenPct);
    if (armorPen > 0 && target.armor - armorPen < 15) dmg = Math.floor(dmg * 1.1);
    return dmg;
  }

  _effectiveAP(hero) {
    return hero.items.includes('chapeau_de_dieu') ? Math.floor(hero.ap * 1.4) : hero.ap;
  }

  _reduceDmg(raw, dmgType, target, armorPen = 0, mrPen = 0, armorPenPct = 0, mrPenPct = 0) {
    if (dmgType === 'physical') {
      const effectiveArmor = Math.min(80, Math.floor(target.armor * (1 + (target.armorPct || 0) / 100) * (1 - armorPenPct / 100)) - armorPen);
      let dmg;
      if (effectiveArmor >= 0) {
        dmg = Math.floor(raw * (1 - effectiveArmor / 100));
      } else {
        dmg = Math.floor(raw * (1 + 3 * Math.pow(-effectiveArmor, 1.3) / 100));
      }
      if (target.passive === 'rock_solid') dmg = Math.floor(dmg * 0.75);
      return Math.max(0, dmg);
    }
    if (dmgType === 'magical') {
      const mrShredMult = (target.statusEffects || [])
        .filter(e => e.type === 'mr_shred')
        .reduce((m, e) => m * (1 - e.pct / 100), 1);
      const effectiveMR = Math.min(80, Math.floor(target.mr * mrShredMult * (1 - mrPenPct / 100)) - mrPen);
      if (effectiveMR >= 0) {
        return Math.max(0, Math.floor(raw * (1 - effectiveMR / 100)));
      } else {
        return Math.floor(raw * (1 + 3 * Math.pow(-effectiveMR, 1.3) / 100));
      }
    }
    return Math.max(0, Math.floor(raw));
  }

  _applyHemorrhage(attacker, target, turns = 1, dmgType = 'physical') {
    if (!attacker || !target.isAlive || target.playerIdx === attacker.playerIdx) return;
    if (dmgType === 'physical' && (attacker.items.includes('lame_ensanglanté') || attacker.items.includes('arc_des_morts'))) {
      target.hemorrhageTurns = Math.max(target.hemorrhageTurns || 0, turns);
    }
    if (dmgType === 'magical' && (attacker.items.includes('boule_du_demon') || attacker.items.includes('livre_des_morts_vivants'))) {
      target.hemorrhageTurns = Math.max(target.hemorrhageTurns || 0, turns);
      this.addLog(`${target.name} — Hémorragie magique !`);
    }
  }

  // Applique dégâts d'un sort + passifs liés (hémorragie si physique ou magique)
  _applySpellDamage(caster, spell, target, dmg) {
    // Passif Voile Antimagie : bloque les dégâts d'un sort magique 1 fois tous les 3 tours
    if (target.items?.includes('voile_antimagie') && spell.damageType === 'magical' && target.voileCooldown <= 0) {
      target.voileCooldown = 3;
      this.addLog(`${target.name} — Le Voile : dégâts magiques bloqués !`);
      return;
    }
    this._applyDamage(target, dmg, caster, spell.damageType || 'physical');
    if (spell.damageType === 'physical' || spell.damageType === 'magical') {
      this._applyHemorrhage(caster, target, 1, spell.damageType);
    }
    // Passif Dans la chair (Frigiel) : +5% HP max cible en dégâts bruts par sort
    if (caster.passive === 'dans_la_chair' && target.isAlive) {
      const bonusRaw = Math.floor(target.maxHP * 0.05);
      this._applyDamage(target, bonusRaw, caster, 'raw');
      this.addLog(`${caster.name} — Passif : Dans la chair −${bonusRaw} HP bruts`);
    }
    // Passif Torche Sombre : DOT magique 3 tours
    if (caster.items?.includes('torche_sombre') && target.playerIdx !== caster.playerIdx && target.isAlive) {
      const dotDmg = Math.floor(20 + 0.02 * this._effectiveAP(caster));
      target.dots = (target.dots || []).filter(d => !(d.label === 'Torche Sombre' && d.caster === caster));
      target.dots.push({ dmgPerTurn: dotDmg, type: 'magical', turns: 3, caster, label: 'Torche Sombre' });
    }
    // Passif Masque de Larme : DOT brut 3 tours (2% HP max cible)
    if (caster.items?.includes('masque_de_larme') && target.playerIdx !== caster.playerIdx && target.isAlive) {
      const dotDmg = Math.floor(target.maxHP * 0.02);
      target.dots = (target.dots || []).filter(d => !(d.label === 'Masque de Larme' && d.caster === caster));
      target.dots.push({ dmgPerTurn: dotDmg, type: 'raw', turns: 3, caster, label: 'Masque de Larme' });
    }
    // Passif Sceptre du Malin : si ultime (index 2) magique → 20+0.15AP dégâts magiques bonus
    if (caster.items?.includes('sceptre_du_malin') && spell.damageType === 'magical'
        && target.playerIdx !== caster.playerIdx && target.isAlive) {
      const _ultIdx = caster.spells.findIndex(s => s.id === spell.id);
      if (_ultIdx === 2) {
        const bonusRaw = Math.floor(20 + 0.15 * this._effectiveAP(caster));
        const bonusDmg = this._reduceDmg(bonusRaw, 'magical', target);
        this._applyDamage(target, bonusDmg, caster, 'magical');
        this.addLog(`${caster.name} — Sceptre du Malin : −${bonusDmg} dégâts magiques bonus`);
      }
    }
  }

  _recalcEnchanteurAura() {
    // Retire l'ancienne aura de tous les héros
    this.players.forEach(pl => pl.heroes.forEach(h => {
      if ((h.enchanteurAD || 0) > 0) { h.ad -= h.enchanteurAD; h.enchanteurAD = 0; }
      if ((h.enchanteurAP || 0) > 0) { h.ap -= h.enchanteurAP; h.enchanteurAP = 0; }
    }));
    // Applique la nouvelle aura
    this.players.forEach(pl => pl.heroes.forEach(owner => {
      if (!owner.isAlive || !owner.position || !owner.items.includes('enchanteur_rouge')) return;
      this._getAllies(owner.playerIdx).forEach(ally => {
        if (ally === owner || !ally.isAlive || !ally.position) return;
        if (this._manhattan(owner.position, ally.position) <= 7) {
          ally.ad += 30; ally.enchanteurAD = (ally.enchanteurAD || 0) + 30;
          ally.ap += 30; ally.enchanteurAP = (ally.enchanteurAP || 0) + 30;
        }
      });
    }));
  }

  _applyArmorShred(attacker, target, pctPerHit = 0.03, maxPct = 0.20, itemName = 'Épée Cinglante') {
    if (!target.isAlive) return;
    const base     = target.armor + (target.armorShred || 0);  // armure totale sans réductions
    if (base <= 0) return;
    const maxShred = Math.round(base * maxPct);
    const perHit   = Math.max(1, Math.round(base * pctPerHit));
    const current  = target.armorShred || 0;
    const delta    = Math.min(perHit, maxShred - current);
    if (delta > 0) {
      target.armor     -= delta;
      target.armorShred = current + delta;
      this.addLog(`${attacker.name} — ${itemName} : armure ${target.name} −${delta} (${target.armor}% restant, shred ${target.armorShred}/${maxShred})`);
    }
    target.armorShredTurns = 5;
  }

  _applyDamage(target, damage, attacker, dmgType = 'physical') {
    if ((target.invincibleTurnsLeft || 0) > 0) {
      this.addLog(`${target.name} est invincible — dégâts annulés !`);
      return;
    }
    // Passif Cupidon : Amour fou — réduit les dégâts de 50% si on a attaqué le caster au tour dernier
    if (target.passive === 'cupidon_passive' && attacker && target.cupidonAttackedLastTurn.has(attacker.instanceId)) {
      damage = Math.floor(damage * 0.5);
      this.addLog(`${target.name} — Amour fou : dégâts réduits à 50%`);
    }
    // Passif Decigeno : multiplicateur de dégâts
    if (attacker?.decigenoDmgPct) {
      damage = Math.floor(damage * (1 + attacker.decigenoDmgPct / 100));
    }
    // Passif Flammes de Furie (furie_magique) : +20% dégâts magiques si cible < 40% HP
    if (dmgType === 'magical' && attacker?.items?.includes('furie_magique')
        && target.currentHP < target.maxHP * 0.4) {
      damage = Math.floor(damage * 1.2);
    }
    // Passif Toucher Magique (casque_necrometien) : +1 PM une fois par sort sur dégât magique
    if (dmgType === 'magical' && this._toucherMagiqueReady) {
      this.movementLeft += 1;
      this._toucherMagiqueReady = false;
      this.addLog(`${attacker?.name} — Toucher Magique : +1 PM`);
    }
    // Passif Alternateur de Puissance : 65 dégâts magiques bonus sur cible ennemie (CD 4 tours)
    if (dmgType === 'magical' && attacker?.items?.includes('alternateur_de_puissance')
        && !(attacker.alternateurCooldown > 0) && target.playerIdx !== attacker.playerIdx) {
      attacker.alternateurCooldown = 4;
      const alternateurDmg = this._reduceDmg(65, 'magical', target);
      if (alternateurDmg > 0) {
        this._applyDamage(target, alternateurDmg, attacker, 'magical');
        this.addLog(`${attacker.name} — Alternateur : −${alternateurDmg} dégâts magiques bonus`);
      }
    }
    // Épée Cinglante / Couperet du Démon : réduction d'armure sur chaque hit
    if (attacker && target.playerIdx !== attacker.playerIdx) {
      if (attacker.items.includes('couperet_du_demon'))
        this._applyArmorShred(attacker, target, 0.06, 0.30, 'Brise Armure');
      else if (attacker.items.includes('epee_cinglante'))
        this._applyArmorShred(attacker, target);
    }
    // Passif Combattant Anti-Mage : réduction des dégâts magiques de 0,1×AD
    if (dmgType === 'magical' && target.items?.includes('combattant_antimage')) {
      damage = Math.max(0, damage - Math.floor(0.1 * target.ad));
    }
    if (target.daggerShield > 0) {
      const absorbed   = Math.min(target.daggerShield, damage);
      target.daggerShield -= absorbed;
      damage              -= absorbed;
    }
    if (target.shield > 0) {
      // Passif Lame Tueuse de Boucliers : dégâts doublés contre le bouclier, normaux contre les HP
      if (attacker?.items?.includes('lame_tueuse_boucliers')) {
        const shieldBefore = target.shield;
        const shieldDmg = Math.min(shieldBefore, damage * 2);
        target.shield -= shieldDmg;
        damage = Math.max(0, damage - shieldBefore);
        if (shieldDmg > 0) this.addLog(`${attacker.name} — Lame Tueuse : bouclier −${shieldDmg}`);
      } else {
        const absorbed = Math.min(target.shield, damage);
        target.shield  -= absorbed;
        damage         -= absorbed;
      }
    }
    // Bouclier magique (Cape Antimagie) : absorbe uniquement les dégâts magiques
    if (attacker && target.playerIdx !== attacker.playerIdx && damage > 0) {
      attacker.dealtDamageLastTurn = true;
      Stats.addDamage(attacker.id, damage, dmgType);
      // Contribution tracking pour les assistances
      if (!target.damageContributors) target.damageContributors = {};
      target.damageContributors[attacker.id] = this.globalTurn;
      // Passif Révolver d'Or — Collecte : 35% des dégâts → or
      if (attacker.items?.includes('revolver_d_or')) {
        const collecteGold = Math.floor(damage * 0.35);
        if (collecteGold > 0) {
          this._giveGold(attacker, collecteGold);
          this.addLog(`${attacker.name} — Collecte : +${collecteGold}g`);
        }
      }
    }
    if (attacker?.lifeSteal > 0) {
      const lifeHeal = Math.floor(damage * attacker.lifeSteal / 100 * (attacker.hemorrhageTurns > 0 ? 0.5 : 1));
      attacker.currentHP = Math.min(attacker.maxHP, attacker.currentHP + lifeHeal);
    }
    if (damage > 0) target.tookDmgThisGlobalTurn = true;
    target.currentHP -= damage;
    // Passif Oeil Démoniaque : 7% des dégâts magiques en dégâts bruts supplémentaires
    if (dmgType === 'magical' && damage > 0 && attacker?.items?.includes('oeil_demoniaque')
        && target.playerIdx !== attacker.playerIdx) {
      const oeildRaw = Math.floor(damage * 0.07);
      if (oeildRaw > 0) {
        this._applyDamage(target, oeildRaw, attacker, 'raw');
        this.addLog(`${attacker.name} — Oeil Démoniaque : −${oeildRaw} dégâts bruts`);
      }
    }
    // Passif Dernier Recours (Sceptre de l'Ange)
    if (target.currentHP > 0 && target.currentHP < target.maxHP * 0.30
        && target.items?.includes('sceptre_ange')
        && (target.dernierRecoursCooldownTurn || 0) <= this.globalTurn) {
      const shieldAmt = Math.floor(target.currentMana * 0.35);
      if (shieldAmt > 0) {
        target.shield = Math.max(target.shield || 0, shieldAmt);
        target.shieldTurnsLeft = Math.max(target.shieldTurnsLeft || 0, 3);
        target.dernierRecoursCooldownTurn = this.globalTurn + 8;
        this.addLog(`${target.name} — Dernier Recours : bouclier +${shieldAmt} (3 tours) !`);
      }
    }
    // Passif Plastron Brûlant / Armure de Stal'noth : hémorragie sur l'attaquant
    if (dmgType === 'physical' && damage > 0 && attacker && attacker.isAlive && attacker.playerIdx !== target.playerIdx) {
      if (target.items?.includes('plastron_brulant') || target.items?.includes('armure_de_stalnoth')) {
        attacker.hemorrhageTurns = Math.max(attacker.hemorrhageTurns || 0, 1);
        this.addLog(`${target.name} — Passif : ${attacker.name} subit Hémorragie !`);
      }
    }
    // Passif Boule de Piques / Armure de Stal'noth : renvoi de dégâts physiques
    if (dmgType === 'physical' && damage > 0 && attacker && attacker.isAlive && attacker.playerIdx !== target.playerIdx) {
      if (target.items?.includes('boule_de_piques') || target.items?.includes('armure_de_stalnoth')) {
        const reflectPct = target.items?.includes('armure_de_stalnoth')
          ? (20 + Math.max(0, target.armor * 0.2)) / 100
          : 0.20;
        const reflectDmg = Math.floor(damage * reflectPct);
        if (reflectDmg > 0) {
          this._applyDamage(attacker, reflectDmg, null, 'magical');
          this.addLog(`${target.name} — Passif : renvoi ${reflectDmg} dégâts à ${attacker.name}`);
        }
      }
    }
    // Passif Révolver d'Or — Exécution : cible à ≤5% HP max → mort immédiate
    if (attacker && attacker.items?.includes('revolver_d_or') && target.playerIdx !== attacker.playerIdx
        && target.currentHP > 0 && target.currentHP <= Math.floor(target.maxHP * 0.05)) {
      this.addLog(`${attacker.name} — Exécution : ${target.name} éliminé !`);
      target.currentHP = 0;
    }
    if (target.currentHP <= 0 && target.isAlive !== false) {
      target.currentHP = 0;
      target.isAlive   = false;
      target.position  = null;
      this.addLog(`💀 ${target.name} (J${target.playerIdx + 1}) éliminé !`);
      // KDA
      target.deaths = (target.deaths || 0) + 1;
      if (attacker) attacker.kills = (attacker.kills || 0) + 1;
      {
        const ASSIST_WINDOW = 3;
        const assisters = new Set();
        for (const [hId, turn] of Object.entries(target.damageContributors || {})) {
          if (this.globalTurn - turn <= ASSIST_WINDOW && hId !== attacker?.id) assisters.add(hId);
        }
        for (const [hId, turn] of Object.entries(target.debuffContributors || {})) {
          if (this.globalTurn - turn <= ASSIST_WINDOW && hId !== attacker?.id) assisters.add(hId);
        }
        if (attacker) {
          for (const [hId, turn] of Object.entries(attacker.buffedBy || {})) {
            if (this.globalTurn - turn <= ASSIST_WINDOW && hId !== attacker.id) assisters.add(hId);
          }
        }
        assisters.delete(target.id);
        this.players.flatMap(p => p.heroes).forEach(h => {
          if (h && assisters.has(h.id) && h.playerIdx === attacker?.playerIdx) {
            h.assists = (h.assists || 0) + 1;
          }
        });
      }
      if (attacker) {
        this._giveGold(attacker, KILL_GOLD);
        this.addLog(`+${KILL_GOLD}g pour ${attacker.name} (kill)`);
        if (attacker.passive === 'skjer_passive') {
          attacker.currentMana = attacker.maxMana;
          this.movementLeft    = attacker.pm;
          Object.keys(attacker.cooldowns).forEach(id => { attacker.cooldowns[id] = 0; });
          Object.keys(this.spellsUsed).forEach(id => { this.spellsUsed[id] = false; });
          this.autoAttacksUsed = 0;
          attacker._skjerPassiveFired = true;
          this.addLog(`${attacker.name} — Passif : Mana, PM et cooldowns remis à zéro !`);
        }
      }
    }
  }

  // ============================================================
  // HELPERS
  // ============================================================

  _brownCandidates() {
    const occupied = new Set(this.brownSpots.map(s => `${s.x},${s.y}`));
    this.players.forEach(p => p.heroes.forEach(h => {
      if (h.position) occupied.add(`${h.position.x},${h.position.y}`);
    }));
    const cells = [];
    for (let x = 1; x < MAP_SIZE - 1; x++)
      for (let y = 1; y < MAP_SIZE - 1; y++) {
        const key = `${x},${y}`;
        if (isWall(x, y)) continue;
        if (ZONE_CELL_SET.has(key)) continue;
        if (occupied.has(key)) continue;
        cells.push({ x, y });
      }
    return cells;
  }

  _generateBrownSpots(count) {
    this.brownSpots = [];
    const candidates = this._brownCandidates();
    for (let i = 0; i < count && candidates.length; i++) {
      const idx = Math.floor(Math.random() * candidates.length);
      this.brownSpots.push({ ...candidates[idx] });
      candidates.splice(idx, 1);
    }
  }

  // Ligne de vue — Bresenham. Murs et héros (sauf from/to) bloquent.
  _hasLineOfSight(from, to, blockHeroes = true) {
    if (from.x === to.x && from.y === to.y) return true;
    let x = from.x, y = from.y;
    const dx = Math.abs(to.x - x), dy = Math.abs(to.y - y);
    const sx = to.x > x ? 1 : -1, sy = to.y > y ? 1 : -1;
    let err = dx - dy;
    while (true) {
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x += sx; }
      if (e2 <  dx) { err += dx; y += sy; }
      if (x === to.x && y === to.y) return true;
      if (isWall(x, y)) return false;
      if (blockHeroes && this.getHeroAt(x, y)) return false;
      if (this.hateWalls?.some(w => w.cells.some(c => c.x === x && c.y === y))) return false;
    }
  }

  _checkBombZone(hero) {
    if (!hero.isAlive || !hero.position) return;
    this.bombZones.forEach(bz => {
      if (!hero.isAlive) return;
      if (hero.playerIdx !== bz.caster.playerIdx && Math.abs(hero.position.x - bz.cx) + Math.abs(hero.position.y - bz.cy) <= bz.radius) {
        const raw = Math.floor(bz.baseDamage + bz.caster.ad * bz.adRatio);
        const dmg = this._reduceDmg(raw, 'physical', hero, bz.caster.armorPenPct || 0);
        this._applyDamage(hero, dmg, bz.caster, 'physical');
        this.addLog(`${hero.name} — Zone de bombardement : −${dmg} HP`);
      }
    });
  }

  _applyGelure(attacker, primaryTarget, totalDmg) {
    // Slow primary target
    (primaryTarget.statusEffects = primaryTarget.statusEffects || []).push({ type: 'slow', pmReduction: 1 });
    this.addLog(`${primaryTarget.name} — Gelure : −1 PM au prochain tour`);
    // Zone based on attacker armor (capped at 40%)
    const armorVal = Math.min(40, attacker.armor);
    const radius = armorVal >= 30 ? 2 : armorVal >= 20 ? 1 : 0;
    if (radius > 0 && primaryTarget.position) {
      const splashDmg = Math.max(1, Math.floor(totalDmg * 0.15));
      this._getEnemies(attacker.playerIdx).forEach(e => {
        if (e === primaryTarget || !e.isAlive || !e.position) return;
        if (this._manhattan(primaryTarget.position, e.position) <= radius) {
          const reduced = this._reduceDmg(splashDmg, 'physical', e);
          this._applyDamage(e, reduced, attacker, 'physical');
          (e.statusEffects = e.statusEffects || []).push({ type: 'slow', pmReduction: 1 });
          this.addLog(`${e.name} — Gelure (zone) : −${reduced} HP, −1 PM`);
        }
      });
    }
  }

  _transformItem(hero, fromId, toId) {
    const idx = hero.items.indexOf(fromId);
    if (idx === -1) return;
    Object.entries(EQUIPMENT[fromId].stats).forEach(([k, v]) => { hero[k] = (hero[k] || 0) - v; });
    Object.entries(EQUIPMENT[toId].stats).forEach(([k, v]) => { hero[k] = (hero[k] || 0) + v; });
    hero.items[idx] = toId;
    this.addLog(`✨ ${hero.name} — ${EQUIPMENT[fromId].name} se transforme en ${EQUIPMENT[toId].name} !`);
  }

  _applyLameElectrique(attacker, primaryTarget) {
    if ((attacker.lameElectriqueCooldown || 0) > 0) return;
    const SPLASH_RANGE = 6;
    const SPLASH_DMG = 250;
    const allEnemies = this._getEnemies(attacker.playerIdx).filter(e => e.isAlive && e.position);
    const splashTargets = allEnemies.filter(e =>
      e !== primaryTarget && this._manhattan(primaryTarget.position, e.position) <= SPLASH_RANGE
    );
    if (!splashTargets.length) return;
    splashTargets.forEach(e => {
      const dmg = this._reduceDmg(SPLASH_DMG, 'magical', e, 0);
      this._applyDamage(e, dmg, attacker, 'magical');
      this.addLog(`${e.name} — Lame Électrique : −${dmg} dégâts magiques`);
    });
    attacker.lameElectriqueCooldown = 3;
    this._checkGameOver();
  }

  _applyLameEauDamage(zone) {
    const hit = this._getEnemies(zone.playerIdx).filter(e =>
      e.isAlive && Math.abs(e.position.x - zone.cx) <= 1 && Math.abs(e.position.y - zone.cy) <= 1
      && !zone.damagedThisTurn.has(e.id)
    );
    hit.forEach(e => {
      zone.damagedThisTurn.add(e.id);
      const raw = Math.floor(zone.baseDamage + zone.caster.ad * zone.adRatio);
      const dmg = this._reduceDmg(raw, 'physical', e, zone.caster.armorPenPct || 0);
      this._applyDamage(e, dmg, zone.caster, 'physical');
      this.addLog(`${e.name} — Lame d'eau : −${dmg} HP`);
    });
    if (hit.length) this._checkGameOver();
  }

  _checkLameEauZone(hero) {
    if (!hero?.position || !this.lameEauZones?.length) return;
    this.lameEauZones.forEach(zone => {
      if (zone.playerIdx === hero.playerIdx) return;
      if (!hero.isAlive) return;
      if (zone.damagedThisTurn.has(hero.id)) return;
      if (Math.abs(hero.position.x - zone.cx) <= 1 && Math.abs(hero.position.y - zone.cy) <= 1) {
        zone.damagedThisTurn.add(hero.id);
        const raw = Math.floor(zone.baseDamage + zone.caster.ad * zone.adRatio);
        const dmg = this._reduceDmg(raw, 'physical', hero, zone.caster.armorPenPct || 0);
        this._applyDamage(hero, dmg, zone.caster, 'physical');
        this.addLog(`${hero.name} — Lame d'eau (entrée) : −${dmg} HP`);
        this._checkGameOver();
      }
    });
  }

  _checkTrap(hero) {
    if (!hero || !hero.position) return;
    // Lame d'eau : déclenchement à l'entrée
    this._checkLameEauZone(hero);
    const idx = this.traps.findIndex(t =>
      t.x === hero.position.x && t.y === hero.position.y && t.playerIdx !== hero.playerIdx
    );
    if (idx !== -1) {
      const trap  = this.traps[idx];
      const owner = trap.ownerHero;
      const raw   = trap.baseDamage + owner.ad * (trap.adRatio || 0) + owner.ap * (trap.apRatio || 0);
      const dmg   = this._reduceDmg(raw, trap.damageType, hero);
      this._applyDamage(hero, dmg, owner);
      this.addLog(`${hero.name} déclenche un piège de ${owner.name} — ${dmg} dégâts magiques !`);
      this.traps.splice(idx, 1);
      this._checkGameOver();
      if (window.renderer) { renderer.render(); renderer.updateUI(); }
    }
    // Glyphe de Douleur : déclenchement à l'entrée (appelé ici pour couvrir tous les déplacements)
    if (hero.isAlive) this._checkGlyph(hero);
  }

  _checkPibotBattery(hero) {
    if (!hero.position) return;
    const idx = this.pibotBatteries.findIndex(b =>
      b.x === hero.position.x && b.y === hero.position.y
    );
    if (idx === -1) return;
    const battery = this.pibotBatteries[idx];
    const missingMana = hero.maxMana - hero.currentMana;
    const regen = Math.floor(missingMana * 0.50);
    hero.currentMana = Math.min(hero.maxMana, hero.currentMana + regen);
    // Si Pibot marche sur sa propre batterie : applique Station de Recharge (attaque renforcée)
    if (battery.heroInstanceId === hero.instanceId) {
      const wSpell = (hero.spells || []).find(s => s.id === 'pibot_w');
      const apRatio = wSpell ? wSpell.apRatio : 0.6;
      hero.empoweredAttack = { adRatio: 0, apRatio };
      this.addLog(`${hero.name} collecte une batterie — +${regen} mana + prochaine AA renforcée !`);
    } else {
      this.addLog(`${hero.name} collecte une batterie — +${regen} mana !`);
    }
    this.pibotBatteries.splice(idx, 1);
    if (window.renderer) { renderer.render(); renderer.updateUI(); }
  }

  // ============================================================
  // LOUPS DE NOYALA
  // ============================================================

  _findWolfOwner(wolf) {
    for (const player of this.players)
      for (const hero of player.heroes)
        if (hero && hero.instanceId === wolf.ownerInstanceId) return hero;
    return null;
  }

  _wolfMove(wolf, tx, ty) {
    if (!wolf || wolf.pmLeft <= 0) { this.addLog('Plus de PM pour ce loup !'); return false; }
    if (isWall(tx, ty)) { this.addLog('Case invalide !'); return false; }
    if (this.getHeroAt(tx, ty)) { this.addLog('Case occupée par un héros !'); return false; }
    if (this.noyalaWolves.some(w => w !== wolf && w.x === tx && w.y === ty)) {
      this.addLog('Case occupée par un autre loup !'); return false;
    }
    const result = this._dijkstraPath({ x: wolf.x, y: wolf.y }, { x: tx, y: ty });
    if (!result) { this.addLog('Chemin inaccessible !'); return false; }
    if (result.cost > wolf.pmLeft) { this.addLog(`Pas assez de PM (coût ${result.cost}, reste ${wolf.pmLeft}) !`); return false; }

    wolf.x = tx; wolf.y = ty;
    wolf.pmLeft -= result.cost;
    this.addLog(`Loup déplacé en (${tx},${ty}) — PM restants : ${wolf.pmLeft}`);

    const noyala = this._findWolfOwner(wolf);

    // Collecte zone ROAM
    const brownIdx = this.brownSpots.findIndex(s => s.x === wolf.x && s.y === wolf.y);
    if (brownIdx !== -1 && noyala) {
      this._giveGold(noyala, 250);
      this.addLog(`Loup de ${noyala.name} collecte une zone de butin — +250g !`);
      const candidates = this._brownCandidates();
      if (candidates.length) {
        const pick = candidates[Math.floor(Math.random() * candidates.length)];
        this.brownSpots[brownIdx] = { ...pick };
      } else {
        this.brownSpots.splice(brownIdx, 1);
      }
    }

    // Adjacent à un ennemi → attaque et meurt
    const _wDirs = [{dx:1,dy:0},{dx:-1,dy:0},{dx:0,dy:1},{dx:0,dy:-1}];
    const adjacentEnemies = this._getEnemies(wolf.playerIdx).filter(e =>
      e.isAlive && e.position && _wDirs.some(d => e.position.x === wolf.x + d.dx && e.position.y === wolf.y + d.dy)
    );
    if (adjacentEnemies.length > 0 && noyala) {
      adjacentEnemies.forEach(e => {
        const raw = Math.floor(wolf.baseDamage + noyala.ad * wolf.adRatio);
        const dmg = this._reduceDmg(raw, 'physical', e);
        this._applyDamage(e, dmg, noyala, 'physical');
        this.addLog(`Loup de ${noyala.name} attaque ${e.name} : −${dmg} HP et meurt !`);
      });
      const idx = this.noyalaWolves.indexOf(wolf);
      if (idx !== -1) this.noyalaWolves.splice(idx, 1);
      this._checkGameOver();
    }

    if (window.renderer) { renderer.render(); renderer.updateUI(); }
    return true;
  }

  getWolfReachableCells(wolf) {
    if (!wolf || wolf.pmLeft <= 0) return [];
    const cells = [];
    for (let x = 0; x < MAP_SIZE; x++) {
      for (let y = 0; y < MAP_SIZE; y++) {
        if (isWall(x, y)) continue;
        if (this.getHeroAt(x, y)) continue;
        if (this.noyalaWolves.some(w => w !== wolf && w.x === x && w.y === y)) continue;
        if (x === wolf.x && y === wolf.y) continue;
        const result = this._dijkstraPath({ x: wolf.x, y: wolf.y }, { x, y });
        if (result && result.cost <= wolf.pmLeft) cells.push({ x, y });
      }
    }
    return cells;
  }

  _checkBrownCollection(hero) {
    const key = `${hero.position.x},${hero.position.y}`;
    const idx = this.brownSpots.findIndex(s => `${s.x},${s.y}` === key);
    if (idx === -1) return;
    this._giveGold(hero, 250);
    this.addLog(`${hero.name} collecte une zone de butin — +250g !`);
    // Passif Layia : +1 PO d'attaque toutes les 2 zones de butin
    if (hero.passive === 'layia_passive') {
      hero.layiaBrownCount = (hero.layiaBrownCount || 0) + 1;
      if (hero.layiaBrownCount % 2 === 0) {
        hero.po++;
        this.addLog(`${hero.name} — Passif : PO d'attaque → ${hero.po} ! (${hero.layiaBrownCount} zones)`);
      } else {
        this.addLog(`${hero.name} — Passif : zone ${hero.layiaBrownCount} (PO au prochain)`);
      }
    }
    // Move spot to new random position immediately
    const candidates = this._brownCandidates();
    if (candidates.length) {
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      this.brownSpots[idx] = { ...pick };
    } else {
      this.brownSpots.splice(idx, 1);
    }
    if (window.renderer) { renderer.render(); renderer.updateUI(); }
  }

  // Donne de l'or à un héros, avec partage vers l'allié le plus proche si goldSharePct > 0
  _giveGold(hero, amount) {
    hero.gold += amount;
    hero.totalGoldEarned = (hero.totalGoldEarned || 0) + amount;
    this.teamGoldEarned[hero.playerIdx] += amount;
    if (hero.goldSharePct > 0) {
      const share = Math.floor(amount * hero.goldSharePct / 100);
      if (share > 0) {
        const allies = this._getAllies(hero.playerIdx).filter(a => a !== hero && a.position);
        if (allies.length) {
          const nearest = allies.reduce((best, a) =>
            this._chebyshev(hero.position, a.position) < this._chebyshev(hero.position, best.position) ? a : best
          );
          nearest.gold += share;
          this.teamGoldEarned[hero.playerIdx] += share;
          this.addLog(`${hero.name} partage ${share}g → ${nearest.name}`);
        }
      }
    }
  }

  _chebyshev(a, b)          { return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)); }
  _manhattan(a, b)          { return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); }
  _getEnemies(playerIdx)    { return this.players[1 - playerIdx].heroes.filter(h => h.isAlive); }
  _getAllies(playerIdx)      { return this.players[playerIdx].heroes.filter(h => h.isAlive); }

  getHeroAt(x, y) {
    for (const p of this.players)
      for (const h of p.heroes)
        if (h.isAlive && h.position && h.position.x === x && h.position.y === y)
          return h;
    return null;
  }

  _isInUltimateGlyph(hero) {
    if (!hero?.position) return false;
    return this.glyphs.some(g =>
      g.type === 'ultimate' && g.playerIdx === hero.playerIdx &&
      g.cells.some(c => c.x === hero.position.x && c.y === hero.position.y)
    );
  }

  _diamondCells(cx, cy, size) {
    const cells = [];
    for (let dx = -size; dx <= size; dx++)
      for (let dy = -(size - Math.abs(dx)); dy <= (size - Math.abs(dx)); dy++)
        cells.push({ x: cx + dx, y: cy + dy });
    return cells;
  }

  _checkGlyph(hero) {
    if (!hero?.position) return;
    for (let i = this.glyphs.length - 1; i >= 0; i--) {
      const g = this.glyphs[i];
      if (!g.cells.some(c => c.x === hero.position.x && c.y === hero.position.y)) continue;
      // Pain glyph damages enemies only
      if (g.type === 'pain' && hero.playerIdx !== g.playerIdx) {
        const raw = Math.floor(g.baseDamage + g.ownerHero.ap * g.apRatio);
        const dmg = this._reduceDmg(raw, g.damageType, hero);
        const _glyphSpell = { damageType: g.damageType };
        this._applySpellDamage(g.ownerHero, _glyphSpell, hero, dmg);
        this.addLog(`${hero.name} déclenche la Glyphe de Douleur de ${g.ownerHero.name} — ${dmg} dégâts magiques !`);
        this.glyphs.splice(i, 1);
        this._checkGameOver();
        if (window.renderer) { renderer.render(); renderer.updateUI(); }
      }
      // Shallah passive: +1 PM quand il marche dans sa propre glyphe pendant son tour
      if (hero === g.ownerHero && hero.passive === 'shallah_passive' && this.currentHero === hero) {
        this.movementLeft++;
        this.addLog(`${hero.name} — Passif : +1 PM (glyphe)`);
      }
    }
  }

  _applySpellEffects(spell, targets) {
    if (!spell.effects?.length) return;
    spell.effects.forEach(eff => {
      targets.forEach(t => {
        if (!t.isAlive) return;
        if ((t.invincibleTurnsLeft || 0) > 0) return;
        // Glyphe Ultime : immunité aux débuffs
        if (this._isInUltimateGlyph(t)) {
          this.addLog(`${t.name} est protégé par la Glyphe Ultime !`);
          return;
        }
        // Vaillance (Ondine) : annule le premier débuff du tour
        if (t.passive === 'vaillance' && !t.debuffDodgedThisTurn) {
          t.debuffDodgedThisTurn = true;
          this.addLog(`${t.name} — Vaillance : débuff annulé !`);
          return;
        }
        if (eff.type === 'stun') {
          // Passif Protection Divine : un allié à moins de 10 cases peut annuler le stun
          const protector = this._getAllies(t.playerIdx).find(a =>
            a.isAlive && a.position && t.position &&
            a.items.includes('protection_divine') &&
            !(a.protectionDivineCooldown > 0) &&
            this._manhattan(a.position, t.position) < 10
          );
          if (protector) {
            protector.protectionDivineCooldown = 7;
            this.addLog(`${protector.name} — Protection Divine : stun sur ${t.name} annulé ! (CD 7 tours)`);
          } else if (!(t.statusEffects || []).some(e => e.type === 'stun')) {
            (t.statusEffects = t.statusEffects || []).push({ ...eff });
            this.addLog(`${t.name} est étourdi !`);
            if (this.currentHero) { if (!t.debuffContributors) t.debuffContributors = {}; t.debuffContributors[this.currentHero.id] = this.globalTurn; }
          }
        } else if (eff.type === 'slow') {
          (t.statusEffects = t.statusEffects || []).push({ ...eff });
          this.addLog(`${t.name} perd ${eff.pmReduction} PM au prochain tour`);
          if (this.currentHero) { if (!t.debuffContributors) t.debuffContributors = {}; t.debuffContributors[this.currentHero.id] = this.globalTurn; }
        } else if (eff.type === 'hemorrhage') {
          (t.statusEffects = t.statusEffects || []).push({ ...eff });
          this.addLog(`${t.name} subit une hémorragie (soins -50% pendant ${eff.turns} tour${eff.turns > 1 ? 's' : ''})`);
          if (this.currentHero) { if (!t.debuffContributors) t.debuffContributors = {}; t.debuffContributors[this.currentHero.id] = this.globalTurn; }
        } else if (eff.type === 'malediction') {
          (t.statusEffects = t.statusEffects || []).push({ ...eff });
          this.addLog(`${t.name} est maudit (portée sorts -3 pendant ${eff.turns} tour${eff.turns > 1 ? 's' : ''})`);
          if (this.currentHero) { if (!t.debuffContributors) t.debuffContributors = {}; t.debuffContributors[this.currentHero.id] = this.globalTurn; }
        } else if (eff.type === 'mute') {
          if (!(t.statusEffects || []).some(e => e.type === 'mute')) {
            (t.statusEffects = t.statusEffects || []).push({ ...eff });
            this.addLog(`${t.name} est muet — sorts bloqués pendant ${eff.turns} tour${eff.turns > 1 ? 's' : ''} !`);
            if (this.currentHero) { if (!t.debuffContributors) t.debuffContributors = {}; t.debuffContributors[this.currentHero.id] = this.globalTurn; }
          }
        } else if (eff.type === 'root') {
          t.rootTurns = Math.max(t.rootTurns || 0, eff.turns);
          this.addLog(`${t.name} est immobilisé (PM et dash bloqués) pendant ${eff.turns} tour${eff.turns > 1 ? 's' : ''} !`);
          if (this.currentHero) { if (!t.debuffContributors) t.debuffContributors = {}; t.debuffContributors[this.currentHero.id] = this.globalTurn; }
        } else if (eff.type === 'mr_shred') {
          (t.statusEffects = t.statusEffects || []).push({ ...eff });
          this.addLog(`${t.name} perd 20% de RM pendant ${eff.turns} tours`);
          if (this.currentHero) { if (!t.debuffContributors) t.debuffContributors = {}; t.debuffContributors[this.currentHero.id] = this.globalTurn; }
        }
        // Passif Blason Glorieux : débuff → 10% HP max dégâts magiques (1x par tour max)
        if (this.currentHero?.items.includes('blason_glorieux') && t.isAlive && !this.currentHero.blasonGlorieuxUsedThisTurn) {
          const blasonDmg = this._reduceDmg(Math.floor(t.maxHP * 0.10), 'magical', t);
          if (blasonDmg > 0) {
            this._applyDamage(t, blasonDmg, this.currentHero, 'magical');
            this.addLog(`${t.name} — Blason Glorieux : −${blasonDmg} dégâts magiques`);
            this.currentHero.blasonGlorieuxUsedThisTurn = true;
          }
        }
      });
    });
  }

  _getAdjacentFreeCells(pos, exclude) {
    const cells = [];
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      if (!dx && !dy) continue;
      const nx = pos.x + dx, ny = pos.y + dy;
      if (nx < 0 || nx >= MAP_SIZE || ny < 0 || ny >= MAP_SIZE) continue;
      if (isWall(nx, ny)) continue;
      const occupant = this.getHeroAt(nx, ny);
      if (occupant && occupant !== exclude) continue;
      cells.push({ x: nx, y: ny });
    }
    return cells;
  }

  addLog(msg) {
    this.log.push(msg);
    if (this.log.length > 200) this.log.shift();
    if (window.renderer) renderer.appendLog(msg);
  }

  // ============================================================
  // GAME OVER
  // ============================================================

  _checkGameOver() {
    const a0 = this.players[0].heroes.filter(h => h.isAlive).length;
    const a1 = this.players[1].heroes.filter(h => h.isAlive).length;
    if (a0 === 0 && a1 === 0) { this.endGame(null); return; }
    if (a0 === 0)              { this.endGame(1);    return; }
    if (a1 === 0)              { this.endGame(0);    return; }
    if (this.currentHero && !this.currentHero.isAlive) this.endHeroTurn();
  }

  endGame(winnerIdx) {
    if (this.phase === 'gameover') return;
    this._stopTimer();
    this.phase  = 'gameover';
    this.winner = winnerIdx;

    // Record KDA to Stats before recordGameEnd
    this.players.flatMap(p => p.heroes).filter(Boolean).forEach(h => {
      Stats.recordKDA(h.id, h.kills || 0, h.deaths || 0, h.assists || 0);
    });

    // Build match result for history + scoreboard
    const matchResult = {
      date: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      winner: winnerIdx,
      players: this.players.map((p, pi) => ({
        label: `Joueur ${pi + 1}`,
        won: winnerIdx !== null && winnerIdx === pi,
        heroes: p.heroes.filter(Boolean).map(h => ({
          name:        h.name,
          portrait:    h.portrait || null,
          colorFill:   h.colorFill,
          kills:       h.kills   || 0,
          deaths:      h.deaths  || 0,
          assists:     h.assists || 0,
          totalGold:   h.totalGoldEarned || h.gold,
          items:       [...h.items],
        }))
      }))
    };
    MatchHistory.save(matchResult);

    Stats.recordGameEnd(winnerIdx, this.players);
    if (window.renderer) renderer.showGameOver(winnerIdx, matchResult);
  }

  // ============================================================
  // ONLINE — SÉRIALISATION / DÉSÉRIALISATION
  // ============================================================

  serialize() {
    const heroToId = h => h?.instanceId ?? null;
    const serHero  = hero => ({
      ...hero,
      dots: (hero.dots || []).map(d => ({
        dmgPerTurn: d.dmgPerTurn, turns: d.turns,
        casterId: heroToId(d.caster), type: d.type
      }))
    });
    const serObj = obj => {
      const o = { ...obj };
      if ('ownerHero' in o) { o.ownerHeroId = heroToId(o.ownerHero); delete o.ownerHero; }
      return o;
    };
    return JSON.stringify({
      phase:              this.phase,
      players:            this.players.map(p => ({ ...p, heroes: p.heroes.map(serHero) })),
      draft:              { ...this.draft, banned: [...this.draft.banned] },
      brownSpots:         this.brownSpots,
      pibotBatteries:     this.pibotBatteries,
      noyalaWolves:       this.noyalaWolves,
      traps:              this.traps.map(serObj),
      glyphs:             this.glyphs.map(serObj),
      bombZones:          this.bombZones.map(serObj),
      hateWalls:          this.hateWalls.map(serObj),
      lameEauZones:       this.lameEauZones.map(serObj),
      amourFouZones:      this.amourFouZones.map(serObj),
      teamGoldEarned:     this.teamGoldEarned,
      globalTurn:         this.globalTurn,
      heroTurnIndex:      this.heroTurnIndex,
      log:                this.log,
      winner:             this.winner,
      currentHeroId:      heroToId(this.currentHero),
      actionMode:         this.actionMode,
      selectedSpellId:    this.selectedSpell?.id ?? null,
      actionsUsed:        this.actionsUsed,
      movementLeft:       this.movementLeft,
      autoAttacksUsed:    this.autoAttacksUsed,
      autoAttacksAllowed: this.autoAttacksAllowed,
      spellsUsed:         this.spellsUsed,
      canBuy:             this.canBuy,
      timeLeft:           this.timeLeft,
    });
  }

  applySerializedState(stateStr) {
    const s = typeof stateStr === 'string' ? JSON.parse(stateStr) : stateStr;

    this.phase              = s.phase;
    this.players            = s.players;
    this.draft              = { ...s.draft, banned: new Set(s.draft.banned) };
    this.brownSpots         = s.brownSpots;
    this.pibotBatteries     = s.pibotBatteries || [];
    this.noyalaWolves       = s.noyalaWolves   || [];
    this.teamGoldEarned     = s.teamGoldEarned;
    this.globalTurn         = s.globalTurn;
    this.heroTurnIndex      = s.heroTurnIndex;
    this.log                = s.log;
    this.winner             = s.winner;
    this.actionMode         = s.actionMode;
    this.actionsUsed        = s.actionsUsed;
    this.movementLeft       = s.movementLeft;
    this.autoAttacksUsed    = s.autoAttacksUsed;
    this.autoAttacksAllowed = s.autoAttacksAllowed;
    this.spellsUsed         = s.spellsUsed;
    this.canBuy             = s.canBuy;
    this.timeLeft           = s.timeLeft;

    const all  = [...this.players[0].heroes, ...this.players[1].heroes];
    const byId = id => all.find(h => h.instanceId === id) ?? null;

    this.currentHero   = byId(s.currentHeroId);
    this.selectedSpell = this.currentHero?.spells.find(sp => sp.id === s.selectedSpellId) ?? null;

    all.forEach(h => {
      if (h.dots) h.dots = h.dots.map(d => ({ ...d, caster: byId(d.casterId) }));
    });

    const relink = arr => (arr || []).map(o => ({ ...o, ownerHero: byId(o.ownerHeroId) }));
    this.traps        = relink(s.traps);
    this.glyphs       = relink(s.glyphs);
    this.bombZones    = relink(s.bombZones);
    this.hateWalls    = relink(s.hateWalls);
    this.lameEauZones     = relink(s.lameEauZones);
    this.amourFouZones    = relink(s.amourFouZones || []);
  }
}
