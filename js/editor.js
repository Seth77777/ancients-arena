// ============================================================
// EDITOR — persistence localStorage + UI
// ============================================================

const EDITOR_KEY  = 'arena_editor_v1';
const STAT_KEYS   = ['maxHP','maxMana','hpRegen','manaRegen','ad','ap','armor','mr','pm','po','lifeSteal'];

// ── Applique les sauvegardes avant l'init du jeu ────────────
function applyEditorSaves() {
  const raw = localStorage.getItem(EDITOR_KEY);
  if (!raw) return;
  let saved;
  try { saved = JSON.parse(raw); } catch { return; }

  (saved.roles || []).forEach(({ roleId, stats, spells }) => {
    if (!ROLE_BASES[roleId]) return;
    Object.assign(ROLE_BASES[roleId], stats);
    if (spells) ROLE_BASES[roleId].spells = JSON.parse(JSON.stringify(spells));
    _propagateRoleBase(roleId);
  });
  (saved.heroes || []).forEach(({ id, stats, spells }) => {
    if (!HERO_TYPES[id]) return;
    Object.assign(HERO_TYPES[id], stats);
    if (spells) HERO_TYPES[id].spells = JSON.parse(JSON.stringify(spells));
  });
}

function _propagateRoleBase(roleId) {
  const base = ROLE_BASES[roleId];
  for (let i = 1; i <= 10; i++) {
    const hero = HERO_TYPES[`${roleId}_${i}`];
    if (!hero || hero.portrait) continue; // héros uniques non touchés
    STAT_KEYS.forEach(k => { if (base[k] !== undefined) hero[k] = base[k]; });
    if (base.spells) hero.spells = base.spells.map(s => ({ ...s }));
  }
}

function editorSave() {
  const data = {
    roles: ROLE_ORDER.map(roleId => {
      const base = ROLE_BASES[roleId];
      const stats = {};
      STAT_KEYS.forEach(k => { stats[k] = base[k]; });
      return { roleId, stats, spells: JSON.parse(JSON.stringify(base.spells)) };
    }),
    heroes: Object.values(HERO_TYPES).filter(t => t.portrait).map(t => {
      const stats = {};
      STAT_KEYS.forEach(k => { stats[k] = t[k]; });
      return { id: t.id, stats, spells: JSON.parse(JSON.stringify(t.spells)) };
    })
  };
  localStorage.setItem(EDITOR_KEY, JSON.stringify(data));
}

// ============================================================
// EDITOR UI
// ============================================================

class EditorUI {
  constructor() {
    this._sel = null; // { type: 'role'|'hero', id }
    document.getElementById('editor-save-btn').addEventListener('click',  () => this._save());
    document.getElementById('editor-reset-btn').addEventListener('click', () => this._reset());
  }

  open() {
    this._buildList();
    if (this._sel) this._renderPanel(); else document.getElementById('editor-panel').innerHTML = '';
  }

  // ── Liste gauche ─────────────────────────────────────────
  _buildList() {
    const list = document.getElementById('editor-list');
    list.innerHTML = '';

    this._listHead(list, 'Bases de rôle');
    ROLE_ORDER.forEach(r => this._listItem(list, ROLE_BASES[r].roleName, 'role', r));

    const specHeroes = Object.values(HERO_TYPES).filter(t => t.portrait);
    if (specHeroes.length) {
      this._listHead(list, 'Héros uniques');
      specHeroes.forEach(t => this._listItem(list, t.name, 'hero', t.id));
    }
  }

  _listHead(list, text) {
    const h = document.createElement('div');
    h.className = 'ed-list-head';
    h.textContent = text;
    list.appendChild(h);
  }

  _listItem(list, text, type, id) {
    const el = document.createElement('div');
    el.className = 'ed-list-item' + (this._sel?.type === type && this._sel?.id === id ? ' active' : '');
    el.textContent = text;
    el.addEventListener('click', () => {
      document.querySelectorAll('.ed-list-item').forEach(i => i.classList.remove('active'));
      el.classList.add('active');
      this._sel = { type, id };
      this._renderPanel();
    });
    list.appendChild(el);
  }

  _target() {
    if (!this._sel) return null;
    return this._sel.type === 'role' ? ROLE_BASES[this._sel.id] : HERO_TYPES[this._sel.id];
  }

  // ── Panneau droite ────────────────────────────────────────
  _renderPanel() {
    const panel  = document.getElementById('editor-panel');
    const target = this._target();
    panel.innerHTML = '';
    if (!target) return;

    const note = document.createElement('div');
    note.className = 'ed-note';
    note.textContent = 'Les modifications s\'appliquent à la prochaine partie.';
    panel.appendChild(note);

    panel.appendChild(this._statsSection(target));
    (target.spells || []).forEach((spell, i) => panel.appendChild(this._spellSection(spell, i)));
  }

  // ── Stats de base ─────────────────────────────────────────
  _statsSection(target) {
    const DEFS = [
      { k:'maxHP',    l:'HP max',          step:50  },
      { k:'maxMana',  l:'Mana max',        step:25  },
      { k:'hpRegen',  l:'Regen HP / tour', step:5   },
      { k:'manaRegen',l:'Regen Mana / tour',step:5  },
      { k:'ad',       l:'AD',              step:5   },
      { k:'ap',       l:'AP',              step:5   },
      { k:'armor',    l:'Armure',          step:5   },
      { k:'mr',       l:'Résist. Mag.',    step:5   },
      { k:'pm',       l:'PM (déplacement)',step:1   },
      { k:'po',       l:'PO (portée AA)',  step:1   },
      { k:'lifeSteal',l:'Vol de vie %',   step:1   },
    ];
    const sec  = this._section('Stats de base');
    const grid = document.createElement('div');
    grid.className = 'ed-grid';
    DEFS.forEach(({ k, l, step }) => {
      if (target[k] === undefined) return;
      grid.appendChild(this._numRow(l, target[k], step, v => {
        target[k] = v;
        if (this._sel.type === 'role') _propagateRoleBase(this._sel.id);
      }));
    });
    sec.appendChild(grid);
    return sec;
  }

  // ── Section sort ─────────────────────────────────────────
  _spellSection(spell, idx) {
    const sec = this._section(`Sort ${idx + 1} — ${spell.name}`);

    const grid = document.createElement('div');
    grid.className = 'ed-grid';
    [
      { k:'manaCost',   l:'Coût Mana',   step:10  },
      { k:'range',      l:'Portée',      step:1   },
      { k:'cooldown',   l:'Cooldown',    step:1   },
      { k:'baseDamage', l:'Dégâts base', step:10  },
      { k:'adRatio',    l:'Ratio AD',    step:0.1 },
      { k:'apRatio',    l:'Ratio AP',    step:0.1 },
    ].forEach(({ k, l, step }) => {
      if (spell[k] === undefined) return;
      grid.appendChild(this._numRow(l, spell[k], step, v => { spell[k] = v; }));
    });
    sec.appendChild(grid);

    // Selects
    const sels = document.createElement('div');
    sels.className = 'ed-selects';
    sels.appendChild(this._selRow('Type dégâts', ['none','physical','magical'],
      spell.damageType || 'none', v => { spell.damageType = v === 'none' ? null : v; }));

    const TARGET_TYPES = ['enemy_hero','ally_hero','self','cell','zone','diamond_zone','dash_to_enemy','no_target'];
    sels.appendChild(this._selRow('Type cible', TARGET_TYPES, spell.targetType, v => { spell.targetType = v; }));
    sec.appendChild(sels);

    // Zone
    const zoneWrap = document.createElement('div');
    zoneWrap.className = 'ed-selects';

    const sizeRow = this._numRow('Taille zone', spell.zone?.size ?? 1, 1, v => {
      if (spell.zone) spell.zone.size = Math.max(1, v);
    });
    sizeRow.querySelector('input').disabled = !spell.zone;

    zoneWrap.appendChild(this._selRow('Forme zone', ['none','square','diamond'],
      spell.zone?.shape || 'none', v => {
        if (v === 'none') {
          spell.zone = null;
          sizeRow.querySelector('input').disabled = true;
        } else {
          spell.zone = { shape: v, size: spell.zone?.size ?? 1 };
          sizeRow.querySelector('input').disabled = false;
        }
      }
    ));
    zoneWrap.appendChild(sizeRow);
    sec.appendChild(zoneWrap);

    // Effets
    sec.appendChild(this._effectsSection(spell));
    return sec;
  }

  _effectsSection(spell) {
    const wrap = document.createElement('div');
    wrap.className = 'ed-effects-wrap';
    const title = document.createElement('div');
    title.className = 'ed-effects-title';
    title.textContent = 'Effets';
    wrap.appendChild(title);
    if (!spell.effects) spell.effects = [];
    [0, 1].forEach(i => wrap.appendChild(this._effectRow(spell, i)));
    return wrap;
  }

  _effectRow(spell, i) {
    const row = document.createElement('div');
    row.className = 'ed-effect-row';
    const eff = spell.effects[i] || null;

    const typeSel = document.createElement('select');
    typeSel.className = 'ed-select';
    [['none','(aucun)'],['slow','Ralenti'],['stun','Étourdi']].forEach(([v, l]) => {
      const o = document.createElement('option');
      o.value = v; o.textContent = l;
      if ((eff?.type || 'none') === v) o.selected = true;
      typeSel.appendChild(o);
    });

    const pmLabel = this._inlineLabel('PM réduits');
    const pmInput = this._smallNum(eff?.pmReduction ?? 1, 1, 10);
    pmLabel.style.display = pmInput.style.display = eff?.type === 'slow' ? '' : 'none';

    const tLabel = this._inlineLabel('Tours');
    const tInput = this._smallNum(eff?.turns ?? 1, 1, 10);
    tLabel.style.display = tInput.style.display = eff ? '' : 'none';

    const sync = () => {
      const type = typeSel.value;
      if (type === 'none') {
        spell.effects[i] = null;
        spell.effects = spell.effects.filter(Boolean);
        pmLabel.style.display = pmInput.style.display = 'none';
        tLabel.style.display  = tInput.style.display  = 'none';
      } else {
        const e = { type, turns: parseInt(tInput.value) || 1 };
        if (type === 'slow') e.pmReduction = parseInt(pmInput.value) || 1;
        spell.effects[i] = e;
        pmLabel.style.display = pmInput.style.display = type === 'slow' ? '' : 'none';
        tLabel.style.display  = tInput.style.display  = '';
      }
    };
    typeSel.addEventListener('change', sync);
    pmInput.addEventListener('change', sync);
    tInput.addEventListener('change', sync);

    row.append(typeSel, pmLabel, pmInput, tLabel, tInput);
    return row;
  }

  // ── Helpers ──────────────────────────────────────────────
  _section(title) {
    const div = document.createElement('div');
    div.className = 'ed-section';
    const h = document.createElement('div');
    h.className = 'ed-section-title';
    h.textContent = title;
    div.appendChild(h);
    return div;
  }

  _numRow(label, value, step, onChange) {
    const row = document.createElement('div');
    row.className = 'ed-stat-row';
    const lbl = document.createElement('label');
    lbl.textContent = label;
    const inp = document.createElement('input');
    inp.type = 'number'; inp.value = value; inp.step = step;
    inp.className = 'ed-input';
    inp.addEventListener('change', () => onChange(parseFloat(inp.value) || 0));
    row.appendChild(lbl); row.appendChild(inp);
    return row;
  }

  _selRow(label, options, current, onChange) {
    const row = document.createElement('div');
    row.className = 'ed-stat-row';
    const lbl = document.createElement('label');
    lbl.textContent = label;
    const sel = document.createElement('select');
    sel.className = 'ed-select';
    options.forEach(v => {
      const o = document.createElement('option');
      o.value = v; o.textContent = v;
      if (v === (current || '')) o.selected = true;
      sel.appendChild(o);
    });
    sel.addEventListener('change', () => onChange(sel.value));
    row.appendChild(lbl); row.appendChild(sel);
    return row;
  }

  _inlineLabel(text) {
    const l = document.createElement('label');
    l.className = 'ed-inline-label';
    l.textContent = text;
    return l;
  }

  _smallNum(value, min, max) {
    const inp = document.createElement('input');
    inp.type = 'number'; inp.value = value; inp.min = min; inp.max = max; inp.step = 1;
    inp.className = 'ed-input-small';
    return inp;
  }

  _save() {
    editorSave();
    const btn = document.getElementById('editor-save-btn');
    const orig = btn.textContent;
    btn.textContent = '✓ Sauvegardé !';
    setTimeout(() => btn.textContent = orig, 2000);
  }

  _reset() {
    if (!confirm('Réinitialiser toutes les stats aux valeurs par défaut ?')) return;
    localStorage.removeItem(EDITOR_KEY);
    location.reload();
  }
}
