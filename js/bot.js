// ============================================================
// BOT IA — Adversaire local (playerIdx = 1 par défaut, configurable pour la simulation bot-vs-bot)
// ============================================================

// ============================================================
// PARAMÈTRES OPTIMISABLES — toutes les constantes de scoring du bot, regroupées ici plutôt
// qu'éparpillées en littéraux magiques dans chaque fonction. But : permettre à un harnais
// d'auto-jeu externe (voir sim/tune.js) de faire évoluer ces valeurs par essai-erreur plutôt
// que de les deviner à la main. setBotParams() permet d'injecter un jeu de valeurs alternatif
// (utilisé par le tuner) ; sans appel, le bot tourne avec BOT_DEFAULT_PARAMS.
// ============================================================
const BOT_DEFAULT_PARAMS = {
  // Température du tirage pondéré softmax (_weightedTopPick, utilisé pour objets/draft/bottes —
  // PAS les runes, voir runePickTemperature juste en dessous) : plus BAS = favorise plus fortement
  // le meilleur score (moins d'exploration), plus HAUT = tirage plus uniforme. Calibré
  // empiriquement sur la distribution réelle de score des objets (~60 candidats, écart typique de
  // quelques points entre voisins proches, dizaines de points jusqu'aux plus mauvais) : à T=4, un
  // écart de 5 points donne ~29% de chances relatives (encore compétitif), un écart de 20 points
  // tombe à ~0.7% (quasi exclu) — voir le commentaire de _weightedTopPick pour le problème que ça
  // corrige (pondération linéaire écrasée par le nombre de candidats, indépendamment de l'écart
  // réel du meilleur). Sur données réelles (dpt_1, ~1200 parties) : T=5 → meilleur objet
  // ~9.8%/tirage, top-5 cumulé ~32.6% ; T=4 → ~13.6%/41.5% — nettement plus concentré sur le
  // meilleur choix sans écraser l'exploration (le reste du pool garde encore ~58% de la masse de
  // probabilité). Vérifié aussi sur le draft (32 héros, écart réel ~15 points) : T=4 y donne
  // ~23%/59.1% (top-5), un étalement comparable à celui des objets — pas besoin d'un réglage séparé.
  weightedPickTemperature: 4,

  // Température séparée pour les runes : mêmes formules que les objets, mais l'écart de score réel
  // entre la meilleure et la pire rune est bien plus étroit en pratique (~8 points sur données
  // réelles, contre ~15-18 pour objets/draft) — la même température y écrasait un écart de winrate
  // pourtant net et confiant (52% vs 33-48%, ~800 parties/rune) en tirage quasi uniforme. À T=1.2 :
  // meilleure rune ~52%/tirage, top-3 cumulé ~79% — favorise nettement la meilleure sans l'imposer.
  runePickTemperature: 1.2,

  // Macro : phases de partie (basées sur globalTurn — une partie dure ~20 tours en pratique,
  // MAX_TURNS=200 n'est qu'un garde-fou de sécurité, pas la durée réelle)
  phaseEarlyEnd: 5,   // tours 1-5   : économie, on tient sa zone
  phaseMidEnd: 11,    // tours 6-11  : rotations/ganks possibles — au-delà : teamfights libres
  soloRecallMinTurn: 5, // pas de TP du top avant ce tour

  // Positionnement
  pokeIsolationRadius: 3, // ennemi "isolé/mal placé" = aucun allié à lui dans ce rayon
  earlyChaseLeash: 3,     // distance max hors zone pour poursuivre en early
  midChaseLeash: 6,       // idem en mid
  // La laisse late était Infinity (aucune limite) et goodReasonToChase incluait phase==='late'
  // inconditionnellement : en pratique, la "phase late" démarre au tour phaseMidEnd+1 (tour 12) et
  // les parties durent 40-100 tours (MAX_TURNS) — ça revenait à désactiver tout ancrage économique
  // pour l'écrasante majorité d'une partie réelle. Laisse désormais finie même en late (plus large
  // que mid pour permettre les vrais teamfights de fin de partie), et phase==='late' seul ne
  // suffit plus à justifier une poursuite (voir goodReasonToChase) — un kill garanti ou une cible
  // isolée le justifient toujours, sinon retour à une approche légère au lieu d'une chasse plein régime.
  lateChaseLeash: 10,
  roamEngageRadius: 3,    // le roam ne lâche pas un combat déjà engagé à cette distance
  roamGankRadius: 5,      // rayon pour évaluer le rapport de force autour d'une cible de gank

  // Économie — ancrage en zone à gold (_scoreMoveCell). L'EV décroît continûment avec le tour
  // plutôt que par paliers early/mid/late : à tour 0, plein bonus (economyWeight=1) ; à
  // economyHorizonTurn, ne reste qu'un intérêt résiduel (economyFloor) — il reste toujours une
  // raison de passer sur l'or, juste moins prioritaire qu'un fight en fin de partie.
  zoneBonusHome: 40, zoneBonusAny: 15,
  // 20 sous-estimait largement la durée réelle observée d'une partie (40-100 tours, MAX_TURNS=100)
  // — l'ancrage économique retombait à economyFloor dès le tour 20, soit sur l'écrasante majorité
  // d'une partie réelle. Relevé pour que l'économie compte sur l'essentiel de la partie, pas
  // seulement les tout premiers tours (voir aussi lateChaseLeash/goodReasonToChase ci-dessus).
  economyHorizonTurn: 60,
  economyFloor: 0.3,      // poids économique minimum, ne redescend jamais à 0 (doublé : même très tard, l'or reste un vrai intérêt)

  // Crédit de victoire pondéré par la vitesse (voir js/stats.js _winCredit) : gagner en 20 tours
  // vaut mieux que gagner en 55, à winrate brut égal — reflète cette préférence dans l'EV de tout
  // ce qui pilote une décision du bot (objets/runes/décisions/paires/contres/draft), pas dans les
  // stats brutes affichées (winrate en Tier List reste un vrai %). Borné pour qu'une partie
  // extrême (très rapide ou très lente) ne domine jamais le signal à elle seule.
  winSpeedCreditMin: 0.5,
  winSpeedCreditMax: 1.5,

  // Or du Roam (taches mobiles, pas une zone fixe — voir game.brownSpots)
  zoneBonusRoam: 6,          // léger intérêt résiduel pour les zones classiques, comme les autres rôles
  roamBrownSpotBonus: 18,    // attrait de la tache d'or la plus proche, dégressif avec la distance
  roamBrownSpotDistWeight: 2,

  // Fenêtre "vitale" de farm en début de partie : avant roamFarmVitalTurn, aller chercher l'or
  // du roam n'est pas juste préférable, c'est quasi-obligatoire (le roam n'a que 1-2 tours de
  // fight utiles avant que ses sorts partent en CD — s'attarder ensuite ne rapporte plus rien).
  // roamFarmVitalMultiplier amplifie l'attrait des plaques pendant cette fenêtre (dégressif,
  // 0 une fois roamFarmVitalTurn passé) ; la durée et l'intensité réelles sont ensuite modulées
  // par héros via l'EV apprise (roamPriority/farm, voir _scoreMoveCell) : un roam qui gagne plus
  // en farmant tôt (winrate observé) voit sa fenêtre vitale allongée et renforcée au fil des
  // parties, un roam sans données garde le comportement de base ci-dessous.
  roamFarmVitalTurn: 10,
  roamFarmVitalMultiplier: 5,

  // Loups de Noyala (_decideWolfMoves) : même logique farm-puis-fight que le roam ci-dessus, sur
  // une unité au PM séparé (rafraîchi chaque tour de Noyala) qui n'était jusqu'ici jamais pilotée
  // après l'invocation — voir _decideWolfMoves. Les loups collectent aussi les zones ROAM
  // (game.js _wolfMove), et meurent automatiquement en infligeant des dégâts dès qu'ils arrivent
  // adjacents à un ennemi — un aller simple, donc réservé aux cibles où ça compte vraiment
  // (finit un kill, ou cible isolée/déjà mal en point) plutôt qu'un sacrifice gratuit.
  wolfBrownSpotBonus: 18,
  wolfBrownSpotDistWeight: 2,
  wolfFarmVitalTurn: 15,        // au-delà, l'attrait économique décroît (les loups gagnent en utilité de combat plus tard que le roam lui-même)
  wolfFarmVitalMultiplier: 3,
  wolfAttackBonus: 15,          // case adjacente à une cible où le sacrifice vaut le coup
  wolfAttackPenalty: 10,        // case adjacente à une cible où ça ne vaut pas le coup (dissuade le sacrifice gratuit)

  // Déplacement / engagement (_scoreMoveCell)
  retreatDistWeight: 2,       // fuite quand HP bas : poids de la distance à la menace
  leashPenaltyWeight: 4,      // pénalité par case au-delà de la laisse sans bonne raison de poursuivre
  inRangeBonus: 8,            // bonus si déjà à portée (poke sans s'avancer)
  // Une case à distance=1 (mêlée) et une case à distance=po (bord de portée) recevaient jusqu'ici
  // EXACTEMENT le même inRangeBonus — aucune pression vers le kite. Pour un profil longue portée
  // (mage/dpt, po jusqu'à 7), ça revient à être indifférent entre coller l'ennemi (exposé aux
  // ripostes courtes ET à distance pour rien) et rester au bord de sa portée (frappe sans jamais
  // être à portée de mêlée). Ce poids récompense maintenant la distance DANS la portée (jamais
  // au-delà) — un héros mêlée (po=1) n'est structurellement jamais concerné, dist=po=1 toujours.
  kiteDistWeight: 2,
  retreatHpThreshold: 0.35,   // % PV sous lequel _scoreMoveCell bascule en mode retraite (point de départ — voir lowHpRetreat/retreatThresholdShiftRange)
  retreatThresholdShiftRange: 0.15, // amplitude max dont l'EV apprise peut déplacer ce seuil (même ordre de grandeur que le spread du curseur "agressivité" du style de jeu)
  // Désengagement piloté par EV (indépendant du plancher HP ci-dessus) : pas besoin d'être bas en
  // vie pour refuser un engagement déjà identifié comme -EV par l'historique (economyVsEngage) —
  // voir _scoreMoveCell. Seuil volontairement conservateur (échelle decisionScoreScale=30) pour ne
  // déclencher que sur un signal net, pas du bruit à faible échantillon.
  disengageEVThreshold: 10,
  disengageRetreatWeight: 1,  // fuite "molle" (EV négative, pas urgence vitale) : moitié de retreatDistWeight
  chaseDistWeight: 3,         // poids de la distance quand on a une bonne raison de poursuivre
  lightApproachDistWeight: 1, // poids de la distance en approche prudente (pas de raison forte)
  trapPenalty: 15,            // pénalité case adjacente à un piège ennemi
  surroundedPenalty: 8,       // pénalité si entouré et HP < 50%

  // Dimensions spatiales absentes de la formule jusqu'ici (voir _scoreMoveCell) — valeurs de base
  // modestes, la vraie calibration vient du multiplicateur appris par héros (_learnedWeight,
  // jusqu'au négatif : un héros peut apprendre à ignorer ou inverser chacune de ces trois).
  allyClusterWeight: 1.5,        // regroupement avec les alliés (poids par case de distance)
  multiTargetExposureWeight: 4,  // bonus par ennemi supplémentaire à portée depuis la case
  backlinePushWeight: 0.5,       // pousser vers l'ennemi le plus loin (profondeur d'engagement)

  // Ciblage d'attaque de base (_scoreAttackTarget)
  atkLowHp25Bonus: 30, atkLowHp50Bonus: 20,
  atkRoleMageBonus: 15, atkRoleDptBonus: 10,
  atkIsolatedBonus: 12,
  atkDistPenaltyWeight: 5,

  // Ciblage de sorts (_scoreSpellOnEnemy)
  spellIsolatedBonus: 0.3,
  // Valeur d'utilité des effets déclarés sur un sort (voir js/heroes.js `effects: [{type,...}]`),
  // même échelle que le ratio dégâts/vie (0-1ish) — un sort à 0 dégât mais fort effet doit pouvoir
  // dépasser le seuil de cast (>0.1 dans _castBestSpell) au lieu de rester invisible pour le bot.
  spellEffectStunValue: 0.35,        // CC dur, refuse une action entière à la cible
  spellEffectMuteValue: 0.2,         // bloque les sorts adverses (pas le déplacement/attaque)
  spellEffectSlowValue: 0.15,        // perte de PM
  spellEffectHemorrhageValue: 0.2,   // -50% soins reçus — fort contre les profils à sustain
  spellEffectMaledictionValue: 0.15, // -3 portée de sorts — fort contre les profils longue portée
  spellEffectMrShredValue: 0.15,     // -20% résistance magique — profite à toute l'équipe côté dégâts magiques

  // Rotation/gank du Roam (_roamPickGankTarget)
  gankIsolatedBonus: 10,
  gankFavorableBonus: 6,
  gankProximityWeight: 0.3,

  // Draft — pick/ban (_scoreBanTarget/_scorePickTarget). Aucune opinion écrite à la main sur "quel
  // héros est fort" (ex. bonus passif puissant, seuils AD/AP/PM) — remplacée par le winrate observé
  // du héros, ventilé par profil de l'équipe adverse déjà connue à ce stade du draft (voir
  // _draftHeroEV). draftNewRoleBonus/draftSameRoleBonus restent : ce n'est pas une opinion sur la
  // force d'un héros, c'est une contrainte structurelle de composition (une équipe a besoin des 5
  // rôles) — même logique que garder le filtre de tier des objets alors que la formule de score a
  // été retirée.
  draftNewRoleBonus: 4, draftSameRoleBonus: 1,
  draftHistoryMinSample: 10,
  draftHistoryConfidentSample: 150,
  draftHistoryScoreScale: 60,
  draftExplorationWeight: 2,
  // Nb de candidats considérés au tirage pondéré (sur ~30 héros configurés). Trop bas (le défaut
  // générique de _weightedTopPick est 3) et un héros sans données/EV élevée n'entre JAMAIS dans le
  // tirage, peu importe le nombre de parties — pas juste rare, structurellement exclus dès qu'au
  // moins 3 autres héros scorent mieux.
  draftTopK: 10,
  // Bascule manuelle (panneau de style, voir computeStyleParams/simulations.html) : ignore l'EV et
  // pioche pick/ban uniformément au hasard parmi tous les héros configurés. Sert à casser le piège
  // du démarrage à froid — un héros avec un mauvais winrate juste par manque de données (items
  // jamais assez testés pour converger) ressort systématiquement hors de draftTopK, donc n'est
  // plus jamais repioché, donc ses données ne s'améliorent jamais. Activer temporairement force un
  // brassage complet pour reconstituer un échantillon sur tout le roster.
  forceRandomDraft: false,

  // Objets — EV historique (_scoreItemForHero / _historicalItemStats). Aucune formule écrite à la
  // main : tout le score vient de données observées (winrate par contexte adverse+allié+rune, et
  // synergie entre objets — voir plus bas).
  // itemExplorationWeight/itemHistoryConfidentSample doivent rester cohérents entre eux : à
  // confiance quasi nulle (objet jamais essayé, confidence≈0), le score vaut ~itemExplorationWeight
  // (rien d'autre ne contribue). Avec l'ancien réglage (weight 6, confidentSample 300), AUCUN
  // winrate réaliste ne pouvait jamais dépasser ça : même 100% de victoires à pleine confiance ne
  // vaut que itemHistoryScoreScale/2 = 40 < 6 seulement si confidence < 0.15, et un objet à 55% de
  // winrate ne dépasse jamais 6 quel que soit l'échantillon (0,05×80×confidence < 6 tant que
  // confidence<1.5, impossible). Résultat observé : sur les ~62 objets Tier3+ éligibles par héros,
  // il y en a presque toujours au moins 5 jamais essayés (score exactement 6), qui dament donc le
  // pion à TOUS les objets déjà testés pour toujours, peu importe leur winrate réel — la page de
  // build recommandé (et le choix du bot en partie) ne convergeait jamais vers rien d'appris.
  // Rééquilibré pour qu'un objet clairement bon (60%+ de winrate) sur un échantillon réaliste
  // (quelques dizaines de parties, pas des centaines) batte un objet jamais testé, tout en gardant
  // assez d'exploration pour continuer à tester ce qui l'est peu.
  itemHistoryMinSample: 8,          // sous ce nb de parties, l'historique est ignoré (trop bruité)
  itemHistoryConfidentSample: 120,  // confiance pleine après ~120 parties (pas 300 : trop lent en pratique, voir ci-dessus)
  itemHistoryScoreScale: 80,        // amplitude du score historique (±scale/2 aux extrêmes de winrate)
  itemExplorationWeight: 2,         // pousse à retester les items peu essayés, sans dominer un winrate réel établi

  // Objets — synergie avec les autres objets déjà choisis pour CE héros (même partie/même build,
  // voir _itemSynergyEV) : winrate observé des parties où les deux objets étaient possédés
  // ensemble par ce héros, ventilé par paire. Les paires sont bien plus nombreuses que les objets
  // seuls (C(n,2) combinaisons) donc l'échantillon par paire grandit plus lentement — seuil de
  // confiance abaissé pour compenser, sinon ce signal ne sortirait jamais du silence.
  itemSynergyMinSample: 5,
  itemSynergyConfidentSample: 150,
  itemSynergyScoreScale: 80,

  // Objets — CONTRE les objets de l'équipe adverse (heroItemCounters, voir _itemCounterEV) : même
  // principe que la synergie ci-dessus, mais côté adversaire au lieu du reste du build — capture
  // qu'un objet peut être fort spécifiquement CONTRE un autre objet précis (perforation d'armure
  // vs un objet HP/armure adverse, RM vs un objet AP adverse...), pas juste contre un profil AD/AP
  // agrégé. Échantillon par paire objet×objet, même rééquilibrage que la synergie.
  itemCounterMinSample: 5,
  itemCounterConfidentSample: 150,
  itemCounterScoreScale: 80,

  // Runes — même principe que les objets : EV historique + bonus d'exploration, aucune formule.
  // Même rééquilibrage exploration/confiance que les objets ci-dessus, et pour la même raison.
  // Seuil de confiance plus bas que les objets : seulement 16 runes au total, moins d'options
  // à départager qu'un pool de ~65 objets, donc moins de parties nécessaires par rune pour un
  // signal exploitable.
  runeHistoryMinSample: 6,
  runeHistoryConfidentSample: 100,
  runeHistoryScoreScale: 80,
  runeExplorationWeight: 3,

  // Décisions génériques (économie vs engagement, priorité du roam, timing des sorts...) — même
  // mécanique EV que les objets/runes, options binaires donc signal plus vite exploitable, mais
  // toujours revu à la hausse pour la même raison (ne pas se figer trop tôt).
  decisionMinSample: 6,
  decisionConfidentSample: 100,
  decisionScoreScale: 30,

  // Regret minimisé (voir _regretSum/_updateRegret/_regretMatchPick/_regretNudge) — même échelle
  // approximative que decisionScoreScale, pour rester un signal comparable (ni dominant ni
  // négligeable) partout où il vient s'ajouter à _decisionEV.
  regretNudgeWeight: 15,
  regretSaturation: 15, // regret cumulé nécessaire pour atteindre la moitié de la force du nudge

  // Ordre du combo (_decideCastSpells/scoreSpellOrder) : poids PAR DÉFAUT, pas des verrous — une
  // préférence apprise (comboFirstPick) suffisamment confiante peut les dépasser. Échelle choisie
  // pour rester comparable à decisionScoreScale/regretNudgeWeight (comboBuffPriorityWeight un peu
  // au-dessus : protéger le combo buff+attaque contre une panne de mana reste la raison la plus
  // proche d'une nécessité mécanique des trois).
  comboBuffPriorityWeight: 30,
  comboControlPriorityWeight: 15,
  comboKillEfficiencyWeight: 10,

  // Effets LOCAUX d'une décision (voir _computeLocalReward/_resolvePendingLocalOutcomes) : mesurés
  // quelques tours après coup au lieu d'attendre le résultat final de la partie — signal plus
  // rapide et moins bruité, en complément (pas en remplacement) de l'EV "partie entière" ci-dessus.
  // Chaque delta est d'abord ramené à une échelle comparable (or/300, dégâts-soin-bouclier/moitié
  // du maxHP, PV/maxHP) — ensuite ces poids-ci décident de l'IMPORTANCE relative de chaque signal,
  // pas de son échelle brute. Ce sont des constantes BOT_DEFAULT_PARAMS comme les autres : déjà
  // mutables par sim/tune.js sans changement supplémentaire là-bas (voir sim/tune.js, qui mute
  // n'importe quelle clé de BOT_DEFAULT_PARAMS).
  localOutcomeHorizonTurns: 4,     // nb de tours après la décision avant de mesurer l'effet
  localOutcomeGoldWeight: 1,       // pondère l'ÉCART d'or creusé sur l'adversaire concerné, pas l'or brut gagné (voir _computeLocalReward)
  localOutcomeDmgDealtWeight: 1,
  localOutcomeHealWeight: 1,
  localOutcomeShieldWeight: 1,
  localOutcomeHpWeight: 2,         // PV net gagnés/perdus dans la fenêtre — proxy dégâts subis/survie
  localOutcomeKillWeight: 3,
  localOutcomeAssistWeight: 1,
  localOutcomeDeathWeight: 4,      // appliqué en négatif
  localOutcomeSurvivalWeight: 2,   // bonus/malus fixe selon vivant ou mort à la résolution
  localOutcomeManaCostWeight: 0.5, // pénalité sur le mana dépensé dans la fenêtre — prix implicite d'une ressource limitée, pour que dégâts/soin/kill obtenus à moindre coût soient appris comme MEILLEURS qu'un résultat équivalent obtenu en vidant la barre de mana (combos gaspilleurs)
  localOutcomeMinSample: 5,
  localOutcomeConfidentSample: 80, // signal plus rapide que l'EV partie entière → seuil plus bas
};

let BOT_PARAMS = { ...BOT_DEFAULT_PARAMS };

// Injecte un jeu de paramètres alternatif (fusionné avec les défauts pour les clés absentes) —
// utilisé par sim/tune.js pour tester des variantes par auto-jeu.
function setBotParams(overrides) {
  BOT_PARAMS = { ...BOT_DEFAULT_PARAMS, ...(overrides || {}) };
}
function getBotParams() {
  return BOT_PARAMS;
}

// Traduit deux curseurs de style de jeu (0→1 chacun) en un jeu concret de constantes, prêt pour
// setBotParams(). Bornes choisies pour que t=0.5 sur les deux curseurs retombe EXACTEMENT sur les
// valeurs par défaut actuelles (BOT_DEFAULT_PARAMS) — les sliders démarrent donc pile là où le bot
// se comporte déjà aujourd'hui, pas sur un réglage différent qu'il faudrait redécouvrir.
//
// evVsExploration : 0 = exploration maximale (tirage quasi uniforme, teste tout), 1 = proche de
// l'EV optimale observée (quasi-argmax sur le meilleur choix connu). Agit sur les températures du
// tirage softmax (voir _weightedTopPick) — objets/runes/draft/bottes.
//
// aggression : 0 = passif (laisse courte, retraite tôt, priorité longue à l'économie avant de
// chercher le combat), 1 = agressif (laisse longue, reste au combat plus tard, bascule vers le
// combat plus tôt pour roam/loups de Noyala).
// forceRandomDraft : bascule brute (pas un curseur continu comme les deux ci-dessus) — voir
// BOT_DEFAULT_PARAMS/_doBan/_doPick. Simple passage direct, pas dérivée des deux curseurs.
function computeStyleParams({ evVsExploration = 0.5, aggression = 0.5, forceRandomDraft = false } = {}) {
  const clamp01 = (t) => Math.max(0, Math.min(1, t));
  evVsExploration = clamp01(evVsExploration);
  aggression = clamp01(aggression);
  // around(default, spread, t) : t=0.5 → default pile, t=0 → default-spread, t=1 → default+spread.
  const around = (def, spread, t) => def + (t - 0.5) * 2 * spread;

  const evT = 1 - evVsExploration;   // températures : plus haut = plus exploratoire
  const aggT = aggression;           // laisse/poursuite : plus haut = plus agressif
  const passT = 1 - aggression;      // retraite/fenêtre de farm : plus haut = plus passif/prudent

  return {
    weightedPickTemperature: Math.max(0.2, around(4,   3.5, evT)),
    runePickTemperature:     Math.max(0.2, around(1.2, 1.0, evT)),

    earlyChaseLeash:         Math.max(0, Math.round(around(3, 2.5, aggT))),
    midChaseLeash:           Math.max(0, Math.round(around(6, 4,   aggT))),
    chaseDistWeight:         Math.max(0.1, around(3, 1.7, aggT)),
    lightApproachDistWeight: Math.max(0.1, around(1, 0.6, aggT)),
    retreatHpThreshold:      Math.max(0.1, Math.min(0.65, around(0.35, 0.15, passT))),
    roamFarmVitalTurn:       Math.max(1, Math.round(around(10, 5, passT))),
    wolfFarmVitalTurn:       Math.max(1, Math.round(around(15, 7, passT))),

    forceRandomDraft: !!forceRandomDraft,
  };
}

// Zone-lane "maison" par rôle (Nord = top, Centre = mid, Sud = bot lane). Roam = pas de zone fixe.
// Structurel (pas un poids de scoring) — pas dans BOT_PARAMS.
const BOT_ROLE_HOME_ZONE = { solo: 'N', mage: 'C', dpt: 'S', support: 'S' };

// Bottes disponibles (pas de champ "categories" dédié dans EQUIPMENT — liste courte, curatée à la main)
const BOT_BOOT_IDS = [
  'simple_boots', 'reinforced_boots', 'anti_spell_boots', 'sorcerer_boots',
  'boots_of_celerity', 'speed_boots', 'bottes_attaquant', 'bottes_assassin'
];

// Héros placeholder générique (ex. "ROAM 7", "Mage 8") — pas de kit unique/nom propre.
// Le bot les exclut du pick/ban : ils ne représentent pas le jeu réel, seuls les héros
// configurés à la main (nom propre) doivent compter dans les stats/simulations.
const BOT_GENERIC_NAME_RE = /^(Solo|ROAM|Roam|Mage|DPT|Dpt|Support)\s+\d+$/;

// Politiques candidates pour QUAND revendre l'item starter (voir GameBot._pickStarterSellPolicy) —
// choisi par EV apprise, pas figé en dur.
const STARTER_SELL_POLICY_IDS = ['whenFull', 'earlyPhaseEnd', 'latePhase', 'never'];

// Multiplicateurs candidats pour _learnedWeight — voir GameBot._learnedWeight. Va jusqu'à 0 (le
// terme n'a plus AUCUN effet pour ce héros) et au négatif (le terme s'INVERSE — ex. un héros pour
// qui s'éloigner des alliés paie plus que se regrouper) : une vraie liberté de désactiver ou
// renverser un comportement par défaut, pas juste l'atténuer/l'amplifier autour de 1×.
const LEARNED_WEIGHT_MULTIPLIERS = [-1, -0.5, 0, 0.3, 0.6, 1.0, 1.4, 2.0];

// Plafonds de calcul (pas de préférence) sur le nombre de candidats évalués en mode neuronal — voir
// _neuralSpellCandidates/_decideBuyNeural. Chaque candidat coûte un clone complet de partie (voir
// _cloneGameForSim) : peu à l'unité (~0.5-1.5ms selon la charge), mais ça se multiplie vite — un
// sort à zone peut couvrir des centaines de cellules, le catalogue d'objets dépasse 120 entrées, ET
// _decideCastSpellsNeural boucle plusieurs fois par phase (early/late) en reconstruisant la liste
// complète à chaque passage. Mesuré en pratique : un tour de héros avec plusieurs sorts + achats
// pouvait dépasser la seconde sans plafonds serrés. Ces plafonds sont un budget de calcul, pas une
// préférence — le sous-échantillonnage reste uniforme, aucune direction/case/objet n'est favorisé.
const NEURAL_CELL_CANDIDATE_CAP = 10;
const NEURAL_ITEM_CANDIDATE_CAP = 12;

class GameBot {
  constructor(game, onSync, playerIdx = 1, params = null) {
    this.game = game;
    this.onSync = onSync;
    this.playerIdx = playerIdx;
    // Jeu de paramètres propre à CETTE instance (pas un global partagé) : permet à sim/tune.js
    // de faire jouer deux bots avec des réglages différents dans la même partie (champion vs
    // challenger). Sans 3e argument, utilise BOT_PARAMS (le défaut courant, éventuellement
    // modifié via setBotParams()).
    this.params = params ? { ...BOT_DEFAULT_PARAMS, ...params } : BOT_PARAMS;
    this._busy = false;
    // Réseau de valeur optionnel (voir js/nn.js, chargé par sim/nn_train.js) — quand présent,
    // _decideMove/_decideCastSpells/_decideBuy évaluent TOUTES les actions réellement légales
    // (getReachableCells/getSpellTargets/catalogue d'objets achetables — les mêmes sources de
    // vérité que le moteur utilise pour valider une action) via ce réseau plutôt que les formules
    // heuristiques (_scoreMoveCell/_scoreSpellOnEnemy/_pickBuildTargets). null = comportement
    // heuristique inchangé (par défaut).
    this._neuralNet = null;
    // Température d'exploration pour les décisions neuronales ci-dessus (0 = argmax pur, comme en
    // partie réelle/évaluation — voir sim/nn_train.js evaluate()). > 0 : tirage softmax parmi les
    // candidats (voir _neuralGreedyPick, même mécanisme que _weightedTopPick), utilisé UNIQUEMENT
    // pendant la génération de données en auto-jeu (sim/nn_train.js playAndCapture) — sans ça, deux
    // bots pilotés par le MÊME réseau rejoueraient la même partie de façon quasi déterministe à
    // chaque round, sans jamais découvrir d'alternative meilleure (même risque de collapse que
    // celui identifié pour le mouvement avant l'ajout du regret/EV côté heuristique).
    this._neuralExploreTemp = 0;

    // File des décisions en attente d'un effet LOCAL mesuré quelques tours plus tard (voir
    // _trackLocalOutcome/_resolvePendingLocalOutcomes) — vidée au fil de la partie, pas persistée.
    this._pendingLocalOutcomes = [];

    // Cellules par zone (id → Set "x,y"), pour l'ancrage de lane en macro-stratégie
    this._zonesById = {};
    (typeof ZONES !== 'undefined' ? ZONES : []).forEach(z => {
      this._zonesById[z.id] = new Set(z.cells.map(c => `${c.x},${c.y}`));
    });
  }

  maybeAct() {
    if (this._busy) return;

    const g = this.game;

    if (g.phase === 'draft') {
      if (g.draftCurrentPlayer() !== this.playerIdx) return;
      this._busy = true;
      setTimeout(() => {
        this.decideDraft();
      }, 400);
    } else if (g.phase === 'playing') {
      const hero = g.currentHero;
      if (!hero || hero.playerIdx !== this.playerIdx) return;
      this._busy = true;
      setTimeout(() => {
        this.executeTurn();
      }, 200);
    }
  }

  // ============================================================
  // DRAFT
  // ============================================================

  decideDraft() {
    const g = this.game;
    const d = g.draft;

    if (d.phase === 'ban') {
      this._doBan();
    } else {
      this._doPick();
    }

    this.onSync();
    this._busy = false;
  }

  _doBan() {
    const g = this.game;
    const candidates = Object.keys(HERO_TYPES).filter(typeId => !g._isUnavailable(typeId) && this._isConfiguredHero(typeId));
    if (!candidates.length) return;
    // forceRandomDraft (voir BOT_DEFAULT_PARAMS) : casse le piège du démarrage à froid en piochant
    // uniformément, sans passer par l'EV ni draftTopK — un héros mal noté par manque de données a
    // alors les mêmes chances que les autres d'être (dé)banni, donc de finir par accumuler des
    // parties et sortir du silence statistique.
    if (this.params.forceRandomDraft) {
      g.banHero(candidates[Math.floor(Math.random() * candidates.length)]);
      return;
    }
    // Équipe adverse telle que connue à cet instant (picks pas forcément complets) — ventile l'EV
    // du héros banni par profil adverse plutôt qu'un agrégat aveugle au matchup. Même indexation
    // que _doPick : "adverse" = l'autre joueur, peu importe qui banni.
    const enemyPicksSoFar = (g.draft.picks[1 - this.playerIdx] || []).map(id => HERO_TYPES[id]).filter(Boolean);
    const best = this._weightedTopPick(candidates, typeId => this._scoreBanTarget(typeId, enemyPicksSoFar), this.params.draftTopK);
    if (best) g.banHero(best);
  }

  _doPick() {
    const g = this.game;
    const candidates = Object.keys(HERO_TYPES).filter(typeId => !g._isUnavailable(typeId) && this._isConfiguredHero(typeId));
    if (!candidates.length) return;
    // Équipes telles que connues à cet instant (picks pas forcément complets) — donne un
    // contexte de matchup approximatif pour le score EV et le choix de rune, affiné au fil du draft.
    const enemyPicksSoFar = (g.draft.picks[1 - this.playerIdx] || []).map(id => HERO_TYPES[id]).filter(Boolean);
    const allyPicksSoFar  = (g.draft.picks[this.playerIdx] || []).map(id => HERO_TYPES[id]).filter(Boolean);
    // forceRandomDraft : voir _doBan — même bascule côté pick (la rune, elle, reste choisie par EV,
    // pool et dynamique différents de celle du champion).
    const best = this.params.forceRandomDraft
      ? candidates[Math.floor(Math.random() * candidates.length)]
      : this._weightedTopPick(candidates, typeId => this._scorePickTarget(typeId, enemyPicksSoFar), this.params.draftTopK);
    if (!best) return;
    const runeId = this._pickRuneForHero(HERO_TYPES[best], enemyPicksSoFar, allyPicksSoFar);
    g.pickHeroWithRune(best, runeId);
  }

  // Un héros "configuré" a un nom propre (pas un placeholder générique type "ROAM 7")
  _isConfiguredHero(typeId) {
    const hero = HERO_TYPES[typeId];
    return !!hero && !BOT_GENERIC_NAME_RE.test(hero.name || '');
  }

  // Tirage pondéré parmi les meilleurs candidats (au lieu d'un argmax déterministe) :
  // sans ça, le scoring étant une fonction pure des stats des héros, le draft produit
  // quasi le même tirage à chaque partie — inutile pour explorer des matchups variés en simulation,
  // et rend le bot prévisible en partie contre un humain.
  // Tirage pondéré softmax (pas linéaire) : le poids de chaque candidat dépend de son écart de
  // score au MEILLEUR (exp((score-max)/T)), pas d'un décalage additif par rapport au pire du lot.
  // C'est un choix délibéré et important : avec l'ancienne pondération linéaire (score-min+1), le
  // poids du meilleur candidat ne dépendait que de son écart au PIRE, alors que sa PROBABILITÉ DE
  // TIRAGE dépend du poids total de TOUS les autres — et avec ~60 candidats (objets), même
  // largement dominé individuellement, le nombre de concurrents "pas les pires mais pas les
  // meilleurs" suffisait à eux seuls à écraser le meilleur objet (observé : ~3-4% de chances d'être
  // tiré pour l'objet au score le plus haut, malgré un écart net et appris sur des centaines de
  // parties). Le softmax corrige ça : un écart de score donné (en unités de weightedPickTemperature)
  // se traduit par un ratio de probabilité CONSTANT entre deux candidats, peu importe combien
  // d'autres candidats existent par ailleurs — la taille du pool n'affaiblit plus mécaniquement le
  // meilleur choix.
  // `temperature` : surcharge optionnelle de weightedPickTemperature. Nécessaire parce que
  // l'étalement naturel des scores diffère selon le domaine — objets/draft s'étalent sur ~15-18
  // points (weightedPickTemperature=4 leur va bien), mais les runes (mêmes formules, juste moins
  // de signal structurel à exploiter que les stats d'un objet) ne s'étalent que sur ~8 points en
  // pratique. La MÊME température y écrase donc un écart de winrate pourtant réel et confiant
  // (52% vs 33-48%, ~800 parties) — observé : les runes se tiraient quasiment uniformément malgré
  // un signal net. Voir runePickTemperature, calibré séparément sur les données réelles de runes.
  _weightedTopPick(candidates, scoreFn, topK = 3, temperature = null) {
    const scored = candidates
      .map(typeId => ({ typeId, score: scoreFn(typeId) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.min(topK, candidates.length));

    const maxScore = scored[0].score;
    const T = Math.max(0.01, temperature != null ? temperature : this.params.weightedPickTemperature);
    const weights = scored.map(s => Math.exp((s.score - maxScore) / T));
    const total = weights.reduce((a, b) => a + b, 0);

    let r = Math.random() * total;
    for (let i = 0; i < scored.length; i++) {
      r -= weights[i];
      if (r <= 0) return scored[i].typeId;
    }
    return scored[0].typeId;
  }

  // Winrate observé d'un héros au pick/ban, ventilé par profil de l'équipe adverse déjà connue à
  // ce stade du draft (armure/RM utiles contre une équipe majoritairement AD/AP se traduit ici
  // directement en meilleur winrate observé pour les héros qui en profitent, sans avoir à le coder
  // à la main). Même principe UCB que _scoreItemForHero : EV à 0 sans données, bonus d'exploration
  // qui décroît avec l'échantillon, jamais nul.
  _draftHeroEV(typeId, enemyPicksSoFar) {
    const p = this.params;
    let picks = 0, learnedEV = 0;
    if (typeof Stats !== 'undefined') {
      try {
        const data = Stats.getData();
        const root = data && data.heroDraftEV && data.heroDraftEV[typeId];
        if (root) {
          const enemyCtx = 'vs' + this._teamContext(enemyPicksSoFar || []);
          const found = this._bestBucketEntry(root, [enemyCtx, 'all'], p.draftHistoryMinSample);
          if (found) {
            picks = found.entry.picks;
            const winrate = found.entry.wins / found.entry.picks;
            const confidence = Math.min(1, picks / p.draftHistoryConfidentSample);
            learnedEV = (winrate - 0.5) * p.draftHistoryScoreScale * confidence;
          }
        }
      } catch (e) {}
    }
    const explorationBonus = p.draftExplorationWeight / Math.sqrt(picks + 1);
    return learnedEV + explorationBonus;
  }

  _scoreBanTarget(typeId, enemyPicksSoFar = []) {
    return this._draftHeroEV(typeId, enemyPicksSoFar);
  }

  _scorePickTarget(typeId, enemyPicksSoFar = []) {
    const hero = HERO_TYPES[typeId];
    const g = this.game;
    const d = g.draft;
    const myPicks = d.picks[this.playerIdx] || [];

    let score = this._scoreBanTarget(typeId, enemyPicksSoFar) + 2; // Même logique que ban + bonus

    // Bonus structurel de composition (pas une opinion sur la force du héros) : une équipe a
    // besoin des 5 rôles, donc un nouveau rôle reste préférable à égalité d'EV.
    const takenRoles = myPicks.map(id => HERO_TYPES[id].roleId);
    if (!takenRoles.includes(hero.roleId)) {
      score += this.params.draftNewRoleBonus;  // Nouveau rôle = bon
    } else {
      score += this.params.draftSameRoleBonus; // Rôle déjà couvert = moins bon mais pas interdit
    }

    return score;
  }

  // ============================================================
  // TURN EXECUTION
  // ============================================================

  async executeTurn() {
    const g = this.game;
    const hero = g.currentHero;

    try {
      // Vérifications strictes
      if (!hero) return;
      if (hero.playerIdx !== this.playerIdx) return;
      if (g.phase !== 'playing') return;

      // Résout les décisions en attente d'un effet local (voir _trackLocalOutcome) avant d'en
      // enregistrer de nouvelles ce tour-ci — décisions/tours anciens d'abord.
      this._resolvePendingLocalOutcomes();

      // Cible de focus pour tout le tour : évite de disperser sorts/attaques sur des cibles différentes
      this._focusTarget = this._computeFocusTarget();
      hero._comboFirstRecorded = false;
      hero._heldSpellsThisTurn = null; // voir 'hold' dans _decideCastSpells — reset à chaque tour

      // 0.5 Revente de l'item starter s'il ne sert plus (voir _maybeSellStarter) — avant l'achat,
      // pour que l'or récupéré et le slot libéré soient disponibles dès ce tour-ci.
      this._maybeSellStarter(hero);

      // 1. Achat (limité à 5 items max par tour)
      let buyCount = 0;
      while (g.canBuy && buyCount < 5) {
        const itemId = this._decideBuy();
        if (!itemId) break;

        // Sécurité : vérifier que l'item existe et a un coût valide. Coût à 0 est légitime
        // (assemblage gratuit quand tous les composants sont déjà en poche) — seul un coût
        // négatif/invalide (objet cassé) doit interrompre l'achat.
        const item = EQUIPMENT[itemId];
        const buyCost = item ? g.getBuyCost(hero, itemId) : -1;
        if (!item || !Number.isFinite(buyCost) || buyCost < 0) break;

        g.buyItem(itemId);
        buyCount++;
        await this._delay(100);
        this.onSync();
      }

      // Le héros peut mourir EN PLEIN TOUR (riposte, dégâts de zone déclenchés par son propre
      // déplacement/sort...) — sans ce garde-fou, les étapes suivantes tournent sur un héros mort
      // (position nulle) et plantent (ex. getAttackTargets → _manhattan(null, ...)).
      const stillActing = () => g.currentHero === hero && hero.isAlive;

      // 2. Sorts avant mouvement (si à portée)
      if (stillActing() && !hero.rootTurns && !hero.mutedThisTurn) {
        await this._decideCastSpells('early');
      }

      // 3. Mouvement
      if (stillActing() && !hero.rootTurns && g.movementLeft > 0) {
        this._decideMove();
        await this._delay(120);
        this.onSync();
      }

      // 4. Sorts après mouvement (en mêlée)
      if (stillActing() && !hero.rootTurns && !hero.mutedThisTurn) {
        await this._decideCastSpells('late');
      }

      // 5. Attaque
      while (stillActing() && g.autoAttacksUsed < g.autoAttacksAllowed && g.actionsUsed < MAX_ACTIONS) {
        const prevAttacks = g.autoAttacksUsed;
        this._decideAttack();
        // Si pas de nouvelle attaque, sortir de la boucle
        if (g.autoAttacksUsed === prevAttacks) break;
        await this._delay(100);
        this.onSync();
      }

      // 5.5 Loups de Noyala : unité secondaire au PM propre (rafraîchi en début de tour de Noyala,
      // voir le passif noyala_passive dans game.js), jamais pilotée jusqu'ici — ils restaient
      // plantés là où ils avaient été invoqués. Voir _decideWolfMoves.
      if (stillActing() && hero.passive === 'noyala_passive') {
        this._decideWolfMoves(hero);
        this.onSync();
      }

      // 6. Fin du tour (immédiat, pas d'attente)
      // Vérification finale avant de terminer
      const finalHero = g.currentHero;
      if (finalHero && finalHero.playerIdx === this.playerIdx) {
        g.endHeroTurn();
        this.onSync();
      }
    } finally {
      this._busy = false;
    }
  }

  // ============================================================
  // SHOPPING
  // ============================================================

  _decideBuy() {
    const g = this.game;
    const hero = g.currentHero;

    if (!hero || !g.canBuy) return null;
    if (this._neuralNet) return this._decideBuyNeural();

    // Build calculé une fois par héros par partie (adapté à la compo adverse au moment du calcul),
    // puis mis en cache sur l'instance du héros pour ne pas changer de cible à chaque achat et
    // gâcher les composants déjà investis. Choix pondéré-aléatoire : deux parties avec le même
    // héros dans le même matchup ne produisent pas forcément le même build.
    if (!hero._botBuild) {
      const enemies = g._getEnemies(hero.playerIdx).filter(e => e.isAlive);
      const allies = g._getAllies(hero.playerIdx).filter(a => a !== hero && a.isAlive);
      hero._botBuild = {
        boots: this._pickBoots(hero, enemies, allies),
        items: this._pickBuildTargets(hero, enemies, allies),
        starter: this._pickStarter(hero, enemies, allies),
        starterSellPolicy: this._pickStarterSellPolicy(hero, enemies, allies),
      };
      // Choix fait une fois pour toute la partie (comme le reste du build ci-dessus) : enregistré
      // dès maintenant, pas seulement au moment de la vente, sinon l'option "never" (jamais
      // revendre — voir _pickStarterSellPolicy) ne recevrait jamais aucune donnée de winrate
      // puisqu'aucune vente n'a jamais lieu pour elle. L'effet local, lui, reste mesuré au moment
      // réel de la vente (voir _maybeSellStarter) : c'est là qu'il se produit.
      if (hero._botBuild.starter) {
        this._recordDecision(hero, 'starterSellPolicy', hero._botBuild.starterSellPolicy);
      }
    }

    // Item starter (voir _maybeSellStarter pour la revente) : très rentable en tout début de
    // partie (stats immédiates + passif économique gold/mana), acheté en priorité absolue au tout
    // premier achat de la partie tant qu'aucun autre item n'est encore possédé — au-delà, il vaut
    // mieux laisser la place aux composants du vrai build (voir finalItems ci-dessous).
    if (hero._botBuild.starter && hero.items.length === 0) {
      const cost = g.getBuyCost(hero, hero._botBuild.starter);
      if (cost <= hero.gold) return hero._botBuild.starter;
    }

    const finalItems = [hero._botBuild.boots, ...hero._botBuild.items].filter(Boolean);
    const owned = new Set(hero.items);

    // Un achat doit tenir dans les 6 emplacements une fois les composants déjà possédés
    // consommés (même calcul que buyItem/_slotsFreedRecursive côté moteur). Sans ce filtre,
    // un inventaire plein de composants isolés (aucun ne complétant un objet final) bloquait
    // tout futur achat via le simple "hero.items.length >= 6" du haut de la fonction, même
    // quand un des objets finaux ne demandait plus qu'un seul composant déjà en poche
    // (ex. bottes_attaquant tenu par simple_boots seul) — le héros restait alors coincé avec
    // de l'or inutilisé pour le reste de la partie.
    const fitsInventory = (id) => {
      const slotsFreed = g._slotsFreedRecursive([...hero.items], EQUIPMENT[id].recipe);
      return hero.items.length - slotsFreed < 6;
    };

    // Chercher le premier item final qu'on n'a pas
    for (const itemId of finalItems) {
      if (owned.has(itemId)) continue;

      const item = EQUIPMENT[itemId];
      if (!item || !fitsInventory(itemId)) continue;

      const cost = g.getBuyCost(hero, itemId);

      // Si on peut acheter l'item final, l'acheter
      if (cost <= hero.gold) {
        return itemId;
      }

      // Sinon, essayer d'acheter les composants manquants (progression T1 → T2 → T3)
      if (item.recipe && item.recipe.length > 0) {
        // Essayer d'acheter le 1er composant manquant
        for (const comp of item.recipe) {
          if (!owned.has(comp)) {
            const compItem = EQUIPMENT[comp];
            if (!compItem || !fitsInventory(comp)) continue;

            const compCost = g.getBuyCost(hero, comp);
            if (compCost <= hero.gold) {
              return comp;
            }
          }
        }
      }
    }

    // Pas d'item à acheter
    return null;
  }

  // Choisit les 5 items T3/T4 cible pour ce héros : scoring adaptatif (profil AD/AP du héros,
  // rôle, compo adverse au moment du calcul) + tirage pondéré parmi les meilleurs pour varier
  // les builds d'une partie à l'autre plutôt que de toujours prendre l'unique meilleur score.
  // Valeur = _scoreItemForHero + regret cumulé (voir _regretNudge), tirage par softmax
  // (_weightedTopPick, PAS _regretMatchPick) : un pool de ~50 objets a un vrai risque d'archétype
  // (un objet tank pour un mage n'est jamais "juste une option parmi d'autres" comme les 4
  // politiques de starterSellPolicy) — _regretMatchPick retombe sur un tirage UNIFORME tant que le
  // regret n'a pas eu le temps de différencier (démarrage à froid, ou pool aussi large que 50
  // objets), ignorant complètement _scoreItemForHero pendant tout ce temps. Le softmax, lui,
  // reste ancré sur l'EV dès la première partie (learnedEV/synergie/contre + exploration UCB) et
  // le regret vient seulement affiner par-dessus — jamais un pur hasard entre-temps. Cette
  // température (weightedPickTemperature) est aussi ce que pilote le curseur "EV optimale" du
  // panneau de style : sans elle ici, ce curseur n'avait plus aucun effet sur le choix des objets.
  _pickBuildTargets(hero, enemies, allies = []) {
    // notBuyable exclu : ce sont des objets spéciaux (récompense/mécanique unique, ex. Épée de
    // l'Ange) sans vrai coût d'achat défini (combineCost 0) — le shop humain les masque déjà
    // (voir renderer.js), mais rien ne les excluait ici. Un bot les visant se retrouvait bloqué :
    // getBuyCost renvoie 0, ce qui déclenche le garde-fou "coûte quelque chose" dans
    // executeTurn() et interrompt TOUT achat pour le reste de la partie (le même objet non
    // possédé redevenant la 1ère cible à chaque tour suivant).
    const pool = new Set(Object.keys(EQUIPMENT).filter(id => EQUIPMENT[id].tier >= 3 && !EQUIPMENT[id].notBuyable));
    const picks = [];
    for (let i = 0; i < 5 && pool.size; i++) {
      const candidates = [...pool];
      // `picks` (objets déjà choisis PLUS TÔT dans cette même construction de build) sert de
      // contexte de synergie pour le prochain choix (voir _scoreItemForHero/_itemSynergyEV) : le
      // 2e objet est jugé en partie sur son affinité avec le 1er, le 3e avec les deux premiers, etc.
      const chosen = this._weightedTopPick(candidates, id =>
        this._scoreItemForHero(id, hero, enemies, allies, picks) + this._regretNudge(hero, 'itemPick', id, enemies, allies),
        candidates.length);
      if (!chosen) break;
      picks.push(chosen);
      pool.delete(chosen);
    }
    return picks;
  }

  _pickBoots(hero, enemies, allies = []) {
    return this._weightedTopPick(BOT_BOOT_IDS, id =>
      this._scoreItemForHero(id, hero, enemies, allies) + this._regretNudge(hero, 'bootsPick', id, enemies, allies),
      BOT_BOOT_IDS.length);
  }

  // Items "starter" (EQUIPMENT[id].isStarter) : un seul possédable à la fois (règle du moteur, voir
  // game.js buyItem), sans recette (pas de composant, jamais un composant d'un autre objet) — très
  // forts en tout début de partie (stats immédiates + passif économique gold/mana, voir
  // js/equipment.js TIER 1) mais fait pour être revendu une fois le build principal engagé (voir
  // _maybeSellStarter). Score réutilise _scoreItemForHero telle quelle (générique par itemId).
  _pickStarter(hero, enemies, allies = []) {
    const ids = Object.keys(EQUIPMENT).filter(id =>
      EQUIPMENT[id].isStarter && (!EQUIPMENT[id].roleRestriction || EQUIPMENT[id].roleRestriction === hero.roleId)
    );
    if (!ids.length) return null;
    return this._weightedTopPick(ids, id =>
      this._scoreItemForHero(id, hero, enemies, allies) + this._regretNudge(hero, 'starterPick', id, enemies, allies),
      ids.length);
  }

  // QUAND revendre le starter (remboursé à 80%, voir game.js sellItem) n'a pas de réponse évidente
  // écrite à la main : le vendre coûte 20% de sa valeur, mais libère un slot pour un objet T3 et
  // "whenFull" (attendre qu'il bloque vraiment un achat) n'est qu'une hypothèse parmi d'autres —
  // il est possible qu'il vaille mieux le revendre plus tôt (accélérer le vrai build) ou même ne
  // JAMAIS le revendre (son passif reste assez fort toute la partie pour valoir le slot manquant).
  // Choix ponctuel autonome et propre (4 options, valeur = _decisionEV pure, pas de terme
  // d'exploration déjà mélangé dedans) : candidat idéal pour le vrai regret matching plutôt que le
  // softmax habituel — voir _regretMatchPick.
  _pickStarterSellPolicy(hero, enemies, allies = []) {
    return this._regretMatchPick(
      hero, 'starterSellPolicy', STARTER_SELL_POLICY_IDS,
      id => this._decisionEV(hero, 'starterSellPolicy', id, enemies, allies),
      enemies, allies
    );
  }

  _maybeSellStarter(hero) {
    const g = this.game;
    const starterId = hero.items.find(id => EQUIPMENT[id]?.isStarter);
    if (!starterId) return false;

    const policy = (hero._botBuild && hero._botBuild.starterSellPolicy) || 'latePhase';
    const inventoryFull = hero.items.length >= 6;
    const phase = this._gamePhase();

    let shouldSell;
    if (policy === 'never') shouldSell = false;
    else if (policy === 'whenFull') shouldSell = inventoryFull;
    else if (policy === 'earlyPhaseEnd') shouldSell = inventoryFull || phase !== 'early';
    else /* 'latePhase' */ shouldSell = inventoryFull || phase === 'late';

    if (!shouldSell) return false;

    g.sellItem(starterId);
    const enemies = g._getEnemies(hero.playerIdx).filter(e => e.isAlive);
    const allies = g._getAllies(hero.playerIdx).filter(a => a !== hero && a.isAlive);
    this._trackLocalOutcome(hero, 'starterSellPolicy', policy, enemies, allies);
    return true;
  }

  // Variantes déterministes (meilleur score exact, pas de tirage pondéré ni d'échantillonnage par
  // regret) utilisées par la page "build recommandé" (server.js /api/simulations/hero/:typeId/build),
  // qui doit rester stable entre deux rechargements ET ne jamais modifier l'état appris rien qu'en
  // étant consultée — _regretMatchPick a un effet de bord (_updateRegret), inutilisable ici pour
  // cette raison. Le regret cumulé (voir _regretNudge) est quand même reflété dans le classement,
  // additionné au score comme partout ailleurs — juste choisi par argmax plutôt qu'échantillonné.
  _pickBuildTargetsDeterministic(hero, enemies = [], allies = []) {
    const pool = new Set(Object.keys(EQUIPMENT).filter(id => EQUIPMENT[id].tier >= 3 && !EQUIPMENT[id].notBuyable));
    const picks = [];
    for (let i = 0; i < 5 && pool.size; i++) {
      let best = null, bestScore = -Infinity;
      for (const id of pool) {
        const score = this._scoreItemForHero(id, hero, enemies, allies, picks) + this._regretNudge(hero, 'itemPick', id, enemies, allies);
        if (score > bestScore) { bestScore = score; best = id; }
      }
      if (best === null) break;
      picks.push(best);
      pool.delete(best);
    }
    return picks;
  }

  _pickBootsDeterministic(hero, enemies = [], allies = []) {
    let best = null, bestScore = -Infinity;
    for (const id of BOT_BOOT_IDS) {
      const score = this._scoreItemForHero(id, hero, enemies, allies) + this._regretNudge(hero, 'bootsPick', id, enemies, allies);
      if (score > bestScore) { bestScore = score; best = id; }
    }
    return best;
  }

  _pickStarterDeterministic(hero, enemies = [], allies = []) {
    const ids = Object.keys(EQUIPMENT).filter(id =>
      EQUIPMENT[id].isStarter && (!EQUIPMENT[id].roleRestriction || EQUIPMENT[id].roleRestriction === hero.roleId)
    );
    let best = null, bestScore = -Infinity;
    for (const id of ids) {
      const score = this._scoreItemForHero(id, hero, enemies, allies) + this._regretNudge(hero, 'starterPick', id, enemies, allies);
      if (score > bestScore) { bestScore = score; best = id; }
    }
    return best;
  }

  // Score d'un objet pour ce héros, entièrement dérivé de données observées — aucune formule
  // écrite à la main. EV = 0 par défaut pour CHAQUE (héros, objet) : sans données, aucun avis
  // n'est pris par avance. Trois signaux, chacun pondéré par SA PROPRE confiance (grandit avec
  // l'échantillon, jamais d'un coup) :
  //  - learnedEV : winrate observé pour ce héros+objet, ventilé par contexte adverse+allié+rune
  //    (voir _historicalItemStats) — dépend donc des adversaires ET de la rune équipée.
  //  - synergyEV : winrate observé pour ce héros quand cet objet était possédé EN MÊME TEMPS que
  //    chacun des objets déjà choisis (voir _itemSynergyEV) — dépend du reste du build.
  //  - counterEV : winrate observé pour ce héros quand cet objet faisait face à chacun des objets
  //    tier≥3 de l'équipe adverse (voir _itemCounterEV) — un vrai contre au niveau de l'objet
  //    précis, pas juste le profil AD/AP agrégé déjà couvert par les buckets de matchup.
  //  - explorationBonus : pousse à retester les objets peu essayés (style UCB), pour que le
  //    winrate observé ait une chance d'évoluer au lieu de se figer sur les premiers résultats.
  _scoreItemForHero(itemId, hero, enemies, allies = [], ownedItemIds = null) {
    const item = EQUIPMENT[itemId];
    if (!item) return -Infinity;
    const p = this.params;

    const hist = this._historicalItemStats(hero, itemId, enemies, allies);
    const picks = hist ? hist.picks : 0;
    const learnedEV = hist ? (hist.winrate - 0.5) * p.itemHistoryScoreScale * hist.confidence : 0;
    const explorationBonus = p.itemExplorationWeight / Math.sqrt(picks + 1);
    const synergyEV = this._itemSynergyEV(hero, itemId, ownedItemIds || hero.items || []);
    const enemyItemIds = [...new Set((enemies || []).flatMap(e =>
      (e.items || []).filter(id => EQUIPMENT[id] && EQUIPMENT[id].tier >= 3)
    ))];
    const counterEV = this._itemCounterEV(hero, itemId, enemyItemIds);

    return learnedEV + explorationBonus + synergyEV + counterEV;
  }

  // Profil de dégâts grossier d'une équipe (AP/AD/Mixed) — mêmes seuils que js/stats.js
  // _teamDamageContext (garder synchronisé).
  _teamContext(entities) {
    let ad = 0, ap = 0;
    (entities || []).forEach(e => { if (e) { ad += e.ad || 0; ap += e.ap || 0; } });
    const total = ad + ap || 1;
    if (ap / total > 0.6) return 'AP';
    if (ad / total > 0.6) return 'AD';
    return 'Mixed';
  }

  // Contexte hiérarchique {combined, enemyOnly, all} : combined = profil adverse + allié (le plus
  // précis, le plus lent à accumuler des données), enemyOnly = juste l'adversaire (repli si combined
  // trop peu échantillonné), all = agrégat total (dernier recours). Toute EV empirique (objets,
  // runes, décisions génériques) varie donc à la fois selon les ennemis ET l'équipe — mêmes clés
  // que js/stats.js _matchupBuckets, à garder synchronisées.
  _matchupBuckets(enemies, allies) {
    // Sans ennemi/allié connu (page "build recommandé" généraliste, appelée avec [], []),
    // _teamContext([]) retombe sur 'Mixed' par défaut — un contexte RÉEL et PARTIEL (parties où
    // l'adversaire s'est justement avéré à profil mixte), pas un synonyme de "tous matchups
    // confondus". Le confondre avec 'all' faisait remonter en priorité un sous-échantillon plus
    // petit et plus bruité que l'agrégat complet — juste parce qu'il passait le seuil minSample
    // en premier dans la liste de repli, pas parce qu'il était plus fiable. D'où des recommandations
    // qui semblaient sortir de nulle part par rapport au classement par winrate brut (qui, lui,
    // utilise bien l'agrégat complet — voir historicalItems côté server.js).
    if (!enemies.length && !allies.length) {
      return { combined: 'all', enemyOnly: 'all', all: 'all' };
    }
    const enemyCtx = 'vs' + this._teamContext(enemies);
    const allyCtx  = 'ally' + this._teamContext(allies);
    return {
      combined:  `${enemyCtx}|${allyCtx}`,
      enemyOnly: `${enemyCtx}|allyAny`,
      all: 'all',
    };
  }

  // Liste de repli à 3 niveaux (combiné → adverse seul → agrégat), l'ordre par défaut utilisé
  // partout sauf pour les objets (voir _itemBucketPriorityList, qui ajoute la rune en amont).
  _bucketKeyList(buckets) {
    return [buckets.combined, buckets.enemyOnly, buckets.all];
  }

  // Comme _bucketKeyList, mais avec la rune équipée en dimension supplémentaire, essayée EN
  // PRIORITÉ (repli si trop peu de données à ce niveau précis) : matchup+rune → matchup seul →
  // adverse+rune → adverse seul → agrégat. Fait dépendre l'EV d'un objet de la rune choisie sans
  // introduire un terme d'EV séparé — juste une clé de bucket plus riche dans le même mécanisme
  // de repli hiérarchique que le reste (objets/runes/décisions).
  _itemBucketPriorityList(enemies, allies, runeId) {
    const buckets = this._matchupBuckets(enemies, allies);
    const keys = [];
    if (runeId) {
      keys.push(`${buckets.combined}|rune:${runeId}`);
      keys.push(`${buckets.enemyOnly}|rune:${runeId}`);
    }
    keys.push(buckets.combined, buckets.enemyOnly, buckets.all);
    return keys;
  }

  // Cherche la donnée la plus précise disponible dans `root` (déjà organisé par bucket de
  // contexte) en essayant `orderedKeys` dans l'ordre et en s'arrêtant au premier bucket assez
  // échantillonné.
  _bestBucketEntry(root, orderedKeys, minSample) {
    for (const key of orderedKeys) {
      const entry = root[key];
      if (entry && entry.picks >= minSample) return { entry, context: key };
    }
    return null;
  }

  // ============================================================
  // DÉCISIONS GÉNÉRIQUES — infrastructure réutilisable pour piloter par EV réelle N'IMPORTE QUELLE
  // décision discrète du bot (pas seulement objets/runes) : économie vs engagement, priorité du
  // roam, timing des sorts... Même principe partout : _recordDecision() note l'option choisie,
  // corrélée à la victoire en fin de partie (js/stats.js) ; _decisionEV() relit cette EV (0 par
  // défaut, monte avec l'échantillon, ventilée par contexte adverse+allié) pour nuancer le score.
  // ============================================================

  _recordDecision(hero, key, optionId) {
    if (typeof Stats === 'undefined') return;
    try { Stats.recordDecision(hero.id, key, optionId, hero.playerIdx); } catch (e) {}
  }

  // EV "partie entière" (winrate final) + EV "effet local" (voir plus bas), combinées. Les deux
  // sont indépendamment pondérées par leur PROPRE confiance (échantillon), donc aucune des deux ne
  // peut dominer avant d'avoir vraiment assez de données — exactement le même principe que
  // objets/runes, juste avec deux sources d'EV au lieu d'une.
  _decisionEV(hero, key, optionId, enemies, allies) {
    if (typeof Stats === 'undefined') return 0;
    const p = this.params;
    let data;
    try { data = Stats.getData(); } catch (e) { return 0; }
    let wholeGameEV = 0;
    const root = data && data.heroDecisions && data.heroDecisions[hero.id] &&
                 data.heroDecisions[hero.id][key] && data.heroDecisions[hero.id][key][optionId];
    if (root) {
      const found = this._bestBucketEntry(root, this._bucketKeyList(this._matchupBuckets(enemies, allies || [])), p.decisionMinSample);
      if (found) {
        const winrate = found.entry.wins / found.entry.picks;
        const confidence = Math.min(1, found.entry.picks / p.decisionConfidentSample);
        wholeGameEV = (winrate - 0.5) * p.decisionScoreScale * confidence;
      }
    }
    return wholeGameEV + this._localOutcomeEV(hero, key, optionId, enemies, allies);
  }

  // ============================================================
  // EFFETS LOCAUX — mesure l'impact d'une décision quelques tours après coup (or gagné, dégâts
  // infligés, soin/bouclier prodigués, PV net, kills/morts/assists, survie), au lieu d'attendre le
  // résultat de la partie entière 40+ tours plus tard. Signal complémentaire à l'EV "partie
  // entière" ci-dessus : converge plus vite (fenêtre courte = moins d'événements non liés qui
  // brouillent le signal) et fonctionne même pour une partie qui finira en égalité.
  // ============================================================

  // Photo de l'état "mesurable" d'un héros à un instant T — comparée à une photo prise quelques
  // tours plus tard pour obtenir les deltas qui composent la récompense locale.
  _snapshotHeroState(hero) {
    const totals = (typeof Stats !== 'undefined' && Stats.getCurrentTotals) ? Stats.getCurrentTotals(hero.id) : {};
    return {
      totalGoldEarned: hero.totalGoldEarned || hero.gold || 0,
      currentHP: hero.currentHP,
      kills: hero.kills || 0, deaths: hero.deaths || 0, assists: hero.assists || 0,
      isAlive: hero.isAlive,
      dmgDealt:    totals.dmgDealt    || 0,
      healDealt:   totals.healDealt   || 0,
      shieldDealt: totals.shieldDealt || 0,
      manaSpent:   totals.manaSpent   || 0,
    };
  }

  // Or gagné par "l'adversaire concerné" à un instant donné — l'homologue direct (même rôle en
  // face, ex. Solo vs Solo) s'il est vivant, sinon la moyenne de l'équipe adverse encore vivante
  // (repli "Team A vs Team B" quand aucun duel direct n'est identifiable). `refs` = ce qu'a
  // renvoyé _matchupOpponentRefs au moment du tracking, réutilisé tel quel à la résolution pour
  // comparer exactement les mêmes héros aux deux instants.
  _opponentGoldSnapshot(refs) {
    if (refs.direct) return refs.direct.totalGoldEarned || refs.direct.gold || 0;
    if (!refs.team.length) return 0;
    return refs.team.reduce((s, e) => s + (e.totalGoldEarned || e.gold || 0), 0) / refs.team.length;
  }

  // Identifie une fois pour toutes (au moment du tracking) QUI sert de référence adverse pour le
  // reste de la mesure — mêmes références d'objets réutilisées à la résolution, pas re-choisies
  // (sinon un adversaire mort en cours de route changerait silencieusement le point de comparaison).
  _matchupOpponentRefs(hero, enemies) {
    const alive = (enemies || []).filter(e => e && e.isAlive);
    return { direct: alive.find(e => e.roleId === hero.roleId) || null, team: alive };
  }

  // Combine les deltas (snapshot → maintenant) en une seule récompense scalaire pondérée. Chaque
  // delta est d'abord ramené à une échelle comparable avant pondération (voir commentaire des
  // params localOutcome* dans BOT_DEFAULT_PARAMS) — sinon l'or (centaines) écraserait mécaniquement
  // les kills (unités) indépendamment de l'importance réellement voulue par les poids.
  //
  // L'or en lui-même ne dit presque rien : les deux camps en gagnent en continu, décision ou pas —
  // ce qui compte c'est l'ÉCART qu'on creuse (ou qu'on laisse se creuser) face à l'adversaire
  // concerné par cette décision précise (homologue de même rôle, ou équipe adverse à défaut), pas
  // le montant brut gagné par ce héros isolément.
  _computeLocalReward(hero, before, after, opponentGoldBefore, opponentGoldAfter) {
    const p = this.params;
    const hpScale = Math.max(1, hero.maxHP * 0.5);
    const myGoldDelta       = after.totalGoldEarned - before.totalGoldEarned;
    const opponentGoldDelta = opponentGoldAfter - opponentGoldBefore;
    const goldGapDelta = (myGoldDelta - opponentGoldDelta) / 300;
    const dmgDelta     = (after.dmgDealt    - before.dmgDealt)    / hpScale;
    const healDelta    = (after.healDealt   - before.healDealt)   / hpScale;
    const shieldDelta  = (after.shieldDealt - before.shieldDealt) / hpScale;
    const hpDelta       = (after.currentHP   - before.currentHP)   / Math.max(1, hero.maxHP);
    const killsDelta   = after.kills   - before.kills;
    const deathsDelta  = after.deaths  - before.deaths;
    const assistsDelta = after.assists - before.assists;
    const manaSpentDelta = (after.manaSpent - before.manaSpent) / Math.max(1, hero.maxMana || 100);

    return goldGapDelta * p.localOutcomeGoldWeight
         + dmgDelta     * p.localOutcomeDmgDealtWeight
         + healDelta    * p.localOutcomeHealWeight
         + shieldDelta  * p.localOutcomeShieldWeight
         + hpDelta       * p.localOutcomeHpWeight
         + killsDelta   * p.localOutcomeKillWeight
         + assistsDelta * p.localOutcomeAssistWeight
         - deathsDelta  * p.localOutcomeDeathWeight
         - manaSpentDelta * p.localOutcomeManaCostWeight
         + (after.isAlive ? 1 : -1) * p.localOutcomeSurvivalWeight;
  }

  // Enregistre une décision à suivre pour son effet local (résolu plus tard, voir
  // _resolvePendingLocalOutcomes) — en plus de _recordDecision (l'EV "partie entière" classique),
  // pas à sa place.
  _trackLocalOutcome(hero, key, optionId, enemies, allies) {
    const opponentRefs = this._matchupOpponentRefs(hero, enemies);
    this._pendingLocalOutcomes.push({
      heroInstanceId: hero.instanceId, heroId: hero.id, key, optionId, playerIdx: hero.playerIdx,
      snapshotTurn: this.game.globalTurn,
      snapshot: this._snapshotHeroState(hero),
      opponentRefs,
      opponentGoldSnapshot: this._opponentGoldSnapshot(opponentRefs),
      buckets: this._matchupBuckets(enemies || [], allies || []),
    });
  }

  // À appeler régulièrement (chaque tour, voir executeTurn) : résout toute décision en attente
  // dont l'horizon est passé, ou dont le héros est mort entre-temps (résolution anticipée — la
  // mort est déjà le signal le plus net possible, inutile d'attendre). Les décisions encore en
  // attente à la toute fin de la partie (dernière poignée de tours) sont perdues avec l'instance du
  // bot — perte mineure acceptée plutôt que de complexifier avec un hook de fin de partie dédié.
  _resolvePendingLocalOutcomes() {
    if (!this._pendingLocalOutcomes.length) return;
    const g = this.game;
    const allHeroes = [...g.players[0].heroes, ...g.players[1].heroes].filter(Boolean);
    const stillPending = [];
    for (const entry of this._pendingLocalOutcomes) {
      const hero = allHeroes.find(h => h.instanceId === entry.heroInstanceId);
      if (!hero) continue;
      const elapsed = g.globalTurn - entry.snapshotTurn;
      if (!hero.isAlive || elapsed >= this.params.localOutcomeHorizonTurns) {
        const reward = this._computeLocalReward(
          hero, entry.snapshot, this._snapshotHeroState(hero),
          entry.opponentGoldSnapshot, this._opponentGoldSnapshot(entry.opponentRefs)
        );
        try { Stats.recordLocalOutcome(entry.heroId, entry.key, entry.optionId, entry.playerIdx, reward, entry.buckets); } catch (e) {}
      } else {
        stillPending.push(entry);
      }
    }
    this._pendingLocalOutcomes = stillPending;
  }

  _localOutcomeEV(hero, key, optionId, enemies, allies) {
    if (typeof Stats === 'undefined') return 0;
    let data;
    try { data = Stats.getData(); } catch (e) { return 0; }
    const root = data && data.heroLocalOutcomes && data.heroLocalOutcomes[hero.id] &&
                 data.heroLocalOutcomes[hero.id][key] && data.heroLocalOutcomes[hero.id][key][optionId];
    if (!root) return 0;
    const p = this.params;
    const found = this._bestBucketEntry(root, this._bucketKeyList(this._matchupBuckets(enemies, allies || [])), p.localOutcomeMinSample);
    if (!found) return 0;
    const avgReward = found.entry.sum / found.entry.picks;
    const confidence = Math.min(1, found.entry.picks / p.localOutcomeConfidentSample);
    return avgReward * confidence;
  }

  // ============================================================
  // REGRET MINIMISÉ (Hart & Mas-Colell) — approximation par bandit-feedback : on n'observe jamais
  // le résultat RÉEL d'une option non choisie dans CETTE situation précise, donc on utilise l'EV
  // apprise (_decisionEV/scoreFn, déjà agrégée sur des situations comparables) comme proxy de sa
  // valeur contrefactuelle. À chaque décision, le regret de CHAQUE option candidate augmente de
  // (sa valeur estimée − la valeur de l'option réellement choisie) — une option qui aurait
  // systématiquement mieux marché accumule un regret positif grandissant, une option régulièrement
  // pire accumule un regret négatif (plafonné à 0 à la sélection, jamais utilisé contre elle).
  // Sélection : probabilité proportionnelle au regret positif cumulé (regret matching canonique) —
  // différent d'un simple softmax sur l'EV : une option jamais essayée ou "malchanceuse" peut
  // dominer la sélection dès que son regret dépasse celui des autres, sans dépendre d'une
  // température fixe.
  // ============================================================

  _regretSum(hero, key, optionId, enemies, allies) {
    if (typeof Stats === 'undefined' || !Stats.getRegret) return 0;
    const bucket = this._matchupBuckets(enemies || [], allies || []).combined;
    try { return Stats.getRegret(hero.id, key, optionId, bucket) || 0; } catch (e) { return 0; }
  }

  // evMap = { optionId: valeurEstimée } pour TOUS les candidats considérés à cette décision (pas
  // seulement celui choisi) — indispensable pour calculer le regret de chacun face au choix réel.
  _updateRegret(hero, key, evMap, chosenId, enemies, allies) {
    if (typeof Stats === 'undefined' || !Stats.updateRegret) return;
    const chosenEV = evMap[chosenId];
    if (typeof chosenEV !== 'number') return;
    const bucket = this._matchupBuckets(enemies || [], allies || []).combined;
    for (const id of Object.keys(evMap)) {
      const delta = evMap[id] - chosenEV;
      if (delta === 0) continue; // rien à ajouter pour l'option choisie elle-même
      try { Stats.updateRegret(hero.id, key, id, bucket, delta); } catch (e) {}
    }
  }

  // Nudge additif pour les décisions déjà pilotées par une heuristique existante (économie vs
  // engagement, rôle de focus, distance d'engagement...) : vient s'ajouter à _decisionEV, pas le
  // remplacer — un signal distinct (comparaison contrefactuelle instance par instance) plutôt
  // qu'une simple moyenne de winrate, qui corrige en partie le biais de sélection (une option
  // choisie surtout dans des situations déjà favorables affiche un winrate gonflé mais un regret
  // plus faible contre ses alternatives, calculé aux instants réels où la comparaison a eu lieu).
  _regretNudge(hero, key, optionId, enemies, allies) {
    const p = this.params;
    const raw = Math.max(0, this._regretSum(hero, key, optionId, enemies, allies));
    // Saturant plutôt que linéaire : le regret cumulé n'est pas borné (accumulé à CHAQUE instance,
    // pas juste une fois par partie comme les autres EV), donc un simple facteur linéaire finirait
    // par dominer tous les autres termes du score avec suffisamment de parties. Approche
    // asymptotiquement regretNudgeWeight sans jamais le dépasser.
    return (raw / (raw + p.regretSaturation)) * p.regretNudgeWeight;
  }

  // Sélection pour les choix ponctuels autonomes (politique de revente du starter...) dont on
  // veut aussi tenir la comptabilité du regret. PAS un regret matching "canonique" (probabilité ∝
  // regret cumulé pur, sans lien avec l'EV brute) : ça retombe sur un tirage UNIFORME tant que le
  // regret n'a pas eu le temps de différencier (démarrage à froid), ignorant complètement scoreFn
  // pendant tout ce temps — testé en conditions réelles sur les objets (avant que ce ne soit
  // remplacé par l'approche ci-dessous, voir _pickBuildTargets) : un pool encore peu différencié
  // retombait quasi au hasard, sans lien avec l'EV connue. À la place : même mécanique que
  // _weightedTopPick (softmax, même température — donc pilotée par le même curseur "EV optimale"
  // du panneau de style), sur scoreFn + regret cumulé (voir _regretNudge) plutôt que scoreFn seul —
  // toujours ancré sur l'EV, le regret vient seulement l'affiner.
  _regretMatchPick(hero, key, candidates, scoreFn, enemies, allies, temperature = null) {
    if (!candidates.length) return null;
    const evMap = {};
    candidates.forEach(id => { evMap[id] = scoreFn(id); });

    const chosen = this._weightedTopPick(
      candidates,
      id => evMap[id] + this._regretNudge(hero, key, id, enemies, allies),
      candidates.length,
      temperature
    );

    this._updateRegret(hero, key, evMap, chosen, enemies, allies);
    return chosen;
  }

  // Transforme une constante FIXE de BOT_DEFAULT_PARAMS en préférence apprise PAR HÉROS : au lieu
  // d'un seul chaseDistWeight/atkRoleMageBonus/etc. partagé par tout le roster, chaque héros choisit
  // (une fois par partie, comme starterSellPolicy — un style cohérent sur toute la partie, pas un
  // tremblement décision par décision) un multiplicateur autour du défaut, par EV+regret réels.
  // 0.6x-1.6x : assez large pour un vrai changement de comportement (ex. un héros qui apprend à
  // chasser beaucoup plus/moins agressivement que le reste du roster), borné pour rester plausible.
  // Mémorisé sur l'instance du héros (remise à zéro naturelle : nouvelle instance à chaque partie).
  _learnedWeight(hero, paramName, enemies, allies) {
    if (!hero._learnedWeights) hero._learnedWeights = {};
    if (hero._learnedWeights[paramName] === undefined) {
      const base = this.params[paramName];
      const key = 'weightMult:' + paramName;
      const mult = this._regretMatchPick(
        hero, key, LEARNED_WEIGHT_MULTIPLIERS,
        m => this._decisionEV(hero, key, String(m), enemies, allies),
        enemies, allies
      );
      hero._learnedWeights[paramName] = base * mult;
      this._recordDecision(hero, key, String(mult));
    }
    return hero._learnedWeights[paramName];
  }

  // Winrate réel + confiance pour (héros, objet), tiré de js/stats.js heroItems — ventilé par
  // contexte adverse + allié + rune équipée, avec repli hiérarchique (voir
  // _itemBucketPriorityList) tant qu'il n'y a pas assez de données au niveau le plus précis.
  // `null` si même l'agrégat est sous le seuil minimum.
  _historicalItemStats(hero, itemId, enemies, allies = []) {
    if (typeof Stats === 'undefined') return null;
    let data;
    try { data = Stats.getData(); } catch (e) { return null; }
    const root = data && data.heroItems && data.heroItems[hero.id] && data.heroItems[hero.id][itemId];
    if (!root) return null;

    const p = this.params;
    const found = this._bestBucketEntry(root, this._itemBucketPriorityList(enemies, allies, hero.runeId), p.itemHistoryMinSample);
    if (!found) return null;

    return {
      winrate: found.entry.wins / found.entry.picks,
      confidence: Math.min(1, found.entry.picks / p.itemHistoryConfidentSample),
      picks: found.entry.picks,
      context: found.context,
    };
  }

  // EV de synergie entre `itemId` et chacun des objets déjà possédés par ce héros (ownedItemIds) :
  // winrate observé des parties où ce héros avait les DEUX objets en même temps, moyenné sur tous
  // les objets déjà en poche. Fait dépendre le score d'un objet du reste du build, pas juste du
  // matchup — sans données sur AUCUNE paire, contribution nulle (pas d'a priori). Chaque paire est
  // pondérée par SA PROPRE confiance (grandit avec son échantillon, plus rare qu'un objet seul —
  // voir itemSynergyConfidentSample), donc l'influence de la synergie grandit progressivement à
  // mesure que des paires spécifiques accumulent des parties.
  _itemSynergyEV(hero, itemId, ownedItemIds) {
    if (typeof Stats === 'undefined' || !ownedItemIds || !ownedItemIds.length) return 0;
    let data;
    try { data = Stats.getData(); } catch (e) { return 0; }
    const root = data && data.heroItemPairs && data.heroItemPairs[hero.id];
    if (!root) return 0;

    const p = this.params;
    let total = 0, count = 0;
    for (const ownedId of ownedItemIds) {
      if (ownedId === itemId) continue;
      const pairKey = itemId < ownedId ? `${itemId}|${ownedId}` : `${ownedId}|${itemId}`;
      const entry = root[pairKey];
      if (!entry || entry.picks < p.itemSynergyMinSample) continue;
      const winrate = entry.wins / entry.picks;
      const confidence = Math.min(1, entry.picks / p.itemSynergyConfidentSample);
      total += (winrate - 0.5) * p.itemSynergyScoreScale * confidence;
      count++;
    }
    return count ? total / count : 0;
  }

  // EV de contre entre `itemId` et chacun des objets tier≥3 possédés par l'équipe ADVERSE
  // (enemyItemIds — voir heroItemCounters/js/stats.js recordGameEnd) : même principe que
  // _itemSynergyEV, mais côté adversaire plutôt que côté propre build — capture qu'un objet peut
  // être fort spécifiquement CONTRE un autre objet précis (perforation d'armure vs un objet
  // HP/armure adverse, RM vs un objet AP adverse...), au-delà du profil AD/AP agrégé de l'équipe
  // (déjà couvert par les buckets de matchup, voir _matchupBuckets/_teamContext). Sans données sur
  // AUCUN contre, contribution nulle — même prudence que la synergie.
  _itemCounterEV(hero, itemId, enemyItemIds) {
    if (typeof Stats === 'undefined' || !enemyItemIds || !enemyItemIds.length) return 0;
    let data;
    try { data = Stats.getData(); } catch (e) { return 0; }
    const root = data && data.heroItemCounters && data.heroItemCounters[hero.id] && data.heroItemCounters[hero.id][itemId];
    if (!root) return 0;

    const p = this.params;
    let total = 0, count = 0;
    for (const enemyItemId of enemyItemIds) {
      const entry = root[enemyItemId];
      if (!entry || entry.picks < p.itemCounterMinSample) continue;
      const winrate = entry.wins / entry.picks;
      const confidence = Math.min(1, entry.picks / p.itemCounterConfidentSample);
      total += (winrate - 0.5) * p.itemCounterScoreScale * confidence;
      count++;
    }
    return count ? total / count : 0;
  }

  // ============================================================
  // RUNES — même principe que les objets : EV historique par héros + bonus d'exploration,
  // aucune formule écrite à la main.
  // ============================================================

  // enemies/allies : héros déjà draftés de chaque côté (typeIds résolus en HERO_TYPES[...] par
  // l'appelant) — au moment du pick, les équipes ne sont pas forcément complètes, mais les picks
  // déjà connus suffisent à esquisser un contexte (ratio AD/AP), affiné au fil du draft.
  _pickRuneForHero(hero, enemies = [], allies = []) {
    const runeIds = Object.keys(RUNES);
    if (!runeIds.length) return null;
    return this._weightedTopPick(
      runeIds, id => this._scoreRuneForHero(RUNES[id], hero, enemies, allies), runeIds.length,
      this.params.runePickTemperature
    );
  }

  // Même principe que _scoreItemForHero, sans le volet synergie (une seule rune à la fois, pas de
  // "reste du build" à considérer) : EV à 0 par défaut, monte avec l'échantillon observé (ventilé
  // par contexte adverse ET allié), bonus d'exploration.
  _scoreRuneForHero(rune, hero, enemies = [], allies = []) {
    const p = this.params;
    const hist = this._historicalRuneStats(hero, rune.id, enemies, allies);
    const picks = hist ? hist.picks : 0;

    const learnedEV = hist ? (hist.winrate - 0.5) * p.runeHistoryScoreScale * hist.confidence : 0;
    const explorationBonus = p.runeExplorationWeight / Math.sqrt(picks + 1);

    return learnedEV + explorationBonus;
  }

  _historicalRuneStats(hero, runeId, enemies, allies = []) {
    if (typeof Stats === 'undefined') return null;
    let data;
    try { data = Stats.getData(); } catch (e) { return null; }
    const root = data && data.heroRunes && data.heroRunes[hero.id] && data.heroRunes[hero.id][runeId];
    if (!root) return null;

    const p = this.params;
    const found = this._bestBucketEntry(root, this._bucketKeyList(this._matchupBuckets(enemies, allies)), p.runeHistoryMinSample);
    if (!found) return null;

    return {
      winrate: found.entry.wins / found.entry.picks,
      confidence: Math.min(1, found.entry.picks / p.runeHistoryConfidentSample),
      picks: found.entry.picks,
      context: found.context,
    };
  }

  // ============================================================
  // SPELLS
  // ============================================================

  // timing : 'early' (avant mouvement) ou 'late' (après mouvement) — voir les deux appels dans
  // executeTurn(). Sert à la fois à enregistrer quand un sort a été lancé (pour corréler avec la
  // victoire) et, pour "early", à décider de le garder en réserve si l'historique montre que ce
  // sort a mieux marché plus tard dans le tour pour ce héros.
  async _decideCastSpells(timing = 'early') {
    const hero = this.game.currentHero;
    if (!hero) return;
    if (this._neuralNet) return this._decideCastSpellsNeural(timing);

    const p = this.params;
    const g = this.game;
    const enemies = g._getEnemies(hero.playerIdx).filter(e => e.isAlive);
    const allies = g._getAllies(hero.playerIdx).filter(a => a !== hero && a.isAlive);

    // Kill confirmé disponible ce tour (AA restantes + sorts dispo, vraies formules) : dans ce cas
    // on ordonne les sorts de dégâts par efficacité (dégâts/mana) sur la cible de focus plutôt que
    // dans l'ordre de déclaration — sécurise le kill au moindre coût, laissant plus de mana pour
    // la suite du combat au lieu de le vider avec un sort inefficace lancé en premier par hasard.
    const focusTarget = this._focusTarget;
    const goingForKill = !!(focusTarget && this._canLikelyKillThisTurn(hero, focusTarget));

    // Un sort qui contrôle/débuffe (voir js/heroes.js `effects`) a presque toujours intérêt à
    // partir AVANT les sorts de dégâts purs : un stun/mute garantit que la suite du combo atterrit,
    // un shred/malediction/hémorragie amplifie ce qui suit — jamais l'inverse. Règle générique par
    // TYPE d'effet, pas par héros (voir _scoreSpellOnEnemy pour le même vocabulaire d'effets).
    const CONTROL_EFFECT_TYPES = new Set(['stun', 'mute', 'slow', 'hemorrhage', 'malediction', 'mr_shred']);
    const hasControlEffect = (spell) => (spell.effects || []).some(e => CONTROL_EFFECT_TYPES.has(e.type));

    // Ordre du combo : PONDÉRÉ, pas figé en paliers absolus. Auparavant "buff d'AA toujours
    // strictement avant contrôle/débuff toujours strictement avant tout le reste" — une règle en
    // dur qui interdisait structurellement d'apprendre qu'un CC-puis-buff peut parfois valoir mieux
    // qu'un buff-puis-CC (sécuriser la fenêtre de kill avant de s'engager sur le bonus, par ex.).
    // Les trois raisons mécaniques restent des poids par défaut FORTS (protéger le combo
    // buff+attaque contre une panne de mana, faire atterrir la suite via un CC, sécuriser un kill
    // au moindre coût) — mais ce sont des poids qu'une préférence apprise (comboFirstPick, EV +
    // regret) peut désormais dépasser avec assez de preuves, pas un verrou absolu. Poids par défaut
    // à recalibrer via sim/tune.js plutôt qu'à la main si l'équilibre ne convient pas.
    const scoreSpellOrder = (spell) => {
      let s = 0;
      if (this._isAABuffSpell(spell)) s += p.comboBuffPriorityWeight;
      if (hasControlEffect(spell)) s += p.comboControlPriorityWeight;
      if (goingForKill) {
        s += (this._estimateDamage(spell, hero, focusTarget) / Math.max(1, spell.manaCost)) * p.comboKillEfficiencyWeight;
      }
      // EV apprise de "quel sort a historiquement le mieux payé à être lancé en premier" pour CE
      // héros — comble (et peut renverser) ce que les poids mécaniques ci-dessus ne tranchent pas
      // seuls, sans avoir à coder la synergie précise de chaque kit à la main.
      s += this._decisionEV(hero, 'comboFirstPick', spell.id, enemies, allies)
         + this._regretNudge(hero, 'comboFirstPick', spell.id, enemies, allies);
      return s;
    };
    const orderedSpells = [...hero.spells].sort((a, b) => scoreSpellOrder(b) - scoreSpellOrder(a));

    for (const spell of orderedSpells) {
      if (this.game.actionsUsed >= MAX_ACTIONS) break;
      // Le héros peut mourir entre deux sorts (riposte, DOT...) — arrêter la boucle plutôt que
      // de continuer sur un héros mort (position nulle plus loin dans la chaîne d'appels).
      if (!hero.isAlive || g.currentHero !== hero) break;
      // Réactivation du Rappel Solo : autorisée même en cooldown (retour au spawn)
      const isRecallReactivation = spell.id === 'solo_recall' && hero.soloRecallActive;
      if (!isRecallReactivation) {
        if (hero.cooldowns[spell.id] > 0) continue;
        if (hero.currentMana < spell.manaCost) continue;
      }
      if (hero.mutedThisTurn) continue;

      // Un sort gardé en réserve (voir 'hold' ci-dessous) le reste pour TOUT le tour, pas juste la
      // phase early : sans ce garde-fou, la décision de le garder serait aussitôt annulée par
      // l'appel 'late' qui, lui, tente toujours de caster sans repasser par ce choix.
      if (hero._heldSpellsThisTurn && hero._heldSpellsThisTurn.has(spell.id)) continue;

      // Timing piloté par EV, DONT NE PLUS RIEN LANCER DU TOUT ce tour ('hold') : un sort qui
      // n'apporte rien dans cette situation (mauvaise cible, pas de fenêtre profitable, ressource à
      // économiser pour plus tard dans la partie) peut être appris comme mieux gardé en réserve —
      // pas juste "maintenant vs plus tard dans le même tour", mais "pas du tout ce tour-ci". Les
      // sorts qui boostent l'attaque restent exemptés (raison mécanique : partir en premier ou pas
      // du tout, jamais "en réserve" au risque de perdre le combo buff+attaque).
      if (timing === 'early' && !this._isAABuffSpell(spell)) {
        const key = 'spellTiming:' + spell.id;
        const earlyEV = this._decisionEV(hero, key, 'early', enemies, allies)
                       + this._regretNudge(hero, key, 'early', enemies, allies);
        const lateEV  = this._decisionEV(hero, key, 'late', enemies, allies)
                       + this._regretNudge(hero, key, 'late', enemies, allies);
        const holdEV  = this._decisionEV(hero, key, 'hold', enemies, allies)
                       + this._regretNudge(hero, key, 'hold', enemies, allies);
        if (holdEV > earlyEV + 5 && holdEV > lateEV + 5) {
          if (!hero._heldSpellsThisTurn) hero._heldSpellsThisTurn = new Set();
          hero._heldSpellsThisTurn.add(spell.id);
          this._recordDecision(hero, key, 'hold');
          this._updateRegretForKey(hero, key, ['early', 'late', 'hold'], 'hold', enemies, allies);
          continue;
        }
        if (lateEV > earlyEV + 5) continue; // marge : ne pas swapper pour un écart insignifiant
      }

      this._castBestSpell(spell);
      if (this.game.spellsUsed[spell.id]) {
        this._recordDecision(hero, 'spellTiming:' + spell.id, timing);
        this._updateRegretForKey(hero, 'spellTiming:' + spell.id, ['early', 'late', 'hold'], timing, enemies, allies);
        // Premier sort non-buff réellement lancé CE tour (early OU late, d'où le flag sur le
        // héros plutôt qu'une variable locale à cet appel) : c'est le choix d'ouverture de combo
        // dont on veut corréler l'EV — voir le tiebreak comboFirstPick plus haut dans le tri.
        if (!this._isAABuffSpell(spell) && !hero._comboFirstRecorded) {
          hero._comboFirstRecorded = true;
          this._recordDecision(hero, 'comboFirstPick', spell.id);
          this._trackLocalOutcome(hero, 'comboFirstPick', spell.id, enemies, allies);
          const nonBuffSpellIds = hero.spells.filter(s => !this._isAABuffSpell(s)).map(s => s.id);
          this._updateRegretForKey(hero, 'comboFirstPick', nonBuffSpellIds, spell.id, enemies, allies);
        }
        await this._delay(100);
        this.onSync();
      }
    }
  }

  // Un sort qui renforce la prochaine attaque de base (Skjer W, Grolith Q, Layia Q, Sinys Q, Pibot W...)
  // ou sa portée d'attaque ce tour (Layia W "Vision", layiaBonusPO) : dans les deux cas, un sort à
  // caster AVANT d'attaquer sous peine de perdre tout son intérêt ce tour-ci (portée manquée ou
  // bonus de dégâts perdu) — sans layiaBonusPO ici, Vision n'était pas priorisée par le tri de
  // _decideCastSpells et pouvait être castée trop tard (ou son mana consommé par un autre sort
  // avant), ratant le poke à distance qu'elle est censée permettre.
  _isAABuffSpell(spell) {
    return !!spell.empoweredAttack || !!spell.bonusNextAttackAP || !!spell.sinysQ || spell.targetType === 'pibot_w' || !!spell.layiaBonusPO;
  }

  _castBestSpell(spell) {
    const g = this.game;
    const hero = g.currentHero;

    // Rappel du Solo : logique dédiée (surnombre), gérée à part
    if (spell.targetType === 'solo_recall') {
      this._handleSoloRecall(spell);
      return;
    }

    // Sorts utiles même sans ennemi vivant (invocation, repositionnement, sauvetage d'allié)
    const noEnemyNeeded = ['self', 'no_target', 'pm_sacrifice', 'pibot_w', 'noyala_q', 'faena_w', 'swap_ally'];
    const enemies = g._getEnemies(hero.playerIdx);
    if (!enemies.length && !noEnemyNeeded.includes(spell.targetType)) return;

    // Sorts à ciblage complexe (zones spéciales, glyphes, swaps, dashes utilitaires) : logique dédiée
    const complexTypes = [
      'place_glyph', 'wind_glyph', 'bomb_zone', 'hate_wall', 'lame_eau',
      'pibot_r', 'noyala_q', 'noyala_r', 'abyss_w', 'abyss_r',
      'faena_w', 'faena_r', 'swap_ally', 'stealth_dash',
      'velna_q', 'velna_w', 'velna_r'
    ];
    if (complexTypes.includes(spell.targetType)) {
      this._castComplexSpell(spell, enemies);
      return;
    }

    let target = null;

    if (['self', 'no_target', 'pm_sacrifice', 'pibot_w'].includes(spell.targetType)) {
      // Sorts sans cible : toujours caster
      target = null;
    } else if (spell.targetType === 'enemy_hero' || spell.targetType === 'swap_enemy') {
      // Cible l'ennemi le plus proche/menaçant — priorité à la cible de focus du tour
      // pour ne pas disperser les dégâts sur plusieurs héros différents.
      // Exclut les cibles qui feraient échouer le sort (mana perdu pour rien) : condition de
      // PV max supérieurs (ex. Frigiel R) ou ligne droite stricte requise (ex. Stank Filet).
      const inRange = enemies.filter(e =>
        e.isAlive && e.position &&
        g._manhattan(hero.position, e.position) <= spell.range &&
        g._hasLineOfSight(hero.position, e.position) &&
        (!spell.conditionHigherHP || e.maxHP > hero.maxHP) &&
        (!spell.requiresLine || e.position.x === hero.position.x || e.position.y === hero.position.y)
      );
      if (inRange.length > 0) {
        const best = (this._focusTarget && inRange.includes(this._focusTarget))
          ? this._focusTarget
          : inRange.reduce((a, b) =>
              this._scoreSpellOnEnemy(spell, a) < this._scoreSpellOnEnemy(spell, b) ? b : a
            );
        if (this._scoreSpellOnEnemy(spell, best) > 0.1) {
          target = { hero: best };
        }
      }
    } else if (['zone', 'diamond_zone', 'line_zone', 'cone_zone', 'cell'].includes(spell.targetType)) {
      // Zones : trouver la meilleure cellule
      const reachable = g.getReachableCells();
      let bestCell = null;
      let bestEnemyCount = 0;

      for (const cell of reachable) {
        if (g._manhattan(hero.position, cell) > spell.range) continue;

        let hitCount = 0;
        for (const e of enemies) {
          if (!e.isAlive || !e.position) continue;
          if (g._manhattan(cell, e.position) <= 1) hitCount++;
        }

        if (hitCount > bestEnemyCount) {
          bestEnemyCount = hitCount;
          bestCell = cell;
        }
      }

      if (bestEnemyCount > 0 && bestCell) {
        target = { x: bestCell.x, y: bestCell.y };
      }
    } else if (spell.targetType === 'push_enemy') {
      // Push : trouver ennemi + direction
      const inRange = enemies.filter(e =>
        e.isAlive && e.position &&
        g._manhattan(hero.position, e.position) <= spell.range
      );
      if (inRange.length > 0) {
        const enemy = inRange[0];
        const dx = enemy.position.x > hero.position.x ? 1 : enemy.position.x < hero.position.x ? -1 : 0;
        const dy = enemy.position.y > hero.position.y ? 1 : enemy.position.y < hero.position.y ? -1 : 0;
        target = { hero: enemy, dx, dy };
      }
    } else if (spell.targetType === 'ally_hero') {
      // Heal allies
      const allies = g._getAllies(hero.playerIdx).filter(a =>
        a !== hero && a.isAlive && this._hpPct(a) < 0.7
      );
      if (allies.length > 0) {
        const lowestHp = allies.reduce((a, b) => a.currentHP < b.currentHP ? a : b);
        target = { hero: lowestHp };
      }
    } else if (spell.targetType === 'dash_to_enemy') {
      // Dash : cible ennemi proche
      const inRange = enemies.filter(e =>
        e.isAlive && e.position &&
        g._manhattan(hero.position, e.position) <= spell.range
      );
      if (inRange.length > 0) {
        target = { hero: inRange[0] };
      }
    }

    if (target !== null || ['self', 'no_target', 'pm_sacrifice', 'pibot_w'].includes(spell.targetType)) {
      try {
        g.castSpell(spell, target);
      } catch (e) {
        // Sort échoué silencieusement
      }
    }
  }

  // ============================================================
  // SORTS COMPLEXES — glyphes, zones spéciales, swaps, dashes utilitaires
  // Réutilise g.getSpellTargets(spell), la source de vérité du moteur pour la légalité
  // (portée, ligne droite/exacte, murs, cases libres) — le bot ne fait que choisir/scorer parmi
  // les candidats déjà légaux, sans redupliquer les règles de portée.
  // ============================================================

  _castComplexSpell(spell, enemies) {
    const g = this.game;
    const hero = g.currentHero;
    const t = g.getSpellTargets(spell); // { heroes, heroesOutOfRange, cells }

    try {
      switch (spell.targetType) {
        // Velna Q/W/R n'avaient AUCUN gestionnaire (ni générique ni complexe) : targetType custom
        // ('velna_q'/'velna_w'/'velna_r') absent partout dans _castBestSpell, donc `target` restait
        // toujours null et g.castSpell n'était JAMAIS appelé — Velna ne lançait tout simplement
        // aucun de ses 3 sorts, quelle que soit la situation (bug trouvé en lisant le dispatch, pas
        // juste une question de placement/portée).
        case 'velna_q': {
          // Chaque cellule candidate (t.cells) est un point d'atterrissage du dash (1-2 cases,
          // direction déjà validée/bloquée par getSpellTargets). Dégâts en ligne (1-5 cases
          // au-delà) + zone 1-3-1 (7 cases au-delà), toutes deux dans la direction du dash depuis
          // l'atterrissage (voir game.js castSpell 'velna_q') — pas reproductible via _bestZoneCell
          // (deux zones de forme différente à additionner), calcul dédié.
          let bestCell = null, bestScore = -1;
          for (const cell of t.cells) {
            const dx = Math.sign(cell.x - hero.position.x), dy = Math.sign(cell.y - hero.position.y);
            let score = 0;
            for (let s = 1; s <= 5; s++) {
              const e = g.getHeroAt(cell.x + dx * s, cell.y + dy * s);
              if (e && e.playerIdx !== hero.playerIdx && e.isAlive) score++;
            }
            const zx = cell.x + dx * 7, zy = cell.y + dy * 7;
            score += enemies.filter(e => e.isAlive && e.position && g._manhattan({ x: zx, y: zy }, e.position) <= 1).length;
            if (score > bestScore) { bestScore = score; bestCell = cell; }
          }
          if (bestCell && bestScore > 0) g.castSpell(spell, { x: bestCell.x, y: bestCell.y });
          return;
        }
        case 'velna_w': {
          // Cible = point de visée exact à spell.range cases (orthogonal strict), PAS une des 2
          // cellules perpendiculaires que getSpellTargets liste aussi (info seulement — le moteur
          // rejette toute cible qui n'est pas exactement à distance spell.range en ligne droite,
          // voir game.js castSpell 'velna_w'). Score = ennemis dans la bande perpendiculaire de 3
          // cases centrée sur ce point.
          const dirs = [{ dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: -1 }];
          let bestCell = null, bestScore = -1;
          for (const { dx, dy } of dirs) {
            const cx = hero.position.x + dx * spell.range, cy = hero.position.y + dy * spell.range;
            if (!t.cells.some(c => c.x === cx && c.y === cy)) continue; // hors carte / bloqué
            const perpDx = dy !== 0 ? 1 : 0, perpDy = dx !== 0 ? 1 : 0;
            let score = 0;
            for (let off = -1; off <= 1; off++) {
              const e = g.getHeroAt(cx + perpDx * off, cy + perpDy * off);
              if (e && e.playerIdx !== hero.playerIdx && e.isAlive) score++;
            }
            if (score > bestScore) { bestScore = score; bestCell = { x: cx, y: cy }; }
          }
          if (bestCell && bestScore > 0) g.castSpell(spell, bestCell);
          return;
        }
        case 'velna_r': {
          // Rayon traversant toute la carte dans une direction : la cible ne fait que fixer la
          // DIRECTION (le moteur retrace la ligne depuis la position actuelle du héros, voir
          // game.js castSpell 'velna_r'), donc n'importe quelle cellule légale de la direction
          // choisie convient — on groupe les cellules déjà fournies par direction plutôt que de
          // reparcourir la carte nous-mêmes.
          const groups = {};
          for (const cell of t.cells) {
            const key = Math.sign(cell.x - hero.position.x) + ',' + Math.sign(cell.y - hero.position.y);
            if (!groups[key]) groups[key] = { anyCell: cell, score: 0 };
            const e = g.getHeroAt(cell.x, cell.y);
            if (e && e.playerIdx !== hero.playerIdx && e.isAlive) groups[key].score++;
          }
          let best = null;
          for (const key in groups) if (!best || groups[key].score > best.score) best = groups[key];
          if (best && best.score > 0) g.castSpell(spell, { x: best.anyCell.x, y: best.anyCell.y });
          return;
        }
        case 'place_glyph': {
          // Glyphe de douleur : zone qui punit les ennemis qui y stationnent/passent
          // Glyphe ultime : attire les ennemis à ≤6 cases vers le centre
          const radius = spell.glyphType === 'ultimate' ? 6 : (spell.glyphZoneSize ?? 2);
          const { cell, count } = this._bestZoneCell(t.cells, radius, enemies);
          if (cell && count > 0) g.castSpell(spell, { x: cell.x, y: cell.y });
          return;
        }
        case 'wind_glyph':
        case 'lame_eau':
        case 'pibot_r':
        case 'faena_r': {
          const { cell, count } = this._bestZoneCell(t.cells, 1, enemies);
          if (cell && count > 0) g.castSpell(spell, { x: cell.x, y: cell.y });
          return;
        }
        case 'bomb_zone': {
          const { cell, count } = this._bestZoneCell(t.cells, 2, enemies);
          if (cell && count > 0) g.castSpell(spell, { x: cell.x, y: cell.y });
          return;
        }
        case 'abyss_w': {
          const { cell, count } = this._bestZoneCell(t.cells, 3, enemies);
          if (cell && count > 0) g.castSpell(spell, { x: cell.x, y: cell.y });
          return;
        }
        case 'hate_wall': {
          // Défensif uniquement : bloquer la ligne de vue d'un ennemi proche et menaçant
          if (!t.cells.length || !enemies.length) return;
          const nearestEnemy = enemies.reduce((a, b) =>
            g._manhattan(hero.position, a.position) < g._manhattan(hero.position, b.position) ? a : b
          );
          if (g._manhattan(hero.position, nearestEnemy.position) > 6 || this._hpPct(hero) > 0.7) return;
          const best = t.cells.reduce((a, b) =>
            g._manhattan(a, nearestEnemy.position) < g._manhattan(b, nearestEnemy.position) ? a : b
          );
          g.castSpell(spell, { x: best.x, y: best.y });
          return;
        }
        case 'noyala_q': {
          // Invocation vers le front si en bonne santé (pression), vers l'arrière sinon (prépare un swap défensif)
          if (!t.cells.length) return;
          const aggressive = this._hpPct(hero) >= 0.4 && enemies.length > 0;
          const ref = enemies.length ? enemies.reduce((a, b) =>
            g._manhattan(hero.position, a.position) < g._manhattan(hero.position, b.position) ? a : b
          ) : null;
          const best = ref
            ? t.cells.reduce((a, b) => {
                const da = g._manhattan(a, ref.position), db = g._manhattan(b, ref.position);
                return aggressive ? (da < db ? a : b) : (da > db ? a : b);
              })
            : t.cells[0];
          g.castSpell(spell, { x: best.x, y: best.y });
          return;
        }
        case 'noyala_r': {
          // Échange avec un loup : fuite (HP bas) vers le loup le plus loin des ennemis,
          // sinon engage vers le loup le plus proche — seulement si ça améliore vraiment la position
          if (!t.cells.length) return;
          const retreat = this._hpPct(hero) < 0.4;
          if (!enemies.length) return;
          const distToEnemies = (pos) => enemies.reduce((m, e) => Math.min(m, g._manhattan(pos, e.position)), Infinity);
          const best = t.cells.reduce((a, b) => {
            const da = distToEnemies(a), db = distToEnemies(b);
            return retreat ? (da > db ? a : b) : (da < db ? a : b);
          });
          const bestDist = distToEnemies(best);
          const curDist  = distToEnemies(hero.position);
          if (retreat ? bestDist <= curDist : bestDist >= curDist) return;
          g.castSpell(spell, { x: best.x, y: best.y });
          return;
        }
        case 'abyss_r': {
          if (!t.heroes.length) return;
          const best = (this._focusTarget && t.heroes.includes(this._focusTarget))
            ? this._focusTarget
            : t.heroes.reduce((a, b) => this._scoreSpellOnEnemy(spell, a) < this._scoreSpellOnEnemy(spell, b) ? b : a);
          if (this._scoreSpellOnEnemy(spell, best) > 0.1) g.castSpell(spell, { hero: best });
          return;
        }
        case 'faena_w': {
          // Repositionnement gratuit (pas de PM consommé) pour se rapprocher de la cible de focus
          if (!t.cells.length || !enemies.length) return;
          const ref = (this._focusTarget && this._focusTarget.position) ? this._focusTarget : enemies.reduce((a, b) =>
            g._manhattan(hero.position, a.position) < g._manhattan(hero.position, b.position) ? a : b
          );
          if (!ref.position) return;
          const curDist = g._manhattan(hero.position, ref.position);
          if (curDist <= this._effectivePO(hero)) return; // déjà à portée, inutile de bouger
          const best = t.cells.reduce((a, b) =>
            g._manhattan(a, ref.position) < g._manhattan(b, ref.position) ? a : b
          );
          if (g._manhattan(best, ref.position) < curDist) g.castSpell(spell, { x: best.x, y: best.y });
          return;
        }
        case 'swap_ally': {
          // Sauvetage uniquement : allié bas en vie et actuellement en danger
          if (!t.heroes.length) return;
          let bestAlly = null, bestUrgency = -Infinity;
          for (const ally of t.heroes) {
            if (!ally.position) continue;
            const hpPct = this._hpPct(ally);
            if (hpPct >= 0.35) continue;
            const nearbyThreat = enemies.some(e => e.position && g._manhattan(ally.position, e.position) <= 2);
            if (!nearbyThreat) continue;
            const urgency = 1 - hpPct;
            if (urgency > bestUrgency) { bestUrgency = urgency; bestAlly = ally; }
          }
          if (bestAlly) g.castSpell(spell, { hero: bestAlly });
          return;
        }
        case 'stealth_dash': {
          if (!t.cells.length) return;
          if (!spell.noDamageOnLand) {
            // Dash offensif : atterrir au contact du maximum d'ennemis (chebyshev ≤1, comme le moteur)
            const { cell, count } = this._bestZoneCell(t.cells, 1, enemies, (a, b) => g._chebyshev(a, b));
            if (cell && count > 0) g.castSpell(spell, { x: cell.x, y: cell.y });
          } else {
            // Dash utilitaire (ex. Layia) : se rapprocher de la cible de focus
            const ref = this._focusTarget;
            if (!ref || !ref.position) return;
            const curDist = g._manhattan(hero.position, ref.position);
            const best = t.cells.reduce((a, b) =>
              g._manhattan(a, ref.position) < g._manhattan(b, ref.position) ? a : b
            );
            if (g._manhattan(best, ref.position) < curDist) g.castSpell(spell, { x: best.x, y: best.y });
          }
          return;
        }
      }
    } catch (e) {
      // Sort échoué silencieusement, comme le reste du bot
    }
  }

  // Meilleure cellule parmi les candidats légaux, selon le nombre d'ennemis touchés dans le rayon donné
  _bestZoneCell(cells, radius, enemies, metric) {
    const g = this.game;
    const dist = metric || ((a, b) => g._manhattan(a, b));
    let bestCell = null;
    let bestCount = 0;
    for (const cell of cells) {
      let count = 0;
      for (const e of enemies) {
        if (!e.isAlive || !e.position) continue;
        if (dist(cell, e.position) <= radius) count++;
      }
      if (count > bestCount) { bestCount = count; bestCell = cell; }
    }
    return { cell: bestCell, count: bestCount };
  }

  _scoreSpellOnEnemy(spell, enemy) {
    if (!enemy.isAlive) return 0;
    const p = this.params;
    const hero = this.game.currentHero;
    const dmg = this._estimateDamage(spell, hero, enemy);
    const effectiveHP = enemy.currentHP + (enemy.shield || 0);
    const g = this.game;
    const spEnemies = g._getEnemies(hero.playerIdx), spAllies = g._getAllies(hero.playerIdx).filter(a => a !== hero && a.isAlive);

    // Score = dégâts / vie restante — mais un sort à 0 dégât n'est pas forcément inutile (CC/debuffs
    // purs : voir la valeur d'utilité ci-dessous). Ne PAS retourner 0 avant de l'avoir comptée,
    // sinon aucun sort purement utilitaire ne peut jamais dépasser le seuil de cast (>0.1) dans
    // _castBestSpell et reste invisible pour le bot pour toujours.
    let score = dmg > 0 ? dmg / Math.max(1, effectiveHP) : 0;

    // Bonus kill proche (seulement significatif si le sort inflige réellement des dégâts)
    if (dmg > 0) {
      if (dmg >= effectiveHP) return 100;
      if (dmg >= effectiveHP * 0.5) return 50;
    }

    // Valeur d'utilité des effets déclarés sur le sort (voir js/heroes.js `effects`) — générique
    // par type d'effet plutôt que par héros, pour que les sorts de CC/debuff comptent pour ce
    // qu'ils apportent réellement (contrôle, réduction de soins/RM, portée) et pas seulement pour
    // leurs dégâts bruts, souvent nuls ou secondaires sur ce type de sort.
    // Poids par défaut, mais appris PAR HÉROS (voir _learnedWeight) : un héros dont l'équipe compte
    // déjà beaucoup de CC peut apprendre à moins valoriser encore du contrôle, un autre à fond sur
    // le contrôle plutôt que les dégâts bruts, etc. — pas un jugement uniforme pour tout le roster.
    for (const eff of (spell.effects || [])) {
      if (eff.type === 'stun')             score += this._learnedWeight(hero, 'spellEffectStunValue', spEnemies, spAllies);
      else if (eff.type === 'mute')        score += this._learnedWeight(hero, 'spellEffectMuteValue', spEnemies, spAllies);
      else if (eff.type === 'slow')        score += this._learnedWeight(hero, 'spellEffectSlowValue', spEnemies, spAllies);
      else if (eff.type === 'hemorrhage')  score += this._learnedWeight(hero, 'spellEffectHemorrhageValue', spEnemies, spAllies);
      else if (eff.type === 'malediction') score += this._learnedWeight(hero, 'spellEffectMaledictionValue', spEnemies, spAllies);
      else if (eff.type === 'mr_shred')    score += this._learnedWeight(hero, 'spellEffectMrShredValue', spEnemies, spAllies);
    }

    // Cible mal placée (isolée) : plus intéressante à punir qu'un ennemi groupé
    if (this._isIsolated(enemy)) score += this._learnedWeight(hero, 'spellIsolatedBonus', spEnemies, spAllies);

    return score;
  }

  // ============================================================
  // MACRO-STRATÉGIE — phases, zones, rappel Solo
  // ============================================================

  _gamePhase() {
    const t = this.game.globalTurn || 1;
    if (t <= this.params.phaseEarlyEnd) return 'early';
    if (t <= this.params.phaseMidEnd) return 'mid';
    return 'late';
  }

  _homeZoneCells(hero) {
    const zoneId = BOT_ROLE_HOME_ZONE[hero.roleId];
    return zoneId ? this._zonesById[zoneId] : null;
  }

  _distToZone(cell, zoneCellSet) {
    if (!zoneCellSet) return 0;
    if (zoneCellSet.has(`${cell.x},${cell.y}`)) return 0;
    let min = Infinity;
    zoneCellSet.forEach(key => {
      const [zx, zy] = key.split(',').map(Number);
      const d = Math.abs(cell.x - zx) + Math.abs(cell.y - zy);
      if (d < min) min = d;
    });
    return min;
  }

  // Un ennemi est "mal placé" s'il n'a aucun allié à proximité pour le couvrir
  _isIsolated(enemy, radius = this.params.pokeIsolationRadius) {
    if (!enemy || !enemy.position) return false;
    const g = this.game;
    const allies = g._getAllies(enemy.playerIdx).filter(a => a !== enemy && a.isAlive && a.position);
    return !allies.some(a => g._manhattan(a.position, enemy.position) <= radius);
  }

  // Le héros peut-il tuer cette cible ce tour (AA restantes + sorts dispo), avec les vraies formules du moteur
  _canLikelyKillThisTurn(hero, enemy) {
    if (!enemy || !enemy.isAlive) return false;
    const g = this.game;
    const aaLeft = Math.max(0, g.autoAttacksAllowed - g.autoAttacksUsed);
    let total = this._estimateAADamage(hero, enemy) * aaLeft;
    for (const spell of hero.spells) {
      if ((hero.cooldowns[spell.id] || 0) > 0) continue;
      if (hero.currentMana < spell.manaCost) continue;
      total += this._estimateDamage(spell, hero, enemy);
    }
    return total >= (enemy.currentHP + (enemy.shield || 0));
  }

  // Cible de focus du tour : celle qui maximise l'intérêt de concentrer les dégâts dessus.
  // Priorité à un kill garanti (avec les vraies formules), sinon on retombe sur le scoring d'attaque existant.
  _computeFocusTarget() {
    const g = this.game;
    const hero = g.currentHero;
    if (!hero) return null;
    const enemies = g._getEnemies(hero.playerIdx).filter(e => e.isAlive && e.position);
    if (!enemies.length) return null;

    let best = null;
    let bestScore = -Infinity;
    let bestIsGuaranteedKill = false;
    for (const enemy of enemies) {
      const isKill = this._canLikelyKillThisTurn(hero, enemy);
      const score = isKill
        ? 1000 - enemy.currentHP // kill garanti : priorité, à égalité on préfère le plus facile à confirmer
        : this._scoreAttackTarget(enemy, hero);
      if (score > bestScore) { bestScore = score; best = enemy; bestIsGuaranteedKill = isKill; }
    }
    // Apprentissage du rôle à focus : un kill garanti n'a pas besoin d'être appris (déjà optimal
    // par construction) — seul le choix "arbitré" entre plusieurs cibles non-lethales vaut la peine
    // d'être corrélé à son effet réel (ex. un assassin apprend empiriquement s'il vaut mieux viser
    // le mage adverse ou le tank, plutôt que de suivre uniquement les bonus statiques de rôle).
    if (best && !bestIsGuaranteedKill) {
      const allies = g._getAllies(hero.playerIdx).filter(a => a !== hero && a.isAlive);
      const role = HERO_TYPES[best.id]?.roleId || 'unknown';
      this._recordDecision(hero, 'focusRole', role);
      this._trackLocalOutcome(hero, 'focusRole', role, enemies, allies);
      // Regret : candidats = rôles réellement présents parmi les ennemis à cet instant (dynamique,
      // pas une liste fixe — voir _updateRegretForKey pour les décisions à options fixes).
      const presentRoles = [...new Set(enemies.map(e => HERO_TYPES[e.id]?.roleId || 'unknown'))];
      this._updateRegretForKey(hero, 'focusRole', presentRoles, role, enemies, allies);
    }
    return best;
  }

  // Cible de rotation/gank pour le Roam : plutôt que de foncer sur l'ennemi le plus proche (ce qui le
  // scotche en permanence contre le roam/solo adverse près du spawn), il privilégie un ennemi isolé
  // ou une zone où ses alliés sont en infériorité/égalité numérique — sa venue y crée un vrai surnombre.
  _roamPickGankTarget(hero, enemies) {
    const g = this.game;
    if (!enemies.length) return null;

    let best = null;
    let bestScore = -Infinity;

    for (const enemy of enemies) {
      if (!enemy.position) continue;
      const alliesNear = g._getAllies(hero.playerIdx).filter(a =>
        a !== hero && a.isAlive && a.position && g._manhattan(a.position, enemy.position) <= this.params.roamGankRadius
      ).length;
      const enemiesNear = enemies.filter(e =>
        e.isAlive && e.position && g._manhattan(e.position, enemy.position) <= this.params.roamGankRadius
      ).length;

      let score = 0;
      if (this._isIsolated(enemy)) score += this.params.gankIsolatedBonus;
      if (enemiesNear <= alliesNear) score += this.params.gankFavorableBonus; // le roam n'arrive pas en infériorité locale
      if (hero.position) score -= g._manhattan(hero.position, enemy.position) * this.params.gankProximityWeight;

      if (score > bestScore) { bestScore = score; best = enemy; }
    }

    return best;
  }

  // Rappel Solo : ne sert qu'à créer un surnombre ailleurs, pas à partir sans raison
  _handleSoloRecall(spell) {
    const g = this.game;
    const hero = g.currentHero;

    if (hero.soloRecallActive) {
      // Déjà parti : rentrer si le gank est terminé (plus d'ennemi proche) ou si ça tourne mal
      const nearbyEnemies = g._getEnemies(hero.playerIdx).filter(e =>
        e.isAlive && e.position && hero.position && g._manhattan(hero.position, e.position) <= 4
      );
      const shouldReturn = nearbyEnemies.length === 0 || this._hpPct(hero) < 0.4;
      if (shouldReturn) {
        try { g.castSpell(spell, null); } catch (e) {}
      }
      return;
    }

    // Pas encore parti : verrou de tour minimum + cooldown dispo
    if (g.globalTurn < this.params.soloRecallMinTurn) return;
    if ((hero.cooldowns[spell.id] || 0) > 0) return;

    // Chercher un allié dont la lane est à égalité ou en infériorité numérique locale :
    // téléporter là-bas crée un surnombre (l'objectif), pas juste un aller-retour gratuit.
    const allies = g._getAllies(hero.playerIdx).filter(a => a !== hero && a.isAlive && a.position);
    let bestAlly = null;
    let bestGain = -1;

    for (const ally of allies) {
      const alliesNear = allies.filter(a =>
        a !== ally && g._manhattan(a.position, ally.position) <= 4
      ).length;
      const enemiesNear = g._getEnemies(hero.playerIdx).filter(e =>
        e.isAlive && e.position && g._manhattan(e.position, ally.position) <= 4
      ).length;

      if (enemiesNear === 0) continue; // rien à faire là-bas
      const gain = enemiesNear - alliesNear; // >=0 : égalité ou infériorité → le TP crée un avantage
      if (gain >= 0 && gain > bestGain) {
        bestGain = gain;
        bestAlly = ally;
      }
    }

    if (bestAlly) {
      try { g.castSpell(spell, { hero: bestAlly }); } catch (e) {}
    }
  }

  // Dégâts réels d'un sort : réutilise la formule exacte du moteur (armure/RM/pénétrations/passifs
  // d'objets inclus) quand une cible est connue ; sinon repli approximatif (ex : évaluation sans cible fixée).
  _estimateDamage(spell, hero, enemy) {
    if (!spell.baseDamage) return 0;
    if (enemy) {
      try {
        return Math.max(0, this.game._calcSpellDmg(hero, spell, enemy));
      } catch (e) {
        // repli si le calcul exact échoue pour une raison quelconque
      }
    }
    const ad = spell.adRatio ? hero.ad * spell.adRatio : 0;
    const ap = spell.apRatio ? hero.ap * spell.apRatio : 0;
    return Math.floor(spell.baseDamage + ad + ap);
  }

  // Dégâts d'attaque de base : approximation avec la vraie mitigation (armure + pénétrations),
  // sans reproduire tous les passifs spécifiques d'attaque (Layia AoE, Abyss, Tueur de Dieux, crit...).
  _estimateAADamage(hero, enemy) {
    const g = this.game;
    const armorPen = (hero.items.includes('dague_destructrice') ? 2.8 : 0)
      + (hero.items.includes('lame_tueuse_boucliers') ? 4.5 : 0)
      + (hero.items.includes('lame_du_ninja') ? 4.5 : 0)
      + (hero.items.includes('anneau_divin') ? 4.5 : 0)
      + (hero.items.includes('revolver_d_or') ? 4.5 : 0)
      + (hero.items.includes('lame_de_nargoth') ? 4.5 : 0)
      + (hero.items.includes('bottes_assassin') ? 3 : 0);
    const armorPenPct = (hero.items.includes('arc_perforant_anges') || hero.items.includes('arc_des_morts')) ? 35
      : hero.items.includes('arc_percant') ? 20 : 0;
    try {
      return Math.max(0, g._reduceDmg(hero.ad, 'physical', enemy, armorPen, 0, armorPenPct));
    } catch (e) {
      return Math.max(0, hero.ad - (enemy.armor || 0) * 0.5);
    }
  }

  // ============================================================
  // MOVEMENT
  // ============================================================

  _decideMove() {
    if (this._neuralNet) return this._decideMoveNeural();

    const g = this.game;
    const hero = g.currentHero;
    if (!hero || hero.rootTurns > 0) return;

    const reachable = g.getReachableCells();
    if (!reachable.length) return;

    const enemies = g._getEnemies(hero.playerIdx);
    const allies = g._getAllies(hero.playerIdx).filter(a => a !== hero && a.isAlive);
    let bestCell = reachable[0];
    let bestScore = this._scoreMoveCell(bestCell, hero, enemies);

    for (const cell of reachable) {
      const score = this._scoreMoveCell(cell, hero, enemies);
      if (score > bestScore) {
        bestScore = score;
        bestCell = cell;
      }
    }

    // Jitter : 10% → 3ème meilleur
    if (this._jitter()) {
      let third = reachable.filter(c => c !== bestCell)[0];
      if (third) bestCell = third;
    }

    this._recordMoveDecision(hero, bestCell, enemies, allies);
    g.moveHero(bestCell.x, bestCell.y);
  }

  // ── Infrastructure partagée par TOUTES les décisions neuronales (mouvement/sorts/achats) ──

  // Choisit un candidat parmi une liste, en évaluant chacun via `simulateFn(candidat) → score`.
  // Température 0 (défaut, vraie partie/évaluation) : argmax pur, déterministe. Température > 0
  // (auto-jeu d'entraînement — voir this._neuralExploreTemp) : tirage softmax via _weightedTopPick,
  // même mécanisme que le reste du bot (draft/objets/runes), juste réutilisé ici sur des candidats
  // arbitraires (cellules, paires sort+cible, ids d'objet) plutôt que des ids simples — on passe
  // donc leurs INDICES à _weightedTopPick et on retrouve le candidat réel après coup.
  _neuralGreedyPick(candidates, simulateFn, temperature = 0) {
    if (!candidates.length) return null;
    if (!temperature) {
      let best = candidates[0], bestScore = simulateFn(candidates[0]);
      for (let i = 1; i < candidates.length; i++) {
        const s = simulateFn(candidates[i]);
        if (s > bestScore) { bestScore = s; best = candidates[i]; }
      }
      return best;
    }
    const idx = this._weightedTopPick(
      candidates.map((_, i) => i),
      i => simulateFn(candidates[i]),
      Math.min(8, candidates.length),
      temperature
    );
    return candidates[idx];
  }

  // Clone complet et sûr de la partie en cours, pour simuler une action candidate (sort, achat)
  // SANS jamais toucher à la vraie partie : réutilise serialize()/applySerializedState(), le
  // mécanisme déjà existant et éprouvé pour la reconnexion multijoueur (voir plus bas dans ce
  // fichier) — il gère déjà correctement les pièges du clonage naïf (JSON.stringify perdrait le
  // Set `draft.banned`, dupliquerait les héros sans préserver `currentHero` comme référence vers LA
  // bonne instance clonée, etc.). Le clone est jeté après lecture du score — jamais réutilisé,
  // jamais renvoyé à l'appelant. Coût non négligeable (JSON aller-retour de tout l'état) : acceptable
  // pour un entraînement en arrière-plan, mais c'est pour ça que le mouvement (juste une position,
  // trivialement réversible) ne clone PAS et mute/restaure directement la partie réelle à la place.
  _cloneGameForSim() {
    const clone = new GameState();
    clone.applySerializedState(this.game.serialize());
    return clone;
  }

  // Un candidat de cible de sort construit sur la VRAIE partie référence les VRAIS objets héros
  // (voir _neuralSpellCandidates) — inutilisables tels quels sur un clone (ce serait manipuler/
  // muter le héros de la partie réelle par erreur pendant une simulation censée être jetable). On
  // retrouve l'équivalent du clone par instanceId (identifiant stable, préservé par
  // serialize/applySerializedState) ; une cellule {x,y} n'a pas ce problème, copiée telle quelle.
  _rehydrateSpellTarget(clone, target) {
    if (!target) return null;
    if (target.hero) {
      const all = [...clone.players[0].heroes, ...clone.players[1].heroes];
      const h = all.find(x => x && x.instanceId === target.hero.instanceId);
      return target.dx !== undefined ? { hero: h, dx: target.dx, dy: target.dy } : { hero: h };
    }
    return { x: target.x, y: target.y };
  }

  // Recherche gloutonne sur l'espace d'actions RÉELLEMENT légal (getReachableCells — la même
  // fonction que le moteur utilise pour valider un déplacement, pas un sous-ensemble de candidats
  // qu'une heuristique aurait pré-filtré) : pour chaque case atteignable, on y place TEMPORAIREMENT
  // le héros (juste une mutation de position, aucun effet de bord déclenché — piège/glyphe/etc. ne
  // sont vérifiés que par un vrai moveHero), on encode l'état résultant et on le note avec le
  // réseau de valeur, puis on restaure la position avant de tester la suivante. La case retenue est
  // celle dont l'état résultant est jugé le meilleur pour CE joueur — le réseau n'a jamais vu la
  // liste de candidats d'une formule écrite à la main, seulement "quel état a le mieux corrélé
  // avec la victoire dans les parties d'entraînement" (voir sim/nn_train.js).
  _decideMoveNeural() {
    const g = this.game;
    const hero = g.currentHero;
    if (!hero || hero.rootTurns > 0) return;

    const reachable = g.getReachableCells();
    if (!reachable.length) return;

    const enemies = g._getEnemies(hero.playerIdx);
    const allies = g._getAllies(hero.playerIdx).filter(a => a !== hero && a.isAlive);
    const originalPos = hero.position ? { x: hero.position.x, y: hero.position.y } : null;

    const bestCell = this._neuralGreedyPick(reachable, cell => {
      hero.position = { x: cell.x, y: cell.y };
      const score = this._neuralNet.predict(encodeState(g, hero.playerIdx));
      hero.position = originalPos;
      return score;
    }, this._neuralExploreTemp);

    this._recordMoveDecision(hero, bestCell, enemies, allies);
    g.moveHero(bestCell.x, bestCell.y);
  }

  // Énumère TOUS les candidats {spell, target} légaux pour un sort donné, via getSpellTargets — la
  // même fonction que le moteur utilise pour surligner les cibles valides côté UI humaine. Couvre
  // uniformément la quasi-totalité des types de sorts du jeu (cible héros, cible cellule, zones,
  // dashes, glyphes...), même les plus exotiques (Velna/Abyss/Faena/Pibot/Noyala...) : plus besoin
  // d'une énumération écrite à la main par type comme l'ancien _castComplexSpell (qui, lui, ne
  // faisait que CHOISIR une cible heuristiquement, pas les lister toutes). Seule exception :
  // push_enemy a besoin d'une direction (dx/dy) en plus de la cible — dérivée mécaniquement de la
  // position choisie (pas une décision en soi, un simple calcul), comme le fait déjà l'heuristique.
  // Un petit nombre de sorts acceptent un dx/dy OPTIONNEL en plus de la cellule (ex. wind_glyph) :
  // non exposé ici, le moteur retombe alors sur sa direction par défaut — see wind_glyph in game.js.
  _neuralSpellCandidates(spell) {
    const g = this.game;
    const hero = g.currentHero;
    const NO_TARGET_TYPES = new Set(['self', 'no_target', 'pm_sacrifice', 'pibot_w']);
    if (NO_TARGET_TYPES.has(spell.targetType)) return [null];
    if (spell.targetType === 'solo_recall' && hero.soloRecallActive) return [null];

    const info = g.getSpellTargets(spell);
    const candidates = [];
    if (spell.targetType === 'push_enemy') {
      (info.heroes || []).forEach(h => {
        const dx = h.position.x > hero.position.x ? 1 : h.position.x < hero.position.x ? -1 : 0;
        const dy = h.position.y > hero.position.y ? 1 : h.position.y < hero.position.y ? -1 : 0;
        candidates.push({ hero: h, dx, dy });
      });
      return candidates;
    }
    (info.heroes || []).forEach(h => candidates.push({ hero: h }));
    // Certains sorts à zone (bomb_zone, place_glyph...) couvrent des centaines de cellules — chacune
    // coûte un clone complet de partie pour être évaluée (voir _cloneGameForSim), donc les évaluer
    // TOUTES est prohibitif (des centaines de clones pour un seul sort). Sous-échantillon aléatoire
    // UNIFORME (pas de biais de position/direction) au-delà du plafond : une borne de calcul, pas
    // une préférence — contrairement au mouvement/ciblage héros (bien plus petits en nombre), qui
    // restent, eux, exhaustifs.
    let cells = info.cells || [];
    if (cells.length > NEURAL_CELL_CANDIDATE_CAP) {
      cells = [...cells].sort(() => Math.random() - 0.5).slice(0, NEURAL_CELL_CANDIDATE_CAP);
    }
    cells.forEach(c => candidates.push({ x: c.x, y: c.y }));
    return candidates;
  }

  // Par phase (early = avant mouvement, late = après — même découpage que l'exécution réelle du
  // tour, voir executeTurn), lance en boucle le meilleur {sort, cible} parmi TOUS ceux réellement
  // castables ce passage (mana/CD/mute déjà filtrés), option "ne rien lancer" incluse — jusqu'à ce
  // que cette option gagne ou qu'il n'y ait plus rien de légal. Remplace entièrement l'ordre de
  // combo écrit à la main (scoreSpellOrder/comboBuffPriorityWeight etc. de la version heuristique) :
  // chaque choix (lequel, sur qui, maintenant ou pas du tout) vient du réseau, pas d'une formule.
  // Ne peuple PAS les tables EV/regret par décision (spellTiming/comboFirstPick...) : ces tables
  // décrivent la politique heuristique qu'on remplace ici, pas celle du réseau — un héros piloté par
  // le réseau reste donc sans "Décisions apprises" sur la page de build recommandé.
  async _decideCastSpellsNeural(timing) {
    const g = this.game;
    let guard = 0;
    while (guard++ < 4) { // un héros lance rarement plus de 2-3 sorts par phase — marge généreuse
      const hero = g.currentHero;
      if (!hero || !hero.isAlive || hero.mutedThisTurn || hero.rootTurns > 0 || g.actionsUsed >= MAX_ACTIONS) break;

      const castable = hero.spells.filter(spell => {
        const isRecallReactivation = spell.id === 'solo_recall' && hero.soloRecallActive;
        // Hornet Q — Lance Soyeuse : réactivable sur une cible déjà marquée même en recharge (voir
        // castSpell/getSpellTargets dans game.js, même condition ici pour rester cohérent).
        const isHornetReactivation = spell.id === 'hornet_q' &&
          Object.values(hero.hornetHarpoonedTargets || {}).some(exp => exp > g.globalTurn);
        if (isRecallReactivation || isHornetReactivation) return true;
        if (hero.cooldowns[spell.id] > 0) return false;
        if (hero.currentMana < spell.manaCost) return false;
        return true;
      });
      if (!castable.length) break;

      const options = [{ spell: null, target: null }];
      for (const spell of castable) {
        for (const target of this._neuralSpellCandidates(spell)) options.push({ spell, target });
      }
      if (options.length === 1) break; // aucune cible légale pour aucun sort dispo ce passage

      const choice = this._neuralGreedyPick(options, opt => {
        if (!opt.spell) return this._neuralNet.predict(encodeState(g, hero.playerIdx)); // "ne rien lancer"
        const clone = this._cloneGameForSim();
        clone.castSpell(opt.spell, this._rehydrateSpellTarget(clone, opt.target));
        return this._neuralNet.predict(encodeState(clone, hero.playerIdx));
      }, this._neuralExploreTemp);

      if (!choice.spell) break;
      g.castSpell(choice.spell, choice.target);
      await this._delay(80);
      this.onSync();
    }
  }

  // Achète en boucle le meilleur objet parmi TOUT le catalogue actuellement légal (case libre une
  // fois les composants déjà possédés pris en compte, coût ≤ or disponible — mêmes règles que
  // fitsInventory/g.getBuyCost côté heuristique), option "ne plus rien acheter ce tour" incluse.
  // Remplace entièrement le plan de build pré-calculé une fois par partie (_pickBuildTargets +
  // hero._botBuild) : pas de liste-cible figée, le réseau réévalue le catalogue complet à CHAQUE
  // achat, au vu de l'état RÉEL du moment (objets déjà en poche, matchup, phase de partie...) — le
  // build émerge achat par achat plutôt que d'être décidé à l'avance.
  _decideBuyNeural() {
    const g = this.game;
    const hero = g.currentHero;
    if (!hero || !g.canBuy) return null;

    let candidates = Object.keys(EQUIPMENT).filter(id => {
      const item = EQUIPMENT[id];
      if (!item || item.notBuyable) return false;
      const slotsFreed = g._slotsFreedRecursive([...hero.items], item.recipe);
      if (hero.items.length - slotsFreed >= 6) return false;
      const cost = g.getBuyCost(hero, id);
      return Number.isFinite(cost) && cost >= 0 && cost <= hero.gold;
    });
    if (!candidates.length) return null;
    // Plafond de calcul, pas de préférence — voir NEURAL_ITEM_CANDIDATE_CAP (chaque candidat coûte
    // un clone complet de partie, et le catalogue dépasse 120 objets achetables en fin de partie).
    if (candidates.length > NEURAL_ITEM_CANDIDATE_CAP) {
      candidates = [...candidates].sort(() => Math.random() - 0.5).slice(0, NEURAL_ITEM_CANDIDATE_CAP);
    }

    const NOOP = '__stop_buying__';
    const pick = this._neuralGreedyPick([NOOP, ...candidates], id => {
      if (id === NOOP) return this._neuralNet.predict(encodeState(g, hero.playerIdx));
      const clone = this._cloneGameForSim();
      clone.buyItem(id);
      return this._neuralNet.predict(encodeState(clone, hero.playerIdx));
    }, this._neuralExploreTemp);

    return pick === NOOP ? null : pick;
  }

  // Classe le déplacement choisi (économie/farm vs engagement) et l'enregistre pour que son EV
  // réelle (par héros, par matchup) vienne nuancer ce type de choix les prochaines fois — voir
  // le nudge correspondant dans _scoreMoveCell. Enregistre aussi l'effet LOCAL (voir
  // _trackLocalOutcome) : ces décisions de déplacement sont exactement le genre de choix
  // tactique dont l'effet se voit en quelques tours (or, dégâts, PV, survie), pas seulement au
  // résultat final de la partie.
  _recordMoveDecision(hero, chosenCell, enemies, allies) {
    // Distance d'engagement : indépendant du reste (roam ou non) — pertinent dès qu'on se
    // positionne à portée d'un ennemi. Bucket par héros/matchup pour que chaque profil apprenne sa
    // propre distance idéale (un mage longue portée et un DPT courte portée ne devraient pas
    // converger vers le même comportement juste parce qu'ils partagent le même kiteDistWeight
    // statique — voir le nudge correspondant dans _scoreMoveCell).
    if (hero.position && hero.po > 0 && enemies.length) {
      const g = this.game;
      const nearestEnemy = enemies.reduce((a, b) => {
        const distA = a.position ? g._manhattan(chosenCell, a.position) : 999;
        const distB = b.position ? g._manhattan(chosenCell, b.position) : 999;
        return distA < distB ? a : b;
      });
      if (nearestEnemy.position) {
        const dist = g._manhattan(chosenCell, nearestEnemy.position);
        if (dist <= this._effectivePO(hero)) {
          const band = this._distanceBand(hero, dist);
          this._recordDecision(hero, 'engageDistance', band);
          this._trackLocalOutcome(hero, 'engageDistance', band, enemies, allies);
          this._updateRegretForKey(hero, 'engageDistance', ['melee', 'midRange', 'maxRange'], band, enemies, allies);
        }
      }
    }
    // Retraite à bas PV (voir le décalage de seuil appris dans _scoreMoveCell) : indépendant du
    // reste (roam ou non), enregistré dès qu'on est effectivement dans la zone "bas PV" de base
    // (retreatHpThreshold, le point de départ AVANT décalage — sinon la zone où l'on enregistre
    // rétrécirait/grandirait avec l'EV qu'elle est censée alimenter, un cercle qui se mord la queue).
    // Option déduite du déplacement réel : s'éloigne-t-on de la menace la plus proche ou pas.
    if (this._hpPct(hero) < this.params.retreatHpThreshold && enemies.length) {
      const g = this.game;
      const nearestEnemy = enemies.reduce((a, b) => {
        const distA = a.position && hero.position ? g._manhattan(hero.position, a.position) : 999;
        const distB = b.position && hero.position ? g._manhattan(hero.position, b.position) : 999;
        return distA < distB ? a : b;
      });
      if (nearestEnemy.position && hero.position) {
        const distBefore = g._manhattan(hero.position, nearestEnemy.position);
        const distAfter = g._manhattan(chosenCell, nearestEnemy.position);
        const optionId = distAfter > distBefore ? 'retreat' : 'fight';
        this._recordDecision(hero, 'lowHpRetreat', optionId);
        this._trackLocalOutcome(hero, 'lowHpRetreat', optionId, enemies, allies);
        this._updateRegretForKey(hero, 'lowHpRetreat', ['retreat', 'fight'], optionId, enemies, allies);
      }
    }

    if (hero.roleId === 'roam') {
      const spots = this.game.brownSpots || [];
      if (!spots.length) return;
      const g = this.game;
      const nearestSpotDist = Math.min(...spots.map(s => g._manhattan(chosenCell, s)));
      const optionId = nearestSpotDist <= 2 ? 'farm' : 'fight';
      this._recordDecision(hero, 'roamPriority', optionId);
      this._trackLocalOutcome(hero, 'roamPriority', optionId, enemies, allies);
      this._updateRegretForKey(hero, 'roamPriority', ['farm', 'fight'], optionId, enemies, allies);
      return;
    }
    const homeZone = this._homeZoneCells(hero);
    if (!homeZone) return;
    const distFromHome = this._distToZone(chosenCell, homeZone);
    const phase = this._gamePhase();
    const leash = phase === 'early' ? this.params.earlyChaseLeash : (phase === 'mid' ? this.params.midChaseLeash : this.params.lateChaseLeash);
    const optionId = distFromHome > leash ? 'engage' : 'hold';
    this._recordDecision(hero, 'economyVsEngage', optionId);
    this._trackLocalOutcome(hero, 'economyVsEngage', optionId, enemies, allies);
    this._updateRegretForKey(hero, 'economyVsEngage', ['hold', 'engage'], optionId, enemies, allies);
  }

  // Petit raccourci pour les décisions à options FIXES et connues d'avance (contrairement à
  // _regretMatchPick, ne sélectionne rien — sert juste à mettre à jour le regret de chaque option
  // candidate après coup, pour une décision déjà prise par l'heuristique existante).
  _updateRegretForKey(hero, key, optionIds, chosenId, enemies, allies) {
    const evMap = {};
    optionIds.forEach(id => { evMap[id] = this._decisionEV(hero, key, id, enemies, allies); });
    this._updateRegret(hero, key, evMap, chosenId, enemies, allies);
  }

  _scoreMoveCell(cell, hero, enemies) {
    const g = this.game;
    const p = this.params;
    let score = 0;

    const isRoam = hero.roleId === 'roam';
    const phase = this._gamePhase();
    const homeZone = this._homeZoneCells(hero);
    const cellKey = `${cell.x},${cell.y}`;
    const inHomeZone = homeZone && homeZone.has(cellKey);
    const inAnyGoldZone = ZONE_CELL_SET?.has(cellKey);
    const allies = g._getAllies(hero.playerIdx).filter(a => a !== hero && a.isAlive);

    // Ancrage économique : tenir sa lane/zone à gold. L'EV de la zone décroît continûment avec le
    // tour (plus de tours restants = plus de valeur à contrôler la zone), pas par paliers fixes.
    const economyWeight = Math.max(p.economyFloor, 1 - g.globalTurn / p.economyHorizonTurn);

    // Fenêtre vitale de farm (roam uniquement) : voir roamFarmVitalTurn/roamFarmVitalMultiplier.
    // farmEV apprise (par héros, par matchup) module à la fois l'intensité (vitalMultiplier) et la
    // durée (vitalTurnForHero) — un roam qui gagne historiquement plus en farmant tôt voit cette
    // fenêtre s'étendre et se renforcer avec les données, sans dépendre d'un réglage manuel par héros.
    let roamVitalFarmWindow = false;
    let roamVitalUrgency = 0;
    let roamFarmEV = 0;
    if (isRoam) {
      roamFarmEV = this._decisionEV(hero, 'roamPriority', 'farm', enemies, allies)
                 + this._regretNudge(hero, 'roamPriority', 'farm', enemies, allies);
      // Divisé par decisionScoreScale (l'unité naturelle d'une EV de décision, pas une constante
      // inventée pour l'occasion) : une EV au maximum de son échelle double la fenêtre vitale de
      // base — pour un héros dont l'intérêt à farmer ne s'éteint pas avec le temps (ex. passif qui
      // scale en continu avec les zones de butin), la fenêtre s'étend d'autant que les parties
      // jouées le confirment, au lieu d'un plafond quasi indépendant de l'EV apprise.
      const vitalTurnForHero = p.roamFarmVitalTurn * (1 + Math.max(0, roamFarmEV) / p.decisionScoreScale);
      roamVitalFarmWindow = g.globalTurn < vitalTurnForHero;
      roamVitalUrgency = Math.max(0, 1 - g.globalTurn / vitalTurnForHero);
    }

    if (!isRoam) {
      score += (inHomeZone ? p.zoneBonusHome : (inAnyGoldZone ? p.zoneBonusAny : 0)) * economyWeight;
    } else {
      // Le roam n'a pas de zone "maison" (il tourne sur la carte) : léger intérêt résiduel pour les
      // zones classiques, mais sa vraie économie, ce sont les taches d'or mobiles (game.brownSpots) —
      // sans ça il n'a jamais de raison d'aller les ramasser et ignore complètement cette source de gold.
      score += inAnyGoldZone ? p.zoneBonusRoam * economyWeight : 0;
      const spots = g.brownSpots || [];
      if (spots.length) {
        const nearestSpotDist = Math.min(...spots.map(s => g._manhattan(cell, s)));
        const vitalMultiplier = 1 + p.roamFarmVitalMultiplier * roamVitalUrgency * (1 + Math.max(0, roamFarmEV) / 20);
        score += Math.max(0, (p.roamBrownSpotBonus + roamFarmEV) - nearestSpotDist * p.roamBrownSpotDistWeight) * economyWeight * vitalMultiplier;
      }
    }

    // Distance aux ennemis
    if (enemies.length > 0) {
      const nearestEnemy = enemies.reduce((a, b) => {
        const distA = a.position ? g._manhattan(cell, a.position) : 999;
        const distB = b.position ? g._manhattan(cell, b.position) : 999;
        return distA < distB ? a : b;
      });

      // Le roam ne fonce pas toujours sur l'ennemi le plus proche (sinon il reste scotché en haut
      // de la carte contre le roam/solo adverse) : il ne poursuit un combat déjà engagé que s'il est
      // déjà au contact, sinon il choisit une vraie cible de gank (ailleurs sur la carte si besoin).
      const targetEnemy = (isRoam && (!hero.position || g._manhattan(hero.position, nearestEnemy.position || hero.position) > p.roamEngageRadius))
        ? (this._roamPickGankTarget(hero, enemies) || nearestEnemy)
        : nearestEnemy;

      const dist = targetEnemy.position ? g._manhattan(cell, targetEnemy.position) : 999;

      // Seuil de retraite DÉPLACÉ par l'EV apprise (lowHpRetreat, voir _recordMoveDecision) : si
      // "continuer à se battre" a historiquement mieux payé pour CE héros à bas PV que "fuir", le
      // seuil effectif baisse (retraite déclenchée plus tard) — et inversement. retreatHpThreshold
      // reste le point de départ (et la limite de repli à ±retreatThresholdShiftRange), pas un
      // verrou : un héros qui gagne ses fights à 20% de vie plus souvent qu'il ne les perd peut
      // apprendre à s'y engager, un autre à fuir dès 50%.
      const retreatEV = this._decisionEV(hero, 'lowHpRetreat', 'retreat', enemies, allies)
                       + this._regretNudge(hero, 'lowHpRetreat', 'retreat', enemies, allies);
      const fightEV = this._decisionEV(hero, 'lowHpRetreat', 'fight', enemies, allies)
                     + this._regretNudge(hero, 'lowHpRetreat', 'fight', enemies, allies);
      const thresholdShift = ((fightEV - retreatEV) / p.decisionScoreScale) * p.retreatThresholdShiftRange;
      const effectiveRetreatThreshold = Math.max(0.05, Math.min(0.9, p.retreatHpThreshold - thresholdShift));

      // Mode retraite si HP bas : s'éloigner de la vraie menace la plus proche, pas d'une cible de gank lointaine
      if (this._hpPct(hero) < effectiveRetreatThreshold) {
        const nearestDist = nearestEnemy.position ? g._manhattan(cell, nearestEnemy.position) : 999;
        score += nearestDist * this._learnedWeight(hero, 'retreatDistWeight', enemies, allies);
      } else {
        const canKillNow = this._canLikelyKillThisTurn(hero, targetEnemy);
        // "Isolé" veut dire "sans alliés proches" — pour un roam qui croise l'autre roam tout
        // seul en haut de carte, c'est vrai quasi tout le temps (ils sont justement seuls par
        // design). Sans ce garde-fou, targetIsolated rouvrait à lui seul la poursuite plein
        // régime pendant la fenêtre vitale, même sans kill garanti — exactement le clash roam vs
        // roam sans fin qu'on cherche à éviter (1-2 tours utiles, sorts en CD ensuite, aucun
        // intérêt à s'attarder). Pendant la fenêtre vitale, seul un kill quasi certain justifie
        // encore de s'arrêter pour un roam.
        const targetIsolated = this._isIsolated(targetEnemy) && !roamVitalFarmWindow;

        // Laisse : en early/mid, ne pas s'éloigner de sa zone pour chasser sans bonne raison
        // (kill garanti ou cible mal placée). Sinon on privilégie l'économie à un fight inutile.
        // Le roam n'avait auparavant AUCUNE laisse (bonne raison automatique via `isRoam`) : la
        // poursuite (chaseDistWeight=3/case) dominait alors systématiquement l'attrait des taches
        // d'or (roamBrownSpotDistWeight=2/case) dès qu'un ennemi traînait quelque part sur la
        // carte — ce qui est presque toujours le cas. Résultat observé : le roam ne va jamais
        // chercher son or. On ne garde la poursuite "gratuite" que s'il est déjà au contact d'un
        // combat engagé (roamEngageRadius), et jamais pendant la fenêtre vitale (sinon un simple
        // contact au tour N verrouillait le roam dans le combat pour le reste de la fenêtre,
        // puisqu'être déjà engagé redonnait la poursuite plein régime au tour N+1) ; sinon il n'a
        // plus qu'une approche légère (lightApproachDistWeight=1), plus faible que l'attrait des
        // taches d'or, qui reprend naturellement la main.
        // La laisse late était Infinity et goodReasonToChase incluait phase==='late' sans condition :
        // la phase "late" démarre au tour phaseMidEnd+1 (12) et les parties durent 40-100 tours
        // (MAX_TURNS) — ça désactivait tout ancrage économique/laisse pour l'écrasante majorité
        // d'une partie réelle, dès le tour 12. Laisse désormais finie même en late (lateChaseLeash,
        // plus large que mid pour les vrais teamfights de fin de partie), et phase==='late' seul ne
        // suffit plus à justifier une poursuite : un kill garanti ou une cible isolée le justifient
        // toujours, sinon retour à une approche légère plutôt qu'une chasse plein régime "parce que
        // c'est tard". Pas de laisse pour le roam ici (isRoam) : il a son propre mécanisme dédié
        // (roamFarmVitalTurn/roamEngageRadius), volontairement différent — voir plus haut.
        let leash = Infinity;
        if (!isRoam) leash = (phase === 'early') ? p.earlyChaseLeash : (phase === 'mid') ? p.midChaseLeash : p.lateChaseLeash;
        const distFromHome = homeZone ? this._distToZone(cell, homeZone) : 0;
        const roamAlreadyEngaged = isRoam && !roamVitalFarmWindow && hero.position && targetEnemy.position &&
          g._manhattan(hero.position, targetEnemy.position) <= p.roamEngageRadius;

        // Une cible isolée mais À L'AUTRE BOUT DE LA CARTE (loin de MA zone) n'est pas une "bonne
        // raison" de tout lâcher : sans ce filtre, targetIsolated seul (fréquent — les héros sont
        // souvent isolés en early avant que les fights ne se forment) désactivait complètement la
        // laisse ci-dessous, quelle que soit la distance réelle à la cible — un DPT/Support pouvait
        // alors partir plusieurs tours de suite vers un ennemi à 15-25 cases sans jamais revenir tenir
        // sa zone, y compris (avec un chaseDistWeight appris négatif — voir _learnedWeight) en
        // s'ÉLOIGNANT activement de sa zone dans la direction opposée à cet ennemi hors de portée
        // pendant tout ce temps. La cible doit être à portée de laisse de MA zone (même notion que
        // distFromHome ci-dessus, appliquée à sa position plutôt qu'à la case candidate) pour compter.
        // N/A pour le roam (pas de homeZone — son propre garde-fou est roamAlreadyEngaged ci-dessus).
        const targetNearHome = !homeZone || !targetEnemy.position || this._distToZone(targetEnemy.position, homeZone) <= leash;

        // Désengagement appris : un kill garanti prime toujours, mais en dehors de ça, l'EV réelle
        // de "engager" pour CE héros contre CE matchup peut à elle seule invalider les bonnes
        // raisons habituelles (cible isolée, déjà au contact...) — y compris en late désormais (un
        // fight identifié comme mauvais reste mauvais quel que soit le tour, pas besoin d'attendre
        // d'être bas en vie pour le refuser).
        const engageEV = this._decisionEV(hero, 'economyVsEngage', 'engage', enemies, allies)
                        + this._regretNudge(hero, 'economyVsEngage', 'engage', enemies, allies);
        const learnedDisengage = !canKillNow && engageEV < -p.disengageEVThreshold;

        const goodReasonToChase = !learnedDisengage && (canKillNow || (targetIsolated && targetNearHome) || roamAlreadyEngaged);

        if (learnedDisengage) {
          const nearestDist = nearestEnemy.position ? g._manhattan(cell, nearestEnemy.position) : 999;
          score += nearestDist * p.disengageRetreatWeight;
        } else if (!goodReasonToChase && distFromHome > leash) {
          score -= (distFromHome - leash) * p.leashPenaltyWeight; // rester/reculer plutôt que s'engager loin de la lane
          // EV réelle de "tenir l'économie" pour ce héros, dans ce matchup — si historiquement
          // ça a plutôt mal tourné pour lui, cette case perd un peu de son attrait malgré tout.
          // Complétée par le regret cumulé (voir _regretNudge) : comparaison contrefactuelle
          // instance par instance, pas juste une moyenne de winrate.
          if (!isRoam) score += this._decisionEV(hero, 'economyVsEngage', 'hold', enemies, allies)
                               + this._regretNudge(hero, 'economyVsEngage', 'hold', enemies, allies);
        } else if (dist <= this._effectivePO(hero)) {
          // Déjà à portée : viser le bord de la portée plutôt que le contact (voir kiteDistWeight),
          // nuancé par l'EV apprise de la bande de distance pour CE héros contre CE matchup (voir
          // _recordMoveDecision) — un mage longue portée qui gagne historiquement à rester loin
          // (contre un matchup donné) verra 'maxRange' encouragé plus fort que le kiteDistWeight
          // statique seul ne le ferait, et inversement pour un profil courte portée.
          const distBand = this._distanceBand(hero, dist);
          score += p.inRangeBonus + (dist - 1) * this._learnedWeight(hero, 'kiteDistWeight', enemies, allies)
                 + this._decisionEV(hero, 'engageDistance', distBand, enemies, allies)
                 + this._regretNudge(hero, 'engageDistance', distBand, enemies, allies);
        } else if (goodReasonToChase) {
          score -= dist * this._learnedWeight(hero, 'chaseDistWeight', enemies, allies); // avancer pour punir/finir la cible
          if (!isRoam && distFromHome > leash) {
            // Idem côté "engager" : l'EV réelle nuance l'attrait d'aller chercher le fight ici.
            score += this._decisionEV(hero, 'economyVsEngage', 'engage', enemies, allies)
                   + this._regretNudge(hero, 'economyVsEngage', 'engage', enemies, allies);
          }
          if (isRoam) score += this._decisionEV(hero, 'roamPriority', 'fight', enemies, allies)
                              + this._regretNudge(hero, 'roamPriority', 'fight', enemies, allies);
        } else {
          score -= dist * this._learnedWeight(hero, 'lightApproachDistWeight', enemies, allies); // légère approche, sans se ruer dessus
        }
      }
    }

    // Pénalité pièges
    const adjacentTraps = (g.traps || []).filter(t =>
      t.playerIdx !== hero.playerIdx &&
      g._manhattan(cell, t) <= 1
    );
    if (adjacentTraps.length > 0) {
      score -= this._learnedWeight(hero, 'trapPenalty', enemies, allies);
    }

    // Pénalité si cerné faible
    const adjacentEnemies = (enemies || []).filter(e =>
      e.position && g._manhattan(cell, e.position) === 1
    );
    if (adjacentEnemies.length > 0 && this._hpPct(hero) < 0.5) {
      score -= this._learnedWeight(hero, 'surroundedPenalty', enemies, allies);
    }

    // ── Dimensions spatiales absentes de la formule jusqu'ici — voir _learnedWeight (multiplicateurs
    // jusqu'au négatif) : chacune peut être ignorée (0×) ou inversée pour un héros donné, pas
    // seulement amplifiée/atténuée autour d'un comportement par défaut supposé bon pour tous. ──

    // Regroupement avec les alliés : distance au plus proche allié vivant. Poids de base positif
    // (préfère se regrouper) — un héros dont le kit veut au contraire s'isoler (poke solo, roam
    // furtif) peut apprendre l'inverse via un multiplicateur négatif sur ce même terme.
    if (allies.length) {
      const nearestAllyDist = Math.min(...allies.map(a => a.position ? g._manhattan(cell, a.position) : 999));
      score -= nearestAllyDist * this._learnedWeight(hero, 'allyClusterWeight', enemies, allies);
    }

    // Exposition multi-cibles : combien d'ennemis seraient à portée d'attaque DEPUIS cette case
    // (pas juste le plus proche) — utile pour un profil à dégâts de zone (ex. Velna R en ligne,
    // passif AoE de Layia) qui veut positionner pour toucher plusieurs cibles à la fois.
    if (enemies.length > 1 && hero.position) {
      const effPO = this._effectivePO(hero);
      const enemiesInRangeFromCell = enemies.filter(e => e.isAlive && e.position && g._manhattan(cell, e.position) <= effPO).length;
      if (enemiesInRangeFromCell > 1) {
        score += (enemiesInRangeFromCell - 1) * this._learnedWeight(hero, 'multiTargetExposureWeight', enemies, allies);
      }
    }

    // Profondeur d'engagement : distance à l'ennemi le plus ÉLOIGNÉ (pas le plus proche) — proxy de
    // "est-ce que je pousse profondément dans le camp adverse" (backline) vs "je reste en bordure
    // du combat". Poids de base modeste et volontairement incertain en signe : dimension neuve,
    // purement laissée à l'EV apprise de trancher plutôt qu'à un préjugé de conception.
    if (enemies.length > 1) {
      const farthestEnemy = enemies.reduce((a, b) => {
        const da = a.position ? g._manhattan(cell, a.position) : 0;
        const db = b.position ? g._manhattan(cell, b.position) : 0;
        return da > db ? a : b;
      });
      if (farthestEnemy.position) {
        score -= g._manhattan(cell, farthestEnemy.position) * this._learnedWeight(hero, 'backlinePushWeight', enemies, allies);
      }
    }

    return score;
  }

  // ============================================================
  // LOUPS DE NOYALA — unité secondaire au PM propre (rafraîchi chaque tour de Noyala via son
  // passif, voir game.js). Jamais pilotée jusqu'ici : un loup restait planté là où il avait été
  // invoqué pour toujours, sans jamais aller chercher l'or des zones ROAM ni participer aux
  // combats. Même philosophie farm-puis-fight que le roam (voir _scoreMoveCell/
  // roamFarmVitalTurn), adaptée à une unité "aller simple" (elle meurt au premier contact avec
  // un ennemi, voir game.js _wolfMove) plutôt qu'un héros qui peut reculer.
  // ============================================================

  _decideWolfMoves(hero) {
    const g = this.game;
    const myWolfIds = (g.noyalaWolves || [])
      .filter(w => w.ownerInstanceId === hero.instanceId && w.pmLeft > 0)
      .map(w => w.id);
    if (!myWolfIds.length) return;

    const allies = g._getAllies(hero.playerIdx).filter(a => a !== hero && a.isAlive);
    for (const wolfId of myWolfIds) {
      // Un loup précédent dans cette même boucle peut avoir tué un ennemi (ou être mort
      // lui-même, voir game.js _wolfMove) — jamais réutiliser un instantané de `wolf`/`enemies`
      // capturé avant la boucle, toujours relire l'état courant à cet instant précis.
      const wolf = (g.noyalaWolves || []).find(w => w.id === wolfId);
      if (!wolf || wolf.pmLeft <= 0) continue;
      const enemies = g._getEnemies(hero.playerIdx).filter(e => e.isAlive && e.position);
      this._decideOneWolfMove(wolf, hero, enemies, allies);
    }
  }

  _decideOneWolfMove(wolf, hero, enemies, allies) {
    const g = this.game;
    const p = this.params;

    // Le loup ne peut bouger qu'une fois par appel (il meurt au contact) — mais getWolfReachableCells
    // reflète tout son budget PM restant, donc cette case peut déjà être à plusieurs cases de distance.
    const reachable = g.getWolfReachableCells(wolf);
    if (!reachable.length) return;

    // Même fenêtre vitale que le roam (voir roamFarmVitalTurn), calibrée séparément pour les
    // loups : ils gagnent en utilité de combat un peu plus tard (le temps d'en avoir plusieurs en
    // jeu), donc la fenêtre économique dure plus longtemps par défaut.
    const farmEV = this._decisionEV(hero, 'wolfPriority', 'farm', enemies, allies)
                 + this._regretNudge(hero, 'wolfPriority', 'farm', enemies, allies);
    const vitalTurnForWolf = p.wolfFarmVitalTurn * (1 + Math.max(0, farmEV) / 40);
    const vitalUrgency = Math.max(0, 1 - g.globalTurn / vitalTurnForWolf);
    const vitalMultiplier = 1 + p.wolfFarmVitalMultiplier * vitalUrgency * (1 + Math.max(0, farmEV) / 20);

    const spots = g.brownSpots || [];
    let bestCell = null, bestScore = -Infinity, bestIsAttack = false;

    for (const cell of reachable) {
      let score = 0;

      if (spots.length) {
        const dist = Math.min(...spots.map(s => g._manhattan(cell, s)));
        score += Math.max(0, p.wolfBrownSpotBonus - dist * p.wolfBrownSpotDistWeight) * vitalMultiplier;
      }

      // Une case adjacente à un ennemi déclenche l'attaque-sacrifice automatique du loup à
      // l'arrivée (voir game.js _wolfMove) — un aller simple, donc jugé au cas par cas plutôt que
      // toujours tenté : ça finit un kill, ou la cible est isolée/déjà mal en point (peu de perte
      // réelle à faire fuir/chip une cible qui n'était pas en position de force de toute façon).
      const adjEnemy = enemies.find(e => g._manhattan(cell, e.position) === 1);
      let isAttack = false;
      if (adjEnemy) {
        isAttack = true;
        const estDmg = wolf.baseDamage + hero.ad * wolf.adRatio;
        const worthwhile = estDmg >= adjEnemy.currentHP || this._isIsolated(adjEnemy) || this._hpPct(adjEnemy) < 0.3;
        score += worthwhile
          ? p.wolfAttackBonus + this._decisionEV(hero, 'wolfPriority', 'fight', enemies, allies)
                               + this._regretNudge(hero, 'wolfPriority', 'fight', enemies, allies)
          : -p.wolfAttackPenalty;
      }

      if (score > bestScore) { bestScore = score; bestCell = cell; bestIsAttack = isAttack; }
    }

    if (!bestCell || bestScore <= 0) return; // rien de mieux que de rester en place
    const wolfChoice = bestIsAttack ? 'fight' : 'farm';
    this._recordDecision(hero, 'wolfPriority', wolfChoice);
    this._updateRegretForKey(hero, 'wolfPriority', ['farm', 'fight'], wolfChoice, enemies, allies);
    g._wolfMove(wolf, bestCell.x, bestCell.y);
  }

  // ============================================================
  // ATTACK
  // ============================================================

  _decideAttack() {
    const g = this.game;
    const hero = g.currentHero;
    const targets = g.getAttackTargets();

    if (!targets.length || g.autoAttacksUsed >= g.autoAttacksAllowed) return;

    // Priorité à la cible de focus du tour si elle est attaquable, pour concentrer les dégâts
    let bestTarget;
    if (this._focusTarget && targets.includes(this._focusTarget)) {
      bestTarget = this._focusTarget;
    } else {
      bestTarget = targets[0];
      let bestScore = this._scoreAttackTarget(bestTarget, hero);
      for (const target of targets) {
        const score = this._scoreAttackTarget(target, hero);
        if (score > bestScore) {
          bestScore = score;
          bestTarget = target;
        }
      }
    }

    // Jitter : 10% → 2ème meilleure cible
    if (this._jitter() && targets.length > 1) {
      const others = targets.filter(t => t !== bestTarget);
      if (others.length > 0) bestTarget = others[0];
    }

    g.autoAttack(bestTarget);
  }

  _scoreAttackTarget(enemy, hero) {
    if (!enemy.isAlive) return -999;

    const dmg = this._estimateAADamage(hero, enemy);
    const p = this.params;
    let score = 0;

    // Kill potentiel
    if (dmg >= enemy.currentHP + (enemy.shield || 0)) {
      return 100;
    }

    const g = this.game;
    const atkEnemies = g._getEnemies(hero.playerIdx), atkAllies = g._getAllies(hero.playerIdx).filter(a => a !== hero && a.isAlive);

    // Low HP priority
    if (enemy.currentHP < enemy.maxHP * 0.25) score += p.atkLowHp25Bonus;
    else if (enemy.currentHP < enemy.maxHP * 0.5) score += p.atkLowHp50Bonus;

    // Role priority — poids par défaut, mais appris PAR HÉROS (voir _learnedWeight) : un assassin
    // et un tank n'ont pas de raison de valoriser un mage adverse de la même façon.
    const enemyRole = HERO_TYPES[enemy.id]?.roleId;
    if (enemyRole === 'mage') score += this._learnedWeight(hero, 'atkRoleMageBonus', atkEnemies, atkAllies);
    if (enemyRole === 'dpt') score += this._learnedWeight(hero, 'atkRoleDptBonus', atkEnemies, atkAllies);

    // Cible mal placée (isolée) : priorité, c'est une opportunité de poke gratuite
    if (this._isIsolated(enemy)) score += this._learnedWeight(hero, 'atkIsolatedBonus', atkEnemies, atkAllies);

    // Distance
    if (enemy.position && hero.position) {
      const dist = Math.abs(enemy.position.x - hero.position.x) +
                   Math.abs(enemy.position.y - hero.position.y);
      score -= dist * p.atkDistPenaltyWeight;
    }

    // EV apprise (voir _computeFocusTarget) : quel rôle a réellement payé à focus pour CE héros
    // contre CE matchup, par-dessus les bonus ci-dessus.
    score += this._decisionEV(hero, 'focusRole', enemyRole || 'unknown', atkEnemies, atkAllies)
           + this._regretNudge(hero, 'focusRole', enemyRole || 'unknown', atkEnemies, atkAllies);

    return score;
  }

  // ============================================================
  // UTILITIES
  // ============================================================

  _jitter() {
    return Math.random() < 0.1;
  }

  _hpPct(hero) {
    return hero.currentHP / Math.max(1, hero.maxHP);
  }

  // Portée EFFECTIVE du tour (base + bonus temporaires) — même formule que game.js (getAttackTargets/
  // autoAttack), qui EST la source de vérité pour la légalité réelle d'une attaque. Sans ça, tout le
  // positionnement/kiting du bot raisonnait sur hero.po seul : un héros qui vient de gagner de la
  // portée pour ce tour (Layia W "Vision", layiaBonusPOTurn ; Faena, faenaBonusPOTurn) se
  // repositionnait comme s'il n'avait toujours que sa portée de base, ratant le poke à distance que
  // le sort était censé permettre.
  _effectivePO(hero) {
    return hero.po + (hero.layiaBonusPOTurn || 0) + (hero.faenaBonusPOTurn || 0);
  }

  // Bande de distance d'engagement, relative à la portée propre du héros (pas une distance
  // absolue en cases) : 'melee' au contact, 'maxRange' au bord de portée, 'midRange' entre les deux.
  // Sert de vocabulaire d'option compact et réutilisable pour l'EV apprise (voir engageDistance).
  _distanceBand(hero, dist) {
    if (dist <= 1) return 'melee';
    if (dist >= this._effectivePO(hero)) return 'maxRange';
    return 'midRange';
  }

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
