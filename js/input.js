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
      const forfeitingPlayer = this.game.currentHero?.playerIdx ?? 0;
      const winner = forfeitingPlayer === 0 ? 1 : 0;
      this.game.endGame(winner);
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
  // DRAFT
  // ============================================================

  _draftClick(typeId) {
    const g = this.game;
    const d = g.draft;
    if (g._isUnavailable(typeId)) return;

    let ok = false;
    if (d.phase === 'ban')       ok = g.banHero(typeId);
    else if (d.phase === 'pick') ok = g.pickHero(typeId);

    if (ok) {
      // pickHero may have started the game (phase changed to 'playing')
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
    const cell = this._cellFromEvent(e);
    if (!cell) return;
    const mode = g.actionMode;

    if (mode === 'move') {
      const ok = g.moveHero(cell.x, cell.y);
      r.clearHighlights();
      g.actionMode = null;
      if (ok && g.movementLeft > 0) r.setMoveHighlight();
      r.render(); r.updateUI(); return;
    }

    if (mode === 'attack') {
      const target = g.getHeroAt(cell.x, cell.y);
      if (target && target.playerIdx !== g.currentHero.playerIdx) g.autoAttack(target);
      r.clearHighlights(); g.actionMode = null;
      r.render(); r.updateUI(); return;
    }

    if (mode === 'spell') {
      const spell = g.selectedSpell;
      if (!spell) { this._cancelMode(); return; }

      let done = false;
      if (spell.targetType === 'push_enemy') {
        if (!g.pushTarget) {
          // Step 1: select the enemy to push
          const t = g.getHeroAt(cell.x, cell.y);
          if (t && t.playerIdx !== g.currentHero.playerIdx &&
              g._manhattan(g.currentHero.position, t.position) <= spell.range) {
            g.pushTarget = t;
            r.setPushDirectionHighlight(t);
            r.render(); r.updateUI();
          }
        } else {
          // Step 2: select push direction
          const enemy = g.pushTarget;
          const relX = cell.x - enemy.position.x;
          const relY = cell.y - enemy.position.y;
          if ((relX !== 0) !== (relY !== 0)) { // exactly one axis
            const dx = Math.sign(relX), dy = Math.sign(relY);
            const dist = Math.abs(relX) + Math.abs(relY);
            if (dist >= 1 && dist <= 3) {
              g.castSpell(spell, { hero: enemy, dx, dy });
              g.pushTarget = null;
              done = true;
            }
          }
        }
        if (done) { r.clearHighlights(); g.actionMode = null; g.selectedSpell = null; }
        r.render(); r.updateUI(); return;
      }
      if (spell.targetType === 'enemy_hero' || spell.targetType === 'swap_enemy' || spell.targetType === 'ally_hero' || spell.targetType === 'swap_ally' || spell.targetType === 'dash_to_enemy' || spell.targetType === 'dash_to_ally' || spell.targetType === 'dash_behind_enemy') {
        const target = g.getHeroAt(cell.x, cell.y);
        if (target) { g.castSpell(spell, { hero: target }); done = true; }
      } else if (spell.targetType === 'cell' || spell.targetType === 'zone' || spell.targetType === 'diamond_zone' || spell.targetType === 'stealth_dash' || spell.targetType === 'trap' || spell.targetType === 'line_zone' || spell.targetType === 'place_glyph' || spell.targetType === 'wind_glyph' || spell.targetType === 'cone_zone' || spell.targetType === 'bomb_zone' || spell.targetType === 'hate_wall' || spell.targetType === 'lame_eau') {
        g.castSpell(spell, { x: cell.x, y: cell.y }); done = true;
      } else if (spell.targetType === 'no_target') {
        g.castSpell(spell, null); done = true;
      }

      if (done) { r.clearHighlights(); g.actionMode = null; g.selectedSpell = null; }
      r.render(); r.updateUI(); return;
    }
  }

  _onCanvasHover(e) {
    const g = this.game, r = this.renderer;
    if (g.phase !== 'playing') return;
    if (g.actionMode !== 'spell') return;
    const spell = g.selectedSpell;
    if (!spell || spell.targetType === 'self' || spell.targetType === 'no_target' || spell.targetType === 'pm_sacrifice') return;
    if (spell.targetType === 'push_enemy' && g.pushTarget) return; // step 2: direction arrows already shown
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
    if (g.actionMode === 'move') { this._cancelMode(); return; }
    r.closeShop();
    g.actionMode = 'move'; g.selectedSpell = null;
    r.clearHighlights(); r.setMoveHighlight();
    r.render(); r.updateUI();
  }

  _toggleAttack() {
    const g = this.game, r = this.renderer;
    if (g.actionMode === 'attack') { this._cancelMode(); return; }
    r.closeShop();
    g.actionMode = 'attack'; g.selectedSpell = null;
    r.clearHighlights(); r.setAttackHighlight();
    r.render(); r.updateUI();
  }

  _toggleSpell(spellId) {
    const g     = this.game, r = this.renderer;
    const spell = g.currentHero?.spells.find(s => s.id === spellId);
    if (!spell) return;
    r.closeShop();

    // Instant cast (no click needed)
    if (spell.targetType === 'self' || spell.targetType === 'no_target' || spell.targetType === 'pm_sacrifice') {
      g.castSpell(spell, null);
      r.clearHighlights(); g.actionMode = null;
      r.render(); r.updateUI(); return;
    }

    // Toggle
    if (g.actionMode === 'spell' && g.selectedSpell?.id === spellId) {
      this._cancelMode(); return;
    }

    g.actionMode = 'spell'; g.selectedSpell = spell;
    r.clearHighlights(); r.setSpellHighlight(spell);
    r.render(); r.updateUI();
  }

  _cancelMode() {
    const g = this.game, r = this.renderer;
    g.actionMode = null; g.selectedSpell = null; g.pushTarget = null;
    r.clearHighlights(); r.render(); r.updateUI();
  }

  _endTurn() {
    const g = this.game, r = this.renderer;
    if (g.phase !== 'playing' || !g.currentHero) return;
    r.clearHighlights();
    g.endHeroTurn();
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
    if (!this.game.buyItem(itemId)) return;
    this.renderer._refreshShopHero();
    this.renderer._refreshShopGrid(this.renderer._shopCurrentTier);
    this.renderer._clearShopDetail();
  }
}
