// ============================================================
// ROLE BASE STATS  (10 placeholder heroes per role)
// ============================================================

const ROLE_BASES = {
  solo: {
    roleName: 'Solo',
    roleOrder: 1,
    colorFill:   '#922b21',
    colorStroke: '#e74c3c',
    maxHP: 1600, maxMana: 100, hpRegen: 40, manaRegen: 10,
    ad: 60, ap: 0, armor: 30, mr: 20, lifeSteal: 0, pm: 3, po: 1,
    spells: [
      {
        id: 'bash', name: 'Frappe Brutale',
        description: '80 + 0.5 AD dégâts physiques',
        manaCost: 30, range: 1, cooldown: 2,
        damageType: 'physical', baseDamage: 80, adRatio: 0.5, apRatio: 0,
        targetType: 'enemy_hero', zone: null
      },
      {
        id: 'iron_will', name: 'Volonté de Fer',
        description: 'Bouclier de 100 + 0.5 AD',
        manaCost: 50, range: 0, cooldown: 3,
        damageType: null, baseDamage: 0, adRatio: 0, apRatio: 0,
        targetType: 'self', shieldAmount: 100, adShieldRatio: 0.5, zone: null
      },
      {
        id: 'solo_recall', name: 'Rappel',
        description: 'Se téléporte sur une case adjacente à un allié (portée illimitée). Réactivez pour retourner à votre case de départ.',
        manaCost: 80, range: 99, cooldown: 7, cdMin: 7,
        damageType: null, baseDamage: 0, adRatio: 0, apRatio: 0,
        targetType: 'solo_recall', zone: null, effects: []
      }
    ]
  },

  roam: {
    roleName: 'ROAM',
    roleOrder: 2,
    colorFill:   '#5b2c6f',
    colorStroke: '#9b59b6',
    maxHP: 1350, maxMana: 150, hpRegen: 32, manaRegen: 20,
    ad: 85, ap: 0, armor: 20, mr: 10, lifeSteal: 0, pm: 5, po: 1,
    spells: [
      {
        id: 'shadow_strike', name: 'Frappe de l\'Ombre',
        description: '120 + 0.8 AD dégâts physiques',
        manaCost: 60, range: 1, cooldown: 2,
        damageType: 'physical', baseDamage: 120, adRatio: 0.8, apRatio: 0,
        targetType: 'enemy_hero', zone: null
      },
      {
        id: 'dash', name: 'Bond',
        description: 'Téléportation jusqu\'à 4 cases',
        manaCost: 50, range: 4, cooldown: 3,
        damageType: null, baseDamage: 0, adRatio: 0, apRatio: 0,
        targetType: 'cell', zone: null
      }
    ]
  },

  mage: {
    roleName: 'Mage',
    roleOrder: 3,
    colorFill:   '#154360',
    colorStroke: '#2980b9',
    maxHP: 1250, maxMana: 200, hpRegen: 28, manaRegen: 30,
    ad: 30, ap: 80, armor: 10, mr: 15, lifeSteal: 0, pm: 3, po: 2,
    spells: [
      {
        id: 'fireball', name: 'Boule de Feu',
        description: '100 + 0.8 AP dégâts magiques',
        manaCost: 60, range: 4, cooldown: 2,
        damageType: 'magical', baseDamage: 100, adRatio: 0, apRatio: 0.8,
        targetType: 'enemy_hero', zone: null
      },
      {
        id: 'arcane_burst', name: 'Explosion Arcane',
        description: '60 + 0.5 AP dégâts magiques — zone 3×3',
        manaCost: 80, range: 3, cooldown: 3,
        damageType: 'magical', baseDamage: 60, adRatio: 0, apRatio: 0.5,
        targetType: 'zone', zone: { shape: 'square', size: 1 }
      }
    ]
  },

  dpt: {
    roleName: 'DPT',
    roleOrder: 4,
    colorFill:   '#1d6a39',
    colorStroke: '#27ae60',
    maxHP: 1300, maxMana: 100, hpRegen: 30, manaRegen: 15,
    ad: 70, ap: 0, armor: 15, mr: 10, lifeSteal: 0, pm: 4, po: 5,
    spells: [
      {
        id: 'piercing_shot', name: 'Tir Perforant',
        description: '80 + 0.6 AD dégâts physiques',
        manaCost: 40, range: 5, cooldown: 2,
        damageType: 'physical', baseDamage: 80, adRatio: 0.6, apRatio: 0,
        targetType: 'enemy_hero', zone: null
      },
      {
        id: 'multishot', name: 'Multitir',
        description: '50 + 0.4 AD dégâts à tous les ennemis à portée 4',
        manaCost: 60, range: 4, cooldown: 4,
        damageType: 'physical', baseDamage: 50, adRatio: 0.4, apRatio: 0,
        targetType: 'no_target', zone: null
      }
    ]
  },

  support: {
    roleName: 'Support',
    roleOrder: 5,
    colorFill:   '#9a6b0e',
    colorStroke: '#f39c12',
    maxHP: 1200, maxMana: 250, hpRegen: 32, manaRegen: 35,
    ad: 25, ap: 40, armor: 10, mr: 20, lifeSteal: 0, pm: 3, po: 3,
    spells: [
      {
        id: 'heal', name: 'Soin',
        description: 'Soigne un allié de 80 + 0.6 AP',
        manaCost: 60, range: 3, cooldown: 2,
        damageType: null, baseDamage: 0, adRatio: 0, apRatio: 0,
        healBase: 80, healApRatio: 0.6,
        targetType: 'ally_hero', zone: null
      },
      {
        id: 'smite', name: 'Châtiment',
        description: '60 + 0.4 AP dégâts magiques',
        manaCost: 40, range: 4, cooldown: 1,
        damageType: 'magical', baseDamage: 60, adRatio: 0, apRatio: 0.4,
        targetType: 'enemy_hero', zone: null
      }
    ]
  }
};

// ============================================================
// BUILD 50 HERO TYPES  (10 per role)
// ============================================================

const HERO_TYPES = {};

Object.entries(ROLE_BASES).forEach(([roleId, base]) => {
  for (let i = 1; i <= 10; i++) {
    const id = `${roleId}_${i}`;
    HERO_TYPES[id] = {
      id,
      name:        `${base.roleName} ${i}`,
      role:        base.roleName,
      roleId,
      roleOrder:   base.roleOrder,
      colorFill:   base.colorFill,
      colorStroke: base.colorStroke,
      maxHP:       base.maxHP,
      maxMana:     base.maxMana,
      hpRegen:     base.hpRegen,
      manaRegen:   base.manaRegen,
      ad:          base.ad,
      ap:          base.ap,
      armor:       base.armor,
      mr:          base.mr,
      lifeSteal:   base.lifeSteal,
      pm:          base.pm,
      po:          base.po,
      passive:     base.passive ?? null,
      spells:      base.spells.map(s => ({ ...s }))
    };
  }
});

// ============================================================
// SPECIFIC HERO DEFINITIONS  (override placeholders 1 by 1)
// ============================================================

HERO_TYPES['solo_1'] = {
  id: 'solo_1', name: 'Shamrock', role: 'Solo', roleId: 'solo', roleOrder: 1,
  colorFill: '#922b21', colorStroke: '#e74c3c',
  portrait: 'assets/heroes/shamrock.png',
  passive: 'rock_solid',
  maxHP: 2900, maxMana: 400, hpRegen: 45, manaRegen: 50,
  ad: 50, ap: 0, armor: 0, mr: 0, lifeSteal: 0, pm: 3, po: 1,
  spells: [
    {
      id: 'shamrock_q', name: 'Coeur de pierre',
      description: '130 +0.3 AP dégâts magiques — cible perd 2 PM pendant 1 tour',
      manaCost: 100, range: 2, cooldown: 3, cdMin: 1,
      damageType: 'magical', baseDamage: 130, adRatio: 0, apRatio: 0.3,
      targetType: 'enemy_hero', zone: null,
      effects: [{ type: 'slow', pmReduction: 2, turns: 1 }]
    },
    {
      id: 'shamrock_w', name: 'Cailloux qui roule',
      description: 'Dash sur case adjacente à l\'ennemi + 130 +0.4 AP dégâts magiques',
      manaCost: 100, range: 3, cooldown: 4, cdMin: 1,
      damageType: 'magical', baseDamage: 130, adRatio: 0, apRatio: 0.4,
      targetType: 'dash_to_enemy', zone: null, effects: []
    },
    {
      id: 'shamrock_r', name: 'Figé dans le marbre',
      description: '110 +0.8 AP dégâts magiques + stun (losange 1-3-5-3-1)',
      manaCost: 200, range: 5, cooldown: 7, cdMin: 2,
      damageType: 'magical', baseDamage: 110, adRatio: 0, apRatio: 0.8,
      targetType: 'diamond_zone', zone: { shape: 'diamond', size: 2 },
      effects: [{ type: 'stun', turns: 1 }]
    },
    {
      id: 'solo_recall', name: 'Rappel',
      description: 'Se téléporte sur une case adjacente à un allié (portée illimitée). Réactivez pour retourner à votre case de départ.',
      manaCost: 80, range: 99, cooldown: 7, cdMin: 7,
      damageType: null, baseDamage: 0, adRatio: 0, apRatio: 0,
      targetType: 'solo_recall', zone: null, effects: [],
      icon: 'img/spells/solo_recall.png'
    }
  ]
};

HERO_TYPES['solo_2'] = {
  id: 'solo_2', name: 'Frigiel', role: 'Solo', roleId: 'solo', roleOrder: 1,
  colorFill: '#922b21', colorStroke: '#e74c3c',
  portrait: 'assets/heroes/frigiel.png',
  passive: 'dans_la_chair',
  maxHP: 2500, maxMana: 400, hpRegen: 45, manaRegen: 50,
  ad: 50, ap: 0, armor: 0, mr: 0, lifeSteal: 0, pm: 3, po: 1,
  spells: [
    {
      id: 'frigiel_q', name: 'Couperie',
      description: '140 +0.7 AD dégâts physiques sur une ligne de 2 cases',
      manaCost: 50, range: 2, minRange: 1, maxRange: 2, cooldown: 3, cdMin: 1,
      damageType: 'physical', baseDamage: 140, adRatio: 0.7, apRatio: 0,
      targetType: 'line_zone', zone: null, effects: []
    },
    {
      id: 'frigiel_w', name: 'Plastron',
      description: 'Bouclier de 130 +1 AD pendant 3 tours',
      manaCost: 70, range: 0, cooldown: 5, cdMin: 1,
      damageType: null, baseDamage: 0, adRatio: 0, apRatio: 0,
      shieldAmount: 130, adShieldRatio: 1, shieldTurns: 3,
      targetType: 'self', zone: null, effects: []
    },
    {
      id: 'frigiel_r', name: 'Appel du chevalier',
      description: 'Si la cible a plus de HP max que Frigiel : inflige 130 +1.1 AD (70% physiques, 30% bruts)',
      manaCost: 80, range: 7, cooldown: 10, cdMin: 2,
      damageType: 'physical', baseDamage: 130, adRatio: 1.1, apRatio: 0,
      targetType: 'enemy_hero', zone: null, effects: [],
      conditionHigherHP: true, splitRawPct: 0.3
    },
    {
      id: 'solo_recall', name: 'Rappel',
      description: 'Se téléporte sur une case adjacente à un allié (portée illimitée). Réactivez pour retourner à votre case de départ.',
      manaCost: 80, range: 99, cooldown: 7, cdMin: 7,
      damageType: null, baseDamage: 0, adRatio: 0, apRatio: 0,
      targetType: 'solo_recall', zone: null, effects: [],
      icon: 'img/spells/solo_recall.png'
    }
  ]
};

HERO_TYPES['solo_3'] = {
  id: 'solo_3', name: 'Ondine', role: 'Solo', roleId: 'solo', roleOrder: 1,
  colorFill: '#922b21', colorStroke: '#e74c3c',
  portrait: 'assets/heroes/ondine.png',
  passive: 'vaillance',
  maxHP: 2450, maxMana: 400, hpRegen: 45, manaRegen: 50,
  ad: 75, ap: 0, armor: 0, mr: 0, lifeSteal: 0, pm: 4, po: 1,
  spells: [
    {
      id: 'ondine_q', name: 'Estoc',
      description: '100 + 1 AD dégâts physiques sur un ennemi adjacent',
      manaCost: 70, range: 1, cooldown: 2, cdMin: 1,
      damageType: 'physical', baseDamage: 100, adRatio: 1, apRatio: 0,
      targetType: 'enemy_hero', zone: null, effects: []
    },
    {
      id: 'ondine_w', name: 'Fendre la lame',
      description: 'Ondine se rue derrière un adversaire en ligne droite (portée 3) et inflige 40 + 0,4 AD dégâts physiques + (20 + 0,4 AD) dégâts bruts',
      manaCost: 60, range: 3, cooldown: 4, cdMin: 1,
      damageType: 'physical', baseDamage: 40, adRatio: 0.4, apRatio: 0,
      rawBase: 20, rawAdRatio: 0.4,
      targetType: 'dash_behind_enemy', ignoresLoS: true, zone: null, effects: []
    },
    {
      id: 'ondine_r', name: 'Lame d\'eau',
      description: 'Zone 3×3 lancée à 2 cases en ligne droite. La zone se déplace d\'1 case par tour pendant 3 tours et inflige 160 + 0,6 AD dégâts physiques aux ennemis touchés.',
      manaCost: 100, range: 2, cooldown: 10, cdMin: 2,
      damageType: 'physical', baseDamage: 160, adRatio: 0.6, apRatio: 0,
      targetType: 'lame_eau', zone: null, effects: []
    },
    {
      id: 'solo_recall', name: 'Rappel',
      description: 'Se téléporte sur une case adjacente à un allié (portée illimitée). Réactivez pour retourner à votre case de départ.',
      manaCost: 80, range: 99, cooldown: 7, cdMin: 7,
      damageType: null, baseDamage: 0, adRatio: 0, apRatio: 0,
      targetType: 'solo_recall', zone: null, effects: [],
      icon: 'img/spells/solo_recall.png'
    }
  ]
};

HERO_TYPES['roam_1'] = {
  id: 'roam_1', name: 'Skjer', role: 'ROAM', roleId: 'roam', roleOrder: 2,
  colorFill: '#5b2c6f', colorStroke: '#9b59b6',
  portrait: 'assets/heroes/skjer.png',
  passive: 'skjer_passive',
  maxHP: 2000, maxMana: 450, hpRegen: 35, manaRegen: 30,
  ad: 50, ap: 0, armor: 0, mr: 0, lifeSteal: 0, pm: 6, po: 1,
  spells: [
    {
      id: 'skjer_q', name: 'Traversée furtive',
      description: 'Dash 2 cases en ligne droite (traverse les murs). Inflige 130 + 0.7 AD + 0.4 AP dégâts physiques aux ennemis adjacents à la case d\'arrivée.',
      manaCost: 60, range: 2, cooldown: 4, cdMin: 1,
      damageType: 'physical', baseDamage: 130, adRatio: 0.7, apRatio: 0.4,
      targetType: 'stealth_dash', zone: null, effects: []
    },
    {
      id: 'skjer_w', name: 'Renforcement',
      description: 'La prochaine attaque de Skjer inflige 0.3 AD + 0.2 AP dégâts bonus.',
      manaCost: 70, range: 0, cooldown: 3, cdMin: 1,
      damageType: null, baseDamage: 0, adRatio: 0.3, apRatio: 0.2,
      targetType: 'self', empoweredAttack: true, zone: null, effects: []
    },
    {
      id: 'skjer_r', name: 'Tueur',
      description: 'Sacrifie tous les PM restants. Gagne +20% AD et +20% AP par PM sacrifié.',
      manaCost: 100, range: 0, cooldown: 8, cdMin: 1,
      damageType: null, baseDamage: 0, adRatio: 0, apRatio: 0,
      targetType: 'pm_sacrifice', zone: null, effects: []
    }
  ]
};

HERO_TYPES['mage_1'] = {
  id: 'mage_1', name: 'Electro', role: 'Mage', roleId: 'mage', roleOrder: 3,
  colorFill: '#154360', colorStroke: '#2980b9',
  portrait: 'assets/heroes/electro.png',
  passive: 'electro_passive',
  maxHP: 2000, maxMana: 680, hpRegen: 40, manaRegen: 20,
  ad: 50, ap: 0, armor: 0, mr: 0, lifeSteal: 0, pm: 4, po: 4,
  spells: [
    {
      id: 'electro_q', name: 'Décharge',
      description: 'Zone en losange (1-3-1). Inflige 20 + 0.9 AP dégâts magiques.',
      manaCost: 140, range: 6, cooldown: 3, cdMin: 1,
      damageType: 'magical', baseDamage: 20, adRatio: 0, apRatio: 0.9,
      targetType: 'diamond_zone', zone: { shape: 'diamond', size: 1 }, effects: []
    },
    {
      id: 'electro_w', name: 'Zap Volt',
      description: 'Zone en losange (1-3-5-3-1). Inflige 30 + 0.6 AP dégâts magiques. Ralentit de 1 PM pendant 1 tour.',
      manaCost: 130, range: 5, cooldown: 3, cdMin: 1,
      damageType: 'magical', baseDamage: 30, adRatio: 0, apRatio: 0.6,
      targetType: 'diamond_zone', zone: { shape: 'diamond', size: 2 },
      effects: [{ type: 'slow', pmReduction: 1, turns: 1 }]
    },
    {
      id: 'electro_r', name: 'Tonnerre',
      description: 'Frappe tous les ennemis sur toute la carte. Inflige 30 + 0.7 AP dégâts magiques.',
      manaCost: 180, range: 0, cooldown: 11, cdMin: 1,
      damageType: 'magical', baseDamage: 30, adRatio: 0, apRatio: 0.7,
      targetType: 'no_target', targetAll: true, zone: null, effects: []
    }
  ]
};

HERO_TYPES['roam_2'] = {
  id: 'roam_2', name: 'Masello', role: 'ROAM', roleId: 'roam', roleOrder: 2,
  colorFill: '#5b2c6f', colorStroke: '#9b59b6',
  portrait: 'assets/heroes/masello.png',
  passive: 'masello_passive',
  maxHP: 2150, maxMana: 360, hpRegen: 40, manaRegen: 35,
  ad: 70, ap: 0, armor: 0, mr: 0, lifeSteal: 0, pm: 5, po: 1,
  spells: [
    {
      id: 'masello_q', name: 'Masellojutsu',
      description: 'Dash à côté d\'un ennemi (à travers les murs) et lui inflige 100 + 0.8 AD dégâts physiques.',
      manaCost: 60, range: 6, cooldown: 3, cdMin: 1,
      damageType: 'physical', baseDamage: 100, adRatio: 0.8, apRatio: 0,
      targetType: 'dash_to_enemy', zone: null, effects: []
    },
    {
      id: 'masello_w', name: 'Help is coming',
      description: 'Se téléporte sur une case adjacente à un allié (à travers les murs).',
      manaCost: 40, range: 6, cooldown: 3, cdMin: 1,
      damageType: null, baseDamage: 0, adRatio: 0, apRatio: 0,
      targetType: 'dash_to_ally', zone: null, effects: []
    },
    {
      id: 'masello_r', name: 'Energy Kick',
      description: 'Frappe toutes les cibles adjacentes (8 cases). Inflige 110 + 1,3 AD dégâts physiques.',
      manaCost: 90, range: 1, cooldown: 6, cdMin: 1,
      damageType: 'physical', baseDamage: 110, adRatio: 1.3, apRatio: 0,
      targetType: 'no_target', adjacentHit: true, zone: null, effects: []
    }
  ]
};

HERO_TYPES['roam_3'] = {
  id: 'roam_3', name: 'Layia', role: 'ROAM', roleId: 'roam', roleOrder: 2,
  colorFill: '#5b2c6f', colorStroke: '#9b59b6',
  portrait: 'assets/heroes/layia.png', passive: 'layia_passive',
  maxHP: 1320, maxMana: 240, hpRegen: 40, manaRegen: 25,
  ad: 50, ap: 0, armor: 0, mr: 0, lifeSteal: 0, pm: 5, po: 1,
  spells: [
    {
      id: 'layia_q', name: 'Petit Bond',
      description: 'Layia dashe de 3 cases en ligne droite (traverse les murs). Sa prochaine attaque de base inflige +0,4×AP dégâts supplémentaires.',
      manaCost: 70, range: 3, cooldown: 4,
      damageType: null, baseDamage: 0, adRatio: 0, apRatio: 0,
      targetType: 'stealth_dash', noDamageOnLand: true, bonusNextAttackAP: 0.4,
      zone: null, effects: []
    },
    {
      id: 'layia_w', name: 'Vision',
      description: 'Pour ce tour, la portée des attaques de base de Layia augmente de 2.',
      manaCost: 110, range: 0, cooldown: 5,
      damageType: null, baseDamage: 0, adRatio: 0, apRatio: 0,
      targetType: 'no_target', layiaBonusPO: 2,
      zone: null, effects: []
    },
    {
      id: 'layia_r', name: 'Double Cibles',
      description: 'Pour ce tour, Layia peut effectuer deux fois plus d\'attaques de base.',
      manaCost: 140, range: 0, cooldown: 8,
      damageType: null, baseDamage: 0, adRatio: 0, apRatio: 0,
      targetType: 'no_target', layiaDoubleAttacks: true,
      zone: null, effects: []
    }
  ]
};

HERO_TYPES['dpt_1'] = {
  id: 'dpt_1', name: 'Decigeno', role: 'DPT', roleId: 'dpt', roleOrder: 4,
  colorFill: '#1d6a39', colorStroke: '#27ae60',
  portrait: 'assets/heroes/decigeno.png',
  passive: 'decigeno_passive',
  maxHP: 1800, maxMana: 250, hpRegen: 50, manaRegen: 30,
  ad: 50, ap: 0, armor: 0, mr: 0, lifeSteal: 0, pm: 4, po: 7,
  spells: [
    {
      id: 'decigeno_q', name: 'Traque',
      description: 'Pose un piège permanent. Si un ennemi marche dessus : 80 + 1,3 AD dégâts physiques. Le piège ne disparaît pas après déclenchement.',
      manaCost: 80, range: 6, cooldown: 2, cdMin: 1,
      damageType: 'physical', baseDamage: 80, adRatio: 1.3, apRatio: 0,
      targetType: 'trap', permanent: true, zone: null, effects: []
    },
    {
      id: 'decigeno_w', name: 'Sniping',
      description: 'Frappe en ligne droite entre 3 et 7 cases. Inflige 80 + 1 AD dégâts physiques à tous les ennemis sur cette ligne.',
      manaCost: 80, range: 7, minRange: 3, maxRange: 7, cooldown: 4, cdMin: 1,
      damageType: 'physical', baseDamage: 80, adRatio: 1, apRatio: 0,
      targetType: 'line_zone', zone: null, effects: []
    },
    {
      id: 'decigeno_r', name: 'From Downtown',
      description: 'Cible un ennemi n\'importe où sur la carte. Inflige 60 + 1.3 AD dégâts physiques.',
      manaCost: 180, range: 0, cooldown: 9, cdMin: 1,
      damageType: 'physical', baseDamage: 60, adRatio: 1.3, apRatio: 0,
      targetType: 'enemy_hero', targetAll: true, ignoresLoS: true, zone: null, effects: []
    }
  ]
};

HERO_TYPES['dpt_2'] = {
  id: 'dpt_2', name: 'Stank', role: 'DPT', roleId: 'dpt', roleOrder: 4,
  colorFill: '#1d6a39', colorStroke: '#27ae60',
  portrait: 'assets/heroes/stank.png',
  passive: 'gros_calibre',
  maxHP: 2000, maxMana: 250, hpRegen: 45, manaRegen: 30,
  ad: 50, ap: 0, armor: 0, mr: 0, lifeSteal: 0, pm: 4, po: 5,
  spells: [
    {
      id: 'stank_q', name: 'Filet',
      description: '60 +1 AP dégâts magiques en ligne droite (portée 6) — cible perd 2 PM pendant 1 tour',
      manaCost: 80, range: 6, cooldown: 2, cdMin: 1,
      damageType: 'magical', baseDamage: 60, adRatio: 0, apRatio: 1,
      targetType: 'enemy_hero', requiresLine: true, zone: null,
      effects: [{ type: 'slow', pmReduction: 2, turns: 1 }]
    },
    {
      id: 'stank_w', name: 'Canon',
      description: '70 +1 AD dégâts physiques dans un cône de portée 5 devant Stank',
      manaCost: 110, range: 5, cooldown: 4, cdMin: 1,
      damageType: 'physical', baseDamage: 70, adRatio: 1, apRatio: 0,
      targetType: 'cone_zone', zone: null, effects: []
    },
    {
      id: 'stank_r', name: 'Appel',
      description: 'Bombarde une zone en losange (1-3-5-3-1) : 140 +0.8 AD dégâts physiques par tour pendant 3 tours',
      manaCost: 150, range: 0, cooldown: 11, cdMin: 2,
      damageType: 'physical', baseDamage: 140, adRatio: 0.8, apRatio: 0,
      targetType: 'bomb_zone', zone: null, effects: []
    }
  ]
};

HERO_TYPES['mage_2'] = {
  id: 'mage_2', name: 'Vadro', role: 'MAGE', roleId: 'mage', roleOrder: 3,
  portrait: 'assets/heroes/vadro.png', passive: 'vadro_passive',
  colorFill: '#154360', colorStroke: '#2980b9',
  maxHP: 2100, maxMana: 390, hpRegen: 40, manaRegen: 20,
  ad: 50, ap: 0, armor: 0, mr: 0, lifeSteal: 50, pm: 4, po: 4,
  spells: [
    {
      id: 'vadro_q', name: 'Morsure',
      description: 'Inflige 60 + 0.6 AP dégâts magiques et applique Hémorragie.',
      manaCost: 90, range: 6, cooldown: 4,
      damageType: 'magical', baseDamage: 60, adRatio: 0, apRatio: 0.6,
      targetType: 'enemy_hero', zone: null, effects: [{ type: 'hemorrhage', turns: 1 }]
    },
    {
      id: 'vadro_w', name: 'Flaque de sang',
      description: 'Zone 1-3-1 : inflige 60 + 0.7 AP dégâts magiques à tous les ennemis touchés.',
      manaCost: 130, range: 5, cooldown: 5,
      damageType: 'magical', baseDamage: 60, adRatio: 0, apRatio: 0.7,
      targetType: 'diamond_zone', zone: { shape: 'diamond', size: 1 }, effects: []
    },
    {
      id: 'vadro_r', name: 'Alucard',
      description: 'Inflige 80 + 0,8 AP dégâts magiques à tous les héros ennemis à 6 cases ou moins.',
      manaCost: 140, range: 6, cooldown: 9,
      damageType: 'magical', baseDamage: 80, adRatio: 0, apRatio: 0.8,
      targetType: 'no_target', zone: null, effects: []
    }
  ]
};

HERO_TYPES['mage_3'] = {
  id: 'mage_3', name: 'Shallah', role: 'MAGE', roleId: 'mage', roleOrder: 3,
  portrait: 'assets/heroes/shallah.png', passive: 'shallah_passive',
  colorFill: '#154360', colorStroke: '#2980b9',
  maxHP: 2150, maxMana: 320, hpRegen: 40, manaRegen: 30,
  ad: 50, ap: 0, armor: 0, mr: 0, lifeSteal: 0, pm: 4, po: 4,
  spells: [
    {
      id: 'shallah_q', name: 'Glyphe de Douleur',
      description: 'Pose une glyphe (zone 1-3-5-3-1, dure 3 tours) n\'importe où à portée. Tout champion ennemi qui se déplace dans la zone subit 120 + 1.3 AP dégâts magiques.',
      manaCost: 100, range: 5, cooldown: 3,
      damageType: 'magical', baseDamage: 120, adRatio: 0, apRatio: 1.3,
      targetType: 'place_glyph', glyphType: 'pain', glyphZoneSize: 2,
      zone: null, effects: []
    },
    {
      id: 'shallah_w', name: 'Glyphe de Vent',
      description: 'Zone 1-3-1 en ligne droite. Repousse les ennemis présents vers la glyphe la plus proche (direction aléatoire s\'il n\'y en a pas).',
      manaCost: 70, range: 6, cooldown: 3,
      damageType: null, baseDamage: 0, adRatio: 0, apRatio: 0,
      targetType: 'wind_glyph', glyphZoneSize: 1,
      lineOnly: true, zone: null, effects: []
    },
    {
      id: 'shallah_r', name: 'Glyphe Ultime',
      description: 'Pose une glyphe de protection (zone 1-3-5-7-5-3-1) n\'importe où à portée. Les héros alliés à l\'intérieur sont immunisés aux débuffs jusqu\'au prochain tour de Shallah.',
      manaCost: 230, range: 2, cooldown: 9,
      damageType: null, baseDamage: 0, adRatio: 0, apRatio: 0,
      targetType: 'place_glyph', glyphType: 'ultimate', glyphZoneSize: 3,
      zone: null, effects: []
    }
  ]
};

HERO_TYPES['mage_4'] = {
  id: 'mage_4', name: 'Chronos', role: 'Mage', roleId: 'mage', roleOrder: 3,
  colorFill: '#154360', colorStroke: '#2980b9',
  portrait: 'assets/heroes/chronos.png', passive: 'chronos_passive',
  maxHP: 2000, maxMana: 350, hpRegen: 40, manaRegen: 30,
  ad: 50, ap: 0, armor: 0, mr: 0, lifeSteal: 0, pm: 4, po: 4,
  spells: [
    {
      id: 'chronos_q', name: 'Distortion',
      description: 'Échange sa position avec un ennemi à portée et lui inflige 70 + 1,2×AP dégâts magiques.',
      manaCost: 70, range: 6, cooldown: 4,
      damageType: 'magical', baseDamage: 70, adRatio: 0, apRatio: 1.2,
      targetType: 'swap_enemy', zone: null, effects: []
    },
    {
      id: 'chronos_w', name: 'Distortion Temporelle',
      description: 'Zone 1-3-5-3-1 : inflige 90 + 0,6×AP dégâts magiques et réduit de 2 PM les ennemis touchés.',
      manaCost: 100, range: 5, cooldown: 5,
      damageType: 'magical', baseDamage: 90, adRatio: 0, apRatio: 0.6,
      targetType: 'diamond_zone', zone: { shape: 'diamond', size: 2 },
      effects: [{ type: 'slow', pmReduction: 2, turns: 1 }]
    },
    {
      id: 'chronos_r', name: 'Rollback',
      description: 'Retourne à sa position de début de tour (case adjacente si occupée). Inflige 120 + 1,1×AP dégâts magiques aux ennemis à 3 cases ou moins du point de réapparition.',
      manaCost: 170, range: 0, cooldown: 10,
      damageType: 'magical', baseDamage: 120, adRatio: 0, apRatio: 1.1,
      targetType: 'no_target', rollback: true, zone: null, effects: []
    }
  ]
};

HERO_TYPES['support_2'] = {
  id: 'support_2', name: 'Shana', role: 'SUPPORT', roleId: 'support', roleOrder: 5,
  colorFill: '#9a6b0e', colorStroke: '#f39c12',
  portrait: 'assets/heroes/shana.png', passive: 'shana_passive',
  maxHP: 2100, maxMana: 220, hpRegen: 50, manaRegen: 25,
  ad: 50, ap: 0, armor: 0, mr: 0, lifeSteal: 0, pm: 4, po: 4,
  spells: [
    {
      id: 'shana_q', name: 'Miaou Miaou !',
      description: 'Confère à un allié +2 PM supplémentaires à son prochain tour.',
      manaCost: 120, range: 6, cooldown: 4,
      damageType: null, baseDamage: 0, adRatio: 0, apRatio: 0,
      targetType: 'ally_hero', pmBuff: 2, zone: null, effects: []
    },
    {
      id: 'shana_w', name: 'Soin au Poil',
      description: 'Soigne un allié de 80 + 0,8×AP HP. (Passif : Shana se soigne du même montant.)',
      manaCost: 60, range: 5, cooldown: 2,
      damageType: null, healBase: 80, healApRatio: 0.8, baseDamage: 0, adRatio: 0, apRatio: 0,
      targetType: 'ally_hero', zone: null, effects: []
    },
    {
      id: 'shana_r', name: 'À la Rescousse !',
      description: 'Soigne tous les héros alliés sur la carte de 80 + 0,5×AP HP. (Passif : Shana se soigne pour chaque allié soigné.)',
      manaCost: 120, range: 0, cooldown: 10,
      damageType: null, healBase: 80, healApRatio: 0.5, baseDamage: 0, adRatio: 0, apRatio: 0,
      targetType: 'no_target', healAllAllies: true, zone: null, effects: []
    }
  ]
};

HERO_TYPES['support_3'] = {
  id: 'support_3', name: 'Anastasia', role: 'SUPPORT', roleId: 'support', roleOrder: 5,
  colorFill: '#9a6b0e', colorStroke: '#f39c12',
  portrait: 'assets/heroes/anastasia.png', passive: 'anastasia_passive',
  maxHP: 2100, maxMana: 220, hpRegen: 50, manaRegen: 25,
  ad: 50, ap: 0, armor: 0, mr: 0, lifeSteal: 0, pm: 4, po: 4,
  spells: [
    {
      id: 'anastasia_q', name: 'Soin Prudent',
      description: 'Soigne un allié ou soi-même de 30 + 0,7×AP HP. Utilisable 2 fois par tour (CD réel : 1).',
      manaCost: 70, range: 5, cooldown: 1, cdMin: 0,
      damageType: null, healBase: 30, healApRatio: 0.7, baseDamage: 0, adRatio: 0, apRatio: 0,
      targetType: 'ally_hero', maxUsesPerTurn: 2, zone: null, effects: []
    },
    {
      id: 'anastasia_w', name: 'Brûlure de Désir',
      description: 'Zone 1-3-1 : inflige 140 + 0,6×AP dégâts magiques et applique Hémorragie aux ennemis touchés.',
      manaCost: 110, range: 4, cooldown: 5,
      damageType: 'magical', baseDamage: 140, adRatio: 0, apRatio: 0.6,
      targetType: 'diamond_zone', zone: { shape: 'diamond', size: 1 },
      effects: [{ type: 'hemorrhage', turns: 1 }]
    },
    {
      id: 'anastasia_r', name: 'Barrière Protectrice',
      description: 'Zone 1-3-5-3-1 en ligne droite : tous les alliés présents reçoivent un bouclier de 200 + 1,2×AP pendant 4 tours.',
      manaCost: 140, range: 5, cooldown: 12,
      damageType: null, baseDamage: 0, adRatio: 0, apRatio: 0,
      targetType: 'diamond_zone', zone: { shape: 'diamond', size: 2 },
      allyShield: true, shieldBase: 200, shieldAPRatio: 1.2, shieldTurns: 4,
      lineOnly: true, effects: []
    }
  ]
};

HERO_TYPES['support_1'] = {
  id: 'support_1', name: 'Voodoo', role: 'SUPPORT', roleId: 'support', roleOrder: 5,
  portrait: 'assets/heroes/voodoo.png', passive: 'voodoo_passive',
  colorFill: '#9a6b0e', colorStroke: '#f39c12',
  maxHP: 2300, maxMana: 220, hpRegen: 35, manaRegen: 25,
  ad: 50, ap: 0, armor: 0, mr: 0, lifeSteal: 0, pm: 4, po: 4,
  spells: [
    {
      id: 'voodoo_q', name: 'Flaque empoisonnée',
      description: 'Zone 1-3-5-3-1 : inflige 60 + 0.6 AP dégâts magiques et réduit de 2 PM les ennemis touchés pour leur prochain tour.',
      manaCost: 80, range: 5, cooldown: 4,
      damageType: 'magical', baseDamage: 60, adRatio: 0, apRatio: 0.6,
      targetType: 'diamond_zone', zone: { shape: 'diamond', size: 2 },
      effects: [{ type: 'slow', pmReduction: 2, turns: 1 }, { type: 'hemorrhage', turns: 1 }]
    },
    {
      id: 'voodoo_w', name: 'Statue magique',
      description: 'Cible automatiquement l\'allié le plus proche (portée 4). Supprime tous ses débuffs. Si aucun débuff, soigne 20 + 0.2 AP.',
      manaCost: 100, range: 4, cooldown: 3,
      damageType: null, healBase: 20, healApRatio: 0.2, baseDamage: 0, adRatio: 0, apRatio: 0,
      targetType: 'no_target', nearestAllyCleanse: true, zone: null, effects: []
    },
    {
      id: 'voodoo_r', name: 'Malédiction',
      description: 'Zone 1-3-5-3-1 : tous les ennemis touchés voient la portée de leurs sorts réduite de 3 (minimum 1) pour leur prochain tour.',
      manaCost: 130, range: 5, cooldown: 6,
      damageType: null, baseDamage: 0, adRatio: 0, apRatio: 0,
      targetType: 'diamond_zone', zone: { shape: 'diamond', size: 2 },
      effects: [{ type: 'malediction', turns: 1, rangeReduction: 3 }, { type: 'hemorrhage', turns: 1 }]
    }
  ]
};

HERO_TYPES['support_4'] = {
  id: 'support_4', name: 'Sharagoth', role: 'SUPPORT', roleId: 'support', roleOrder: 5,
  portrait: 'assets/heroes/sharagoth.png', passive: 'sharagoth_passive',
  colorFill: '#9a6b0e', colorStroke: '#f39c12',
  maxHP: 2200, maxMana: 400, hpRegen: 45, manaRegen: 50,
  ad: 50, ap: 0, armor: 0, mr: 0, lifeSteal: 0, pm: 4, po: 1,
  spells: [
    {
      id: 'sharagoth_q', name: 'Terrain conquis',
      description: 'Clique sur une case : pousse l\'ennemi à portée (jusqu\'à 3 cases) vers cette destination et lui inflige 200 dégâts magiques.',
      manaCost: 110, range: 5, cooldown: 3, cdMin: 1,
      damageType: 'magical', baseDamage: 200, adRatio: 0, apRatio: 0,
      targetType: 'push_enemy', zone: null, effects: []
    },
    {
      id: 'sharagoth_w', name: 'Mur de haine',
      description: 'Crée un mur de 3 cases (perpendiculaire à la direction choisie, à distance 2) bloquant la ligne de vue ennemie pendant 2 tours.',
      manaCost: 80, range: 2, cooldown: 5, cdMin: 1,
      damageType: null, baseDamage: 0, adRatio: 0, apRatio: 0,
      targetType: 'hate_wall', zone: null, effects: []
    },
    {
      id: 'sharagoth_r', name: 'Changement de corps',
      description: 'Échange sa position avec un allié n\'importe où sur la carte.',
      manaCost: 170, range: 0, cooldown: 12, cdMin: 3,
      damageType: null, baseDamage: 0, adRatio: 0, apRatio: 0,
      targetType: 'swap_ally', ignoresLoS: true, targetAll: true, zone: null, effects: []
    }
  ]
};

HERO_TYPES['roam_5'] = {
  id: 'roam_5', name: 'Abyss', role: 'ROAM', roleId: 'roam', roleOrder: 2,
  portrait: 'assets/heroes/abyss.png',
  passive: 'abyss_passive',
  maxHP: 2200, maxMana: 400, hpRegen: 35, manaRegen: 35,
  ad: 50, ap: 0, armor: 0, mr: 0, lifeSteal: 0, pm: 6, po: 1,
  spells: [
    {
      id: 'abyss_q', name: 'Blackout',
      description: 'Inflige 80 + 0,5 AD + 0,5 AP dégâts magiques et mute la cible (sorts bloqués pendant 1 tour).',
      manaCost: 80, range: 3, cooldown: 4, cdMin: 1,
      damageType: 'magical', baseDamage: 80, adRatio: 0.5, apRatio: 0.5,
      targetType: 'enemy_hero', zone: null, effects: [{ type: 'mute', turns: 1 }]
    },
    {
      id: 'abyss_w', name: 'Nuisance noire',
      description: 'Dash en ligne droite (max 3 cases). Les ennemis à 3 cases ou moins de l\'arrivée subissent 30 + 0,25 AP dégâts magiques par tour pendant 3 tours.',
      manaCost: 90, range: 3, cooldown: 4, cdMin: 1,
      damageType: 'magical', baseDamage: 30, adRatio: 0, apRatio: 0.25,
      targetType: 'abyss_w', zone: null, effects: []
    },
    {
      id: 'abyss_r', name: 'Nuit infinie',
      description: 'Se rue sur un ennemi lointain (8 à 10 cases, sans ligne de vue) et lui inflige 130 + 0,7 AD + 0,5 AP dégâts physiques.',
      manaCost: 110, range: 10, cooldown: 11, cdMin: 1,
      damageType: 'physical', baseDamage: 130, adRatio: 0.7, apRatio: 0.5,
      targetType: 'abyss_r', minRange: 8, zone: null, effects: []
    }
  ]
};

HERO_TYPES['roam_6'] = {
  id: 'roam_6', name: 'Hornet', role: 'ROAM', roleId: 'roam', roleOrder: 2,
  portrait: 'assets/heroes/hornet.png',
  passive: 'hornet_passive',
  maxHP: 2150, maxMana: 360, hpRegen: 40, manaRegen: 35,
  ad: 50, ap: 0, armor: 0, mr: 0, lifeSteal: 0, pm: 5, po: 1,
  spells: [
    {
      id: 'hornet_q', name: 'Lance Soyeuse',
      description: 'Lance en ligne droite (portée 5) : marque la cible jusqu\'à la fin du prochain tour, infligeant 50 + 0,6×AD dégâts physiques. Réactivation (portée infinie, de n\'importe où) sur la cible marquée : dégâts +25 + 0,3×AD + téléportation adjacente (non diagonale).',
      manaCost: 80, range: 5, cooldown: 5, maxUsesPerTurn: 2,
      damageType: 'physical', baseDamage: 50, adRatio: 0.6, apRatio: 0,
      targetType: 'enemy_hero', zone: null, effects: [], harpooned: true, reusable: true
    },
    {
      id: 'hornet_w', name: 'Pourfandage aiguisé',
      description: 'Attaque une cible adjacente, infligeant 30 + 0,6×AD dégâts physiques. Si la cible est marquée par Lance Soyeuse, inflige 15 + 0,8×AD dégâts supplémentaires et vole 1 PM.',
      manaCost: 80, range: 1, cooldown: 4,
      damageType: 'physical', baseDamage: 30, adRatio: 0.6, apRatio: 0,
      targetType: 'enemy_hero', zone: null, effects: [], usesHarpoon: true
    },
    {
      id: 'hornet_r', name: 'Tisse-tempête',
      description: 'Inflige 50 + 1×AD dégâts physiques autour d\'elle (zone 3PO) et retire 2 PM à toutes les cibles touchées.',
      manaCost: 130, range: 0, cooldown: 10,
      damageType: 'physical', baseDamage: 50, adRatio: 1, apRatio: 0,
      targetType: 'no_target', zone: null, effects: [], pmSteal: 2
    }
  ]
};

HERO_TYPES['dpt_3'] = {
  id: 'dpt_3', name: 'Faëna', role: 'DPT', roleId: 'dpt', roleOrder: 4,
  portrait: 'assets/heroes/faena.png',
  passive: 'faena_passive',
  maxHP: 2000, maxMana: 250, hpRegen: 50, manaRegen: 30,
  ad: 50, ap: 0, armor: 0, mr: 0, lifeSteal: 0, pm: 4, po: 5,
  spells: [
    {
      id: 'faena_q', name: 'Tir en éclat',
      description: '40 + 0,8 AD dégâts physiques dans une zone 1-3-1 (portée 6) — ralentit de 1 PM pendant 1 tour.',
      manaCost: 70, range: 6, cooldown: 3, cdMin: 1,
      damageType: 'physical', baseDamage: 40, adRatio: 0.8, apRatio: 0,
      targetType: 'diamond_zone', zone: { size: 1 },
      effects: [{ type: 'slow', pmReduction: 1, turns: 1 }]
    },
    {
      id: 'faena_w', name: 'Boost',
      description: 'Faëna se déplace d\'une case (sans consommer de PM) et gagne +1 PO d\'attaque pour ce tour.',
      manaCost: 80, range: 1, cooldown: 3, cdMin: 1,
      damageType: null, baseDamage: 0, adRatio: 0, apRatio: 0,
      targetType: 'faena_w', zone: null, effects: []
    },
    {
      id: 'faena_r', name: 'Flèches de douleur',
      description: 'Inflige 50 + 0,7 AD + % chance de coup critique dégâts physiques dans une zone 1-3-1 (portée 5). Peut être critique selon votre % de chance critique.',
      manaCost: 130, range: 5, cooldown: 9, cdMin: 2,
      damageType: 'physical', baseDamage: 50, adRatio: 0.7, apRatio: 0,
      targetType: 'faena_r', zone: null, effects: []
    }
  ]
};

HERO_TYPES['dpt_4'] = {
  id: 'dpt_4', name: 'Cupidon', role: 'DPT', roleId: 'dpt', roleOrder: 4,
  colorFill: '#1d6a39', colorStroke: '#27ae60',
  portrait: 'assets/heroes/cupidon.png',
  passive: 'cupidon_passive',
  maxHP: 2000, maxMana: 250, hpRegen: 50, manaRegen: 30,
  ad: 50, ap: 0, armor: 0, mr: 0, lifeSteal: 0, pm: 4, po: 5,
  spells: [
    {
      id: 'cupidon_q', name: 'Flèche d\'amour',
      description: 'Zone 1-3-1 : inflige 70 + 0,8 AD dégâts physiques et retire 1 PM aux ennemis touchés.',
      manaCost: 70, range: 5, cooldown: 4, cdMin: 1,
      damageType: 'physical', baseDamage: 70, adRatio: 0.8, apRatio: 0,
      targetType: 'diamond_zone', zone: { size: 1 },
      effects: [{ type: 'slow', pmReduction: 1, turns: 1 }]
    },
    {
      id: 'cupidon_w', name: 'Dans les nuages',
      description: 'Dash de 2 cases en avant à travers un mur (et à travers un mur seulement).',
      manaCost: 80, range: 2, cooldown: 2, cdMin: 1,
      damageType: null, baseDamage: 0, adRatio: 0, apRatio: 0,
      targetType: 'stealth_dash', throughWallOnly: true, zone: null, effects: []
    },
    {
      id: 'cupidon_r', name: 'L\'amour fou',
      description: 'Zone 1-3-5-3-1 : les héros ennemis se déplacent dans des directions aléatoires lorsqu\'ils traversent cette zone.',
      manaCost: 100, range: 5, cooldown: 12, cdMin: 2,
      damageType: null, baseDamage: 0, adRatio: 0, apRatio: 0,
      targetType: 'diamond_zone', zone: { size: 2 }, effects: []
    }
  ]
};

HERO_TYPES['dpt_5'] = {
  id: 'dpt_5', name: 'Quackshot', role: 'DPT', roleId: 'dpt', roleOrder: 4,
  colorFill: '#1d6a39', colorStroke: '#27ae60',
  portrait: 'assets/heroes/quackshot.jpg',
  passive: 'quackshot_passive',
  maxHP: 2000, maxMana: 250, hpRegen: 50, manaRegen: 30,
  ad: 50, ap: 0, armor: 0, mr: 0, lifeSteal: 0, pm: 4, po: 5,
  spells: [
    {
      id: 'quackshot_q', name: 'Chasse à l\'épuisement',
      description: 'Inflige 60 + 0,8 AD dégâts physiques. À 8+ charges : perd 2 PM (1 tour). À 16+ charges : root (1 tour).',
      manaCost: 100, range: 5, cooldown: 4, cdMin: 1,
      damageType: 'physical', baseDamage: 60, adRatio: 0.8, apRatio: 0,
      targetType: 'enemy_hero', zone: null, effects: []
    },
    {
      id: 'quackshot_w', name: 'Changement de proie',
      description: '50% des charges de la cible actuelle sont transférées sur une autre cible.',
      manaCost: 0, range: 5, cooldown: 0, cdMin: 0,
      damageType: null, baseDamage: 0, adRatio: 0, apRatio: 0,
      targetType: 'enemy_hero', zone: null, effects: []
    },
    {
      id: 'quackshot_r', name: 'Coup de grâce',
      description: 'Consomme toutes les charges et inflige 25 + 0,10 AD dégâts physiques par charge.',
      manaCost: 100, range: 100, cooldown: 9, cdMin: 2,
      damageType: 'physical', baseDamage: 25, adRatio: 0.10, apRatio: 0,
      targetType: 'enemy_hero', ignoresLoS: true, zone: null, effects: []
    }
  ]
};

HERO_TYPES['mage_5'] = {
  id: 'mage_5', name: 'Pibot', role: 'MAGE', roleId: 'mage', roleOrder: 3,
  colorFill: '#154360', colorStroke: '#2980b9',
  portrait: 'assets/heroes/pibot.png',
  passive: 'pibot_passive',
  maxHP: 2100, maxMana: 300, hpRegen: 40, manaRegen: 30,
  ad: 50, ap: 0, armor: 0, mr: 0, lifeSteal: 0, pm: 4, po: 1,
  spells: [
    {
      id: 'pibot_q', name: 'Pinces robotiques',
      description: 'Attire un ennemi au corps à corps en ligne droite et lui inflige 110 + 0,8 AP dégâts magiques.',
      manaCost: 70, range: 6, cooldown: 3, cdMin: 1,
      damageType: 'magical', baseDamage: 110, adRatio: 0, apRatio: 0.8,
      targetType: 'enemy_hero', requiresLine: true, pullCells: 20, zone: null, effects: []
    },
    {
      id: 'pibot_w', name: 'Station de recharge',
      description: 'Actif (sur soi-même) : la prochaine attaque de base de Pibot inflige 40 + 1,1 AP dégâts magiques supplémentaires.',
      manaCost: 100, range: 0, cooldown: 4, cdMin: 1,
      damageType: 'magical', baseDamage: 40, adRatio: 0, apRatio: 1.1,
      targetType: 'pibot_w', zone: null, effects: []
    },
    {
      id: 'pibot_r', name: 'Méga-Pibot',
      description: 'Inflige 110 + 0,9 AP dégâts magiques dans une zone 1-3-1 en ligne droite (portée 5) et gagne un bouclier égal à 1×AP pendant 2 tours.',
      manaCost: 120, range: 5, cooldown: 10, cdMin: 2,
      damageType: 'magical', baseDamage: 110, adRatio: 0, apRatio: 0.9,
      targetType: 'pibot_r', zone: null, effects: []
    }
  ]
};

// Ordered list of role IDs for display
HERO_TYPES['support_5'] = {
  id: 'support_5', name: 'Gabriel', role: 'SUPPORT', roleId: 'support', roleOrder: 5,
  portrait: 'assets/heroes/gabriel.png', passive: 'gabriel_passive',
  maxHP: 2250, maxMana: 220, hpRegen: 50, manaRegen: 25,
  ad: 50, ap: 0, armor: 0, mr: 0, lifeSteal: 0, pm: 4, po: 4,
  spells: [
    {
      id: 'gabriel_q', name: 'Bénédiction',
      description: 'Zone 1-3-1 : les alliés présents gagnent un bouclier de 60 + 0,6×AP pendant 3 tours. Les ennemis subissent 60 + 0,6×AP dégâts magiques.',
      manaCost: 120, range: 5, cooldown: 4,
      damageType: 'magical', baseDamage: 60, adRatio: 0, apRatio: 0.6,
      targetType: 'diamond_zone', zone: { shape: 'diamond', size: 1 },
      allyShield: true, shieldBase: 60, shieldAPRatio: 0.6, shieldTurns: 3,
      effects: []
    },
    {
      id: 'gabriel_w', name: 'Parole Divine',
      description: 'Zone 1-3-1 : centre immobilise (root), autres cases retirent 2 PM. Inflige 70 + 0,7×AP dégâts magiques aux ennemis.',
      manaCost: 80, range: 6, cooldown: 4,
      damageType: 'magical', baseDamage: 70, adRatio: 0, apRatio: 0.7,
      targetType: 'diamond_zone', zone: { shape: 'diamond', size: 1 },
      effects: [{ type: 'root', turns: 1 }]
    },
    {
      id: 'gabriel_r', name: 'Destinée',
      description: 'Rend un allié invincible jusqu\'à la fin de son prochain tour (aucun dégât ni débuff). Supprime ses débuffs actuels.',
      manaCost: 110, range: 5, cooldown: 9,
      damageType: null, baseDamage: 0, adRatio: 0, apRatio: 0,
      targetType: 'ally_hero', invincibility: true,
      effects: []
    }
  ]
};

HERO_TYPES['roam_4'] = {
  id: 'roam_4', name: 'Noyala', role: 'ROAM', roleId: 'roam', roleOrder: 2,
  portrait: 'assets/heroes/noyala.png', passive: 'noyala_passive',
  maxHP: 2150, maxMana: 200, hpRegen: 35, manaRegen: 20,
  ad: 40, ap: 0, armor: 0, mr: 0, lifeSteal: 0, pm: 5, po: 5,
  spells: [
    {
      id: 'noyala_q', name: 'Invocation de Loups',
      description: 'Invoque un loup (100 PV, PM = Noyala) sur une case adjacente. Les loups collectent les zones ROAM. Quand un loup arrive adjacent à un ennemi, il meurt et lui inflige 50 + 0,7×AD dégâts physiques.',
      manaCost: 80, range: 1, cooldown: 6,
      damageType: 'physical', baseDamage: 50, adRatio: 0.7, apRatio: 0,
      targetType: 'noyala_q', effects: []
    },
    {
      id: 'noyala_w', name: 'Piège du Trappeur',
      description: 'Pose un piège permanent (portée 3). L\'ennemi qui marche dessus subit 60 + 1,3×AD dégâts physiques.',
      manaCost: 70, range: 3, cooldown: 3,
      damageType: 'physical', baseDamage: 60, adRatio: 1.3, apRatio: 0,
      targetType: 'trap', permanent: true, effects: []
    },
    {
      id: 'noyala_r', name: 'Loup et Moi',
      description: 'Échange la position de Noyala avec un de ses loups. Si elle finit son tour adjacent à un ennemi, celui-ci subit 130 + 1,1×AD dégâts physiques.',
      manaCost: 110, range: 999, cooldown: 10,
      damageType: 'physical', baseDamage: 130, adRatio: 1.1, apRatio: 0,
      targetType: 'noyala_r', effects: []
    }
  ]
};

HERO_TYPES['solo_4'] = {
  id: 'solo_4', name: 'Grolith', role: 'Solo', roleId: 'solo', roleOrder: 1,
  portrait: 'assets/heroes/grolith.png', passive: 'grolith_passive',
  maxHP: 3000, maxMana: 400, hpRegen: 45, manaRegen: 50,
  ad: 50, ap: 0, armor: 0, mr: 0, lifeSteal: 0, pm: 3, po: 1,
  spells: [
    {
      id: 'grolith_q', name: 'Rock and Roll',
      description: 'La prochaine attaque de base inflige 20 + 0,3×AP + 0,5×Bouclier dégâts magiques supplémentaires.',
      manaCost: 110, range: 0, cooldown: 3,
      damageType: null, baseDamage: 20, adRatio: 0, apRatio: 0.3,
      targetType: 'self',
      empoweredAttack: { baseDamage: 20, apRatio: 0.3, shieldRatio: 0.5, damageType: 'magical' },
      effects: []
    },
    {
      id: 'grolith_w', name: 'Tomber à Pic',
      description: 'Pousse un ennemi adjacent de 3 cases et lui inflige 120 + 0,4×AP dégâts magiques.',
      manaCost: 80, range: 1, cooldown: 4,
      damageType: 'magical', baseDamage: 120, adRatio: 0, apRatio: 0.4,
      targetType: 'push_enemy',
      effects: []
    },
    {
      id: 'grolith_r', name: 'Éboulement',
      description: 'Tous les ennemis adjacents à un mur dans un rayon de 20 cases (Manhattan) reçoivent 120 + 0,6×AP dégâts magiques et sont stun 1 tour.',
      manaCost: 130, range: 20, cooldown: 12, initialCooldown: 1,
      damageType: 'magical', baseDamage: 120, adRatio: 0, apRatio: 0.6,
      targetType: 'no_target',
      grolihtEboulement: true,
      effects: [{ type: 'stun', turns: 1 }]
    },
    {
      id: 'solo_recall', name: 'Rappel',
      description: 'Se téléporte sur une case adjacente à un allié (portée illimitée). Réactivez pour retourner à votre case de départ.',
      manaCost: 80, range: 99, cooldown: 7, cdMin: 7,
      damageType: null, baseDamage: 0, adRatio: 0, apRatio: 0,
      targetType: 'solo_recall', zone: null, effects: [],
      icon: 'img/spells/solo_recall.png'
    }
  ]
};

HERO_TYPES['solo_5'] = {
  id: 'solo_5', name: 'Salena', role: 'Solo', roleId: 'solo', roleOrder: 1,
  portrait: 'assets/heroes/salena.png', passive: 'salena_passive',
  maxHP: 2500, maxMana: 400, hpRegen: 45, manaRegen: 50,
  ad: 50, ap: 0, armor: 0, mr: 0, lifeSteal: 0, pm: 3, po: 2,
  spells: [
    {
      id: 'salena_q', name: 'Destruction',
      description: 'Salena se dasse sur une cible en ligne droite (portée 2) et lui inflige 50 + 0,7×AP dégâts magiques. La cible perd 20% de sa RM (peut devenir négatif) pendant 2 tours.',
      manaCost: 70, range: 2, cooldown: 5,
      damageType: 'magical', baseDamage: 50, adRatio: 0, apRatio: 0.7,
      targetType: 'dash_to_enemy', lineOnly: true, zone: null, effects: [{ type: 'mr_shred', pct: 20, turns: 2 }]
    },
    {
      id: 'salena_w', name: 'Découpage',
      description: 'Ce tour-ci, vos attaques de base infligent 3% (+0,02×AP) des HP max de la cible en dégâts bruts supplémentaires.',
      manaCost: 80, range: 0, cooldown: 4,
      damageType: null, baseDamage: 0, adRatio: 0, apRatio: 0,
      targetType: 'no_target', decoupage: true, zone: null, effects: []
    },
    {
      id: 'salena_r', name: 'Ligne de mire',
      description: 'Les ennemis présents sur une ligne (1 à 5 cases) subissent 150 + 0,9×AP dégâts magiques.',
      manaCost: 110, range: 5, minRange: 1, maxRange: 5, cooldown: 11,
      damageType: 'magical', baseDamage: 150, adRatio: 0, apRatio: 0.9,
      targetType: 'line_zone', zone: null, effects: []
    },
    {
      id: 'solo_recall', name: 'Rappel',
      description: 'Se téléporte sur une case adjacente à un allié (portée illimitée). Réactivez pour retourner à votre case de départ.',
      manaCost: 80, range: 99, cooldown: 7, cdMin: 7,
      damageType: null, baseDamage: 0, adRatio: 0, apRatio: 0,
      targetType: 'solo_recall', zone: null, effects: [],
      icon: 'img/spells/solo_recall.png'
    }
  ]
};

HERO_TYPES['support_6'] = {
  id: 'support_6', name: 'Fenino', role: 'SUPPORT', roleId: 'support', roleOrder: 5,
  colorFill: '#9a6b0e', colorStroke: '#f39c12',
  portrait: 'assets/heroes/fenino.png',
  passive: 'fenino_passive',
  maxHP: 2100, maxMana: 420, hpRegen: 50, manaRegen: 25,
  ad: 50, ap: 0, armor: 0, mr: 0, lifeSteal: 0, pm: 4, po: 1,
  spells: [
    {
      id: 'fenino_q', name: 'Ton meilleur ami',
      description: 'Dash sur une case adjacente à un allié (portée 4) et le soigne de 50 + 0,8×AP.',
      manaCost: 80, range: 4, cooldown: 4,
      damageType: null, baseDamage: 0, adRatio: 0, apRatio: 0,
      healBase: 50, healApRatio: 0.8,
      targetType: 'fenino_q', zone: null, effects: []
    },
    {
      id: 'fenino_w', name: 'On s\'arrête',
      description: 'Dash sur une case adjacente à un ennemi (portée 3) et lui inflige 180 + 0,3×AP dégâts magiques. La cible perd 4 PM ce tour.',
      manaCost: 110, range: 3, cooldown: 5,
      damageType: 'magical', baseDamage: 180, adRatio: 0, apRatio: 0.3,
      targetType: 'fenino_w', zone: null,
      effects: [{ type: 'slow', pmReduction: 4, turns: 1 }]
    },
    {
      id: 'fenino_r', name: 'Figez vous !',
      description: 'Ce tour, chaque ennemi adjacent à Fenino lors d\'un déplacement ou d\'un dash est root et voit ses dégâts réduits de 30% à son prochain tour.',
      manaCost: 130, range: 0, cooldown: 10,
      damageType: null, baseDamage: 0, adRatio: 0, apRatio: 0,
      targetType: 'no_target', feninoR: true, zone: null, effects: []
    }
  ]
};

const ROLE_ORDER = ['solo', 'roam', 'mage', 'dpt', 'support'];

// ============================================================
// Couleurs par défaut par rôle
const ROLE_COLORS = {
  solo:    { fill: '#922b21', stroke: '#e74c3c' },
  roam:    { fill: '#5b2c6f', stroke: '#9b59b6' },
  mage:    { fill: '#154360', stroke: '#2980b9' },
  dpt:     { fill: '#1d6a39', stroke: '#27ae60' },
  support: { fill: '#9a6b0e', stroke: '#f39c12' },
};

// Appliquer les couleurs par rôle à tous les héros sans couleur explicite
Object.values(HERO_TYPES).forEach(t => {
  const rc = ROLE_COLORS[t.roleId] || ROLE_COLORS.mage;
  if (!t.colorFill)   t.colorFill   = rc.fill;
  if (!t.colorStroke) t.colorStroke = rc.stroke;
});

// ============================================================
// HERO INSTANCE FACTORY
// ============================================================

function createHeroInstance(typeId, playerIdx, slotIdx) {
  const t = HERO_TYPES[typeId];
  const _rc = ROLE_COLORS[t.roleId] || ROLE_COLORS.mage;
  return {
    // Identity
    id:          typeId,
    instanceId:  `p${playerIdx}_${typeId}`,
    name:        t.name,
    role:        t.role,
    roleId:      t.roleId,
    roleOrder:   t.roleOrder,
    colorFill:   t.colorFill   || _rc.fill,
    colorStroke: t.colorStroke || _rc.stroke,
    playerIdx,
    slotIdx,

    // Stats (mutable)
    maxHP:       t.maxHP,
    currentHP:   t.maxHP,
    maxMana:     t.maxMana,
    currentMana: t.maxMana,
    hpRegen:     t.hpRegen,
    manaRegen:   t.manaRegen,
    ad:          t.ad,
    ap:          t.ap,
    armor:       t.armor,
    mr:          t.mr,
    lifeSteal:   t.lifeSteal,
    pm:          t.pm,
    po:          t.po,
    shield:              0,
    shieldTurnsLeft:     0,   // 0 = no timer; >0 = expires after N hero turns
    daggerShield:        0,
    dealtDamageLastTurn: false,
    gold:        500,   // ← gold belongs to the hero, not the player

    // Chronos passive state
    chronosStartPos: null,    // position at turn start (for Rollback)

    // Shana buff state
    bonusPMNextTurn: 0,       // extra PM granted by Miaou Miaou!, applied at next turn start

    // Layia passive state
    layiaBonusNextAttack: 0,  // bonus damage on next auto (set by Petit Bond)
    layiaBonusPOTurn:     0,  // extra PO this turn only (set by Vision)
    layiaTurnCount:       0,  // counts hero turns for +1 PO every 5 turns

    // Cupidon passive state
    cupidonAttackedLastTurn: new Set(),  // tracks enemies attacked by Cupidon last turn (applies protection this turn)
    cupidonAttackedThisTurn: new Set(),  // tracks enemies attacked by Cupidon this turn (protection next turn)

    // Quackshot passive state
    quackshotCharges: {},  // enemyInstanceId → charge count
    quackshotCurrentTarget: null,  // current auto-attack target instanceId


    // Focus Lointain passive state
    focusLointainMarks: {},  // { targetInstanceId: true } — reset each hero turn

    // Écho du Cœur passive state
    echoDuCoeurCharges: 0,  // accumulated charges (35% of damage dealt to enemies)

    // Plastron du Diable Immortel passive state
    plastronDiableTriggerTurn: 0,  // globalTurn at which the delayed explosion fires (0 = inactive)

    // Hornet passive state
    hornetHarpoonedTargets: {},  // { targetInstanceId: expiryTurn }
    hornetDidNotUsePMThisTurn: true,  // tracks if Hornet used any PM this turn
    hornetPMBonusNextTurn: 0,  // extra PM from passive

    // Solo recall state
    soloRecallActive: false,   // true after first cast, allows reactivation (return to spawn)
    spawnPosition: null,       // saved at game start

    // Bâton d'Ancienneté — Développement ancien
    batonAncienStacks: 0,

    // Attack count system (supports future items that grant extra attacks)
    extraAutoAttacks: 0,

    // Item passive stats
    critChance:        0,
    armorShred:        0,   // armor already removed by Épée Cinglante (restored on expiry)
    armorShredTurns:   0,   // turns remaining on shred
    bonusSpellRange:   0,
    goldPerTurn:       0,
    healEfficiency:    0,
    goldSharePct:      0,
    manaOnSpell:       0,
    manaOnSpellMax:    0,
    manaOnSpellGained: 0,
    manaRegenPct:      0,
    cdReduction:       0,

    // Passive & status effects
    passive:          t.passive ?? null,
    empoweredAttack:  null,   // { adRatio, apRatio } set by Renforcement
    statusEffects: [],
    hemorrhageTurns:   0,      // reduces heals received (incl. lifesteal) by 50%
    maledictionTurns:  0,      // reduces spell range by 3 (min 1)
    rootTurns:         0,      // blocks movement and dash spells
    invincibleTurnsLeft: 0,    // blocks all damage and debuffs
    voileCooldown:    0,       // Voile Antimagie: cooldown before next spell block

    // Spells (deep copy so cooldowns are independent)
    spells:    t.spells.map(s => ({ ...s })),
    cooldowns: Object.fromEntries(t.spells.map(s => [s.id, s.initialCooldown ?? 0])),

    // Portrait (for scoreboard)
    portrait: t.portrait || null,

    // KDA
    kills:   0,
    deaths:  0,
    assists: 0,
    totalGoldEarned: 500,

    // Contribution tracking (for assists)
    damageContributors: {},  // { heroId: globalTurn }
    debuffContributors: {},  // { heroId: globalTurn }
    buffedBy: {},            // { heroId: globalTurn }

    // DOTs (damage over time)
    dots: [],

    // State
    position: null,
    isAlive:  true,
    items:    []
  };
}
