// ============================================================
// BOT IA — Adversaire local jouant en Player 2 (playerIdx = 1)
// ============================================================

class GameBot {
  constructor(game, onSync) {
    this.game = game;
    this.onSync = onSync;
    this.playerIdx = 1;
    this._busy = false;

    // Builds finaux T3 par héros (boots T2 + 5 items T3)
    // Le bot achète les composants progressivement jusqu'aux items finaux
    this._HERO_BUILDS = {
      // SOLO
      solo_1:   { boots: 'bottes_attaquant', items: ['armure_de_la_vie', 'plastron_brulant', 'flamme_du_soleil_flamboyant', 'armure_esprit_magique', 'boule_de_piques'] },
      solo_2:   { boots: 'bottes_attaquant', items: ['armure_de_la_vie', 'ceinture_de_vie', 'coeur_de_courage', 'boule_de_piques', 'armure_esprit_magique'] },
      solo_3:   { boots: 'bottes_attaquant', items: ['armure_de_la_vie', 'plastron_brulant', 'flamme_du_soleil_flamboyant', 'armure_de_stalnoth', 'lame_antimagie'] },
      solo_4:   { boots: 'bottes_attaquant', items: ['armure_de_la_vie', 'plastron_brulant', 'flamme_du_soleil_flamboyant', 'armure_esprit_magique', 'lame_du_diable'] },
      solo_5:   { boots: 'bottes_attaquant', items: ['armure_de_la_vie', 'ceinture_de_vie', 'coeur_de_courage', 'boule_de_piques', 'lame_du_diable'] },

      // ROAM
      roam_1:   { boots: 'bottes_attaquant', items: ['tueur_de_dieux', 'lame_du_diable', 'lame_du_ninja', 'lame_electrique', 'couperet_du_demon'] },
      roam_2:   { boots: 'bottes_attaquant', items: ['tueur_de_dieux', 'lame_du_diable', 'lame_tueuse_boucliers', 'lame_electrique', 'epee_double_feu'] },
      roam_3:   { boots: 'bottes_attaquant', items: ['revolver_d_or', 'lame_electrique', 'lame_du_ninja', 'canon_de_feu', 'lame_d_infini'] },
      roam_4:   { boots: 'bottes_attaquant', items: ['tueur_de_dieux', 'lame_du_diable', 'lame_du_ninja', 'epee_double_feu', 'lame_electrique'] },
      roam_5:   { boots: 'bottes_attaquant', items: ['lame_d_infini', 'lame_electrique', 'canon_de_feu', 'lame_tueuse_boucliers', 'epee_double_feu'] },

      // DPT
      dpt_1:    { boots: 'bottes_attaquant', items: ['revolver_d_or', 'arc_perforant_anges', 'arc_des_morts', 'pistolet_magique', 'combattant_antimage'] },
      dpt_2:    { boots: 'bottes_attaquant', items: ['canon_de_feu', 'lame_du_ninja', 'arc_perforant_anges', 'epee_double_feu', 'lame_electrique'] },
      dpt_3:    { boots: 'bottes_attaquant', items: ['lame_d_infini', 'lame_electrique', 'arc_perforant_anges', 'canon_de_feu', 'epee_double_feu'] },

      // MAGE
      mage_1:   { boots: 'sorcerer_boots', items: ['furie_magique', 'gros_baton_magique', 'sceptre_du_malin', 'baton_des_abysses', 'blason_glorieux'] },
      mage_2:   { boots: 'sorcerer_boots', items: ['furie_magique', 'gros_baton_magique', 'sceptre_du_malin', 'poignard_de_dieu', 'blason_glorieux'] },
      mage_3:   { boots: 'sorcerer_boots', items: ['furie_magique', 'gros_baton_magique', 'sceptre_du_malin', 'baton_des_abysses', 'oeil_demoniaque'] },
      mage_4:   { boots: 'sorcerer_boots', items: ['furie_magique', 'gros_baton_magique', 'sceptre_du_malin', 'blason_glorieux', 'poignard_de_dieu'] },
      mage_5:   { boots: 'sorcerer_boots', items: ['furie_magique', 'gros_baton_magique', 'sceptre_du_malin', 'baton_des_abysses', 'pistolet_magique'] },

      // SUPPORT
      support_1: { boots: 'sorcerer_boots', items: ['enchanteur_rouge', 'protection_divine', 'compagnon_fidele', 'furie_magique', 'coeur_de_courage'] },
      support_2: { boots: 'sorcerer_boots', items: ['enchanteur_rouge', 'compagnon_fidele', 'voile_antimagie', 'gros_baton_magique', 'furie_magique'] },
      support_3: { boots: 'sorcerer_boots', items: ['enchanteur_rouge', 'protection_divine', 'compagnon_fidele', 'gros_baton_magique', 'furie_magique'] },
      support_4: { boots: 'sorcerer_boots', items: ['enchanteur_rouge', 'protection_divine', 'armure_de_stalnoth', 'coeur_de_courage', 'furie_magique'] },
      support_5: { boots: 'sorcerer_boots', items: ['enchanteur_rouge', 'compagnon_fidele', 'furie_magique', 'poignard_de_dieu', 'blason_glorieux'] }
    };

    // Héros avec passifs puissants (bonus au draft)
    this._POWERFUL_PASSIVES = [
      'skjer_passive', 'decigeno_passive', 'vadro_passive', 'layia_passive',
      'faena_passive', 'chronos_passive', 'shallah_passive', 'noyala_passive'
    ];
  }

  maybeAct() {
    if (this._busy) return;

    const g = this.game;

    if (g.phase === 'draft') {
      if (g.draftCurrentPlayer() !== 1) return;
      this._busy = true;
      setTimeout(() => {
        this.decideDraft();
      }, 400);
    } else if (g.phase === 'playing') {
      const hero = g.currentHero;
      if (!hero || hero.playerIdx !== 1) return;
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
    const d = g.draft;

    // Trouver les héros banissables (non bannis, pas de restriction)
    const candidates = Object.keys(HERO_TYPES).filter(typeId => !g._isUnavailable(typeId));

    let best = null;
    let bestScore = -Infinity;

    for (const typeId of candidates) {
      const score = this._scoreBanTarget(typeId);
      if (score > bestScore) {
        bestScore = score;
        best = typeId;
      }
    }

    // 10% jitter → prendre le 2ème meilleur
    if (this._jitter() && candidates.length > 1) {
      let second = null;
      let secondScore = -Infinity;
      for (const typeId of candidates) {
        if (typeId === best) continue;
        const score = this._scoreBanTarget(typeId);
        if (score > secondScore) {
          secondScore = score;
          second = typeId;
        }
      }
      if (second) best = second;
    }

    if (best) g.banHero(best);
  }

  _doPick() {
    const g = this.game;
    const d = g.draft;

    // Trouver les héros picables (disponibles)
    const candidates = Object.keys(HERO_TYPES).filter(typeId => !g._isUnavailable(typeId));

    let best = null;
    let bestScore = -Infinity;

    for (const typeId of candidates) {
      const score = this._scorePickTarget(typeId);
      if (score > bestScore) {
        bestScore = score;
        best = typeId;
      }
    }

    if (best) g.pickHero(best);
  }

  _scoreBanTarget(typeId) {
    const hero = HERO_TYPES[typeId];
    let score = 0;

    // Score par rôle
    const roleScores = { mage: 10, roam: 9, dpt: 8, solo: 7, support: 5 };
    score += roleScores[hero.roleId] || 0;

    // Bonus pour passif puissant
    if (this._POWERFUL_PASSIVES.includes(hero.passive)) score += 4;

    // Bonus pour stats hautes
    if ((hero.ad || 0) > 80) score += 3;
    if ((hero.ap || 0) > 70) score += 3;
    if ((hero.pm || 0) > 4) score += 2;

    return score;
  }

  _scorePickTarget(typeId) {
    const hero = HERO_TYPES[typeId];
    const g = this.game;
    const d = g.draft;
    const myPicks = d.picks[1] || [];

    let score = this._scoreBanTarget(typeId) + 2; // Même logique que ban + bonus

    // Bonus synergy : complément de rôles
    const takenRoles = myPicks.map(id => HERO_TYPES[id].roleId);
    if (!takenRoles.includes(hero.roleId)) {
      score += 4; // Nouveau rôle = bon
    } else {
      score += 1; // Rôle déjà couvert = moins bon mais pas interdit
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
      if (hero.playerIdx !== 1) return;
      if (g.phase !== 'playing') return;

      // 1. Achat (limité à 5 items max par tour)
      let buyCount = 0;
      while (g.canBuy && buyCount < 5) {
        const itemId = this._decideBuy();
        if (!itemId) break;

        // Sécurité : vérifier que l'item existe et coûte quelque chose
        const item = EQUIPMENT[itemId];
        if (!item || g.getBuyCost(hero, itemId) <= 0) break;

        g.buyItem(itemId);
        buyCount++;
        await this._delay(100);
        this.onSync();
      }

      // 2. Sorts avant mouvement (si à portée)
      if (!hero.rootTurns && !hero.mutedThisTurn) {
        await this._decideCastSpells();
      }

      // 3. Mouvement
      if (!hero.rootTurns && g.movementLeft > 0) {
        this._decideMove();
        await this._delay(120);
        this.onSync();
      }

      // 4. Sorts après mouvement (en mêlée)
      if (!hero.rootTurns && !hero.mutedThisTurn) {
        await this._decideCastSpells();
      }

      // 5. Attaque
      while (g.autoAttacksUsed < g.autoAttacksAllowed && g.actionsUsed < MAX_ACTIONS) {
        const prevAttacks = g.autoAttacksUsed;
        this._decideAttack();
        // Si pas de nouvelle attaque, sortir de la boucle
        if (g.autoAttacksUsed === prevAttacks) break;
        await this._delay(100);
        this.onSync();
      }

      // 6. Fin du tour (immédiat, pas d'attente)
      // Vérification finale avant de terminer
      const finalHero = g.currentHero;
      if (finalHero && finalHero.playerIdx === 1) {
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

    if (!hero || !g.canBuy || hero.items.length >= 6) return null;

    // Récupérer le build final (T3 + boots T2)
    const build = this._HERO_BUILDS[hero.id];
    if (!build) return null;

    const finalItems = [build.boots, ...build.items];
    const owned = new Set(hero.items);

    // Chercher le premier item final qu'on n'a pas
    for (const itemId of finalItems) {
      if (owned.has(itemId)) continue;

      const item = EQUIPMENT[itemId];
      if (!item) continue;

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
            if (!compItem) continue;

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

  // ============================================================
  // SPELLS
  // ============================================================

  async _decideCastSpells() {
    const hero = this.game.currentHero;
    if (!hero) return;

    for (const spell of hero.spells) {
      if (this.game.actionsUsed >= MAX_ACTIONS) break;
      if (hero.cooldowns[spell.id] > 0) continue;
      if (hero.currentMana < spell.manaCost) continue;
      if (hero.mutedThisTurn) continue;

      this._castBestSpell(spell);
      if (this.game.spellsUsed[spell.id]) {
        await this._delay(100);
        this.onSync();
      }
    }
  }

  _castBestSpell(spell) {
    const g = this.game;
    const hero = g.currentHero;
    const enemies = g._getEnemies(hero.playerIdx);

    if (!enemies.length) return;

    // Saut des sorts complexes
    const skipTypes = [
      'place_glyph', 'wind_glyph', 'bomb_zone', 'hate_wall', 'lame_eau',
      'pibot_w', 'pibot_r', 'noyala_q', 'noyala_r', 'abyss_w', 'abyss_r',
      'faena_w', 'faena_r', 'swap_enemy', 'swap_ally', 'stealth_dash'
    ];
    if (skipTypes.includes(spell.targetType)) return;

    let target = null;

    if (['self', 'no_target', 'pm_sacrifice'].includes(spell.targetType)) {
      // Sorts sans cible : toujours caster
      target = null;
    } else if (spell.targetType === 'enemy_hero') {
      // Cible l'ennemi le plus proche/menaçant
      const inRange = enemies.filter(e =>
        e.isAlive && e.position &&
        g._manhattan(hero.position, e.position) <= spell.range &&
        g._hasLineOfSight(hero.position, e.position)
      );
      if (inRange.length > 0) {
        const best = inRange.reduce((a, b) =>
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

    if (target !== null || ['self', 'no_target', 'pm_sacrifice'].includes(spell.targetType)) {
      try {
        g.castSpell(spell, target);
      } catch (e) {
        // Sort échoué silencieusement
      }
    }
  }

  _scoreSpellOnEnemy(spell, enemy) {
    if (!enemy.isAlive) return 0;
    const dmg = this._estimateDamage(spell, this.game.currentHero);
    if (dmg <= 0) return 0;

    // Score = dégâts / vie restante
    const score = dmg / Math.max(1, enemy.currentHP);

    // Bonus kill proche
    if (dmg >= enemy.currentHP) return 100;
    if (dmg >= enemy.currentHP * 0.5) return 50;

    return score;
  }

  _estimateDamage(spell, hero) {
    if (!spell.baseDamage) return 0;
    const ad = spell.adRatio ? hero.ad * spell.adRatio : 0;
    const ap = spell.apRatio ? hero.ap * spell.apRatio : 0;
    return Math.floor(spell.baseDamage + ad + ap);
  }

  // ============================================================
  // MOVEMENT
  // ============================================================

  _decideMove() {
    const g = this.game;
    const hero = g.currentHero;
    if (!hero || hero.rootTurns > 0) return;

    const reachable = g.getReachableCells();
    if (!reachable.length) return;

    const enemies = g._getEnemies(hero.playerIdx);
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

    g.moveHero(bestCell.x, bestCell.y);
  }

  _scoreMoveCell(cell, hero, enemies) {
    const g = this.game;
    let score = 0;

    // Bonus zone de gold (sauf pour les roams qui font du combat)
    const isRoam = hero.roleId === 'roam';
    if (ZONE_CELL_SET?.has(`${cell.x},${cell.y}`) && !isRoam) {
      score += 10;
    }

    // Distance aux ennemis
    if (enemies.length > 0) {
      const nearestEnemy = enemies.reduce((a, b) => {
        const distA = a.position ? g._manhattan(cell, a.position) : 999;
        const distB = b.position ? g._manhattan(cell, b.position) : 999;
        return distA < distB ? a : b;
      });

      const dist = nearestEnemy.position ? g._manhattan(cell, nearestEnemy.position) : 999;

      // Mode retraite si HP bas
      if (this._hpPct(hero) < 0.35) {
        score += dist * 2; // S'éloigner
      } else {
        score -= dist * 3; // Se rapprocher

        // Bonus si à portée d'attaque après déplacement
        if (dist <= hero.po) {
          score += 8;
        }
      }
    }

    // Pénalité pièges
    const adjacentTraps = (g.traps || []).filter(t =>
      t.playerIdx !== hero.playerIdx &&
      g._manhattan(cell, t) <= 1
    );
    if (adjacentTraps.length > 0) {
      score -= 15;
    }

    // Pénalité si cerné faible
    const adjacentEnemies = (enemies || []).filter(e =>
      e.position && g._manhattan(cell, e.position) === 1
    );
    if (adjacentEnemies.length > 0 && this._hpPct(hero) < 0.5) {
      score -= 8;
    }

    return score;
  }

  // ============================================================
  // ATTACK
  // ============================================================

  _decideAttack() {
    const g = this.game;
    const hero = g.currentHero;
    const targets = g.getAttackTargets();

    if (!targets.length || g.autoAttacksUsed >= g.autoAttacksAllowed) return;

    let bestTarget = targets[0];
    let bestScore = this._scoreAttackTarget(bestTarget, hero);

    for (const target of targets) {
      const score = this._scoreAttackTarget(target, hero);
      if (score > bestScore) {
        bestScore = score;
        bestTarget = target;
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

    const dmg = Math.floor(hero.ad + (hero.ap * 0.3)); // Rough estimate
    let score = 0;

    // Kill potentiel
    if (dmg >= enemy.currentHP + (enemy.shield || 0)) {
      return 100;
    }

    // Low HP priority
    if (enemy.currentHP < enemy.maxHP * 0.25) score += 30;
    else if (enemy.currentHP < enemy.maxHP * 0.5) score += 20;

    // Role priority
    const enemyRole = HERO_TYPES[enemy.id]?.roleId;
    if (enemyRole === 'mage') score += 15;
    if (enemyRole === 'dpt') score += 10;

    // Distance
    if (enemy.position && hero.position) {
      const dist = Math.abs(enemy.position.x - hero.position.x) +
                   Math.abs(enemy.position.y - hero.position.y);
      score -= dist * 5;
    }

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

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
