// ============================================================
// STATISTICS  (localStorage-backed)
// ============================================================

const Stats = (() => {
  const KEY = 'arena_stats_v1';

  // Per-game accumulators (reset at game start)
  let _cur = {
    bans:              new Set(), // heroIds banned this game
    picks:             {},        // heroId → playerIdx
    damage:            {},        // heroId → { phys, mag }
    heals:             {},        // heroId → total heals
    shields:           {},        // heroId → total shields given
    manaSpent:         {},        // heroId → total mana spent on spells
    items:             {},        // heroId → Set of itemIds bought
    kda:               {},        // heroId → { k, d, a }
    runes:             [],        // [{ runeId, playerIdx, heroId }]
    decisions:         [],        // [{ heroId, key, optionId, playerIdx }] — voir recordDecision
  };

  // Persistent data
  let _data = { heroes: {}, items: {}, runes: {}, heroItems: {}, heroRunes: {}, heroDecisions: {}, heroItemPairs: {}, heroItemCounters: {}, heroLocalOutcomes: {}, heroDraftEV: {}, heroRegret: {} };

  // Décroissance temporelle de l'EV apprise (objets/runes/décisions/paires/effets locaux) : une
  // partie vieille de N parties pèse DECAY_PER_GAME^N fois une partie d'aujourd'hui. Choisi pour
  // qu'une partie vieille de 500 parties pèse encore 90% d'une partie fraîche (0.9^(1/500)) — un
  // oubli TRÈS lent, juste assez pour qu'une vieille donnée finisse par s'effacer face à des
  // milliers de parties récentes, sans jamais faire un "trou" brutal comme un reset complet.
  // S'applique à TOUTES les entrées {picks,wins}/{picks,sum} à CHAQUE partie (pas seulement celles
  // concernées par cette partie précise) : sinon une entrée jamais retouchée resterait figée à sa
  // valeur d'origine pour toujours au lieu de s'effacer avec le temps qui passe. Voir _decayAll().
  const DECAY_PER_GAME = Math.pow(0.9, 1 / 500);

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

  // Winrate d'un objet sur un héros donné, ventilé par profil de dégâts de l'équipe adverse
  // (vsAP / vsAD / vsMixed, + "all" = agrégat tous matchups) — l'EV d'un objet dépend de contre
  // qui il est acheté (armure vs une équipe AD, RM vs une équipe AP...), pas juste du héros qui
  // l'achète. Sert de signal empirique pour le choix de build adaptatif (js/bot.js _scoreItemForHero).
  function _heroItemEntry(heroId, itemId, ctx) {
    if (!_data.heroItems) _data.heroItems = {};
    if (!_data.heroItems[heroId]) _data.heroItems[heroId] = {};
    if (!_data.heroItems[heroId][itemId]) _data.heroItems[heroId][itemId] = {};
    if (!_data.heroItems[heroId][itemId][ctx]) _data.heroItems[heroId][itemId][ctx] = { picks: 0, wins: 0 };
    return _data.heroItems[heroId][itemId][ctx];
  }

  function _runeEntry(id) {
    if (!_data.runes) _data.runes = {};
    if (!_data.runes[id]) _data.runes[id] = { picks: 0, wins: 0 };
    return _data.runes[id];
  }

  // Winrate d'une rune sur un héros donné, ventilé par contexte — même principe que _heroItemEntry.
  function _heroRuneEntry(heroId, runeId, ctx) {
    if (!_data.heroRunes) _data.heroRunes = {};
    if (!_data.heroRunes[heroId]) _data.heroRunes[heroId] = {};
    if (!_data.heroRunes[heroId][runeId]) _data.heroRunes[heroId][runeId] = {};
    if (!_data.heroRunes[heroId][runeId][ctx]) _data.heroRunes[heroId][runeId][ctx] = { picks: 0, wins: 0 };
    return _data.heroRunes[heroId][runeId][ctx];
  }

  // Winrate observé pour un héros donné quand DEUX objets étaient possédés en même temps (paire
  // canonicalisée : itemA/itemB triés alphabétiquement, une seule entrée par paire quel que soit
  // l'ordre d'achat) — signal de synergie entre objets, voir js/bot.js _itemSynergyEV. `pairKey`
  // est déjà construit par l'appelant (recordGameEnd) au format "itemA|itemB".
  function _heroItemPairEntry(heroId, pairKey) {
    if (!_data.heroItemPairs) _data.heroItemPairs = {};
    if (!_data.heroItemPairs[heroId]) _data.heroItemPairs[heroId] = {};
    if (!_data.heroItemPairs[heroId][pairKey]) _data.heroItemPairs[heroId][pairKey] = { picks: 0, wins: 0 };
    return _data.heroItemPairs[heroId][pairKey];
  }

  // Winrate observé pour ce héros quand IL possédait `myItemId` ET qu'un héros ADVERSE (n'importe
  // lequel) possédait `enemyItemId` en fin de partie — contrairement à heroItemPairs (synergie
  // entre deux objets du MÊME héros), ceci capture un vrai contre au niveau de l'objet précis
  // (perforation d'armure vs un objet HP/armure adverse, RM vs un objet AP adverse...) plutôt que
  // le profil AD/AP agrégé de l'équipe adverse (déjà couvert par les buckets de matchup — voir
  // js/bot.js _itemCounterEV). Asymétrique par construction : "myItemId contre enemyItemId" n'a
  // pas besoin d'être la même donnée que son inverse.
  function _heroItemCounterEntry(heroId, myItemId, enemyItemId) {
    if (!_data.heroItemCounters) _data.heroItemCounters = {};
    if (!_data.heroItemCounters[heroId]) _data.heroItemCounters[heroId] = {};
    if (!_data.heroItemCounters[heroId][myItemId]) _data.heroItemCounters[heroId][myItemId] = {};
    if (!_data.heroItemCounters[heroId][myItemId][enemyItemId]) _data.heroItemCounters[heroId][myItemId][enemyItemId] = { picks: 0, wins: 0 };
    return _data.heroItemCounters[heroId][myItemId][enemyItemId];
  }

  // Crédit de victoire pondéré par la vitesse (voir recordGameEnd) : gagner en 20 tours vaut mieux
  // que gagner en 55, à winrate brut égal. Centré sur economyHorizonTurn (repère "durée de partie
  // normale" déjà utilisé ailleurs, voir js/bot.js _scoreMoveCell — pas une nouvelle constante
  // inventée pour l'occasion) : une victoire à cette durée ou plus lente vaut le crédit plancher,
  // plus vite vaut plus, borné (winSpeedCreditMin/Max) pour ne jamais laisser une partie extrême
  // dominer le signal. Ne s'applique QU'aux structures qui pilotent les décisions du bot (objets/
  // runes/décisions/paires/contres/draft) — jamais à _heroEntry/_itemEntry/_runeEntry (stats
  // brutes affichées telles quelles en Tier List) : ce que l'humain y lit doit rester un vrai % de
  // victoires, la pondération vitesse ne concerne que ce que le bot optimise en interne.
  function _winCredit(turns) {
    let p = { economyHorizonTurn: 60, winSpeedCreditMin: 0.5, winSpeedCreditMax: 1.5 };
    try { if (typeof getBotParams === 'function') p = getBotParams(); } catch (e) {}
    const ref = p.economyHorizonTurn || 60;
    const raw = ref / Math.max(1, turns || ref);
    const min = p.winSpeedCreditMin ?? 0.5, max = p.winSpeedCreditMax ?? 1.5;
    return Math.max(min, Math.min(max, raw));
  }

  // Winrate d'une décision générique (héros, clé de décision, option choisie), ventilé par
  // contexte — infrastructure réutilisable pour TOUTE décision du bot qu'on veut piloter par EV
  // (économie vs engagement, ordre de cast, engager ou non...), pas juste objets/runes.
  // Voir js/bot.js _recordDecision / _decisionEV.
  function _heroDecisionEntry(heroId, key, optionId, ctx) {
    if (!_data.heroDecisions) _data.heroDecisions = {};
    if (!_data.heroDecisions[heroId]) _data.heroDecisions[heroId] = {};
    if (!_data.heroDecisions[heroId][key]) _data.heroDecisions[heroId][key] = {};
    if (!_data.heroDecisions[heroId][key][optionId]) _data.heroDecisions[heroId][key][optionId] = {};
    if (!_data.heroDecisions[heroId][key][optionId][ctx]) _data.heroDecisions[heroId][key][optionId][ctx] = { picks: 0, wins: 0 };
    return _data.heroDecisions[heroId][key][optionId][ctx];
  }

  // Winrate d'un héros au pick/ban, ventilé par profil de l'équipe adverse connue à ce moment du
  // draft (l'allié n'est pas encore assez fiable tôt dans le draft — voir js/bot.js
  // _draftBucketKeyList, qui ne retient que enemyOnly/all, pas combined). Sert de signal EV pour
  // le choix de pick/ban (js/bot.js _draftHeroEV), en complément du winrate global déjà dans
  // heroes[id] (agrégat non ventilé, affiché sur la tier list mais pas utilisé pour le scoring).
  function _heroDraftEntry(heroId, ctx) {
    if (!_data.heroDraftEV) _data.heroDraftEV = {};
    if (!_data.heroDraftEV[heroId]) _data.heroDraftEV[heroId] = {};
    if (!_data.heroDraftEV[heroId][ctx]) _data.heroDraftEV[heroId][ctx] = { picks: 0, wins: 0 };
    return _data.heroDraftEV[heroId][ctx];
  }

  // Effet LOCAL d'une décision (héros, clé, option choisie), ventilé par contexte — récompense
  // scalaire déjà combinée (or/dégâts/soin/bouclier/PV/KDA, pondérés — voir js/bot.js
  // _computeLocalReward), mesurée quelques tours après la décision plutôt qu'au résultat final de
  // la partie 40+ tours plus tard. Signal complémentaire à heroDecisions (l'issue de toute la
  // partie) : plus rapide à converger, moins bruité par tout ce qui se passe ensuite dans la
  // partie, et fonctionne même pour une partie qui finit en égalité (la partie entière est ignorée
  // par recordGameEnd, mais l'effet local d'une décision reste un fait mesuré indépendamment).
  // {picks, sum} plutôt que {picks, wins} : la récompense est continue (pas binaire gagné/perdu) —
  // moyenne = sum/picks.
  function _heroLocalOutcomeEntry(heroId, key, optionId, ctx) {
    if (!_data.heroLocalOutcomes) _data.heroLocalOutcomes = {};
    if (!_data.heroLocalOutcomes[heroId]) _data.heroLocalOutcomes[heroId] = {};
    if (!_data.heroLocalOutcomes[heroId][key]) _data.heroLocalOutcomes[heroId][key] = {};
    if (!_data.heroLocalOutcomes[heroId][key][optionId]) _data.heroLocalOutcomes[heroId][key][optionId] = {};
    if (!_data.heroLocalOutcomes[heroId][key][optionId][ctx]) _data.heroLocalOutcomes[heroId][key][optionId][ctx] = { picks: 0, sum: 0 };
    return _data.heroLocalOutcomes[heroId][key][optionId][ctx];
  }

  // Applique DECAY_PER_GAME à TOUTE entrée {picks,wins}/{picks,sum} existante, qu'elle soit
  // concernée par la partie qui vient de se terminer ou non — voir le commentaire de
  // DECAY_PER_GAME plus haut. Appelée une fois par partie jouée (y compris les égalités : le temps
  // passe même quand cette partie précise n'apporte pas de nouvelle donnée).
  function _decayEntry(e) {
    if (e && typeof e.picks === 'number') {
      e.picks *= DECAY_PER_GAME;
      if (typeof e.wins === 'number') e.wins *= DECAY_PER_GAME;
      if (typeof e.sum  === 'number') e.sum  *= DECAY_PER_GAME;
    }
  }
  function _decayAll() {
    Object.values(_data.items || {}).forEach(_decayEntry);
    Object.values(_data.runes || {}).forEach(_decayEntry);
    Object.values(_data.heroItems || {}).forEach(itemMap =>
      Object.values(itemMap).forEach(ctxMap => Object.values(ctxMap).forEach(_decayEntry)));
    Object.values(_data.heroRunes || {}).forEach(runeMap =>
      Object.values(runeMap).forEach(ctxMap => Object.values(ctxMap).forEach(_decayEntry)));
    Object.values(_data.heroItemPairs || {}).forEach(pairMap =>
      Object.values(pairMap).forEach(_decayEntry));
    Object.values(_data.heroItemCounters || {}).forEach(myItemMap =>
      Object.values(myItemMap).forEach(enemyItemMap => Object.values(enemyItemMap).forEach(_decayEntry)));
    Object.values(_data.heroDecisions || {}).forEach(keyMap =>
      Object.values(keyMap).forEach(optMap =>
        Object.values(optMap).forEach(ctxMap => Object.values(ctxMap).forEach(_decayEntry))));
    Object.values(_data.heroLocalOutcomes || {}).forEach(keyMap =>
      Object.values(keyMap).forEach(optMap =>
        Object.values(optMap).forEach(ctxMap => Object.values(ctxMap).forEach(_decayEntry))));
    Object.values(_data.heroDraftEV || {}).forEach(ctxMap => Object.values(ctxMap).forEach(_decayEntry));
    // heroRegret : nombres bruts (regret cumulé), pas des {picks,wins}/{picks,sum} — décroissance
    // directe de la valeur, même horizon que le reste (voir updateRegret/getRegret plus bas).
    Object.values(_data.heroRegret || {}).forEach(keyMap =>
      Object.values(keyMap).forEach(optMap =>
        Object.values(optMap).forEach(bucketMap => {
          Object.keys(bucketMap).forEach(k => { bucketMap[k] *= DECAY_PER_GAME; });
        })));
  }

  // Profil de dégâts agrégé d'une équipe (AD/AP) — mêmes seuils que js/bot.js _teamContext
  // (garder synchronisé). Utilisé pour bâtir le contexte de matchup (adverse ET allié) qui
  // ventile l'EV des objets/runes/décisions.
  function _teamDamageContext(heroes) {
    let ad = 0, ap = 0;
    (heroes || []).forEach(h => { if (h) { ad += h.ad || 0; ap += h.ap || 0; } });
    const total = ad + ap || 1;
    if (ap / total > 0.6) return 'AP';
    if (ad / total > 0.6) return 'AD';
    return 'Mixed';
  }

  // Contexte hiérarchique {combined, enemyOnly, all} pour un joueur donné : combined = profil
  // adverse + profil allié (le plus précis, mais le plus lent à accumuler des données) ; enemyOnly
  // = juste l'adversaire (retombe dessus si combined est encore trop peu échantillonné) ; all =
  // agrégat total (dernier recours). Voir bot.js pour la même logique de repli en lecture.
  function _matchupBuckets(pi, players) {
    const enemyTeam = players && players[1 - pi] ? players[1 - pi].heroes : [];
    const allyTeam   = players && players[pi]     ? players[pi].heroes.filter(h => h) : [];
    const enemyCtx = 'vs' + _teamDamageContext(enemyTeam);
    const allyCtx  = 'ally' + _teamDamageContext(allyTeam);
    return {
      combined:  `${enemyCtx}|${allyCtx}`,
      enemyOnly: `${enemyCtx}|allyAny`,
      all: 'all',
    };
  }

  return {
    load() {
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) _data = JSON.parse(raw);
        if (!_data.heroes)    _data.heroes    = {};
        if (!_data.items)     _data.items     = {};
        if (!_data.runes)     _data.runes     = {};
        if (!_data.heroItems) _data.heroItems = {};
        if (!_data.heroRunes) _data.heroRunes = {};
        if (!_data.heroDecisions) _data.heroDecisions = {};
        if (!_data.heroItemPairs) _data.heroItemPairs = {};
        if (!_data.heroLocalOutcomes) _data.heroLocalOutcomes = {};
        if (!_data.heroDraftEV) _data.heroDraftEV = {};
        if (!_data.heroRegret) _data.heroRegret = {};
        if (!_data.heroItemCounters) _data.heroItemCounters = {};
      } catch(e) { _data = { heroes: {}, items: {}, runes: {}, heroItems: {}, heroRunes: {}, heroDecisions: {}, heroItemPairs: {}, heroItemCounters: {}, heroLocalOutcomes: {}, heroDraftEV: {}, heroRegret: {} }; }
    },

    save() {
      try { localStorage.setItem(KEY, JSON.stringify(_data)); } catch(e) {}
    },

    reset() {
      _data = { heroes: {}, items: {}, runes: {}, heroItems: {}, heroRunes: {}, heroDecisions: {}, heroItemPairs: {}, heroItemCounters: {}, heroLocalOutcomes: {}, heroDraftEV: {}, heroRegret: {} };
      this.save();
    },

    resetGame() {
      _cur = { bans: new Set(), picks: {}, damage: {}, heals: {}, shields: {}, manaSpent: {}, items: {}, kda: {}, runes: [], decisions: [] };
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

    addManaSpent(heroId, amount) {
      if (!heroId || amount <= 0) return;
      _cur.manaSpent[heroId] = (_cur.manaSpent[heroId] || 0) + amount;
    },

    recordKDA(heroId, k, d, a) {
      _cur.kda[heroId] = { k, d, a };
    },

    recordRunePick(runeId, playerIdx, heroId) {
      if (!runeId) return;
      _cur.runes.push({ runeId, playerIdx, heroId });
    },

    // Enregistre un choix ponctuel du bot (économie vs engagement, ordre de cast, engager ou
    // non...) pour corréler plus tard avec la victoire/défaite. `key` identifie la décision
    // (ex. "economyVsEngage", "spellTiming:sylvia_q"), `optionId` l'option choisie (ex. "hold",
    // "early"). Coût quasi nul à l'appel — la résolution du contexte se fait à recordGameEnd.
    recordDecision(heroId, key, optionId, playerIdx) {
      if (!heroId || !key || optionId === undefined || optionId === null) return;
      _cur.decisions.push({ heroId, key, optionId, playerIdx });
    },

    // Regret minimisé (Hart & Mas-Colell) : contrairement à recordDecision (résolu en fin de
    // partie via recordGameEnd), c'est appliqué IMMÉDIATEMENT à _data — le "regret" de chaque
    // option est la différence entre sa valeur estimée et celle de l'option réellement choisie AU
    // MOMENT de la décision (voir js/bot.js _updateRegret/_regretMatchPick), pas quelque chose qui
    // s'attend au résultat de la partie. `bucketKey` = même contexte de matchup que le reste
    // (voir _matchupBuckets), un seul niveau (pas de repli hiérarchique en lecture : sans donnée
    // dans CE contexte précis, le regret est 0 — voir getRegret — ce qui retombe sur l'exploration
    // uniforme côté _regretMatchPick, un repli sûr).
    updateRegret(heroId, key, optionId, bucketKey, delta) {
      if (!heroId || !key || optionId === undefined || optionId === null || !bucketKey || !Number.isFinite(delta)) return;
      if (!_data.heroRegret) _data.heroRegret = {};
      if (!_data.heroRegret[heroId]) _data.heroRegret[heroId] = {};
      if (!_data.heroRegret[heroId][key]) _data.heroRegret[heroId][key] = {};
      if (!_data.heroRegret[heroId][key][optionId]) _data.heroRegret[heroId][key][optionId] = {};
      const bucket = _data.heroRegret[heroId][key][optionId];
      bucket[bucketKey] = (bucket[bucketKey] || 0) + delta;
    },

    getRegret(heroId, key, optionId, bucketKey) {
      const v = _data.heroRegret && _data.heroRegret[heroId] && _data.heroRegret[heroId][key] &&
                _data.heroRegret[heroId][key][optionId] && _data.heroRegret[heroId][key][optionId][bucketKey];
      return typeof v === 'number' ? v : 0;
    },

    // Compteurs cumulés EN COURS de partie pour un héros (dégâts infligés, soin/bouclier
    // prodigués) — normalement lus seulement en fin de partie, mais exposés ici pour mesurer
    // l'effet LOCAL d'une décision (js/bot.js _resolvePendingLocalOutcomes) : snapshot à la
    // décision, re-snapshot quelques tours plus tard, delta = contribution de cette fenêtre.
    getCurrentTotals(heroId) {
      const d = _cur.damage[heroId] || { phys: 0, mag: 0 };
      return {
        dmgDealt:    (d.phys || 0) + (d.mag || 0),
        healDealt:   _cur.heals[heroId]   || 0,
        shieldDealt: _cur.shields[heroId] || 0,
        manaSpent:   _cur.manaSpent[heroId] || 0,
      };
    },

    // Effet LOCAL d'une décision, mesuré par js/bot.js quelques tours après coup (pas à la fin de
    // la partie) : `rewardValue` est la récompense scalaire déjà combinée (voir
    // _computeLocalReward), `buckets` le contexte de matchup calculé par l'appelant AU MOMENT de
    // la décision (pas celui de fin de partie, qui peut avoir changé). Indépendant de
    // recordGameEnd : s'applique même si la partie finit en égalité, puisque ça ne mesure pas
    // l'issue de la partie entière mais un effet local déjà constaté.
    recordLocalOutcome(heroId, key, optionId, playerIdx, rewardValue, buckets) {
      if (!heroId || !key || optionId === undefined || optionId === null || !buckets) return;
      [buckets.combined, buckets.enemyOnly, buckets.all].forEach(ctx => {
        const e = _heroLocalOutcomeEntry(heroId, key, optionId, ctx);
        e.picks++;
        e.sum += rewardValue;
      });
    },

    // ── End of game ───────────────────────────────────────────

    recordGameEnd(winnerIdx, players, turns) {
      // Décroissance : le temps passe pour TOUTES les entrées existantes à chaque partie jouée,
      // gagnée/perdue/nulle — voir DECAY_PER_GAME. Avant tout traitement propre à cette partie.
      _decayAll();

      // Égalité (plafond de tours atteint sans vainqueur) : aucun camp n'a "gagné" avec ses
      // choix, donc rien de fiable à en tirer pour les héros/objets/runes/décisions de cette
      // partie. On ignore la partie entièrement plutôt que de l'enregistrer comme un games++
      // sans wins++ pour tout le monde — ce qui revenait à compter une égalité comme une défaite
      // pour les deux joueurs et faisait mécaniquement baisser tous les winrates impliqués.
      // La décroissance ci-dessus s'applique quand même (le temps passe), et save() aussi : des
      // effets locaux (heroLocalOutcomes) ont pu être enregistrés PENDANT cette partie même si son
      // issue finale est ignorée — voir recordLocalOutcome, indépendant de recordGameEnd.
      if (winnerIdx === null) { this.save(); this.resetGame(); return; }

      const winCredit = _winCredit(turns);

      // Bans
      _cur.bans.forEach(id => { _heroEntry(id).bans++; });

      // Picks → games / wins / damage / heals / shields / kda — h.wins reste un vrai booléen
      // (voir _winCredit ci-dessus : stat brute affichée, pas une entrée qui pilote une décision).
      Object.entries(_cur.picks).forEach(([heroId, playerIdx]) => {
        const h   = _heroEntry(heroId);
        const won = winnerIdx === playerIdx; // égalité déjà exclue plus haut
        h.games++;
        h.picks++;
        if (won) h.wins++;
        if (_cur.damage[heroId])  { h.dmgPhys += _cur.damage[heroId].phys; h.dmgMag += _cur.damage[heroId].mag; }
        if (_cur.heals[heroId])   h.heals   += _cur.heals[heroId];
        if (_cur.shields[heroId]) h.shields += _cur.shields[heroId];
        if (_cur.kda[heroId])     { h.kills += _cur.kda[heroId].k; h.deaths += _cur.kda[heroId].d; h.assists += _cur.kda[heroId].a; }
      });

      // Contexte hiérarchique par joueur (adverse + allié), pour ventiler l'EV objets/runes/
      // décisions par matchup plutôt que de tout mélanger. Voir _matchupBuckets.
      const buckets = [0, 1].map(pi => _matchupBuckets(pi, players));

      // Draft : winrate du héros ventilé par profil adverse (voir js/bot.js _draftHeroEV) — ne
      // retient que enemyOnly/all, pas combined (l'allié n'est souvent pas encore fixé quand la
      // décision de pick/ban a réellement lieu, autant ne pas ventiler dessus).
      Object.entries(_cur.picks).forEach(([heroId, playerIdx]) => {
        const won = winnerIdx === playerIdx;
        const b = buckets[playerIdx];
        [b.enemyOnly, b.all].forEach(ctx => {
          const e = _heroDraftEntry(heroId, ctx);
          e.picks++;
          if (won) e.wins += winCredit;
        });
      });

      // Runes
      (_cur.runes || []).forEach(({ runeId, playerIdx, heroId }) => {
        const won = winnerIdx === playerIdx; // égalité déjà exclue plus haut
        const e = _runeEntry(runeId);
        e.picks++;
        if (won) e.wins++; // stat brute (voir _winCredit) : pas pondérée par la vitesse
        if (heroId) {
          const b = buckets[playerIdx];
          [b.combined, b.enemyOnly, b.all].forEach(bucket => {
            const he = _heroRuneEntry(heroId, runeId, bucket);
            he.picks++;
            if (won) he.wins += winCredit;
          });
        }
      });

      // Items — heroId → runeId de ce héros cette partie, pour ventiler aussi par rune équipée
      // (voir js/bot.js _itemBucketPriorityList, mêmes clés "<bucket>|rune:<runeId>" à garder
      // synchronisées) et pour la synergie entre objets (heroItemPairs, voir plus bas).
      const heroRuneMap = {};
      (_cur.runes || []).forEach(r => { if (r.heroId) heroRuneMap[r.heroId] = r.runeId; });

      Object.entries(_cur.items).forEach(([heroId, itemSet]) => {
        const playerIdx = _cur.picks[heroId];
        if (playerIdx === undefined) return;
        const won = winnerIdx === playerIdx; // égalité déjà exclue plus haut
        const b = buckets[playerIdx];
        const runeId = heroRuneMap[heroId];
        const bucketKeys = [b.combined, b.enemyOnly, b.all];
        if (runeId) bucketKeys.push(`${b.combined}|rune:${runeId}`, `${b.enemyOnly}|rune:${runeId}`);

        itemSet.forEach(itemId => {
          const e = _itemEntry(itemId);
          e.picks++;
          if (won) e.wins++; // stat brute (voir _winCredit) : pas pondérée par la vitesse
          bucketKeys.forEach(bucket => {
            const he = _heroItemEntry(heroId, itemId, bucket);
            he.picks++;
            if (won) he.wins += winCredit;
          });
        });

        // Synergie entre objets : une entrée par PAIRE d'objets possédés ensemble par ce héros
        // cette partie (voir js/bot.js _itemSynergyEV). Paire canonicalisée (ordre alphabétique)
        // pour que "A acheté avant B" et "B acheté avant A" retombent sur la même entrée.
        const itemList = [...itemSet].sort();
        for (let i = 0; i < itemList.length; i++) {
          for (let j = i + 1; j < itemList.length; j++) {
            const pe = _heroItemPairEntry(heroId, `${itemList[i]}|${itemList[j]}`);
            pe.picks++;
            if (won) pe.wins += winCredit;
          }
        }
      });

      // Contre-objets : pour chaque héros, corrélation entre ses objets et ceux de son HOMOLOGUE
      // DIRECT adverse (même rôle, ex. Solo vs Solo — même principe que js/bot.js
      // _matchupOpponentRefs pour l'écart d'or) en fin de partie — voir _heroItemCounterEntry et
      // js/bot.js _itemCounterEV. Volontairement PAS l'union de toute l'équipe adverse (bornerait
      // mal la cardinalité objet×objet : testé à ~2000 entrées/partie sur l'équipe entière, contre
      // quelques dizaines seulement avec l'homologue direct — la confrontation directe est aussi
      // la plus pertinente pour un vrai "contre"). Limité aux objets tier ≥ 3 côté adverse
      // (bottes/starters exclus, peu pertinents comme contre).
      if (typeof EQUIPMENT !== 'undefined' && typeof HERO_TYPES !== 'undefined') {
        const heroesByPlayer = [[], []];
        Object.entries(_cur.picks).forEach(([heroId, pi]) => { if (heroesByPlayer[pi]) heroesByPlayer[pi].push(heroId); });

        Object.entries(_cur.items).forEach(([heroId, itemSet]) => {
          const playerIdx = _cur.picks[heroId];
          if (playerIdx === undefined) return;
          const won = winnerIdx === playerIdx;
          const myRole = HERO_TYPES[heroId] && HERO_TYPES[heroId].roleId;
          if (!myRole) return;
          const directOpponentId = heroesByPlayer[1 - playerIdx].find(id => HERO_TYPES[id] && HERO_TYPES[id].roleId === myRole);
          if (!directOpponentId) return;
          const enemyItems = _cur.items[directOpponentId];
          if (!enemyItems || !enemyItems.size) return;
          itemSet.forEach(myItemId => {
            enemyItems.forEach(enemyItemId => {
              const it = EQUIPMENT[enemyItemId];
              if (!it || it.tier < 3) return;
              const ce = _heroItemCounterEntry(heroId, myItemId, enemyItemId);
              ce.picks++;
              if (won) ce.wins += winCredit;
            });
          });
        });
      }

      // Décisions génériques (économie vs engagement, ordre de cast, etc.)
      (_cur.decisions || []).forEach(({ heroId, key, optionId, playerIdx }) => {
        if (playerIdx === undefined || playerIdx === null) return;
        const won = winnerIdx === playerIdx; // égalité déjà exclue plus haut
        const b = buckets[playerIdx];
        [b.combined, b.enemyOnly, b.all].forEach(bucket => {
          const he = _heroDecisionEntry(heroId, key, optionId, bucket);
          he.picks++;
          if (won) he.wins += winCredit;
        });
      });

      this.save();
      this.resetGame();
    },

    // ── Accessors ─────────────────────────────────────────────

    getData() { return _data; },

    getCurDamage(heroId) { const d = _cur.damage[heroId]; return d ? (d.phys + d.mag) : 0; },
    getCurHeals(heroId)  { return _cur.heals[heroId] || 0; },

    getTotalGames() {
      return Object.values(_data.heroes).reduce((m, h) => Math.max(m, h.games), 0);
    },

    getRuneStats(runeId) {
      const e = _data.runes && _data.runes[runeId];
      if (!e || !e.picks) return null;
      return { picks: e.picks, wins: e.wins, pct: Math.round(e.wins / e.picks * 100) };
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
