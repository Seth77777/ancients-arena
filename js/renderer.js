// ============================================================
// RENDERER
// ============================================================

class Renderer {
  constructor(game) {
    this.game   = game;
    this.canvas = document.getElementById('game-canvas');
    this.ctx    = this.canvas.getContext('2d');

    this.highlightMove        = [];
    this.highlightAttack      = [];
    this.highlightAttackRange = [];
    this.highlightSpell       = { heroes: [], cells: [] };
    this.zoneSpellTarget      = null;
    this.highlightPushDirs    = [];
    this.pushDirArrows        = [];
    this.highlightSplashCells = [];

    // Tooltip inventaire
    this._tooltip = document.createElement('div');
    this._tooltip.className = 'inv-tooltip';
    document.body.appendChild(this._tooltip);
    this._initInvTooltip();

    // Tooltip sorts
    this._spellTooltip = document.createElement('div');
    this._spellTooltip.className = 'spell-tooltip';
    document.body.appendChild(this._spellTooltip);
    this._initSpellTooltip();

    // Tooltip héros sur la map
    this._mapHeroTooltip = document.createElement('div');
    this._mapHeroTooltip.className = 'map-hero-tooltip';
    document.body.appendChild(this._mapHeroTooltip);

    // Preload hero portraits
    this._portraits = {};
    Object.values(HERO_TYPES).forEach(t => {
      if (!t.portrait) return;
      const img = new Image();
      img.onload = () => { if (this.game.phase === 'playing') this.render(); };
      img.src = t.portrait;
      this._portraits[t.id] = img;
    });

  }

  // ============================================================
  // DRAFT SCREEN
  // ============================================================

  renderDraft() {
    const g = this.game;
    const d = g.draft;

    // Phase label
    const phaseEl = document.getElementById('draft-phase-label');
    const actEl   = document.getElementById('draft-action-label');
    if (d.phase === 'ban') {
      phaseEl.textContent = '⚔ PHASE DE BAN';
      phaseEl.style.color = '#e74c3c';
    } else {
      phaseEl.textContent = '🏆 PHASE DE SÉLECTION';
      phaseEl.style.color = '#2ecc71';
    }
    actEl.textContent = g.draftStatus();
    const curP = g.draftCurrentPlayer();
    actEl.style.color = curP === 0 ? '#00d2ff' : '#ff6b35';

    // Ban slots
    this._renderBanSlots(0, document.getElementById('p1-bans'), d);
    this._renderBanSlots(1, document.getElementById('p2-bans'), d);

    // Pick slots
    this._renderPickSlots(0, document.getElementById('p1-picks'), d);
    this._renderPickSlots(1, document.getElementById('p2-picks'), d);

    // Hero pool
    this._renderHeroPool(d);
  }

  _renderBanSlots(playerIdx, el, d) {
    el.innerHTML = '';
    const myBans = [...d.banned]
      .map((id, i) => ({ id, bannerIdx: BAN_ORDER[i] }))
      .filter(b => b.bannerIdx === playerIdx)
      .map(b => b.id);

    for (let i = 0; i < 3; i++) {
      const slot = document.createElement('div');
      slot.className = 'draft-slot ban-slot';
      if (myBans[i]) {
        const t = HERO_TYPES[myBans[i]];
        slot.style.borderColor  = '#e74c3c';
        slot.style.padding      = '0';
        slot.style.position     = 'relative';
        if (t.portrait) {
          slot.style.backgroundImage    = `url('${t.portrait}')`;
          slot.style.backgroundSize     = 'cover';
          slot.style.backgroundPosition = 'center top';
        } else {
          slot.style.background = t.colorFill;
        }
        slot.innerHTML = `
          <div style="position:absolute;inset:0;background:rgba(0,0,0,0.45);"></div>
          <div style="position:relative;z-index:1;padding:0 6px;font-weight:bold;font-size:0.72rem;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${t.name}</div>`;
      }
      el.appendChild(slot);
    }
  }

  _renderPickSlots(playerIdx, el, d) {
    el.innerHTML = '';
    const myPicks = d.picks[playerIdx];
    const color = playerIdx === 0 ? '#00d2ff' : '#ff6b35';
    for (let i = 0; i < 5; i++) {
      const slot = document.createElement('div');
      slot.className = 'draft-slot pick-slot';
      if (myPicks[i]) {
        const t = HERO_TYPES[myPicks[i]];
        slot.style.borderColor = color;
        slot.style.padding     = '0';
        slot.style.position    = 'relative';
        if (t.portrait) {
          slot.style.backgroundImage    = `url('${t.portrait}')`;
          slot.style.backgroundSize     = 'cover';
          slot.style.backgroundPosition = 'center top';
        } else {
          slot.style.background = t.colorFill;
        }
        slot.innerHTML = `
          <div style="position:absolute;inset:0;background:rgba(0,0,0,0.38);"></div>
          <div style="position:relative;z-index:1;padding:0 6px;font-weight:bold;font-size:0.72rem;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${t.name}</div>
          <small style="position:relative;z-index:1;padding:0 6px;font-size:0.65rem;color:rgba(255,255,255,0.65);">${t.role}</small>`;
      }
      el.appendChild(slot);
    }
  }

  _renderHeroPool(d) {
    const pool = document.getElementById('hero-pool');
    pool.innerHTML = '';

    // Rôles déjà pris par le joueur qui doit picker actuellement
    const blockedRoles = new Set();
    if (d.phase === 'pick') {
      const seq = PICK_SEQUENCE[d.pickRound];
      if (seq) d.picks[seq.p].forEach(id => blockedRoles.add(HERO_TYPES[id].roleId));
    }

    ROLE_ORDER.forEach(roleId => {
      const base    = ROLE_BASES[roleId];
      const section = document.createElement('div');
      section.className = 'pool-role-section';

      const header = document.createElement('div');
      header.className = 'pool-role-header';
      header.innerHTML = `<span style="color:${base.colorStroke}">${base.roleName}</span>`;
      section.appendChild(header);

      const grid = document.createElement('div');
      grid.className = 'pool-role-grid';

      const roleHeroes = Object.values(HERO_TYPES)
        .filter(t => t.roleId === roleId)
        .sort((a, b) => a.name.localeCompare(b.name));

      roleHeroes.forEach(t => {
        const typeId = t.id;
        const banned   = d.banned.has(typeId);
        const pickedBy = d.picks[0].includes(typeId) ? 0 : d.picks[1].includes(typeId) ? 1 : -1;
        const roleBlocked = pickedBy === -1 && !banned && blockedRoles.has(roleId);

        const card = document.createElement('div');
        card.className   = 'pool-hero-card';
        card.dataset.typeId = typeId;

        if (banned) {
          card.classList.add('pool-banned');
          card.innerHTML = `<div class="phc-name">${t.name}</div><div class="phc-banned">BANNI</div>`;
        } else if (pickedBy !== -1) {
          card.classList.add(`pool-picked-p${pickedBy + 1}`);
          card.style.borderColor = pickedBy === 0 ? '#00d2ff' : '#ff6b35';
          card.innerHTML = `<div class="phc-name" style="color:${t.colorStroke}">${t.name}</div><div class="phc-picked">J${pickedBy + 1}</div>`;
        } else if (roleBlocked) {
          card.classList.add('pool-role-blocked');
          card.innerHTML = `<div class="phc-name">${t.name}</div><div class="phc-role-blocked">Rôle pris</div>`;
        } else {
          card.innerHTML = `
            ${t.portrait ? `<div class="phc-portrait"><img src="${t.portrait}" alt="${t.name}"></div>` : ''}
            <div class="phc-name" style="color:${t.colorStroke}">${t.name}</div>`;
        }
        grid.appendChild(card);
      });
      section.appendChild(grid);
      pool.appendChild(section);
    });
    if (window.bot) setTimeout(() => window.bot.maybeAct(), 50);
  }

  // ============================================================
  // GAME — CANVAS
  // ============================================================

  render() {
    const ctx = this.ctx;
    const cs  = CELL_SIZE;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Brown spots
    const _brownSet    = new Set(this.game.brownSpots.map(s => `${s.x},${s.y}`));
    const _batterySet  = new Set((this.game.pibotBatteries || []).map(b => `${b.x},${b.y}`));
    const _wolfMap     = new Map((this.game.noyalaWolves || []).map(w => [`${w.x},${w.y}`, w]));
    for (let x = 0; x < MAP_SIZE; x++) for (let y = 0; y < MAP_SIZE; y++) {
      const px = x * cs, py = y * cs;
      const key = `${x},${y}`;

      // Walls — solid grey, no other overlays
      if (isWall(x, y)) {
        ctx.fillStyle = '#6b7280';
        ctx.fillRect(px, py, cs, cs);
        ctx.strokeStyle = '#4b5563';
        ctx.lineWidth   = 0.5;
        ctx.strokeRect(px, py, cs, cs);
        continue;
      }

      // Base
      ctx.fillStyle = '#1a2035';
      ctx.fillRect(px, py, cs, cs);

      // Glyphes de Shallah
      for (const g of this.game.glyphs) {
        if (g.cells.some(c => c.x === x && c.y === y)) {
          ctx.fillStyle = g.type === 'ultimate' ? 'rgba(255,215,0,0.22)' : 'rgba(180,50,200,0.25)';
          ctx.fillRect(px, py, cs, cs);
          // Bordure colorée sur les bords du glyphe pour le distinguer
          ctx.strokeStyle = g.type === 'ultimate' ? 'rgba(255,215,0,0.6)' : 'rgba(200,80,255,0.5)';
          ctx.lineWidth = 1;
          ctx.strokeRect(px + 0.5, py + 0.5, cs - 1, cs - 1);
          break;
        }
      }

      // Brown spots
      if (_brownSet.has(key)) {
        ctx.fillStyle = 'rgba(140,75,20,0.75)';
        ctx.fillRect(px, py, cs, cs);
      }

      // Pibot batteries
      if (_batterySet.has(key)) {
        ctx.fillStyle = 'rgba(0,180,255,0.25)';
        ctx.fillRect(px, py, cs, cs);
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(px + 1, py + 1, cs - 2, cs - 2);
        // Icône ⚡ centrée
        ctx.fillStyle = '#00d4ff';
        ctx.font = `${cs * 0.45}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⚡', px + cs / 2, py + cs / 2);
      }

      // Noyala wolves
      const _wolf = _wolfMap.get(key);
      if (_wolf) {
        ctx.fillStyle = 'rgba(100,180,50,0.3)';
        ctx.fillRect(px, py, cs, cs);
        ctx.strokeStyle = '#7dc832';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(px + 1, py + 1, cs - 2, cs - 2);
        ctx.fillStyle = '#7dc832';
        ctx.font = `${cs * 0.45}px sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('🐺', px + cs / 2, py + cs / 2);
        // HP bar at bottom
        const wbx = px + 2, wby = py + cs - 6, wbw = cs - 4;
        ctx.fillStyle = '#111'; ctx.fillRect(wbx, wby, wbw, 4);
        ctx.fillStyle = '#7dc832'; ctx.fillRect(wbx, wby, Math.floor(wbw * (_wolf.hp / _wolf.maxHp)), 4);
      }

      // Murs de haine (Sharagoth)
      if (this.game.hateWalls?.some(w => w.cells.some(c => c.x === x && c.y === y))) {
        ctx.fillStyle = 'rgba(180,0,50,0.45)';
        ctx.fillRect(px, py, cs, cs);
        ctx.strokeStyle = '#c0003a';
        ctx.lineWidth = 2;
        ctx.strokeRect(px + 1, py + 1, cs - 2, cs - 2);
      }

      // Lame d'eau (Ondine)
      const _lz = this.game.lameEauZones?.find(z => Math.abs(x - z.cx) <= 1 && Math.abs(y - z.cy) <= 1);
      if (_lz) {
        ctx.fillStyle = 'rgba(0,120,220,0.35)';
        ctx.fillRect(px, py, cs, cs);
        ctx.strokeStyle = '#0088ff';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(px + 1, py + 1, cs - 2, cs - 2);
        if (x === _lz.cx && y === _lz.cy) {
          ctx.fillStyle = '#0088ff';
          ctx.font = `bold ${Math.floor(cs * 0.35)}px sans-serif`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(_lz.turnsLeft, px + cs / 2, py + cs / 2);
          ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        }
      }

      // Zones de bombardement (Stank - Appel)
      const _bz = this.game.bombZones?.find(bz => Math.abs(x - bz.cx) + Math.abs(y - bz.cy) <= bz.radius);
      if (_bz) {
        ctx.fillStyle = 'rgba(255,80,0,0.30)';
        ctx.fillRect(px, py, cs, cs);
        ctx.strokeStyle = '#ff5000';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(px + 1, py + 1, cs - 2, cs - 2);
        // Numéro de tours restants au centre
        ctx.fillStyle = '#ff5000';
        ctx.font = `bold ${Math.floor(cs * 0.35)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(_bz.turnsLeft, px + cs / 2, py + cs / 2);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
      }

      // Zones d'amour fou (Cupidon - L'amour fou)
      const _af = this.game.amourFouZones?.find(z => Math.abs(x - z.cx) + Math.abs(y - z.cy) <= z.size);
      if (_af) {
        ctx.fillStyle = 'rgba(255,105,180,0.30)';
        ctx.fillRect(px, py, cs, cs);
        ctx.strokeStyle = '#ff69b4';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(px + 1, py + 1, cs - 2, cs - 2);
        if (x === _af.cx && y === _af.cy) {
          ctx.fillStyle = '#ff69b4';
          ctx.font = `bold ${Math.floor(cs * 0.35)}px sans-serif`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(_af.turnsLeft, px + cs / 2, py + cs / 2);
          ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        }
      }

      // Traps
      const _trap = this.game.traps.find(t => t.x === x && t.y === y);
      if (_trap) {
        const trapColor = _trap.playerIdx === 0 ? 'rgba(0,210,255,0.55)' : 'rgba(255,107,53,0.55)';
        ctx.fillStyle = trapColor;
        ctx.fillRect(px, py, cs, cs);
        ctx.strokeStyle = _trap.playerIdx === 0 ? '#00d2ff' : '#ff6b35';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(px + 6, py + 6); ctx.lineTo(px + cs - 6, py + cs - 6);
        ctx.moveTo(px + cs - 6, py + 6); ctx.lineTo(px + 6, py + cs - 6);
        ctx.stroke();
      }


      // Zone à gold
      if (ZONE_CELL_SET.has(key)) {
        ctx.fillStyle = 'rgba(212,172,13,0.35)';
        ctx.fillRect(px, py, cs, cs);
      }

      // Zone de soin
      if (HEAL_ZONE_CELL_SET.has(key)) {
        ctx.fillStyle = 'rgba(46,204,113,0.22)';
        ctx.fillRect(px, py, cs, cs);
      }

      // Move highlight
      if (this.highlightMove.some(c => c.x === x && c.y === y)) {
        ctx.fillStyle = 'rgba(52,152,219,0.35)';
        ctx.fillRect(px, py, cs, cs);
      }

      // Wolf move highlight
      if (this.highlightWolfMove?.some(c => c.x === x && c.y === y)) {
        ctx.fillStyle = 'rgba(100,200,50,0.35)';
        ctx.fillRect(px, py, cs, cs);
      }

      // Cells blocked by enemy traps
      if (this.highlightMoveTrapBlocked?.some(c => c.x === x && c.y === y)) {
        ctx.fillStyle = 'rgba(200,100,0,0.18)';
        ctx.fillRect(px, py, cs, cs);
      }

      // Attack range highlight — rouge clair si LOS libre, rouge très sombre si bloqué
      if (this.highlightAttackRange?.some(c => c.x === x && c.y === y)) {
        ctx.fillStyle = 'rgba(231,76,60,0.22)';
        ctx.fillRect(px, py, cs, cs);
      } else if (this.highlightAttackRangeBlocked?.some(c => c.x === x && c.y === y)) {
        ctx.fillStyle = 'rgba(100,20,20,0.18)';
        ctx.fillRect(px, py, cs, cs);
      }

      // Spell cell highlight — violet si LOS libre, rouge si bloqué
      if (this.highlightSpell.cells?.some(c => c.x === x && c.y === y)) {
        ctx.fillStyle = 'rgba(155,89,182,0.30)';
        ctx.fillRect(px, py, cs, cs);
      } else if (this.highlightSpell.cellsBlocked?.some(c => c.x === x && c.y === y)) {
        ctx.fillStyle = 'rgba(180,30,30,0.22)';
        ctx.fillRect(px, py, cs, cs);
      }

      // Splash preview (Stank — Gros Calibre)
      if (this.highlightSplashCells?.some(c => c.x === x && c.y === y)) {
        ctx.fillStyle = 'rgba(231,126,34,0.28)';
        ctx.fillRect(px, py, cs, cs);
      }

      // Push direction cells (Terrain conquis — step 2)
      if (this.highlightPushDirs?.some(c => c.x === x && c.y === y)) {
        ctx.fillStyle = 'rgba(46,204,113,0.28)';
        ctx.fillRect(px, py, cs, cs);
      }
      const _arrow = this.pushDirArrows?.find(a => a.x === x && a.y === y);
      if (_arrow) {
        ctx.fillStyle = 'rgba(46,204,113,0.85)';
        ctx.beginPath();
        const acx = px + cs / 2, acy = py + cs / 2, sz = cs * 0.30;
        if      (_arrow.dx ===  1) { ctx.moveTo(acx+sz, acy); ctx.lineTo(acx-sz, acy-sz); ctx.lineTo(acx-sz, acy+sz); }
        else if (_arrow.dx === -1) { ctx.moveTo(acx-sz, acy); ctx.lineTo(acx+sz, acy-sz); ctx.lineTo(acx+sz, acy+sz); }
        else if (_arrow.dy ===  1) { ctx.moveTo(acx, acy+sz); ctx.lineTo(acx-sz, acy-sz); ctx.lineTo(acx+sz, acy-sz); }
        else if (_arrow.dy === -1) { ctx.moveTo(acx, acy-sz); ctx.lineTo(acx-sz, acy+sz); ctx.lineTo(acx+sz, acy+sz); }
        ctx.closePath(); ctx.fill();
      }

      // Spell hover preview
      if (this.zoneSpellTarget) {
        const sp  = this.game.selectedSpell;
        const tx  = this.zoneSpellTarget.x, ty = this.zoneSpellTarget.y;
        const hero = this.game.currentHero;
        if (sp && hero) {
          const { inZone, valid } = this._spellHoverCell(sp, hero, tx, ty, x, y);
          if (inZone) {
            ctx.fillStyle = valid ? 'rgba(155,89,182,0.45)' : 'rgba(231,76,60,0.35)';
            ctx.fillRect(px, py, cs, cs);
            if (!valid && x === tx && y === ty) {
              ctx.strokeStyle = 'rgba(231,76,60,0.85)';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(px + 5, py + 5); ctx.lineTo(px + cs - 5, py + cs - 5);
              ctx.moveTo(px + cs - 5, py + 5); ctx.lineTo(px + 5, py + cs - 5);
              ctx.stroke();
            }
          }
        }
      }

      // Grid line
      ctx.strokeStyle = '#2c3e50';
      ctx.lineWidth   = 0.5;
      ctx.strokeRect(px, py, cs, cs);
    }

    // Heroes
    this.game.players.forEach(p => p.heroes.forEach(h => {
      if (h.isAlive && h.position) this._drawHero(h);
    }));

    // Current hero glow
    const cur = this.game.currentHero;
    if (cur?.isAlive && cur.position) this._drawGlow(cur);

    // Attack rings
    this.highlightAttack.forEach(h => {
      if (!h.isAlive || !h.position) return;
      this._drawRing(h.position, '#e74c3c', 2.5);
    });

    // Spell hero rings — in range (purple) / out of range (red dashed)
    this.highlightSpell.heroes.forEach(h => {
      if (!h.isAlive || !h.position) return;
      this._drawRing(h.position, '#9b59b6', 2.5);
    });
    (this.highlightSpell.heroesOutOfRange || []).forEach(h => {
      if (!h.isAlive || !h.position) return;
      this._drawRing(h.position, '#e74c3c', 1.5, true);
    });

  }

  _inAnyZone(x, y) {
    return ZONE_CELL_SET.has(`${x},${y}`);
  }

  _drawHero(hero) {
    const ctx = this.ctx, cs = CELL_SIZE;
    const cx  = hero.position.x * cs + cs / 2;
    const cy  = hero.position.y * cs + cs / 2;
    const r   = cs / 2 - 3;

    // Player-color border
    ctx.fillStyle = hero.playerIdx === 0 ? '#00d2ff' : '#ff6b35';
    ctx.beginPath(); ctx.arc(cx, cy, r + 2, 0, Math.PI * 2); ctx.fill();

    const portrait = this._portraits[hero.id];
    const hasPortrait = portrait && portrait.complete && portrait.naturalWidth > 0;

    if (hasPortrait) {
      // Portrait clipped to circle
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
      ctx.drawImage(portrait, cx - r, cy - r, r * 2, r * 2);
      ctx.restore();
    } else {
      // Fallback: colored circle + initial
      ctx.fillStyle = hero.colorFill;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle    = '#fff';
      ctx.font         = `bold ${Math.floor(cs * 0.38)}px monospace`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(hero.name[0], cx, cy);
    }

    // HP bar
    const bx = hero.position.x * cs + 2, by = hero.position.y * cs + cs - 6;
    const bw = cs - 4, bh = 4;
    const hpPct = hero.currentHP / hero.maxHP;
    ctx.fillStyle = '#111'; ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = hpPct > 0.5 ? '#2ecc71' : hpPct > 0.25 ? '#f39c12' : '#e74c3c';
    ctx.fillRect(bx, by, Math.floor(bw * hpPct), bh);

    // Charges de Quackshot — afficher sur les ennemis
    const allHeroes = this.game?.players?.flatMap(p => p.heroes) || [];
    const quackshotCaster = allHeroes.find(h => h.passive === 'quackshot_passive');
    if (quackshotCaster && hero.playerIdx !== quackshotCaster.playerIdx) {
      const charges = quackshotCaster.quackshotCharges[hero.instanceId] || 0;
      if (charges > 0) {
        // Badge de charges en haut à droite du héros
        const badgeX = hero.position.x * cs + cs - 8;
        const badgeY = hero.position.y * cs + 6;
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(badgeX, badgeY, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(charges, badgeX, badgeY);
      }
    }
  }

  _drawGlow(hero) {
    const ctx = this.ctx, cs = CELL_SIZE;
    const cx  = hero.position.x * cs + cs / 2;
    const cy  = hero.position.y * cs + cs / 2;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 2;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.arc(cx, cy, cs / 2 - 1 + 3, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
  }

  _drawRing(pos, color, width, dashed = false) {
    const ctx = this.ctx, cs = CELL_SIZE;
    ctx.strokeStyle = color;
    ctx.lineWidth   = width;
    if (dashed) ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.arc(pos.x * cs + cs / 2, pos.y * cs + cs / 2, cs / 2 - 2, 0, Math.PI * 2);
    ctx.stroke();
    if (dashed) ctx.setLineDash([]);
  }

  // ============================================================
  // GAME — DOM UI
  // ============================================================

  updateUI() {
    const g = this.game;

    // Turn label
    const cur = g.currentHero;
    const pi  = g._currentPlayerIdx();
    document.getElementById('turn-label').textContent =
      cur ? `Tour ${g.globalTurn} — Joueur ${pi + 1} — ${cur.name}` : `Tour ${g.globalTurn}`;

    // Team gold totals (total earned since game start)
    const _teamGold = g.teamGoldEarned || [0, 0];
    document.getElementById('team-gold-p1').textContent = `J1 : ${_teamGold[0]}g`;
    document.getElementById('team-gold-p2').textContent = `J2 : ${_teamGold[1]}g`;

    // Hero lists
    this._renderHeroList(0);
    this._renderHeroList(1);

    // Action panel
    this._renderActionPanel();

    // Action counter (skipped when opponent's turn — _renderActionPanel already set the message)
    const _isOpponentTurn = window.OnlineMode?.active && g.phase === 'playing' &&
      g.currentHero && g.currentHero.playerIdx !== window.OnlineMode.playerIdx;
    if (!_isOpponentTurn) {
      document.getElementById('action-counter-text').innerHTML =
        `Actions: ${g.actionsUsed}/${MAX_ACTIONS} &nbsp;|&nbsp; <span class="pm-counter">👟 PM : ${g.movementLeft}</span>`;
    }
  }

  _renderHeroList(playerIdx) {
    const el     = document.getElementById(`p${playerIdx + 1}-heroes-list`);
    const _ROLE_PRI = { solo: 1, roam: 2, mage: 3, dpt: 4, support: 5 };
    const heroes = [...this.game.players[playerIdx].heroes].sort((a, b) => (_ROLE_PRI[a.roleId] || 9) - (_ROLE_PRI[b.roleId] || 9));
    el.innerHTML = '';
    heroes.forEach(hero => {
      const isCurrent = hero === this.game.currentHero;
      const div = document.createElement('div');
      div.className = 'hero-list-item' + (isCurrent ? ' active' : '') + (!hero.isAlive ? ' dead' : '');
      const _rawHpPct     = hero.maxHP > 0 ? Math.max(0, hero.currentHP / hero.maxHP * 100) : 0;
      const shieldPct     = hero.shield      > 0 && hero.maxHP > 0 ? Math.min(hero.shield      / hero.maxHP * 100, 100) : 0;
      const magicShieldPct= (hero.magicShield||0) > 0 && hero.maxHP > 0 ? Math.min(hero.magicShield / hero.maxHP * 100, 100 - shieldPct) : 0;
      const hpPct         = isNaN(_rawHpPct) ? 0 : Math.min(_rawHpPct, 100 - shieldPct - magicShieldPct).toFixed(1);
      const manaPct       = hero.maxMana > 0 ? Math.max(0, hero.currentMana / hero.maxMana * 100).toFixed(0) : 0;
      const shieldTitle   = hero.shield > 0 ? ` title="Bouclier : ${hero.shield} HP"` : '';
      // Grille d'équipement (6 slots, 3 par ligne)
      const SLOTS = 6;
      let slots = '';
      for (let s = 0; s < SLOTS; s++) {
        const itemId = hero.items[s];
        if (itemId && EQUIPMENT[itemId]) {
          const item = EQUIPMENT[itemId];
          slots += `<div class="hli-inv-slot hli-inv-slot--filled" data-item-id="${itemId}">
            <img src="${item.icon}" alt="${item.name}" class="hli-inv-img">
          </div>`;
        } else {
          slots += `<div class="hli-inv-slot"></div>`;
        }
      }
      const inventoryHtml = `<div class="hli-inventory">${slots}</div>`;

      const t = HERO_TYPES[hero.id];
      const portraitHtml = t?.portrait
        ? `<img src="${t.portrait}" class="hli-portrait" alt="${hero.name}">`
        : `<div class="hli-portrait hli-portrait--fallback" style="background:${hero.colorFill}">${hero.name[0]}</div>`;

      div.innerHTML = `
        <div class="hli-top">
          ${portraitHtml}
          <div class="hli-info">
            <div class="hli-header">
              <span class="hli-name" style="color:${hero.colorStroke}">${hero.name}</span>
              <span class="hli-gold">💰${hero.gold}g</span>
            </div>
            <div class="hli-role">${hero.role}</div>
            <div class="hli-bar" title="${[`${hero.currentHP}/${hero.maxHP} HP`, hero.shield > 0 ? `Bouclier : ${hero.shield}` : '', (hero.magicShield||0) > 0 ? `Bouclier magique : ${hero.magicShield}` : ''].filter(Boolean).join(' · ')}">${shieldPct > 0 ? `<div class="shield-fill" style="width:${shieldPct}%"></div>` : ''}${magicShieldPct > 0 ? `<div class="magic-shield-fill" style="width:${magicShieldPct}%;right:${shieldPct}%"></div>` : ''}<div class="hli-fill hp-fill" style="width:${hpPct}%"></div></div>
            <div class="hli-bar" title="${hero.currentMana}/${hero.maxMana} MP"><div class="hli-fill mana-fill" style="width:${manaPct}%"></div></div>
            ${!hero.isAlive ? '<div class="hli-dead">ÉLIMINÉ</div>' : this._buildStatusBadges(hero)}
          </div>
        </div>
        ${inventoryHtml}
      `;
      el.appendChild(div);
    });
  }

  _buildStatusBadges(hero) {
    const badges = [];
    const b = (cls, icon, label) => `<span class="hli-badge hli-badge--${cls}" title="${label}">${icon}</span>`;

    // Vérifier si ce héros est harponné par Hornet
    if (window.game) {
      for (const player of window.game.players) {
        for (const h of player.heroes) {
          if (h && h.hornetHarpoonedTargets && h.hornetHarpoonedTargets[hero.instanceId] && h.hornetHarpoonedTargets[hero.instanceId] > window.game.globalTurn) {
            badges.push(b('debuff', '🪝', `Harponné par ${h.name}`));
          }
        }
      }
    }

    // Debuffs
    for (const e of (hero.statusEffects || [])) {
      if (e.type === 'stun')       badges.push(b('debuff', '⚡', `Étourdi (${e.turns}t)`));
      if (e.type === 'slow')       badges.push(b('debuff', '🐌', `Ralenti −${e.pmReduction} PM (${e.turns}t)`));
      if (e.type === 'hemorrhage') badges.push(b('debuff', '🩸', `Hémorragie soins −50% (${e.turns}t)`));
      if (e.type === 'malediction')badges.push(b('debuff', '🔮', `Malédiction portée −3 (${e.turns}t)`));
      if (e.type === 'mute')       badges.push(b('debuff', '🔇', `Muet — sorts bloqués (${e.turns}t)`));
    }
    // DOTs — une icône par source distincte
    if (hero.dots && hero.dots.length > 0) {
      const _dotIcons = { 'Nuisance noire': '🌑', 'Torche Sombre': '🔥', 'Masque de Larme': '💧' };
      const _dotGroups = {};
      hero.dots.forEach(d => {
        const key = d.label || 'Nuisance noire';
        if (!_dotGroups[key]) _dotGroups[key] = { dmg: 0, turns: 0 };
        _dotGroups[key].dmg   += d.dmgPerTurn;
        _dotGroups[key].turns  = Math.max(_dotGroups[key].turns, d.turns);
      });
      Object.entries(_dotGroups).forEach(([label, { dmg, turns }]) => {
        const icon = _dotIcons[label] || '☠️';
        badges.push(b('debuff', icon, `${label} −${dmg}/tour (${turns}t)`));
      });
    }
    const _seTypes = new Set((hero.statusEffects || []).map(e => e.type));
    if ((hero.hemorrhageTurns || 0) > 0 && !_seTypes.has('hemorrhage')) badges.push(b('debuff', '🩸', `Hémorragie soins −50% (${hero.hemorrhageTurns}t)`));
    if ((hero.maledictionTurns|| 0) > 0 && !_seTypes.has('malediction')) badges.push(b('debuff', '🔮', `Malédiction portée −3 (${hero.maledictionTurns}t)`));
    if ((hero.rootTurns       || 0) > 0) badges.push(b('debuff', '🌿', `Immobilisé (${hero.rootTurns}t)`));

    // Boucliers
    if ((hero.shield || 0) > 0) {
      const label = hero.shieldTurnsLeft > 0 ? `Bouclier ${hero.shield} HP (${hero.shieldTurnsLeft}t)` : `Bouclier ${hero.shield} HP`;
      badges.push(b('shield', '🛡', label));
    }
    if ((hero.magicShield || 0) > 0) badges.push(b('magic-shield', '💜', `Bouclier magique ${hero.magicShield} HP`));
    if ((hero.daggerShield|| 0) > 0) badges.push(b('shield', '🗡', `Bouclier Dague ${hero.daggerShield} HP`));

    // Buffs défensifs
    if ((hero.invincibleTurnsLeft || 0) > 0)     badges.push(b('buff', '✨', `Invincible (${hero.invincibleTurnsLeft}t)`));

    // Buffs offensifs
    if (hero.empoweredAttack)                    badges.push(b('buff', '⚡', 'Attaque renforcée'));
    if ((hero.bonusPMNextTurn || 0) > 0)         badges.push(b('buff', '👟', `+${hero.bonusPMNextTurn} PM prochain tour`));
    if ((hero.layiaBonusNextAttack || 0) > 0)    badges.push(b('buff', '🏹', `Prochain AA +${hero.layiaBonusNextAttack}`));

    // Cooldown Protection Divine
    if ((hero.protectionDivineCooldown || 0) > 0) badges.push(b('cd', '🕊', `Protection Divine CD ${hero.protectionDivineCooldown}t`));

    return `<div class="hli-status-row">${badges.join('')}</div>`;
  }

  _renderActionPanel() {
    const g    = this.game;
    const hero = g.currentHero;
    const nameEl   = document.getElementById('hero-name-display');
    const statsEl  = document.getElementById('hero-stats-display');
    const spellsEl = document.getElementById('spell-buttons');
    const btnMove   = document.getElementById('btn-move');
    const btnAttack = document.getElementById('btn-attack');
    const btnShop   = document.getElementById('btn-shop');
    const btnEndTurn = document.getElementById('btn-end-turn');
    const actionCounter = document.getElementById('action-counter-text');

    // Online mode — opponent's turn: hide action controls, show waiting message
    const isOpponentTurn = window.OnlineMode?.active && g.phase === 'playing' &&
      hero && hero.playerIdx !== window.OnlineMode.playerIdx;

    if (isOpponentTurn) {
      nameEl.textContent = '—';
      statsEl.innerHTML = '';
      spellsEl.innerHTML = '';
      btnMove.style.display   = 'none';
      btnAttack.style.display = 'none';
      if (btnShop)    btnShop.style.display    = 'none';
      if (btnEndTurn) btnEndTurn.style.display  = 'none';
      if (actionCounter) actionCounter.innerHTML = '<span style="opacity:.7">⏳ Adversaire en train de jouer…</span>';
      return;
    }

    // Restore display if previously hidden
    btnMove.style.display   = '';
    btnAttack.style.display = '';
    if (btnShop)    btnShop.style.display    = '';
    if (btnEndTurn) btnEndTurn.style.display  = '';

    if (!hero) {
      nameEl.textContent = '—';
      statsEl.innerHTML = spellsEl.innerHTML = '';
      if (btnShop) btnShop.disabled = true;
      return;
    }

    nameEl.innerHTML = `${hero.name} <span style="color:#00d2ff">J${hero.playerIdx + 1}</span> <span class="hero-gold-badge">💰 ${hero.gold}g</span>`;

    const _rawHpPct2 = Math.max(0, hero.currentHP / hero.maxHP * 100);
    const _shPct     = hero.shield > 0 ? Math.min(hero.shield / hero.maxHP * 100, 100) : 0;
    const hpPct      = Math.min(_rawHpPct2, 100 - _shPct).toFixed(1);
    const manaPct    = (hero.currentMana / hero.maxMana * 100).toFixed(1);
    const _shTitle   = hero.shield > 0 ? ` title="Bouclier : ${hero.shield} HP"` : '';
    const _myWolves = hero.passive === 'noyala_passive'
      ? (g.noyalaWolves || []).filter(w => w.ownerInstanceId === hero.instanceId) : [];
    const _wolfInfo = _myWolves.length > 0
      ? _myWolves.map(w => {
          const sel = g.actionMode === 'wolf_move' && g.selectedWolf === w;
          return `<span title="Loup — ${w.hp}/${w.maxHp} PV · ${w.pmLeft}/${w.pm} PM" style="cursor:default;${sel ? 'color:#7dc832;font-weight:bold;' : 'opacity:0.85;'}">🐺${w.pmLeft}PM</span>`;
        }).join(' ') : '';
    statsEl.innerHTML = `
      <div class="stat-bars">
        <div class="stat-label">❤ ${hero.currentHP}/${hero.maxHP}</div>
        <div class="stat-bar-bg"${_shTitle}><div class="stat-bar-hp" style="width:${hpPct}%"></div>${_shPct > 0 ? `<div class="shield-fill" style="width:${_shPct}%"></div>` : ''}</div>
        <div class="stat-label">🔵 ${hero.currentMana}/${hero.maxMana}</div>
        <div class="stat-bar-bg"><div class="stat-bar-mana" style="width:${manaPct}%"></div></div>
      </div>
      <div class="stat-row">
        <span>⚔ ${hero.ad}</span><span>✨ ${hero.ap}</span>
        <span>🛡 ${hero.armor}</span><span>🧿 ${hero.mr}</span>
        ${(hero.cdReduction || 0) > 0 ? `<span title="Réduction de cooldown">⏬ −${hero.cdReduction} CD</span>` : ''}
        ${hero.shield > 0 ? `<span class="stat-shield">🔰 ${hero.shield}</span>` : ''}
        ${_wolfInfo}
      </div>`;

    btnMove.classList.toggle('active-mode', g.actionMode === 'move');
    btnMove.disabled = g.movementLeft === 0 || g.actionsUsed >= MAX_ACTIONS;

    btnAttack.classList.toggle('active-mode', g.actionMode === 'attack');
    btnAttack.disabled = g.autoAttacksUsed >= g.autoAttacksAllowed || g.actionsUsed >= MAX_ACTIONS;
    btnAttack.innerHTML = `Attaque <span style="font-size:0.78em;opacity:0.8">(${g.autoAttacksUsed}/${g.autoAttacksAllowed})</span>`;

    // Spells
    spellsEl.innerHTML = '';
    hero.spells.forEach(spell => {
      const btn      = document.createElement('button');
      const cd       = hero.cooldowns[spell.id];
      const usedCount = typeof g.spellsUsed[spell.id] === 'number' ? g.spellsUsed[spell.id] : (g.spellsUsed[spell.id] ? 999 : 0);
      const used     = usedCount >= (spell.maxUsesPerTurn || 1);
      const noMana   = hero.currentMana < spell.manaCost;
      const isActive = g.actionMode === 'spell' && g.selectedSpell?.id === spell.id;

      btn.className = 'action-btn spell-btn';
      const _recallReactivation = spell.targetType === 'solo_recall' && hero.soloRecallActive;
      btn.disabled  = used || (cd > 0 && !_recallReactivation) || (noMana && !_recallReactivation) || g.actionsUsed >= MAX_ACTIONS;
      btn.classList.toggle('active-mode', isActive);
      if (_recallReactivation) btn.classList.add('recall-ready');
      btn.dataset.spellId = spell.id;

      const keyMatch = spell.id.match(/_([qwer])$/i);
      const key = keyMatch ? keyMatch[1].toUpperCase() : spell.name[0].toUpperCase();
      const maxUses = spell.maxUsesPerTurn || 1;
      const overlay = used ? '✓' : _recallReactivation ? '↩' : cd > 0 ? cd : maxUses > 1 && usedCount > 0 ? `${usedCount}/${maxUses}` : '';
      if (spell.icon) {
        btn.style.backgroundImage = `url('${spell.icon}')`;
        btn.style.backgroundSize = 'cover';
        btn.style.backgroundPosition = 'center';
      }
      btn.innerHTML = `<span class="spell-key">${key}</span>${overlay !== '' ? `<span class="spell-cd-overlay ${used ? 'spell-used' : _recallReactivation ? 'recall-active' : ''}">${overlay}</span>` : ''}`;

      spellsEl.appendChild(btn);
    });

    // Boutique button
    if (btnShop) {
      btnShop.disabled = !g.canBuy || g.actionsUsed >= MAX_ACTIONS;
      btnShop.title    = g.canBuy ? '' : 'Boutique verrouillée (action déjà effectuée)';
    }
  }

  // ============================================================
  // MAP HERO TOOLTIP
  // ============================================================

  showMapHeroTooltip(hero, clientX, clientY) {
    const tip = this._mapHeroTooltip;
    const hpPct  = Math.round(hero.currentHP  / hero.maxHP  * 100);
    const manaPct = Math.round(hero.currentMana / hero.maxMana * 100);
    const shieldHtml = (hero.shield || 0) > 0
      ? `<div class="mht-row"><span>Bouclier</span><span class="mht-shield">${hero.shield}</span></div>` : '';
    const statusHtml = (hero.statusEffects || []).filter(e => e.turns > 0).map(e =>
      `<span class="mht-status">${e.label || e.type} (${e.turns}t)</span>`
    ).join('');
    const itemsHtml = hero.items.length
      ? hero.items.map(id => {
          const it = EQUIPMENT[id];
          return it ? `<img src="${it.icon}" alt="${it.name}" title="${it.name}" class="mht-item-icon">` : '';
        }).join('')
      : '<span class="mht-none">Aucun item</span>';

    tip.innerHTML = `
      <div class="mht-name" style="color:${hero.playerIdx === 0 ? '#00d2ff' : '#ff6b35'}">${hero.name}</div>
      <div class="mht-row"><span>❤ HP</span><span>${hero.currentHP}/${hero.maxHP} <span class="mht-pct">(${hpPct}%)</span></span></div>
      <div class="mht-row"><span>🔵 Mana</span><span>${hero.currentMana}/${hero.maxMana} <span class="mht-pct">(${manaPct}%)</span></span></div>
      ${shieldHtml}
      <div class="mht-row"><span>AD / AP</span><span>${hero.ad} / ${hero.ap}</span></div>
      <div class="mht-row"><span>Armure / RM</span><span>${hero.armor} / ${hero.mr}</span></div>
      <div class="mht-row"><span>PM / PO</span><span>${hero.pm} / ${hero.po}</span></div>
      ${statusHtml ? `<div class="mht-statuses">${statusHtml}</div>` : ''}
      <div class="mht-items">${itemsHtml}</div>`;

    tip.style.display = 'block';
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    let left = clientX + 14, top = clientY - th / 2;
    if (left + tw > window.innerWidth)  left = clientX - tw - 14;
    if (top < 4)                        top  = 4;
    if (top + th > window.innerHeight)  top  = window.innerHeight - th - 4;
    tip.style.left = left + 'px';
    tip.style.top  = top  + 'px';
  }

  hideMapHeroTooltip() {
    this._mapHeroTooltip.style.display = 'none';
  }

  // ============================================================
  // SHOP OVERLAY
  // ============================================================

  _initInvTooltip() {
    const STAT_LABELS = { ad:'AD', ap:'AP', armor:'Armure', mr:'Résist. Mag',
      maxHP:'HP max', maxMana:'Mana max', pm:'PM', po:'PO',
      lifeSteal:'Vol de vie %', hpRegen:'Regen HP', manaRegen:'Regen Mana', manaRegenPct:'Regen Mana %',
      critChance:'Chance Critique %', extraAutoAttacks:'Attaques/tour',
      cdReduction:'Réduction CD',
      goldPerTurn:'Gold/tour', healEfficiency:'Efficacité soins %',
      goldSharePct:'Partage gold %', manaOnSpell:'Mana max/sort', armorPct:'Armure %' };

    const show = (itemId, el) => {
      const item = EQUIPMENT[itemId];
      if (!item) return;
      const statsHtml = Object.entries(STAT_LABELS)
        .filter(([k]) => item.stats[k])
        .map(([k, lbl]) => `<div class="inv-tt-stat"><span>${lbl}</span><span>+${item.stats[k]}</span></div>`)
        .join('');
      const passiveHtml = item.passive
        ? `<div class="inv-tt-passive"><b>Passif :</b> ${item.passive}</div>` : '';
      this._tooltip.innerHTML = `
        <div class="inv-tt-name">${item.name} <span class="inv-tt-tier">T${item.tier}</span></div>
        <div class="inv-tt-stats">${statsHtml}</div>
        ${passiveHtml}`;
      const rect = el.getBoundingClientRect();
      this._tooltip.style.display = 'block';
      // Position : à droite du slot si assez de place, sinon à gauche
      const tw = this._tooltip.offsetWidth;
      const left = rect.right + 8 + tw > window.innerWidth ? rect.left - tw - 8 : rect.right + 8;
      this._tooltip.style.left = left + 'px';
      this._tooltip.style.top  = Math.min(rect.top, window.innerHeight - this._tooltip.offsetHeight - 8) + 'px';
    };

    const hide = () => { this._tooltip.style.display = 'none'; };

    [1, 2].forEach(pi => {
      const el = document.getElementById(`p${pi}-heroes-list`);
      el.addEventListener('mouseover', e => {
        const slot = e.target.closest('.hli-inv-slot--filled');
        if (slot) show(slot.dataset.itemId, slot);
      });
      el.addEventListener('mouseleave', hide);
      el.addEventListener('mouseout', e => {
        if (!e.target.closest('.hli-inv-slot--filled')) hide();
      });
    });
  }

  _itemIcon(item, cls = '') {
    return `<img src="${item.icon}" alt="${item.name}" class="item-icon ${cls}">`;
  }

  openShop() {
    const hero = this.game.currentHero;
    const defaultCat = this.game.globalTurn === 1 ? 'starter' : 'ad';
    this._shopCurrentCategory = defaultCat;
    document.getElementById('shop-overlay').style.display = 'flex';
    document.querySelectorAll('.shop-tab').forEach(t => t.classList.toggle('active', t.dataset.cat === defaultCat));
    this._refreshShopHero();
    this._refreshShopGrid(defaultCat);
    this._clearShopDetail();
  }

  closeShop() {
    document.getElementById('shop-overlay').style.display = 'none';
    this.render();
    this.updateUI();
  }

  _refreshShopHero() {
    const hero = this.game.currentHero;
    if (!hero) return;
    document.getElementById('shop-hero-name').textContent = `${hero.name} — J${hero.playerIdx + 1}`;
    document.getElementById('shop-hero-gold').textContent = `💰 ${hero.gold}g`;

    // Sync gold badge in the left hero list panel
    this._renderHeroList(hero.playerIdx);

    const hpPct   = (hero.currentHP   / hero.maxHP   * 100).toFixed(1);
    const manaPct = (hero.currentMana / hero.maxMana * 100).toFixed(1);
    document.getElementById('shop-bar-hp').style.width   = hpPct   + '%';
    document.getElementById('shop-bar-mana').style.width = manaPct + '%';
    document.getElementById('shop-bar-hp-num').textContent   = `${hero.currentHP}/${hero.maxHP}`;
    document.getElementById('shop-bar-mana-num').textContent = `${hero.currentMana}/${hero.maxMana}`;

    const STAT_LABELS = { ad:'⚔ AD', ap:'✨ AP', armor:'🛡 Armure', mr:'🧿 RésistMag',
                          pm:'🏃 PM', po:'🎯 PO', lifeSteal:'🩸 VolVie', hpRegen:'💚 RegenHP', manaRegen:'💙 RegenMana',
                          critChance:'🎲 Crit', extraAutoAttacks:'💥 AA/tour', cdReduction:'⏬ −CD' };
    const _STAT_PCT = new Set(['lifeSteal', 'critChance']);
    const statsEl = document.getElementById('shop-hero-stats');
    statsEl.innerHTML = Object.entries(STAT_LABELS)
      .filter(([k]) => (k !== 'extraAutoAttacks' && k !== 'critChance') || (hero[k] ?? 0) > 0)
      .map(([k, lbl]) => {
        const val = hero[k] ?? 0;
        const display = _STAT_PCT.has(k) ? `${val}%` : k === 'extraAutoAttacks' ? `+${val}` : val;
        return `<span>${lbl}: <b>${display}</b></span>`;
      })
      .join('');

    const invEl = document.getElementById('shop-inventory');
    invEl.innerHTML = '';
    if (!hero.items.length) {
      invEl.innerHTML = '<div style="font-size:0.68rem;color:var(--muted)">Aucun item</div>';
    } else {
      const counts = {};
      hero.items.forEach(id => counts[id] = (counts[id] || 0) + 1);
      Object.entries(counts).forEach(([id, n]) => {
        const item = EQUIPMENT[id];
        const refund = Math.floor(item.totalCost * 0.8);
        const div = document.createElement('div');
        div.className = 'inv-item';
        div.innerHTML = `${this._itemIcon(item, 'inv-item-icon')}
          <span class="inv-item-name">${item.name}${n > 1 ? ` ×${n}` : ''}</span>
          <span class="inv-item-tier">${item.isStarter ? 'Starter' : 'T' + item.tier}</span>`;
        const sellBtn = document.createElement('button');
        sellBtn.className = 'inv-sell-btn';
        sellBtn.textContent = `Vendre ${refund}g`;
        sellBtn.addEventListener('click', () => {
          window.input._shopSell(id);
        });
        div.appendChild(sellBtn);
        invEl.appendChild(div);
      });
    }
  }

  _refreshShopGrid(cat) {
    this._shopCurrentCategory = cat;
    const hero = this.game.currentHero;
    const grid = document.getElementById('shop-grid');
    grid.innerHTML = '';

    // Helper : ajoute un séparateur de tier dans la grid
    const _tierHeader = tier => {
      const h = document.createElement('div');
      h.className = 'shop-tier-header';
      h.textContent = `Tier ${tier}`;
      grid.appendChild(h);
    };

    // Helper : construit une carte item et l'ajoute à la grid
    const _addCard = (item, { owned = false, bootsBlocked = false } = {}) => {
      const cost      = this.game.getBuyCost(hero, item.id);
      const craftable = item.recipe.length > 0 && this.game._hasComponents(hero, item.recipe);
      const hasPartial = item.recipe.some(cId => hero.items.includes(cId));
      const affordable = !owned && !bootsBlocked && hero.gold >= cost;
      const priceClass = affordable ? 'sic-ok' : hasPartial ? 'sic-partial' : 'sic-bad';
      const card = document.createElement('div');
      card.className = 'shop-item-card' +
        (craftable ? ' shop-craftable' : '') +
        (affordable || owned ? '' : ' shop-unaffordable');
      card.dataset.itemId = item.id;
      card.innerHTML = `
        ${this._itemIcon(item, 'sic-icon')}
        <span class="sic-name">${item.name}</span>
        <span class="sic-tier-badge">T${item.tier}</span>
        ${owned
          ? '<span class="sic-owned">✓ Équipé</span>'
          : `<span class="sic-cost ${priceClass}">${cost}g</span>`}
        ${craftable && !owned ? '<span class="sic-forge">⚒ Forger</span>' : ''}`;
      card.addEventListener('mouseenter', () => {
        document.querySelectorAll('.shop-item-card').forEach(c => {
          const ci = EQUIPMENT[c.dataset.itemId];
          if (!ci) return;
          if (ci.recipe.includes(item.id)) c.classList.add('shop-highlight-upgrade');
          if (item.recipe.includes(ci.id)) c.classList.add('shop-highlight-component');
        });
      });
      card.addEventListener('mouseleave', () => {
        document.querySelectorAll('.shop-highlight-upgrade,.shop-highlight-component').forEach(c => {
          c.classList.remove('shop-highlight-upgrade', 'shop-highlight-component');
        });
      });
      grid.appendChild(card);
    };

    // Onglet Bottes : items avec isBoots, groupés par tier
    if (cat === 'boots') {
      const items      = Object.values(EQUIPMENT).filter(i => i.isBoots).sort((a, b) => a.tier - b.tier);
      const bootsInInv = hero.items.filter(id => EQUIPMENT[id]?.isBoots).length;
      let lastTier = null;
      items.forEach(item => {
        if (item.tier !== lastTier) { _tierHeader(item.tier); lastTier = item.tier; }
        const owned      = hero.items.includes(item.id);
        const craftable  = item.recipe.length > 0 && this.game._hasComponents(hero, item.recipe);
        const bootsFreed = craftable ? item.recipe.filter(cId => EQUIPMENT[cId]?.isBoots).length : 0;
        _addCard(item, { owned, bootsBlocked: !owned && bootsInInv - bootsFreed >= 1 });
      });
      return;
    }

    // Onglet Starter : items starters uniquement (1 max par héros)
    if (cat === 'starter') {
      const hasStarter = hero.items.some(id => EQUIPMENT[id]?.isStarter);
      const starters   = Object.values(EQUIPMENT).filter(i => i.isStarter);
      const h = document.createElement('div');
      h.className = 'shop-tier-header';
      h.textContent = 'Starters — 1 maximum par héros';
      grid.appendChild(h);
      starters.forEach(item => {
        const owned         = hero.items.includes(item.id);
        const starterLocked = !owned && hasStarter;
        const cost          = this.game.getBuyCost(hero, item.id);
        const affordable    = !owned && !starterLocked && hero.gold >= cost;
        const card = document.createElement('div');
        card.className = 'shop-item-card' + (affordable || owned ? '' : ' shop-unaffordable');
        card.dataset.itemId = item.id;
        card.innerHTML = `
          ${this._itemIcon(item, 'sic-icon')}
          <span class="sic-name">${item.name}</span>
          <span class="sic-tier-badge">Starter</span>
          ${owned
            ? '<span class="sic-owned">✓ Équipé</span>'
            : starterLocked
              ? '<span class="sic-bad" style="font-size:0.65rem">Déjà 1 starter</span>'
              : `<span class="sic-cost ${affordable ? 'sic-ok' : 'sic-bad'}">${cost}g</span>`}`;
        grid.appendChild(card);
      });
      return;
    }

    // Onglets stats : filtrer par stat principale
    const STAT_FILTERS = {
      ad:   i => (i.stats.ad    || 0) > 0,
      ap:   i => (i.stats.ap    || 0) > 0,
      hp:   i => (i.stats.maxHP || 0) > 0,
      res:  i => (i.stats.armor || 0) > 0 || (i.stats.mr || 0) > 0,
      mana: i => (i.stats.maxMana || 0) > 0 || (i.stats.manaRegen || 0) > 0 || (i.stats.manaRegenPct || 0) > 0,
      util: i => !i.notInUtil && ((i.stats.lifeSteal       || 0) > 0 || (i.stats.cdReduction    || 0) > 0 ||
                 (i.stats.bonusSpellRange|| 0) > 0 || (i.stats.hpRegen         || 0) > 0 ||
                 (i.stats.goldPerTurn    || 0) > 0 || (i.stats.healEfficiency   || 0) > 0 ||
                 (i.stats.manaOnSpell    || 0) > 0 || (i.stats.goldSharePct     || 0) > 0),
      crit: i => (i.stats.critChance       || 0) > 0,
      aa:   i => (i.stats.extraAutoAttacks || 0) > 0
    };
    const statFilter = STAT_FILTERS[cat];
    if (statFilter) {
      const items = Object.values(EQUIPMENT)
        .filter(i => !i.isBoots && !i.isStarter && !i.notBuyable && statFilter(i))
        .sort((a, b) => a.tier - b.tier);
      if (!items.length) {
        grid.innerHTML = '<div style="padding:20px;color:var(--muted);font-size:0.8rem">Aucun item dans cette catégorie.</div>';
        return;
      }
      let lastTier = null;
      items.forEach(item => {
        if (item.tier !== lastTier) { _tierHeader(item.tier); lastTier = item.tier; }
        _addCard(item, { owned: hero.items.includes(item.id) });
      });
    }
  }

  _showShopDetail(itemId) {
    const item = EQUIPMENT[itemId];
    const hero = this.game.currentHero;
    const crafting   = item.recipe.length > 0 && this.game._hasComponents(hero, item.recipe);
    const cost       = this.game.getBuyCost(hero, item.id);
    const canAfford  = hero.gold >= cost;

    // Net stat changes (accounting for consumed components when crafting)
    const STAT_LABELS = { ad:'AD', ap:'AP', armor:'Armure %', mr:'Résist. Mag',
                          maxHP:'HP max', maxMana:'Mana max', pm:'PM', po:'PO',
                          lifeSteal:'Vol de vie %', hpRegen:'Regen HP', manaRegen:'Regen Mana', manaRegenPct:'Regen Mana %',
                          critChance:'Chance Critique %', extraAutoAttacks:'Attaques/tour',
                          cdReduction:'Réduction CD',
                          goldPerTurn:'Gold/tour', healEfficiency:'Efficacité soins %',
                          goldSharePct:'Partage gold %', manaOnSpell:'Mana max/sort' };
    const netStats = { ...item.stats };
    if (crafting) {
      const toRemove = [...item.recipe];
      toRemove.forEach(cId => {
        const comp = EQUIPMENT[cId];
        Object.entries(comp.stats).forEach(([s, v]) => { netStats[s] = (netStats[s] || 0) - v; });
      });
    }

    // Ne pas afficher manaOnSpellMax (cap interne), ni les stats à 0
    delete netStats.manaOnSpellMax;

    let statHtml = '';
    Object.entries(STAT_LABELS).forEach(([stat, lbl]) => {
      const delta = netStats[stat];
      if (!delta) return;
      const cur   = hero[stat] ?? 0;
      const color = delta > 0 ? '#2ecc71' : '#e74c3c';
      const sign  = delta > 0 ? '+' : '';
      statHtml += `<div class="sd-stat">
        <span class="sd-sname">${lbl}:</span>
        <span class="sd-sval">${cur} → <b style="color:${color}">${cur + delta}</b>
          <span style="color:${color};font-size:0.65rem">(${sign}${delta})</span></span>
      </div>`;
    });
    if (!statHtml && item.instant?.currentHP) {
      statHtml = `<div class="sd-stat"><span class="sd-sname">HP:</span>
        <span class="sd-sval"><b style="color:#2ecc71">+${item.instant.currentHP}</b> instantané</span></div>`;
    }

    // Recipe display
    let recipeHtml = '';
    if (item.recipe.length) {
      const counts = {};
      item.recipe.forEach(cId => counts[cId] = (counts[cId] || 0) + 1);
      recipeHtml = '<div class="sd-recipe">Recette : ';
      Object.entries(counts).forEach(([cId, needed]) => {
        const comp = EQUIPMENT[cId];
        const tmp = [...hero.items];
        let have = 0;
        for (let i = 0; i < needed; i++) { const ix = tmp.indexOf(cId); if (ix !== -1) { have++; tmp.splice(ix, 1); } }
        const ok    = have >= needed;
        const color = ok ? '#2ecc71' : '#e74c3c';
        const label = needed > 1 ? `${comp.name} ×${needed}` : comp.name;
        recipeHtml += `<span class="sd-comp" data-item-id="${cId}" style="color:${color};cursor:pointer" title="Acheter ${comp.name}">${this._itemIcon(comp, 'sd-comp-icon')} ${label} <span class="sd-check">[${have}/${needed}]</span></span>`;
      });
      recipeHtml += '</div>';
    }

    const tierLabel  = `Tier ${item.tier}`;
    const btnClass   = crafting ? 'sd-buy-btn sd-forge-btn' : 'sd-buy-btn';
    const btnLabel   = crafting ? `⚒ Forger — ${cost}g` : `Acheter — ${cost}g`;
    const passiveHtml = item.passive
      ? `<div class="sd-passive"><span class="sd-passive-label">Passif :</span> ${item.passive}${item.roleRestrictionNote ? `<div class="sd-role-restriction">${item.roleRestrictionNote}</div>` : ''}</div>` : '';

    document.getElementById('shop-detail').innerHTML = `
      <div class="sd-header">${this._itemIcon(item, 'sd-icon')} ${item.name} <span class="sd-tier">${tierLabel}</span></div>
      ${recipeHtml}
      <div class="sd-stats">${statHtml}</div>
      ${passiveHtml}
      <div class="sd-buy-row">
        <span class="sd-cost-label">${crafting ? '(composants en inventaire ✓)' : `Coût total : ${cost}g`}</span>
        <button class="${btnClass}" data-item-id="${itemId}" ${canAfford ? '' : 'disabled'}>${btnLabel}</button>
      </div>`;
  }

  _clearShopDetail() {
    document.getElementById('shop-detail').innerHTML =
      '<div class="sd-placeholder">Survolez un item pour voir ses détails</div>';
  }

  // ============================================================
  // SHARED HELPERS
  // ============================================================

  appendLog(msg) {
    const el = document.getElementById('combat-log');
    if (!el) return;
    const div = document.createElement('div');
    div.className = 'log-entry';
    const low = msg.toLowerCase();
    if (/──/.test(msg))                                      div.classList.add('log-turn');
    else if (/kill|mort|éliminé/.test(low))                 div.classList.add('log-kill');
    else if (/soigne|régénère|hp\s*\+|se soigne/.test(low)) div.classList.add('log-heal');
    else if (/dégât|dégâts|−\d/.test(low))                  div.classList.add('log-dmg');
    div.textContent = msg;
    el.appendChild(div);
    while (el.children.length > 120) el.removeChild(el.firstChild);
    el.scrollTop = el.scrollHeight;
  }

  updateTimer(seconds) {
    const el = document.getElementById('timer-display');
    if (!el) return;
    el.textContent = `⏱ ${seconds}s`;
    el.style.color = seconds <= 15 ? '#e74c3c' : '#ecf0f1';
  }

  showGameOver(winnerIdx, matchResult) {
    document.getElementById('game-screen').classList.remove('active');
    const screen = document.getElementById('gameover-screen');
    screen.classList.add('active');
    document.getElementById('gameover-title').textContent =
      winnerIdx === null ? 'Match nul ! (200 tours)' : `Joueur ${winnerIdx + 1} remporte la partie !`;
    if (matchResult) {
      document.getElementById('gameover-scoreboard').innerHTML = renderScoreboard(matchResult);
    }
  }

  // Highlights
  clearHighlights() {
    this.highlightMove               = [];
    this.highlightAttack             = [];
    this.highlightAttackRange        = [];
    this.highlightAttackRangeBlocked = [];
    this.highlightSplashCells        = [];
    this.highlightSpell       = { heroes: [], cells: [], cellsBlocked: [], heroesOutOfRange: [] };
    this.zoneSpellTarget   = null;
    this.highlightPushDirs = [];
    this.pushDirArrows     = [];
    this.highlightWolfMove       = [];
    this.highlightMoveTrapBlocked = [];
  }

  setMoveHighlight() {
    this.highlightMove            = this.game.getReachableCells(true);
    this.highlightMoveTrapBlocked = this.game.getTrapBlockedCells();
  }
  setWolfMoveHighlight(wolf) { this.highlightWolfMove = this.game.getWolfReachableCells(wolf); }
  setAttackHighlight() {
    const hero = this.game.currentHero;
    const isLayia = hero?.passive === 'layia_passive';
    this.highlightAttack         = this.game.getAttackTargets();
    const allCells               = this.game.getAttackRangeCells();
    if (isLayia || !hero?.position) {
      this.highlightAttackRange        = allCells;
      this.highlightAttackRangeBlocked = [];
    } else {
      this.highlightAttackRange        = allCells.filter(c => this.game._hasLineOfSight(hero.position, c, true));
      this.highlightAttackRangeBlocked = allCells.filter(c => !this.game._hasLineOfSight(hero.position, c, true));
    }
  }
  setSpellHighlight(spell) {
    const targets = this.game.getSpellTargets(spell);
    const hero = this.game.currentHero;
    // Séparer les cases selon la ligne de vue
    if (hero?.position && !spell.targetAll && !spell.ignoresLoS &&
        spell.targetType !== 'self' && spell.targetType !== 'no_target' && spell.targetType !== 'bomb_zone') {
      const clear = [], blocked = [];
      (targets.cells || []).forEach(c => {
        (this.game._hasLineOfSight(hero.position, c, true) ? clear : blocked).push(c);
      });
      targets.cells        = clear;
      targets.cellsBlocked = blocked;
    }
    this.highlightSpell = targets;
  }

  setWindGlyphDirectionHighlight(cx, cy) {
    this.highlightPushDirs = [];
    this.pushDirArrows     = [];
    const dirs = [{dx:1,dy:0},{dx:-1,dy:0},{dx:0,dy:1},{dx:0,dy:-1}];
    dirs.forEach(({dx, dy}) => {
      const cells = [];
      for (let step = 1; step <= 3; step++) {
        const nx = cx + dx * step, ny = cy + dy * step;
        if (nx < 0 || nx >= MAP_SIZE || ny < 0 || ny >= MAP_SIZE) break;
        if (isWall(nx, ny)) break;
        cells.push({ x: nx, y: ny });
      }
      if (cells.length) {
        cells.forEach(c => this.highlightPushDirs.push(c));
        const end = cells[cells.length - 1];
        this.pushDirArrows.push({ x: end.x, y: end.y, dx, dy });
      }
    });
  }

  setPushDirectionHighlight(enemy) {
    this.highlightPushDirs = [];
    this.pushDirArrows     = [];
    const dirs = [{dx:1,dy:0},{dx:-1,dy:0},{dx:0,dy:1},{dx:0,dy:-1}];
    dirs.forEach(({dx, dy}) => {
      const cells = [];
      for (let step = 1; step <= 3; step++) {
        const nx = enemy.position.x + dx * step, ny = enemy.position.y + dy * step;
        if (nx < 0 || nx >= MAP_SIZE || ny < 0 || ny >= MAP_SIZE) break;
        if (isWall(nx, ny) || this.game.getHeroAt(nx, ny)) break;
        cells.push({ x: nx, y: ny });
      }
      if (cells.length) {
        cells.forEach(c => this.highlightPushDirs.push(c));
        const end = cells[cells.length - 1];
        this.pushDirArrows.push({ x: end.x, y: end.y, dx, dy });
      }
    });
  }

  // Returns { inZone, valid } for the cell (x,y) given the spell hovered at (tx,ty)
  _spellHoverCell(sp, hero, tx, ty, x, y) {
    const g    = this.game;
    const dist = g._manhattan(hero.position, { x: tx, y: ty });
    const inRange = dist <= sp.range;

    switch (sp.targetType) {
      case 'enemy_hero':
      case 'dash_to_enemy': {
        if (x !== tx || y !== ty) return { inZone: false, valid: false };
        const t = g.getHeroAt(tx, ty);
        return { inZone: true, valid: inRange && !!t && t.playerIdx !== hero.playerIdx };
      }
      case 'ally_hero':
      case 'dash_to_ally': {
        if (x !== tx || y !== ty) return { inZone: false, valid: false };
        const t = g.getHeroAt(tx, ty);
        return { inZone: true, valid: inRange && !!t && t.playerIdx === hero.playerIdx && t !== hero };
      }
      case 'cell':
      case 'stealth_dash': {
        if (x !== tx || y !== ty) return { inZone: false, valid: false };
        return { inZone: true, valid: inRange && !isWall(tx, ty) && !g.getHeroAt(tx, ty) };
      }
      case 'zone': {
        const sz = sp.zone?.size ?? 1;
        if (Math.abs(x - tx) > sz || Math.abs(y - ty) > sz) return { inZone: false, valid: false };
        const hit = g._getEnemies(hero.playerIdx).some(e =>
          Math.abs(e.position.x - tx) <= sz && Math.abs(e.position.y - ty) <= sz
        );
        return { inZone: true, valid: inRange && hit };
      }
      case 'diamond_zone': {
        const sz = sp.zone?.size ?? 2;
        if (Math.abs(x - tx) + Math.abs(y - ty) > sz) return { inZone: false, valid: false };
        const hit = g._getEnemies(hero.playerIdx).some(e =>
          Math.abs(e.position.x - tx) + Math.abs(e.position.y - ty) <= sz
        );
        return { inZone: true, valid: inRange && hit };
      }
      case 'trap': {
        if (x !== tx || y !== ty) return { inZone: false, valid: false };
        const blocked = isWall(tx, ty) || !!g.getHeroAt(tx, ty) || g.traps.some(t => t.x === tx && t.y === ty);
        return { inZone: true, valid: inRange && !blocked };
      }
      case 'line_zone': {
        const sp2 = sp;
        const ldx = tx - hero.position.x, ldy = ty - hero.position.y;
        if (ldx !== 0 && ldy !== 0) return { inZone: false, valid: false };
        const minR = sp2.minRange ?? 1, maxR = sp2.maxRange ?? sp2.range;
        const dist2 = Math.abs(ldx) + Math.abs(ldy);
        if (dist2 < minR || dist2 > maxR) return { inZone: false, valid: false };
        const dirX = ldx === 0 ? 0 : (ldx > 0 ? 1 : -1);
        const dirY = ldy === 0 ? 0 : (ldy > 0 ? 1 : -1);
        // Highlight all cells in the line from minRange to maxRange in that direction
        let inLine = false;
        for (let step = minR; step <= maxR; step++) {
          if (x === hero.position.x + dirX * step && y === hero.position.y + dirY * step) { inLine = true; break; }
        }
        if (!inLine) return { inZone: false, valid: false };
        const valid = g._getEnemies(hero.playerIdx).some(e => {
          const ex = e.position.x - hero.position.x, ey = e.position.y - hero.position.y;
          if (dirX !== 0 && ey === 0 && Math.sign(ex) === dirX) {
            const s = Math.abs(ex); return s >= minR && s <= maxR;
          }
          if (dirY !== 0 && ex === 0 && Math.sign(ey) === dirY) {
            const s = Math.abs(ey); return s >= minR && s <= maxR;
          }
          return false;
        });
        return { inZone: true, valid };
      }
      case 'bomb_zone': {
        // Losange Manhattan ≤ 2 centré sur la case survolée
        if (Math.abs(x - tx) + Math.abs(y - ty) > 2) return { inZone: false, valid: false };
        return { inZone: true, valid: !isWall(tx, ty) };
      }
      case 'push_enemy': {
        if (x !== tx || y !== ty) return { inZone: false, valid: false };
        const t = g.getHeroAt(tx, ty);
        return { inZone: true, valid: !!t && t.playerIdx !== hero.playerIdx && g._manhattan(hero.position, t.position) <= sp.range };
      }
      case 'hate_wall': {
        const hwdx = tx - hero.position.x, hwdy = ty - hero.position.y;
        if ((hwdx !== 0 && hwdy !== 0) || (hwdx === 0 && hwdy === 0)) return { inZone: false, valid: false };
        if (Math.abs(hwdx) + Math.abs(hwdy) !== sp.range) return { inZone: false, valid: false };
        const perpDx = hwdy !== 0 ? 1 : 0, perpDy = hwdx !== 0 ? 1 : 0;
        for (let off = -1; off <= 1; off++) {
          const wx = tx + perpDx * off, wy = ty + perpDy * off;
          if (x === wx && y === wy) return { inZone: true, valid: !isWall(tx, ty) };
        }
        return { inZone: false, valid: false };
      }
      case 'swap_ally': {
        if (x !== tx || y !== ty) return { inZone: false, valid: false };
        const t = g.getHeroAt(tx, ty);
        return { inZone: true, valid: !!t && t.playerIdx === hero.playerIdx && t !== hero };
      }
      case 'fenino_q': {
        if (x !== tx || y !== ty) return { inZone: false, valid: false };
        const t = g.getHeroAt(tx, ty);
        if (!t || t.playerIdx !== hero.playerIdx || t === hero) return { inZone: true, valid: false };
        return { inZone: true, valid: g._manhattan(hero.position, t.position) <= sp.range };
      }
      case 'fenino_w': {
        if (x !== tx || y !== ty) return { inZone: false, valid: false };
        const t = g.getHeroAt(tx, ty);
        if (!t || t.playerIdx === hero.playerIdx) return { inZone: true, valid: false };
        return { inZone: true, valid: g._manhattan(hero.position, t.position) <= sp.range };
      }
      case 'dash_behind_enemy': {
        if (x !== tx || y !== ty) return { inZone: false, valid: false };
        const t = g.getHeroAt(tx, ty);
        if (!t || t.playerIdx === hero.playerIdx) return { inZone: true, valid: false };
        const rdx = tx - hero.position.x, rdy = ty - hero.position.y;
        if (rdx !== 0 && rdy !== 0) return { inZone: true, valid: false };
        return { inZone: true, valid: Math.abs(rdx) + Math.abs(rdy) <= sp.range };
      }
      case 'lame_eau': {
        const rdx = tx - hero.position.x, rdy = ty - hero.position.y;
        if (rdx !== 0 && rdy !== 0) return { inZone: false, valid: false };
        if (Math.abs(rdx) + Math.abs(rdy) !== 2) return { inZone: false, valid: false };
        if (Math.abs(x - tx) > 1 || Math.abs(y - ty) > 1) return { inZone: false, valid: false };
        return { inZone: true, valid: !isWall(tx, ty) };
      }
      case 'cone_zone': {
        // Cône orthogonal dans la direction (hero→target)
        const cdx = tx - hero.position.x, cdy = ty - hero.position.y;
        if (cdx !== 0 && cdy !== 0) return { inZone: false, valid: false };
        if (cdx === 0 && cdy === 0)  return { inZone: false, valid: false };
        const fdx = Math.sign(cdx), fdy = Math.sign(cdy);
        const fwd = fdx !== 0 ? (x - hero.position.x) * fdx : (y - hero.position.y) * fdy;
        const lat = fdx !== 0 ? Math.abs(y - hero.position.y) : Math.abs(x - hero.position.x);
        if (fwd < 1 || fwd > sp.range || lat > fwd) return { inZone: false, valid: false };
        const hit = g._getEnemies(hero.playerIdx).some(e => {
          const ef = fdx !== 0 ? (e.position.x - hero.position.x) * fdx : (e.position.y - hero.position.y) * fdy;
          const el = fdx !== 0 ? Math.abs(e.position.y - hero.position.y) : Math.abs(e.position.x - hero.position.x);
          return ef >= 1 && ef <= sp.range && el <= ef;
        });
        return { inZone: true, valid: hit };
      }
      case 'pibot_r': {
        if (Math.abs(x - tx) + Math.abs(y - ty) > 1) return { inZone: false, valid: false };
        const prdx = tx - hero.position.x, prdy = ty - hero.position.y;
        if (prdx !== 0 && prdy !== 0) return { inZone: true, valid: false };
        const prDist = Math.abs(prdx) + Math.abs(prdy);
        if (prDist === 0 || prDist > sp.range) return { inZone: true, valid: false };
        const prHit = g._getEnemies(hero.playerIdx).some(e =>
          Math.abs(e.position.x - tx) + Math.abs(e.position.y - ty) <= 1
        );
        return { inZone: true, valid: prHit };
      }
      case 'faena_w': {
        if (x !== tx || y !== ty) return { inZone: false, valid: false };
        const dist1 = Math.abs(tx - hero.position.x) + Math.abs(ty - hero.position.y);
        const free = !isWall(tx, ty) && !g.getHeroAt(tx, ty);
        return { inZone: true, valid: dist1 === 1 && free };
      }
      case 'faena_r': {
        if (Math.abs(x - tx) + Math.abs(y - ty) > 1) return { inZone: false, valid: false };
        const inRange = g._manhattan(hero.position, { x: tx, y: ty }) <= sp.range;
        const hit = g._getEnemies(hero.playerIdx).some(e =>
          Math.abs(e.position.x - tx) + Math.abs(e.position.y - ty) <= 1
        );
        return { inZone: true, valid: inRange && hit };
      }
      default:
        return { inZone: false, valid: false };
    }
  }

  _initSpellTooltip() {
    const tip = this._spellTooltip;
    const container = document.getElementById('spell-buttons');

    container.addEventListener('mouseover', e => {
      const btn = e.target.closest('.spell-btn');
      if (!btn) return;
      const hero = this.game.currentHero;
      if (!hero) return;
      const spell = hero.spells.find(s => s.id === btn.dataset.spellId);
      if (!spell) return;

      const cd     = hero.cooldowns[spell.id];
      const used   = !!this.game.spellsUsed[spell.id];
      const noMana = hero.currentMana < spell.manaCost;

      let statusHtml = '';
      if (used)        statusHtml = `<div class="st-status st-used">Déjà utilisé ce tour</div>`;
      else if (cd > 0) statusHtml = `<div class="st-status st-cd">En recharge : ${cd} tour${cd > 1 ? 's' : ''}</div>`;
      else if (noMana) statusHtml = `<div class="st-status st-nomana">Mana insuffisant</div>`;

      const dmgType = spell.damageType === 'magical' ? 'magiques' : spell.damageType === 'physical' ? 'physiques' : '';
      let dmgHtml = '';
      if (spell.baseDamage || spell.adRatio || spell.apRatio) {
        const parts = [];
        if (spell.baseDamage) parts.push(spell.baseDamage);
        if (spell.adRatio)    parts.push(`${spell.adRatio} AD`);
        if (spell.apRatio)    parts.push(`${spell.apRatio} AP`);
        const calculatedDmg = Math.floor((spell.baseDamage || 0) + (hero.ad || 0) * (spell.adRatio || 0) + (hero.ap || 0) * (spell.apRatio || 0));
        dmgHtml = `<div class="st-dmg st-dmg--${spell.damageType || 'raw'}">${parts.join(' + ')} dégâts ${dmgType}<br><small>Avant résistance : ${calculatedDmg} dégâts</small></div>`;
      } else if (spell.healBase) {
        const calculatedHeal = Math.floor((spell.healBase || 0) + (hero.ap || 0) * (spell.healApRatio || 0));
        dmgHtml = `<div class="st-dmg st-dmg--raw">Soigne ${spell.healBase}${spell.healApRatio ? ` + ${spell.healApRatio} AP` : ''}<br><small>Total : ${calculatedHeal} PV</small></div>`;
      } else if (spell.shieldAmount) {
        const calculatedShield = Math.floor((spell.shieldAmount || 0) + (hero.ad || 0) * (spell.adShieldRatio || 0));
        dmgHtml = `<div class="st-dmg st-dmg--raw">Bouclier ${spell.shieldAmount}${spell.adShieldRatio ? ` + ${spell.adShieldRatio} AD` : ''}<br><small>Total : ${calculatedShield} bouclier</small></div>`;
      }

      tip.innerHTML = `
        <div class="st-name">${spell.name}</div>
        <div class="st-meta">${spell.manaCost} mana · Portée ${spell.range} · CD ${(() => { const eff = Math.max(spell.cdMin || 1, spell.cooldown - (hero.cdReduction || 0)); return eff === spell.cooldown ? spell.cooldown : `<span style="text-decoration:line-through;opacity:.5">${spell.cooldown}</span> ${eff}`; })()} tour${spell.cooldown > 1 ? 's' : ''}</div>
        ${dmgHtml}
        ${spell.description ? `<div class="st-desc">${spell.description}</div>` : ''}
        ${statusHtml}`;
      tip.style.display = 'block';
    });

    container.addEventListener('mousemove', e => {
      tip.style.left = (e.clientX + 12) + 'px';
      tip.style.top  = (e.clientY - tip.offsetHeight - 8) + 'px';
    });

    container.addEventListener('mouseleave', () => { tip.style.display = 'none'; });
  }
}
