// ============================================================
// ENTRY POINT
// ============================================================

const PASSIVE_LABELS = {
  rock_solid:    'Roche Solide — Les dégâts physiques subis sont réduits de 25%.',
  skjer_passive:   'Instinct de prédateur — En tuant un ennemi, Skjer récupère tout son mana et tous ses points de mouvement, et tous ses cooldowns sont remis à zéro.',
  electro_passive:  'Surcharge — Chaque ennemi touché par un sort d\'Electro lui confère +5 AP (permanent).',
  masello_passive:  'Cohésion — Au début de son tour, Masello gagne +1 PM par allié à moins de 7 cases (distance Manhattan).',
  decigeno_passive: 'Predator Mode — Lorsque Decigeno utilise une action (attaque ou sort), il consomme tous ses PM restants et gagne +15% dégâts par PM consommé jusqu\'à la fin du tour.',
  voodoo_passive:   'Hémorragie — Chaque sort de Voodoo qui touche un ennemi lui inflige Hémorragie : réduit les soins reçus de 50% (vol de vie inclus) pendant 1 tour.',
  vadro_passive:    'Soif de Sang — Vadro possède 50% de vol de vie (cumule avec les items).',
  shallah_passive:  'Architecte des Glyphes — Lorsque Shallah marche dans une glyphe qu\'il a posée, il gagne +1 PM pour ce tour.',
  layia_passive:    'Chasseresse — Les attaques de base touchent tous les ennemis à portée (commence à 1 PO ; héros à distance dès 2 PO). Gagne +1 PO toutes les 2 zones marron collectées.',
  chronos_passive:  'Maître du Temps — Chaque sort lancé rapporte 50 PO à Chronos.',
  shana_passive:    'Félin pour l\'autre — Quand Shana soigne un allié, elle se soigne aussi du même montant.',
  anastasia_passive: 'Soins Intéressés — Chaque fois qu\'Anastasia soigne un héros (allié ou elle-même), elle gagne 50 PO. Elle peut soigner des cibles à pleine vie.',
  fenino_passive:    'Impulsion — Lorsque Fenino effectue un dash (Sort 1 ou Sort 2), il gagne +1 PM jusqu\'à la fin de son tour.',
  dans_la_chair:      'Dans la chair — Chaque sort de Frigiel inflige 5% des HP max de la cible en dégâts bruts supplémentaires.',
  gros_calibre:       'Gros Calibre — Les attaques de base de Stank infligent les mêmes dégâts physiques à tous les ennemis dans un rayon de 4 cases autour de la cible.',
  sharagoth_passive:  'Plus forts ensemble — Au début de son tour, Sharagoth gagne un bouclier de 10% de ses HP max par allié présent à moins de 10 cases (Manhattan), pendant 2 tours.',
  vaillance:          'Vaillance — Le premier débuff appliqué à Ondine chaque tour est automatiquement annulé.',
  abyss_passive:      'Abysses mixtes — Abyss ne peut effectuer qu\'une attaque de base par tour. Elle inflige 0,9×AD dégâts physiques + 0,9×AP dégâts magiques + 0,1×AD + 0,1×AP dégâts bruts.',
  faena_passive:      'Coups critiques mortels — Chaque tranche de 10 AD donne +5% de dégâts critiques (base 350%). S\'applique aux attaques de base et aux Flèches de douleur.',
  pibot_passive:      'Batterie — Au début de chaque tour de Pibot, une case ⚡ apparaît à 5 cases ou moins. Passer dessus récupère 50% de la mana manquante.',
  gabriel_passive:    'Pas Léger — Au début du tour de chaque allié à moins de 7 cases de Gabriel, cet allié gagne +1 PM.',
  grolith_passive:    'Pierre qui roule — Grolith gagne 70 points de bouclier au début de chaque tour. Ce bouclier n\'expire jamais.',
  noyala_passive:     'Chasse — Noyala gagne +1 PM au début de son tour si elle est adjacente à un mur. Ses loups récupèrent leurs PM à chaque début de son tour.',
  salena_passive:     'Lame Magique — Chaque attaque de base de Salena inflige 0,3×AP dégâts magiques supplémentaires à la cible.',
  cupidon_passive:    'Amour fou — Si un adversaire contre qui vous avez envoyé une attaque de base au dernier tour vous attaque (sorts + AA), vous ne recevez que 50% des dégâts à la place (applique débuffs).',
  quackshot_passive:  'Marque du Chasseur — Chaque attaque de base ajoute une charge à l\'ennemi (cumulable). Changer de cible retire les charges de l\'ennemi précédent.',
  hornet_passive:     'Suture — Si Hornet n\'utilise aucun PM pendant son tour, elle se soigne de 80 + 1×AD HP, retire son hémorragie et gagne +3 PM au prochain tour.',
  egnamita_passive:   'Antimagie — 35% des dégâts magiques qu\'Egnamita inflige sont convertis en bouclier antimagie permanent (absorbe uniquement les dégâts magiques).',
  velna_passive:      'Lumière filante — Lorsque Velna effectue un dash, son prochain sort inflige 10% de dégâts magiques supplémentaires.',
  sinys_passive:      'Points de rage — Les sorts de Sinys ne coûtent pas de mana. 50% des dégâts encaissés sont stockés comme Rage (barre de mana). La Rage est dépensée et utilisée comme bonus par ses sorts. Sinys perd 10% de sa rage actuelle à chaque début de tour.'
};

const TARGET_LABELS = {
  enemy_hero:   'Héros ennemi',
  ally_hero:    'Héros allié',
  self:         'Soi-même',
  cell:         'Case libre',
  zone:         'Zone',
  diamond_zone: 'Zone en losange',
  no_target:    'Sans cible (portée automatique)',
  dash_to_enemy:  'Dash vers un héros ennemi',
  stealth_dash:   'Dash en ligne droite (traverse les murs)',
  pm_sacrifice:   'Instantané (sacrifice de PM)',
  dash_to_ally:   'Dash vers un héros allié',
  trap:           'Pose un piège sur une case',
  line_zone:      'Zone en ligne droite',
  place_glyph:    'Pose une glyphe (en ligne droite)',
  wind_glyph:     'Zone de poussée (en ligne droite)',
  swap_enemy:     'Échange de position avec un héros ennemi',
  push_enemy:     'Choisir une destination : pousse un ennemi vers cette case',
  hate_wall:      'Pose un mur de 3 cases bloquant la ligne de vue (direction orthogonale)',
  swap_ally:          'Échange de position avec un héros allié',
  dash_behind_enemy:  'Dash derrière un héros ennemi (ligne droite, portée 3)',
  lame_eau:           'Zone 3×3 lancée à 2 cases en ligne droite (se déplace chaque tour)',
  abyss_w:            'Dash en ligne droite (max 3 cases)',
  abyss_r:            'Dash sur un ennemi lointain (8–10 cases, sans ligne de vue)',
  cone_zone:          'Zone en cône devant le héros',
  bomb_zone:          'Zone en losange (bombardement sur 3 tours)',
  faena_w:            'Case adjacente (déplacement sans PM)',
  faena_r:            'Zone 1-3-1 — tir critique garanti (portée 5)',
  pibot_w:            'Téléportation sur la batterie active (portée 5, sans ligne de vue)',
  pibot_r:            'Zone 1-3-1 en ligne droite orthogonale (portée 5)',
  noyala_q:           'Invoque un loup sur une case adjacente libre',
  noyala_r:           'Échange de position avec un loup',
  egnamita_w:         'Zone en losange (1-3-5-3-1, portée 5)',
  velna_q:            'Dash 1–2 cases en ligne droite + zone 1-3-1 à 7 cases dans la direction du dash',
  velna_w:            'Zone perpendiculaire au lancer (3 cases, portée 6 en ligne droite)',
  velna_r:            'Rayon en ligne droite sur toute la carte (ignore les obstacles)'
};

const DMG_LABELS = {
  physical: 'Physique',
  magical:  'Magique'
};

function _spellEffectsText(effects) {
  if (!effects || !effects.length) return '';
  return effects.map(e => {
    if (e.type === 'slow')       return `Ralentit la cible (−${e.pmReduction} PM pendant ${e.turns} tour${e.turns > 1 ? 's' : ''})`;
    if (e.type === 'stun')       return `Étourdit les cibles (${e.turns} tour${e.turns > 1 ? 's' : ''})`;
    if (e.type === 'shield')     return `Bouclier de ${e.amount}`;
    if (e.type === 'hemorrhage') return `Hémorragie (soins −50% pendant ${e.turns} tour${e.turns > 1 ? 's' : ''})`;
    if (e.type === 'malediction')return `Malédiction (portée sorts −3 pendant ${e.turns} tour${e.turns > 1 ? 's' : ''})`;
    return e.type;
  }).join(' · ');
}

function _spellDmgText(spell) {
  if (!spell.damageType) {
    if (spell.healBase) return `Soigne ${spell.healBase}${spell.healApRatio ? ` + ${spell.healApRatio} AP` : ''}`;
    if (spell.shieldAmount) return `Bouclier ${spell.shieldAmount}${spell.adShieldRatio ? ` + ${spell.adShieldRatio} AD` : ''}`;
    return '';
  }
  const parts = [];
  if (spell.baseDamage) parts.push(spell.baseDamage);
  if (spell.adRatio)    parts.push(`${spell.adRatio} AD`);
  if (spell.apRatio)    parts.push(`${spell.apRatio} AP`);
  return `${parts.join(' + ')} dégâts ${DMG_LABELS[spell.damageType] || spell.damageType}`;
}

// ============================================================
// SCOREBOARD  (fin de partie + historique)
// ============================================================

function renderScoreboard(matchResult) {
  const teams = matchResult.players.map((player, pi) => {
    const rows = player.heroes.map(h => {
      const portrait = h.portrait
        ? `<img src="${h.portrait}" class="sb-portrait" alt="${h.name}">`
        : `<div class="sb-portrait-fallback" style="background:${h.colorFill}">${h.name[0]}</div>`;
      const items = h.items.map(id => {
        const it = EQUIPMENT[id];
        return it ? `<img src="${it.icon}" class="sb-item-icon" title="${it.name}" onerror="this.style.display='none'">` : '';
      }).join('');
      const dmgStr  = h.damageDealt ? `⚔ ${h.damageDealt.toLocaleString('fr-FR')}` : '';
      const healStr = h.healingDone ? `💚 ${h.healingDone.toLocaleString('fr-FR')}` : '';
      return `
        <div class="scoreboard-hero-row">
          ${portrait}
          <div class="sb-hero-info">
            <div style="display:flex;align-items:center;gap:8px">
              <span class="sb-name">${h.name}</span>
              <span class="sb-kda"><span>${h.kills}</span> / <span style="color:#e74c3c">${h.deaths}</span> / <span>${h.assists}</span></span>
              <span class="sb-gold">💰 ${h.totalGold}g</span>
              ${dmgStr  ? `<span class="sb-dmg">${dmgStr}</span>`   : ''}
              ${healStr ? `<span class="sb-heal">${healStr}</span>` : ''}
            </div>
            <div class="sb-items">${items}</div>
          </div>
        </div>`;
    }).join('');
    const teamGold = player.heroes.reduce((sum, h) => sum + (h.totalGold || 0), 0);
    const winnerBadge = player.won ? ' 🏆' : '';
    return `
      <div class="scoreboard-team${player.won ? ' winner' : ''}">
        <div class="scoreboard-team-header">${player.label}${winnerBadge}<span class="sb-team-gold">💰 ${teamGold}g</span></div>
        ${rows}
      </div>`;
  }).join('');
  const turnsLine = matchResult.turns != null
    ? `<div class="scoreboard-turns">Durée : ${matchResult.turns} tour${matchResult.turns > 1 ? 's' : ''}</div>`
    : '';
  return `<div class="scoreboard">${turnsLine}${teams}</div>`;
}

// ============================================================
// HISTORY SCREEN
// ============================================================

function renderHistoryScreen() {
  const body = document.getElementById('history-body');
  const matches = MatchHistory.getAll();
  if (!matches.length) {
    body.innerHTML = '<div style="color:var(--muted);padding:20px">Aucune partie enregistrée.</div>';
    return;
  }
  body.innerHTML = matches.map((m, i) => {
    const winnerLabel = m.winner === null ? 'Match nul' : `${m.players[m.winner]?.label || `Joueur ${m.winner + 1}`} gagne`;
    return `
      <div class="history-entry">
        <div class="history-entry-header">
          <span>${m.date}</span>
          <span class="history-entry-winner">${winnerLabel}</span>
        </div>
        ${renderScoreboard(m)}
      </div>`;
  }).join('');
}

function _renderHeroesSection() {
  const roleColors = { solo: '#e74c3c', roam: '#9b59b6', mage: '#2980b9', dpt: '#27ae60', support: '#f39c12' };
  const roleNames  = { solo: 'Solo', roam: 'Roam', mage: 'Mage', dpt: 'DPT', support: 'Support' };

  function _heroCard(h) {
    const roleColor  = roleColors[h.roleId] || '#58a6ff';
    const passiveHtml = h.passive
      ? `<div class="hc-passive"><span class="hc-passive-label">Passif</span> ${PASSIVE_LABELS[h.passive] || h.passive}</div>`
      : '';
    const statsHtml = `
      <div class="hc-stats">
        <div class="hc-stat"><span class="hc-stat-lbl">❤ HP</span><span>${h.maxHP}</span></div>
        <div class="hc-stat"><span class="hc-stat-lbl">🔵 Mana</span><span>${h.maxMana}</span></div>
        <div class="hc-stat"><span class="hc-stat-lbl">♻ Rég. HP</span><span>${h.hpRegen}/tour</span></div>
        <div class="hc-stat"><span class="hc-stat-lbl">💧 Rég. Mana</span><span>${h.manaRegen}/tour</span></div>
        <div class="hc-stat"><span class="hc-stat-lbl">⚔ AD</span><span>${h.ad}</span></div>
        <div class="hc-stat"><span class="hc-stat-lbl">✨ AP</span><span>${h.ap}</span></div>
        <div class="hc-stat"><span class="hc-stat-lbl">🛡 Armure</span><span>${h.armor}%</span></div>
        <div class="hc-stat"><span class="hc-stat-lbl">🔮 RM</span><span>${h.mr}%</span></div>
        <div class="hc-stat"><span class="hc-stat-lbl">🩸 Vol de vie</span><span>${h.lifeSteal}%</span></div>
        <div class="hc-stat"><span class="hc-stat-lbl">👟 PM</span><span>${h.pm}</span></div>
        <div class="hc-stat"><span class="hc-stat-lbl">🎯 PO</span><span>${h.po}</span></div>
      </div>`;
    const spellsHtml = h.spells.map(s => {
      const dmg = _spellDmgText(s);
      const fx  = _spellEffectsText(s.effects);
      const cdLabel = s.cooldown === 0 ? '0 (utilisable plusieurs fois)' : `${s.cooldown} tour${s.cooldown > 1 ? 's' : ''}`;
      return `
        <div class="hc-spell">
          <div class="hc-spell-header">
            <span class="hc-spell-name">${s.name}</span>
            <span class="hc-spell-meta">Portée ${s.range} · Coût ${s.manaCost} mana · CD ${cdLabel}</span>
          </div>
          <div class="hc-spell-target">${TARGET_LABELS[s.targetType] || s.targetType}</div>
          ${dmg ? `<div class="hc-spell-dmg hc-spell-dmg--${s.damageType || 'raw'}">${dmg}</div>` : ''}
          ${fx  ? `<div class="hc-spell-fx">${fx}</div>` : ''}
          ${s.description ? `<div class="hc-spell-desc">${s.description}</div>` : ''}
        </div>`;
    }).join('');
    return `
      <div class="hero-card">
        <div class="hc-top">
          ${h.portrait ? `<img src="${h.portrait}" class="hc-portrait" alt="${h.name}">` : `<div class="hc-portrait hc-portrait-fallback" style="background:${h.colorFill}">${h.name[0]}</div>`}
          <div class="hc-identity">
            <div class="hc-name">${h.name}</div>
            <div class="hc-role" style="color:${roleColor}">${h.role}</div>
            ${passiveHtml}
          </div>
        </div>
        ${statsHtml}
        <div class="hc-spells-title">Sorts</div>
        <div class="hc-spells">${spellsHtml}</div>
      </div>`;
  }

  const sections = ROLE_ORDER.map(roleId => {
    const heroes = Object.values(HERO_TYPES)
      .filter(h => h.portrait && h.roleId === roleId)
      .sort((a, b) => a.name.localeCompare(b.name));
    if (!heroes.length) return '';
    const color = roleColors[roleId] || '#58a6ff';
    return `
      <div class="heroes-role-group">
        <div class="heroes-role-title" style="color:${color}">${roleNames[roleId] || roleId}</div>
        <div class="heroes-role-cards">${heroes.map(_heroCard).join('')}</div>
      </div>`;
  }).join('');

  return sections || '<p class="heroes-empty">Aucun héros personnalisé défini.</p>';
}

let _infoItemsCat = 'all';

function _renderItemsSection(cat) {
  cat = cat || _infoItemsCat || 'all';

  const STAT_LABELS = {
    ad: '⚔ AD', ap: '✨ AP', maxHP: '❤ HP max', maxMana: '🔵 Mana max',
    armor: '🛡 Armure', mr: '🔮 RM', lifeSteal: '🩸 Vol de vie',
    hpRegen: '♻ Rég. HP', manaRegen: '💧 Rég. Mana', manaRegenPct: '💧 Rég. Mana %', pm: '👟 PM',
    cdReduction: '⏬ Réd. CD', bonusSpellRange: '🎯 Portée sorts',
    goldPerTurn: '💰 Or/tour', healEfficiency: '💚 Efficacité soins',
    goldSharePct: '🤝 Partage or', manaOnSpell: '💧 Mana/sort',
    manaOnSpellMax: '(max via passif)',
    critChance: '🎯 Crit %', extraAutoAttacks: '⚡ +1 Att./tour'
  };

  const CAT_FILTERS = {
    all:          () => true,
    starter:      it => !!it.isStarter,
    boots:        it => !!it.isBoots,
    ad:           it => (it.stats.ad || 0) > 0,
    ap:           it => (it.stats.ap || 0) > 0,
    hp:           it => (it.stats.maxHP || 0) > 0,
    res:          it => (it.stats.armor || 0) > 0 || (it.stats.mr || 0) > 0,
    mana:         it => (it.stats.maxMana || 0) > 0 || (it.stats.manaRegen || 0) > 0 || (it.stats.manaRegenPct || 0) > 0,
    util:         it => (it.stats.lifeSteal || 0) > 0 || (it.stats.cdReduction || 0) > 0 ||
                        (it.stats.hpRegen || 0) > 0 || (it.stats.goldPerTurn || 0) > 0 ||
                        (it.stats.healEfficiency || 0) > 0 || (it.stats.manaOnSpell || 0) > 0 ||
                        (it.stats.goldSharePct || 0) > 0 || (it.stats.bonusSpellRange || 0) > 0 ||
                        (it.stats.pm || 0) > 0,
    crit:         it => (it.stats.critChance || 0) > 0,
    extra_attack: it => (it.stats.extraAutoAttacks || 0) > 0,
  };

  const CAT_LABELS = [
    { cat: 'all',          label: 'Tout' },
    { cat: 'starter',      label: 'Starter' },
    { cat: 'boots',        label: 'Bottes' },
    { cat: 'ad',           label: 'AD' },
    { cat: 'ap',           label: 'AP' },
    { cat: 'hp',           label: 'HP' },
    { cat: 'res',          label: 'Armure / RM' },
    { cat: 'mana',         label: 'Mana' },
    { cat: 'util',         label: 'Utilitaire' },
    { cat: 'crit',         label: 'Crit %' },
    { cat: 'extra_attack', label: '+1 Att./tour' },
  ];

  const filterFn = CAT_FILTERS[cat] || CAT_FILTERS.all;

  const tierLabels = { 1: 'Tier 1 — Starters', 2: 'Tier 2', 3: 'Tier 3' };
  const allItems = Object.values(EQUIPMENT).filter(filterFn);
  const byTier = {};
  allItems.forEach(it => {
    if (!byTier[it.tier]) byTier[it.tier] = [];
    byTier[it.tier].push(it);
  });

  const filterTabsHtml = `<div id="item-filter-tabs">${
    CAT_LABELS.map(({ cat: c, label }) =>
      `<button class="item-filter-tab${c === cat ? ' active' : ''}" data-cat="${c}">${label}</button>`
    ).join('')
  }</div>`;

  const tiersHtml = Object.keys(byTier).sort().map(tier => {
    const cards = byTier[tier].map(it => {
      const statsLines = Object.entries(it.stats || {}).map(([k, v]) => {
        if (k === 'manaOnSpellMax') return null;
        const lbl = STAT_LABELS[k] || k;
        const suffix = ['armor','mr','lifeSteal','healEfficiency','goldSharePct','manaRegenPct','critChance'].includes(k) ? '%' : '';
        return `<div class="ic-stat"><span class="ic-stat-lbl">${lbl}</span><span>+${v}${suffix}</span></div>`;
      }).filter(Boolean).join('');

      const recipeHtml = it.recipe && it.recipe.length
        ? `<div class="ic-recipe">Composants : ${it.recipe.map(id => EQUIPMENT[id] ? EQUIPMENT[id].name : id).join(' + ')}</div>`
        : '';

      const restrictHtml = it.roleRestrictionNote
        ? `<div class="ic-restrict">${it.roleRestrictionNote}</div>`
        : '';

      const passiveHtml = it.passive
        ? `<div class="ic-passive"><span class="ic-passive-lbl">Passif</span> ${it.passive}</div>`
        : '';

      return `
        <div class="item-card">
          <div class="ic-top">
            <img src="${it.icon}" class="ic-icon" alt="${it.name}" onerror="this.style.display='none'">
            <div class="ic-info">
              <div class="ic-name">${it.name}</div>
              <div class="ic-cost">${it.totalCost}g${it.recipe && it.recipe.length ? ` (forge : +${it.combineCost}g)` : ''}</div>
              ${restrictHtml}
            </div>
          </div>
          <div class="ic-stats">${statsLines}</div>
          ${recipeHtml}
          ${passiveHtml}
        </div>`;
    }).join('');

    return `<div class="items-tier-group"><div class="items-tier-title">${tierLabels[tier] || 'Tier ' + tier}</div><div class="items-grid">${cards}</div></div>`;
  }).join('') || '<p class="heroes-empty">Aucun item dans cette catégorie.</p>';

  return filterTabsHtml + tiersHtml;
}

// ============================================================
// STATS SCREEN
// ============================================================

function renderStatsScreen(tab) {
  const body = document.getElementById('stats-body');
  body.innerHTML = tab === 'items' ? _renderItemStatsSection() : _renderHeroStatsSection();
  document.querySelectorAll('.stats-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  _makeTableSortable(body.querySelector('.stats-table'));
}

function _makeTableSortable(table) {
  if (!table) return;
  let sortCol = -1, sortDir = 1;

  table.querySelectorAll('th').forEach((th, colIdx) => {
    th.style.cursor = 'pointer';
    th.title = 'Cliquer pour trier';
    th.addEventListener('click', () => {
      sortDir = sortCol === colIdx ? -sortDir : -1;  // default: descending on first click
      sortCol = colIdx;

      // Update indicators
      table.querySelectorAll('th').forEach(h => h.classList.remove('st-sort-asc', 'st-sort-desc'));
      th.classList.add(sortDir === 1 ? 'st-sort-asc' : 'st-sort-desc');

      const tbody = table.querySelector('tbody');
      const rows  = Array.from(tbody.querySelectorAll('tr'));
      rows.sort((a, b) => {
        const aText = a.cells[colIdx]?.textContent.trim().replace('%', '') || '';
        const bText = b.cells[colIdx]?.textContent.trim().replace('%', '') || '';
        const aNum  = parseFloat(aText);
        const bNum  = parseFloat(bText);
        // '—' values always go to bottom regardless of sort direction
        const aEmpty = aText === '—' || aText === '';
        const bEmpty = bText === '—' || bText === '';
        if (aEmpty && bEmpty) return 0;
        if (aEmpty) return 1;
        if (bEmpty) return -1;
        if (!isNaN(aNum) && !isNaN(bNum)) return sortDir * (aNum - bNum);
        return sortDir * aText.localeCompare(bText);
      });
      rows.forEach(r => tbody.appendChild(r));
    });
  });
}

function _renderHeroStatsSection() {
  const data       = Stats.getData();
  const totalGames = Stats.getTotalGames();
  const heroes     = Object.values(HERO_TYPES).sort((a, b) => a.name.localeCompare(b.name));

  const rows = heroes.map(h => {
    const s = data.heroes[h.id] || {};
    const games    = s.games   || 0;
    const wins     = s.wins    || 0;
    const picks    = s.picks   || 0;
    const bans     = s.bans    || 0;
    const dmgPhys  = s.dmgPhys || 0;
    const dmgMag   = s.dmgMag  || 0;
    const heals    = s.heals   || 0;
    const shields  = s.shields || 0;

    const kills    = s.kills   || 0;
    const deaths   = s.deaths  || 0;
    const assists  = s.assists || 0;
    const wr       = games  > 0 ? Math.round(wins  / games  * 100) : '—';
    const pickPct  = totalGames > 0 ? Math.round(picks / totalGames * 100) : '—';
    const banPct   = totalGames > 0 ? Math.round(bans  / totalGames * 100) : '—';
    const avgPhys  = games  > 0 ? Math.round(dmgPhys / games) : '—';
    const avgMag   = games  > 0 ? Math.round(dmgMag  / games) : '—';
    const avgTotal = games  > 0 ? Math.round((dmgPhys + dmgMag) / games) : '—';
    const avgHeal  = games  > 0 ? Math.round(heals   / games) : '—';
    const avgShield= games  > 0 ? Math.round(shields  / games) : '—';
    const avgK     = games  > 0 ? (kills   / games).toFixed(1) : '—';
    const avgD     = games  > 0 ? (deaths  / games).toFixed(1) : '—';
    const avgA     = games  > 0 ? (assists / games).toFixed(1) : '—';
    const kda      = deaths > 0 ? ((kills + assists) / deaths).toFixed(2) : kills + assists > 0 ? '∞' : '—';

    const portrait = h.portrait
      ? `<img src="${h.portrait}" class="st-portrait" alt="${h.name}">`
      : `<div class="st-portrait st-portrait-fallback" style="background:${h.colorFill}">${h.name[0]}</div>`;

    return `
      <tr>
        <td class="st-hero-cell">${portrait}<span>${h.name}</span></td>
        <td>${games}</td>
        <td class="st-wr">${typeof wr === 'number' ? wr + '%' : wr}</td>
        <td>${typeof pickPct === 'number' ? pickPct + '%' : pickPct}</td>
        <td>${typeof banPct  === 'number' ? banPct  + '%' : banPct}</td>
        <td>${avgTotal}</td>
        <td>${avgPhys}</td>
        <td>${avgMag}</td>
        <td>${avgHeal}</td>
        <td>${avgShield}</td>
        <td>${avgK} / ${avgD} / ${avgA}</td>
        <td>${kda}</td>
      </tr>`;
  }).join('');

  return `
    <table class="stats-table">
      <thead>
        <tr>
          <th>Héros</th>
          <th>Parties</th>
          <th>WR %</th>
          <th>Pick %</th>
          <th>Ban %</th>
          <th>Dmg total moy.</th>
          <th>Dmg phys. moy.</th>
          <th>Dmg mag. moy.</th>
          <th>Soins moy.</th>
          <th>Boucliers moy.</th>
          <th>K / D / A moy.</th>
          <th>KDA ratio</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function _renderItemStatsSection() {
  const data       = Stats.getData();
  const totalGames = Stats.getTotalGames();
  const items      = Object.values(EQUIPMENT).sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name));

  const rows = items.map(it => {
    const s     = data.items[it.id] || {};
    const picks = s.picks || 0;
    const wins  = s.wins  || 0;

    const pickPct = totalGames > 0 ? Math.round(picks / totalGames * 100) : '—';
    const wr      = picks     > 0 ? Math.round(wins  / picks  * 100) : '—';

    return `
      <tr>
        <td class="st-item-cell">
          <img src="${it.icon}" class="st-item-icon" alt="${it.name}" onerror="this.style.display='none'">
          <span>${it.name}</span>
          <span class="st-item-tier">T${it.tier}</span>
        </td>
        <td>${picks}</td>
        <td class="st-wr">${typeof wr === 'number' ? wr + '%' : wr}</td>
        <td>${typeof pickPct === 'number' ? pickPct + '%' : pickPct}</td>
      </tr>`;
  }).join('');

  return `
    <table class="stats-table">
      <thead>
        <tr>
          <th>Item</th>
          <th>Achats</th>
          <th>WR %</th>
          <th>Sélection %</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function renderInfoScreen(tab) {
  const body = document.getElementById('heroes-body');
  if (tab === 'items') {
    body.innerHTML = _renderItemsSection(_infoItemsCat);
    body.querySelector('#item-filter-tabs').addEventListener('click', e => {
      const btn = e.target.closest('.item-filter-tab');
      if (!btn) return;
      _infoItemsCat = btn.dataset.cat;
      renderInfoScreen('items');
    });
  } else {
    body.innerHTML = _renderHeroesSection();
  }
  document.querySelectorAll('.info-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
}

let game, renderer, input, editorUI, bot;

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

window.addEventListener('DOMContentLoaded', () => {

  // Appliquer les overrides de l'éditeur avant l'init du jeu
  applyEditorSaves();

  window.game     = game     = new GameState();
  window.renderer = renderer = new Renderer(game);
  window.input    = input    = new InputHandler(game, renderer);
  editorUI = new EditorUI();

  // Monkey-patch openShop pour déclencher le bot
  const _origOpenShop = renderer.openShop.bind(renderer);
  renderer.openShop = function() {
    _origOpenShop();
    if (bot && game.currentHero?.playerIdx === 1) {
      renderer.closeShop();
      setTimeout(() => bot.maybeAct(), 150);
    }
  };

  // ── Menu principal ───────────────────────────────────────
  document.getElementById('btn-menu-draft').addEventListener('click', () => {
    showScreen('draft-screen');
    renderer.renderDraft();
  });

  document.getElementById('btn-menu-bot').addEventListener('click', () => {
    bot = new GameBot(game, () => { renderer.render(); renderer.updateUI(); });
    showScreen('draft-screen');
    renderer.renderDraft();
  });


  document.getElementById('btn-menu-heroes').addEventListener('click', () => {
    renderInfoScreen('heroes');
    showScreen('heroes-screen');
  });

  document.getElementById('heroes-back-btn').addEventListener('click', () => {
    showScreen('menu-screen');
  });

  document.querySelectorAll('.info-tab').forEach(btn => {
    btn.addEventListener('click', () => renderInfoScreen(btn.dataset.tab));
  });

  document.getElementById('btn-menu-stats').addEventListener('click', () => {
    renderStatsScreen('heroes');
    showScreen('stats-screen');
  });

  document.getElementById('stats-back-btn').addEventListener('click', () => {
    showScreen('menu-screen');
  });

  document.querySelectorAll('.stats-tab').forEach(btn => {
    btn.addEventListener('click', () => renderStatsScreen(btn.dataset.tab));
  });

  document.getElementById('stats-reset-btn').addEventListener('click', () => {
    if (confirm('Réinitialiser toutes les statistiques ? Cette action est irréversible.')) {
      Stats.reset();
      renderStatsScreen(document.querySelector('.stats-tab.active')?.dataset.tab || 'heroes');
    }
  });

  document.getElementById('btn-menu-history').addEventListener('click', () => {
    renderHistoryScreen();
    showScreen('history-screen');
  });

  document.getElementById('history-back-btn').addEventListener('click', () => {
    showScreen('menu-screen');
  });

  document.getElementById('history-clear-btn').addEventListener('click', () => {
    if (confirm('Effacer tout l\'historique ? Cette action est irréversible.')) {
      MatchHistory.clear();
      renderHistoryScreen();
    }
  });

  document.getElementById('btn-menu-rules').addEventListener('click', () => {
    showScreen('rules-screen');
  });

  document.getElementById('rules-back-btn').addEventListener('click', () => {
    showScreen('menu-screen');
  });

  // ── Game over → menu ─────────────────────────────────────
  document.querySelector('#gameover-screen button').addEventListener('click', () => {
    location.reload();
  });

  // ── Online ────────────────────────────────────────────────
  document.getElementById('btn-menu-online').addEventListener('click', () => {
    showScreen('online-screen');
    window.OnlineMode.connect(() => {
      document.getElementById('online-status').textContent = 'Connecté au serveur — choisissez une option.';
    });
  });

  document.getElementById('btn-create-room').addEventListener('click', () => {
    window.OnlineMode.createRoom(res => {
      if (res.code) {
        document.getElementById('room-code-text').textContent = res.code;
        document.getElementById('online-create-info').classList.remove('hidden');
        document.getElementById('online-status').textContent = 'En attente de l\'adversaire…';
      }
    });
  });

  document.getElementById('btn-join-room').addEventListener('click', () => {
    const code = document.getElementById('join-code-input').value.trim();
    if (!code) return;
    const errEl = document.getElementById('online-error');
    errEl.classList.remove('hidden');
    if (window.OnlineMode.roomCode && code.toUpperCase() === window.OnlineMode.roomCode) {
      errEl.textContent = 'Tu ne peux pas rejoindre ta propre partie.';
      return;
    }
    errEl.classList.add('hidden');
    window.OnlineMode.joinRoom(code, res => {
      if (res.error) {
        errEl.textContent = res.error;
        errEl.classList.remove('hidden');
      } else {
        document.getElementById('online-status').textContent = 'Connecté ! Démarrage du draft…';
        setTimeout(() => { showScreen('draft-screen'); renderer.renderDraft(); }, 800);
      }
    });
  });

  document.getElementById('btn-online-back').addEventListener('click', () => {
    showScreen('menu-screen');
  });

  // Hôte : l'adversaire a rejoint → démarrer le draft
  document.addEventListener('online:guest-joined', () => {
    document.getElementById('online-status').textContent = 'Adversaire connecté ! Démarrage…';
    setTimeout(() => { showScreen('draft-screen'); renderer.renderDraft(); }, 800);
  });

  // Les deux : réception de l'état mis à jour par l'hôte
  document.addEventListener('online:state', e => {
    const prevPhase = game.phase;
    const prevHeroId = game.currentHero?.instanceId;
    game.applySerializedState(e.detail);

    if (game.phase === 'gameover') {
      const matchResult = {
        date: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        turns: game.globalTurn,
        winner: game.winner,
        players: game.players.map((p, pi) => ({
          label: `Joueur ${pi + 1}`,
          won: game.winner === pi,
          heroes: p.heroes.map(h => ({
            name: h.name, portrait: h.portrait, colorFill: h.colorFill,
            kills: h.kills || 0, deaths: h.deaths || 0, assists: h.assists || 0,
            totalGold: h.totalGoldEarned || h.gold,
            damageDealt: 0,
            healingDone: 0,
            items: [...(h.items || [])]
          }))
        }))
      };
      MatchHistory.save(matchResult);
      showScreen('gameover-screen');
      renderer.showGameOver(game.winner, matchResult);
      return;
    }

    // Transition draft → jeu
    if (prevPhase === 'draft' && game.phase === 'playing') {
      showScreen('game-screen');
      renderer.render();
      renderer.updateUI();
      // Ouvrir la boutique pour le joueur actuel
      if (window.OnlineMode?.active) {
        const myPlayerIdx = window.OnlineMode.isHost ? 0 : 1;
        if (game.currentHero?.playerIdx === myPlayerIdx) {
          renderer.openShop();
        }
      }
      return;
    }

    if (game.phase === 'playing') {
      renderer.render();
      renderer.updateUI();
      // If it's now a player's turn, open the shop (hôte = playerIdx 0, guest = playerIdx 1)
      if (window.OnlineMode?.active && game.currentHero?.instanceId !== prevHeroId) {
        const myPlayerIdx = window.OnlineMode.isHost ? 0 : 1;
        if (game.currentHero?.playerIdx === myPlayerIdx) {
          renderer.openShop();
        }
      }
    } else if (game.phase === 'draft') {
      renderer.renderDraft();
    }
  });

  // Hôte : exécuter l'action reçue du guest puis renvoyer l'état
  document.addEventListener('online:guest-action', e => {
    const action = e.detail;
    const g = game;
    const all   = [...g.players[0].heroes, ...g.players[1].heroes];
    const byId  = id => all.find(h => h.instanceId === id) ?? null;

    switch (action.type) {
      case 'move':
        g.moveHero(action.x, action.y);
        break;
      case 'attack': {
        const t = byId(action.heroId);
        if (t) g.autoAttack(t);
        break;
      }
      case 'spell': {
        const hero  = g.currentHero;
        if (!hero) break;
        const spell = hero.spells.find(s => s.id === action.spellId);
        if (!spell) break;
        let tgt = action.target;
        if (tgt?.heroId) tgt = { hero: byId(tgt.heroId), dx: tgt.dx, dy: tgt.dy };
        g.castSpell(spell, tgt);
        break;
      }
      case 'endTurn':
        if (g.currentHero?.playerIdx === 1) g.endHeroTurn();
        break;
      case 'buy':
        g.buyItem(action.itemId);
        break;
      case 'sell':
        g.sellItem(action.itemId);
        break;
      case 'wolf_move': {
        const wolf = (g.noyalaWolves || []).find(w => w.id === action.wolfId);
        if (wolf) g._wolfMove(wolf, action.x, action.y);
        break;
      }
      case 'ban':
        g.banHero(action.heroId);
        break;
      case 'pick':
        g.pickHero(action.heroId);
        break;
      case 'forfeit':
        g.endGame(0); // guest (joueur 1) abandonne, host (joueur 0) gagne
        break;
    }

    window.OnlineMode.sendState(g.serialize());

    if (g.phase === 'gameover') return;
    // Transition draft → jeu côté hôte
    if (g.phase === 'playing' && document.getElementById('draft-screen').classList.contains('active')) {
      showScreen('game-screen');
    }
    if (g.phase === 'playing') {
      renderer.render(); renderer.updateUI();
    } else if (g.phase === 'draft') {
      renderer.renderDraft();
    }
  });

  // Soi-même en cours de reconnexion
  document.addEventListener('online:reconnecting', () => {
    _showOnlineBanner('🔄 Connexion perdue — reconnexion en cours…', 'warn');
  });

  // Soi-même reconnecté
  document.addEventListener('online:reconnected', () => {
    _showOnlineBanner('✅ Reconnecté !', 'ok', 3000);
  });

  // Adversaire en cours de reconnexion
  document.addEventListener('online:opponent-reconnecting', () => {
    _showOnlineBanner('⏳ Adversaire en cours de reconnexion… (30 s)', 'warn');
  });

  // Adversaire reconnecté
  document.addEventListener('online:opponent-reconnected', () => {
    _showOnlineBanner('✅ Adversaire reconnecté !', 'ok', 3000);
  });

  // Adversaire définitivement déconnecté (timeout expiré)
  document.addEventListener('online:disconnected', () => {
    alert('Votre adversaire s\'est déconnecté. La partie est terminée.');
    location.reload();
  });
});

function _showOnlineBanner(msg, type, autoDismissMs = 0) {
  let banner = document.getElementById('online-reconnect-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'online-reconnect-banner';
    banner.style.cssText = 'position:fixed;top:0;left:50%;transform:translateX(-50%);z-index:9999;padding:8px 20px;border-radius:0 0 8px 8px;font-weight:bold;font-size:0.9rem;pointer-events:none;transition:opacity 0.4s';
    document.body.appendChild(banner);
  }
  banner.textContent = msg;
  banner.style.opacity = '1';
  banner.style.background = type === 'ok' ? '#2ecc71' : '#e67e22';
  banner.style.color = '#fff';
  if (banner._dismissTimer) clearTimeout(banner._dismissTimer);
  if (autoDismissMs > 0) {
    banner._dismissTimer = setTimeout(() => { banner.style.opacity = '0'; }, autoDismissMs);
  }
}
