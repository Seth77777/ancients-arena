// ============================================================
// INPUT HANDLER
// ============================================================

class InputHandler {
  constructor(game, renderer) {
    this.game     = game;
    this.renderer = renderer;
    this._bind();
  }

  _bind() {
    // Canvas
    this.renderer.canvas.addEventListener('click',       e => this._onCanvasClick(e));
    this.renderer.canvas.addEventListener('mousemove',   e => this._onCanvasHover(e));
    this.renderer.canvas.addEventListener('contextmenu', e => { e.preventDefault(); this._cancelMode(); });

    // Action buttons
    document.getElementById('btn-move').addEventListener('click',     () => this._toggleMove());
    document.getElementById('btn-attack').addEventListener('click',   () => this._toggleAttack());
    document.getElementById('btn-end-turn').addEventListener('click', () => this._endTurn());

    // Abandon
    const overlay = document.getElementById('forfeit-overlay');
    document.getElementById('btn-forfeit').addEventListener('click', () => {
      if (!this.game.currentHero) return;
      overlay.style.display = 'flex';
    });
    document.getElementById('forfeit-cancel').addEventListener('click', () => {
      overlay.style.display = 'none';
    });
    document.getElementById('forfeit-confirm').addEventListener('click', () => {
      overlay.style.display = 'none';
      const forfeitingPlayer = window.OnlineMode?.active
        ? window.OnlineMode.playerIdx
        : (this.game.currentHero?.playerIdx ?? 0);
      const winner = forfeitingPlayer === 0 ? 1 : 0;
      this.game.endGame(winner);
      if (window.OnlineMode?.active && window.OnlineMode.isHost) {
        window.OnlineMode.sendState(this.game.serialize());
      }
    });

    // Spell buttons (delegated)
    document.getElementById('spell-buttons').addEventListener('click', e => {
      const btn = e.target.closest('.spell-btn');
      if (btn) this._toggleSpell(btn.dataset.spellId);
    });

    // Draft — hero pool click (delegated)
    document.getElementById('hero-pool').addEventListener('click', e => {
      const card = e.target.closest('.pool-hero-card');
      if (card) this._draftClick(card.dataset.typeId);
    });

    // Boutique — open
    document.getElementById('btn-shop').addEventListener('click', () => this._openShop());

    // Boutique — close
    document.getElementById('shop-close-btn').addEventListener('click', () => this._closeShop());

    // Boutique — tabs
    document.getElementById('shop-tabs').addEventListener('click', e => {
      const tab = e.target.closest('.shop-tab');
      if (!tab) return;
      document.querySelectorAll('.shop-tab').forEach(t => t.classList.toggle('active', t === tab));
      this.renderer._refreshShopGrid(tab.dataset.cat);
      this.renderer._clearShopDetail();
    });

    // Boutique — hover item card → detail
    document.getElementById('shop-grid').addEventListener('mouseover', e => {
      const card = e.target.closest('.shop-item-card');
      if (card) this.renderer._showShopDetail(card.dataset.itemId);
    });

    // Boutique — click item card → buy
    document.getElementById('shop-grid').addEventListener('click', e => {
      const card = e.target.closest('.shop-item-card');
      if (card) this._shopBuy(card.dataset.itemId);
    });

    // Boutique — buy button in detail panel
    document.getElementById('shop-detail').addEventListener('click', e => {
      const btn = e.target.closest('.sd-buy-btn');
      if (btn) this._shopBuy(btn.dataset.itemId);
    });
  }

  // ============================================================
  // HELPERS ONLINE
  // ============================================================

  _isMyTurn() {
    if (!window.OnlineMode?.active) return true;
    const g = this.game, myIdx = window.OnlineMode.playerIdx;
    if (g.phase === 'draft')   return g.draftCurrentPlayer() === myIdx;
    if (g.phase === 'playing') return (g.currentHero?.playerIdx ?? -1) === myIdx;
    return false;
  }

  _onlineSync() {
    if (window.OnlineMode?.active && window.OnlineMode.isHost) {
      window.OnlineMode.sendState(this.game.serialize());
    }
  }

  // ============================================================
  // DRAFT
  // ============================================================

  _draftClick(typeId) {
    const g = this.game, d = g.draft;
    const online  = window.OnlineMode?.active;
    const isGuest = online && !window.OnlineMode.isHost;

    if (online && !this._isMyTurn()) return;
    if (g._isUnavailable(typeId)) return;

    if (isGuest) {
      const action = d.phase === 'ban'
        ? { type: 'ban',  heroId: typeId }
        : { type: 'pick', heroId: typeId };
      window.OnlineMode.sendGuestAction(action);
      return;
    }

    let ok = false;
    if (d.phase === 'ban')       ok = g.banHero(typeId);
    else if (d.phase === 'pick') ok = g.pickHero(typeId);

    if (ok) {
      this._onlineSync();
      if (g.phase === 'playing') {
        document.getElementById('draft-screen').classList.remove('active');
        document.getElementById('game-screen').classList.add('active');
        this.renderer.render();
        this.renderer.updateUI();
      } else {
        this.renderer.renderDraft();
      }
    }
  }

  // ============================================================
  // CANVAS
  // ============================================================

  _cellFromEvent(e) {
    const rect  = this.renderer.canvas.getBoundingClientRect();
    const scaleX = this.renderer.canvas.width  / rect.width;
    const scaleY = this.renderer.canvas.height / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX / CELL_SIZE);
    const y = Math.floor((e.clientY - rect.top)  * scaleY / CELL_SIZE);
    if (x < 0 || x >= MAP_SIZE || y < 0 || y >= MAP_SIZE) return null;
    return { x, y };
  }

  _onCanvasClick(e) {
    const g = this.game, r = this.renderer;
    if (g.phase !== 'playing' || !g.currentHero) return;

    const online  = window.OnlineMode?.active;
    if (online && !this._isMyTurn()) return;
    const isGuest = online && !window.OnlineMode.isHost;

    const cell = this._cellFromEvent(e);
    if (!cell) return;
    const mode = g.actionMode;

    // ── Sélection d'un loup (aucun mode actif → clic sur tuile loup)
    if (!mode) {
      const wolf = (g.noyalaWolves || []).find(
        w => w.x === cell.x && w.y === cell.y && w.ownerInstanceId === g.currentHero.instanceId
      );
      if (wolf) {
        if (wolf.pmLeft <= 0 || g.actionsUsed >= MAX_ACTIONS) return;
        g.actionMode = 'wolf_move'; g.selectedWolf = wolf;
        r.clearHighlights();
        r.highlightWolfMove = g.getWolfReachableCells(wolf);
        r.render(); r.updateUI();
        return;
      }
    }

    // ── Loup (Noyala) ────────────────────────────────────────
    if (mode === 'wolf_move') {
      const wolf = g.selectedWolf;
      if (!wolf) { this._cancelMode(); return; }
      if (isGuest) {
        window.OnlineMode.sendGuestAction({ type: 'wolf_move', wolfId: wolf.id, x: cell.x, y: cell.y });
        r.clearHighlights(); g.actionMode = null; g.selectedWolf = null;
        r.render(); r.updateUI();
        return;
      }
      const moved = g._wolfMove(wolf, cell.x, cell.y);
      this._onlineSync();
      if (!g.noyalaWolves.includes(wolf) || wolf.pmLeft <= 0) {
        g.actionMode = null; g.selectedWolf = null; r.clearHighlights();
      } else if (moved) {
        r.highlightWolfMove = g.getWolfReachableCells(wolf);
      }
      r.render(); r.updateUI();
      return;
    }

    // ── Déplacement ──────────────────────────────────────────
    if (mode === 'move') {
      if (isGuest) {
        window.OnlineMode.sendGuestAction({ type: 'move', x: cell.x, y: cell.y });
        r.clearHighlights(); g.actionMode = null;
        return;
      }
      const ok = g.moveHero(cell.x, cell.y);
      r.clearHighlights();
      g.actionMode = null;
      if (ok && g.movementLeft > 0) r.setMoveHighlight();
      this._onlineSync();
      r.render(); r.updateUI();
      return;
    }

    // ── Attaque ───────────────────────────────────────────────
    if (mode === 'attack') {
      const target = g.getHeroAt(cell.x, cell.y);
      if (target && target.playerIdx !== g.currentHero.playerIdx) {
        if (isGuest) {
          window.OnlineMode.sendGuestAction({ type: 'attack', heroId: target.instanceId });
          r.clearHighlights(); g.actionMode = null;
          return;
        }
        g.autoAttack(target);
        this._onlineSync();
      }
      r.clearHighlights(); g.actionMode = null;
      r.render(); r.updateUI();
      return;
    }

    // ── Sort ──────────────────────────────────────────────────
    if (mode === 'spell') {
      const spell = g.selectedSpell;
      if (!spell) { this._cancelMode(); return; }

      const heroTargetTypes = ['enemy_hero','swap_enemy','ally_hero','swap_ally',
        'dash_to_enemy','dash_to_ally','dash_behind_enemy','abyss_r'];
      const cellTargetTypes = ['cell','zone','diamond_zone','stealth_dash','trap',
        'line_zone','place_glyph','wind_glyph','cone_zone','bomb_zone',
        'hate_wall','lame_eau','abyss_w','faena_w','faena_r','pibot_r',
        'noyala_q','noyala_r'];

      let done = false;

      if (spell.targetType === 'push_enemy') {
        if (!g.pushTarget) {
          const t = g.getHeroAt(cell.x, cell.y);
          if (t && t.playerIdx !== g.currentHero.playerIdx &&
              g._manhattan(g.currentHero.position, t.position) <= spell.range) {
            g.pushTarget = t;
            r.setPushDirectionHighlight(t);
            r.render(); r.updateUI();
          }
        } else {
          const enemy = g.pushTarget;
          const relX = cell.x - enemy.position.x;
          const relY = cell.y - enemy.position.y;
          if ((relX !== 0) !== (relY !== 0)) {
            const dx = Math.sign(relX), dy = Math.sign(relY);
            const dist = Math.abs(relX) + Math.abs(relY);
            if (dist >= 1 && dist <= 3) {
              if (isGuest) {
                window.OnlineMode.sendGuestAction({ type: 'spell', spellId: spell.id,
                  target: { heroId: enemy.instanceId, dx, dy } });
              } else {
                g.castSpell(spell, { hero: enemy, dx, dy });
                this._onlineSync();
              }
              g.pushTarget = null;
              done = true;
            }
          }
        }
        if (done) { r.clearHighlights(); g.actionMode = null; g.selectedSpell = null; }
        r.render(); r.updateUI();
        return;
      }

      if (heroTargetTypes.includes(spell.targetType)) {
        const target = g.getHeroAt(cell.x, cell.y);
        if (target) {
          if (isGuest) {
            window.OnlineMode.sendGuestAction({ type: 'spell', spellId: spell.id,
              target: { heroId: target.instanceId } });
          } else {
            g.castSpell(spell, { hero: target });
            this._onlineSync();
          }
          done = true;
        }
      } else if (cellTargetTypes.includes(spell.targetType)) {
        if (isGuest) {
          window.OnlineMode.sendGuestAction({ type: 'spell', spellId: spell.id,
            target: { x: cell.x, y: cell.y } });
        } else {
          g.castSpell(spell, { x: cell.x, y: cell.y });
          this._onlineSync();
        }
        done = true;
      } else if (spell.targetType === 'no_target') {
        if (isGuest) {
          window.OnlineMode.sendGuestAction({ type: 'spell', spellId: spell.id, target: null });
        } else {
          g.castSpell(spell, null);
          this._onlineSync();
        }
        done = true;
      }

      if (done) { r.clearHighlights(); g.actionMode = null; g.selectedSpell = null; }
      r.render(); r.updateUI();
      return;
    }
  }

  _onCanvasHover(e) {
    const g = this.game, r = this.renderer;
    if (g.phase !== 'playing') return;
    if (g.actionMode !== 'spell') return;
    const spell = g.selectedSpell;
    if (!spell || spell.targetType === 'self' || spell.targetType === 'no_target' || spell.targetType === 'pm_sacrifice') return;
    if (spell.targetType === 'push_enemy' && g.pushTarget) return;
    const cell = this._cellFromEvent(e);
    if (!cell) { r.zoneSpellTarget = null; r.render(); return; }
    r.zoneSpellTarget = cell;
    r.render();
  }

  // ============================================================
  // ACTION BUTTONS
  // ============================================================

  _toggleMove() {
    const g = this.game, r = this.renderer;
    if (window.OnlineMode?.active && !this._isMyTurn()) return;
    if (g.actionMode === 'move') { this._cancelMode(); return; }
    r.closeShop();
    g.actionMode = 'move'; g.selectedSpell = null;
    r.clearHighlights(); r.setMoveHighlight();
    r.render(); r.updateUI();
  }

  _toggleAttack() {
    const g = this.game, r = this.renderer;
    if (window.OnlineMode?.active && !this._isMyTurn()) return;
    if (g.actionMode === 'attack') { this._cancelMode(); return; }
    r.closeShop();
    g.actionMode = 'attack'; g.selectedSpell = null;
    r.clearHighlights(); r.setAttackHighlight();
    r.render(); r.updateUI();
  }

  _toggleSpell(spellId) {
    const g   = this.game, r = this.renderer;
    const spell = g.currentHero?.spells.find(s => s.id === spellId);
    if (!spell) return;

    const online  = window.OnlineMode?.active;
    if (online && !this._isMyTurn()) return;
    const isGuest = online && !window.OnlineMode.isHost;

    r.closeShop();

    // Sorts instantanés (pas de clic sur la carte)
    if (spell.targetType === 'self' || spell.targetType === 'no_target' || spell.targetType === 'pm_sacrifice' || spell.targetType === 'pibot_w') {
      if (isGuest) {
        window.OnlineMode.sendGuestAction({ type: 'spell', spellId: spell.id, target: null });
      } else {
        g.castSpell(spell, null);
        this._onlineSync();
      }
      r.clearHighlights(); g.actionMode = null;
      r.render(); r.updateUI();
      return;
    }

    if (g.actionMode === 'spell' && g.selectedSpell?.id === spellId) {
      this._cancelMode(); return;
    }

    g.actionMode = 'spell'; g.selectedSpell = spell;
    r.clearHighlights(); r.setSpellHighlight(spell);
    r.render(); r.updateUI();
  }

  _cancelMode() {
    const g = this.game, r = this.renderer;
    g.actionMode = null; g.selectedSpell = null; g.pushTarget = null; g.selectedWolf = null;
    r.clearHighlights(); r.render(); r.updateUI();
  }

  _endTurn() {
    const g = this.game, r = this.renderer;
    if (g.phase !== 'playing' || !g.currentHero) return;

    const online  = window.OnlineMode?.active;
    if (online && !this._isMyTurn()) return;
    const isGuest = online && !window.OnlineMode.isHost;

    r.clearHighlights();
    if (isGuest) {
      window.OnlineMode.sendGuestAction({ type: 'endTurn' });
      r.render(); r.updateUI();
      return;
    }
    g.endHeroTurn();
    this._onlineSync();
    r.render(); r.updateUI();
  }

  // ============================================================
  // SHOP
  // ============================================================

  _openShop() {
    if (!this.game.canBuy || this.game.actionsUsed >= MAX_ACTIONS) return;
    this.renderer.openShop();
  }

  _closeShop() {
    this.renderer.closeShop();
  }

  _shopBuy(itemId) {
    const online  = window.OnlineMode?.active;
    if (online && !this._isMyTurn()) return;
    const isGuest = online && !window.OnlineMode.isHost;

    if (isGuest) {
      window.OnlineMode.sendGuestAction({ type: 'buy', itemId });
      return;
    }
    if (!this.game.buyItem(itemId)) return;
    this._onlineSync();
    this.renderer._refreshShopHero();
    this.renderer._refreshShopGrid(this.renderer._shopCurrentTier);
    this.renderer._clearShopDetail();
  }
}
