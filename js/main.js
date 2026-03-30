// ============================================================
// ENTRY POINT
// ============================================================

const PASSIVE_LABELS = {
  rock_solid:    'Roche Solide — Les dégâts physiques subis sont réduits de 50%.',
  skjer_passive:   'Instinct de prédateur — En tuant un ennemi, Skjer récupère tout son mana et tous ses points de mouvement, et tous ses cooldowns sont remis à zéro.',
  electro_passive:  'Surcharge — Chaque ennemi touché par un sort d\'Electro lui confère +5 AP (permanent).',
  masello_passive:  'Cohésion — Au début de son tour, Masello gagne +1 PM par allié à moins de 7 cases (distance Manhattan).',
  decigeno_passive: 'Predator Mode — Lorsque Decigeno utilise une action (attaque ou sort), il consomme tous ses PM restants et gagne +25 AD par PM consommé jusqu\'à la fin du tour.',
  voodoo_passive:   'Hémorragie — Chaque sort de Voodoo qui touche un ennemi lui inflige Hémorragie : réduit les soins reçus de 50% (vol de vie inclus) pendant 1 tour.',
  vadro_passive:    'Soif de Sang — Vadro possède en permanence 50% de vol de vie.',
  shallah_passive:  'Architecte des Glyphes — Lorsque Shallah marche dans une glyphe qu\'il a posée, il gagne +1 PM pour ce tour.',
  layia_passive:    'Chasseresse — Les attaques de base touchent tous les ennemis à portée. Tous les 5 tours ou en collectant une zone de butin, Layia gagne +1 PO (commence à 1 ; héros à distance dès 2 PO).',
  chronos_passive:  'Maître du Temps — Chaque sort lancé rapporte 50 PO à Chronos.',
  shana_passive:    'Félin pour l\'autre — Quand Shana soigne un allié, elle se soigne aussi du même montant.',
  anastasia_passive: 'Soins Intéressés — Chaque fois qu\'Anastasia soigne un héros (allié ou elle-même), elle gagne 10 PO. Elle peut soigner des cibles à pleine vie.',
  dans_la_chair:      'Dans la chair — Chaque sort de Frigiel inflige 5% des HP max de la cible en dégâts bruts supplémentaires.',
  gros_calibre:       'Gros Calibre — Les attaques de base de Stank infligent les mêmes dégâts physiques à tous les ennemis sur les cases adjacentes à la cible.',
  sharagoth_passive:  'Plus forts ensemble — Au début de son tour, Sharagoth gagne un bouclier de 10% de ses HP max par allié présent à moins de 10 cases (Manhattan), pendant 2 tours.',
  vaillance:          'Vaillance — Le premier débuff appliqué à Ondine chaque tour est automatiquement annulé.',
  abyss_passive:      'Équilibre des abysses — Les attaques de base d\'Abyss infligent 40% de dégâts physiques, 40% de dégâts magiques et 20% de dégâts bruts.',
  faena_passive:      'Coups critiques mortels — Chaque tranche de 10 AD donne +1% de dégâts critiques (base 150%). S\'applique aux attaques de base et aux Flèches de douleur.',
  pibot_passive:      'Batterie — Au début de chaque tour de Pibot, une case ⚡ apparaît à 5 cases ou moins. Passer dessus (ou utiliser Station de recharge) récupère 25% de la mana manquante.',
  gabriel_passive:    'Pas Léger — Au début du tour de chaque allié à moins de 7 cases de Gabriel, cet allié gagne +1 PM.',
  grolith_passive:    'Pierre qui roule — Grolith gagne 70 points de bouclier au début de chaque tour. Ce bouclier n\'expire jamais.',
  noyala_passive:     'Chasse — Noyala gagne +1 PM au début de son tour si elle est adjacente à un mur. Ses loups récupèrent leurs PM à chaque début de son tour.'
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
  noyala_r:           'Échange de position avec un loup'
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
      return `
        <div class="scoreboard-hero-row">
          ${portrait}
          <div class="sb-hero-info">
            <div style="display:flex;align-items:center;gap:8px">
              <span class="sb-name">${h.name}</span>
              <span class="sb-kda"><span>${h.kills}</span> / <span style="color:#e74c3c">${h.deaths}</span> / <span>${h.assists}</span></span>
              <span class="sb-gold">⚔ ${h.kills}K ${h.assists}A &nbsp;💰 ${h.totalGold}g</span>
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
  return `<div class="scoreboard">${teams}</div>`;
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

function _renderItemsSection() {
  const STAT_LABELS = {
    ad: '⚔ AD', ap: '✨ AP', maxHP: '❤ HP max', maxMana: '🔵 Mana max',
    armor: '🛡 Armure', mr: '🔮 RM', lifeSteal: '🩸 Vol de vie',
    hpRegen: '♻ Rég. HP', manaRegen: '💧 Rég. Mana', pm: '👟 PM',
    cdReduction: '⏬ Réd. CD', bonusSpellRange: '🎯 Portée sorts',
    goldPerTurn: '💰 Or/tour', healEfficiency: '💚 Efficacité soins',
    goldSharePct: '🤝 Partage or', manaOnSpell: '💧 Mana/sort',
    manaOnSpellMax: '(max via passif)'
  };

  const tierLabels = { 1: 'Tier 1 — Starters', 2: 'Tier 2', 3: 'Tier 3' };
  const items = Object.values(EQUIPMENT);
  const byTier = {};
  items.forEach(it => {
    if (!byTier[it.tier]) byTier[it.tier] = [];
    byTier[it.tier].push(it);
  });

  return Object.keys(byTier).sort().map(tier => {
    const cards = byTier[tier].map(it => {
      const statsLines = Object.entries(it.stats || {}).map(([k, v]) => {
        if (k === 'manaOnSpellMax') return null;
        const lbl = STAT_LABELS[k] || k;
        const suffix = ['armor','mr','lifeSteal','healEfficiency','goldSharePct'].includes(k) ? '%' : '';
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
  }).join('');
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
  body.innerHTML = tab === 'items' ? _renderItemsSection() : _renderHeroesSection();
  document.querySelectorAll('.info-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
}

let game, renderer, input, editorUI;

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

  // ── Menu principal ───────────────────────────────────────
  document.getElementById('btn-menu-draft').addEventListener('click', () => {
    showScreen('draft-screen');
    renderer.renderDraft();
  });

  document.getElementById('btn-menu-editor').addEventListener('click', () => {
    showScreen('editor-screen');
    editorUI.open();
  });

  document.getElementById('editor-back-btn').addEventListener('click', () => {
    showScreen('menu-screen');
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
    game.applySerializedState(e.detail);

    if (game.phase === 'gameover') {
      const matchResult = {
        turns: game.globalTurn,
        teams: game.players.map((p, pi) => ({
          label: `Joueur ${pi + 1}`,
          won: game.winner === pi,
          heroes: p.heroes.map(h => ({
            name: h.name, portrait: h.portrait, colorFill: h.colorFill,
            kills: h.kills || 0, deaths: h.deaths || 0, assists: h.assists || 0,
            totalGold: h.totalGoldEarned || h.gold, items: [...(h.items || [])]
          }))
        }))
      };
      showScreen('gameover-screen');
      renderer.showGameOver(game.winner, matchResult);
      return;
    }

    // Transition draft → jeu
    if (prevPhase === 'draft' && game.phase === 'playing') {
      showScreen('game-screen');
      renderer.render();
      renderer.updateUI();
      return;
    }

    if (game.phase === 'playing') {
      renderer.render();
      renderer.updateUI();
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
        g.endHeroTurn();
        break;
      case 'buy':
        g.buyItem(action.itemId);
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
    }

    window.OnlineMode.sendState(g.serialize());

    if (g.phase === 'gameover') {
      renderer.showGameOver(g.winner, null);
      return;
    }
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

  // Adversaire déconnecté
  document.addEventListener('online:disconnected', () => {
    alert('Votre adversaire s\'est déconnecté. La partie est terminée.');
    location.reload();
  });
});
