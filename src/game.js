class Game {
  constructor() {
    this.canvas = document.getElementById('arena');
    this.ctx = this.canvas.getContext('2d');
    this._ballId = 0;
    this.state = this._freshState();

    this._addHeld = false;
    this._addHoldStart = 0;
    this._addHoldLast = 0;
    this._mergeHeld = false;
    this._mergeHoldStart = 0;
    this._mergeHoldLast = 0;
    this._lastAutoAdd = 0;
    this._lastWallSound = 0;
    this._lastSave = Date.now();
    this._lastIncomeWindow = [];
    this._currentTab = 'All';

    this._challengeSystem = new ChallengeSystem();
    this._challengesMergedThisRun = false;
    this._slowBallTimer = 0;
    this._fullHouseTimer = 0;
    this._challengeStartTime = Date.now();

    this._resizeCanvas();
    window.addEventListener('resize', () => this._resizeCanvas());

    const loaded = loadSave(this.state, this.canvas.width, this.canvas.height);
    if (!loaded || this.state.balls.length === 0) {
      this._spawnBall(0);
    }

    if (loaded && this.state._offlineEarnings && this.state._offlineEarnings.gt(0)) {
      this._showOfflinePopup(this.state._offlineEarnings, this.state._offlineTime);
      this.state._offlineEarnings = null;
    }

    this._achievementSystem = new AchievementSystem();

    this._buildUpgradeTabs();
    this._renderUpgradeCards();
    this._bindInput();
    this._lastTime = performance.now();
    requestAnimationFrame(ts => this._loop(ts));

    this._tutorial = new Tutorial(this);
    this._tutorial.start();
  }

  _freshState() {
    return {
      money: new Decimal(0),
      lightFragments: new Decimal(0),
      primeShards: new Decimal(0),
      lifetimeMoney: new Decimal(0),
      balls: [],
      numbersAdded: 0,
      prestige: 0,
      upgrades: {},
      permanentUpgrades: {},
      highestTier: 0,
      wallHits: 0,
      prestigeAvailable: false,
      comboHits: [],
      _comboMult: 1,
      incomePerSec: new Decimal(0),
      _particles: [],
      _popups: [],
      _offlineEarnings: null,
      _offlineTime: 0,
    };
  }

  _resizeCanvas() {
    const container = document.getElementById('arena-container');
    const oldW = this.canvas.width || container.clientWidth;
    const oldH = this.canvas.height || container.clientHeight;
    this.canvas.width  = container.clientWidth;
    this.canvas.height = container.clientHeight;
    // Scale existing ball positions and velocities to the new arena size
    if (this.state && this.state.balls.length > 0 && oldW > 0) {
      const sx = this.canvas.width  / oldW;
      const sy = this.canvas.height / oldH;
      for (const b of this.state.balls) {
        b.x  *= sx;  b.y  *= sy;
        b.vx *= sx;  b.vy *= sy;
      }
    }
  }

  _speedScale() {
    return this.canvas.width / REFERENCE_WIDTH;
  }

  getCapacity() {
    return BASE_CAPACITY
      + (this.state.upgrades.moreCapacity || 0) * 5
      + (this.state.permanentUpgrades.capacityPlus || 0) * 5;
  }

  getBaseSpeed() {
    return (BASE_SPEED + (this.state.upgrades.speedUp || 0) * 20) * this._speedScale();
  }

  getLightspeedThreshold() {
    return (LIGHTSPEED_BASE + (this.state.permanentUpgrades.lsBuffer || 0) * 50) * this._speedScale();
  }

  getWallMult(wall) {
    if (wall === 'left')  return 1 + (this.state.upgrades.leftWall  || 0) * 0.5;
    if (wall === 'right') return 1 + (this.state.upgrades.rightWall || 0) * 0.5;
    return 0;
  }

  _getAddCost() {
    const discount = 1 - (this.state.upgrades.cheapNumbers || 0) * 0.08;
    return new Decimal(BASE_ADD_COST * Math.pow(ADD_COST_GROWTH, this.state.numbersAdded) * discount);
  }

  _spawnBall(tier, forceX, forceY) {
    const w = this.canvas.width, h = this.canvas.height;
    const r = getBallRadius(tier);
    const speed = this.getBaseSpeed();
    const angle = Math.random() * Math.PI * 2;
    const ball = {
      id: this._ballId++,
      tier,
      x: forceX !== undefined ? forceX : r * 2 + Math.random() * (w - r * 4),
      y: forceY !== undefined ? forceY : r * 2 + Math.random() * (h - r * 4),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: r,
      hitFlash: 0, mergeFlash: 0, popScale: 1,
      _lastHitTime: 0, _stuckTimer: 0, _remove: false,
    };
    this.state.balls.push(ball);
    return ball;
  }

  tryAdd() {
    const cap = this.getCapacity();
    if (this.state.balls.length >= cap) return false;
    const cost = this._getAddCost();
    if (!this.state.money.gte(cost)) return false;
    this.state.money = this.state.money.sub(cost);
    this.state.numbersAdded++;
    this._spawnBall(0);
    if (this.state.balls.length >= cap && !this.state.prestigeAvailable) {
      this.state.prestigeAvailable = true;
      document.getElementById('prestige-notification').style.display = 'block';
      setTimeout(() => {
        document.getElementById('prestige-notification').style.display = 'none';
      }, 6000);
    }
    return true;
  }

  tryMerge() {
    const counts = {};
    for (const b of this.state.balls) {
      if (!counts[b.tier]) counts[b.tier] = [];
      counts[b.tier].push(b);
    }
    for (const tier of Object.keys(counts).map(Number).sort((a, b) => a - b)) {
      if (counts[tier].length >= 2) {
        this._mergeBalls(counts[tier][0], counts[tier][1]);
        return true;
      }
    }
    return false;
  }

  _mergeBalls(a, b) {
    this._challengesMergedThisRun = true;
    const newTier = a.tier + 1;
    if (window.audio) window.audio.playMerge(newTier);
    const nx = (a.x + b.x) / 2;
    const ny = (a.y + b.y) / 2;
    const angle = Math.random() * Math.PI * 2;
    const pop = 80;
    const nvx = (a.vx + b.vx) / 2 + Math.cos(angle) * pop;
    const nvy = (a.vy + b.vy) / 2 + Math.sin(angle) * pop;
    a._remove = b._remove = true;
    this.state.balls = this.state.balls.filter(x => !x._remove);

    this.state.balls.push({ id: this._ballId++, tier: newTier, x: nx, y: ny, vx: nvx, vy: nvy,
      radius: getBallRadius(newTier), hitFlash: 0, mergeFlash: 0.35, popScale: 1.45,
      _lastHitTime: 0, _stuckTimer: 0, _remove: false });
    if (newTier > this.state.highestTier) this.state.highestTier = newTier;
    const mergePayLevel = this.state.upgrades.mergePayout || 0;
    if (mergePayLevel > 0) {
      const bonus = new Decimal(2).pow(newTier).mul(mergePayLevel * 0.1);
      this.state.money = this.state.money.add(bonus);
      this.state.lifetimeMoney = this.state.lifetimeMoney.add(bonus);
    }

    const pc = getTierInfo(newTier).color;
    for (let i = 0; i < 8; i++) {
      const pa = (i / 8) * Math.PI * 2;
      this.state._particles.push({ x: nx, y: ny, vx: Math.cos(pa) * 90, vy: Math.sin(pa) * 90, life: 0.5, size: 3, color: pc });
    }
  }

  _triggerLightspeed(ball) {
    if (window.audio) window.audio.playLightspeed();
    ball._remove = true;
    const frags = Math.ceil(Math.max(1, ball.tier / 2) * (1 + (this.state.permanentUpgrades.fragBoost || 0) * 0.25));
    this.state.lightFragments = this.state.lightFragments.add(frags);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      this.state._particles.push({ x: ball.x, y: ball.y, vx: Math.cos(a) * 140, vy: Math.sin(a) * 140, life: 0.9, size: 4, color: '#ffffff' });
    }
    this.state._popups.push({ x: ball.x, y: ball.y - 10, text: '+' + frags + ' ⚡', life: 1.5, vy: -55, isLight: true });
  }

  _updatePhysics(dt) {
    const w = this.canvas.width, h = this.canvas.height;
    const threshold = this.getLightspeedThreshold();

    for (const ball of this.state.balls) {
      if (ball._remove) continue;
      if (ball.popScale > 1) ball.popScale = Math.max(1, ball.popScale - dt * 6);
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      const spd = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
      if (spd >= threshold) { this._triggerLightspeed(ball); continue; }

      // Anti-stuck nudge
      if (spd < 25) {
        ball._stuckTimer += dt;
        if (ball._stuckTimer > 1.5) {
          const a = Math.random() * Math.PI * 2;
          const s = this.getBaseSpeed();
          ball.vx = Math.cos(a) * s; ball.vy = Math.sin(a) * s;
          ball._stuckTimer = 0;
        }
      } else { ball._stuckTimer = 0; }

      // Wall collisions
      const r = ball.radius;
      let hitWall = null;
      if (ball.x - r < 0)  { ball.x = r;     ball.vx =  Math.abs(ball.vx); hitWall = 'left'; }
      else if (ball.x + r > w) { ball.x = w - r; ball.vx = -Math.abs(ball.vx); hitWall = 'right'; }
      if (ball.y - r < 0)  { ball.y = r;     ball.vy =  Math.abs(ball.vy); hitWall = hitWall || 'top'; }
      else if (ball.y + r > h) { ball.y = h - r; ball.vy = -Math.abs(ball.vy); hitWall = hitWall || 'bottom'; }

      if (hitWall) {
        const now = performance.now();
        if (now - ball._lastHitTime > 80) {
          ball._lastHitTime = now;
          this._onWallHit(ball, hitWall, spd);
          ball.hitFlash = 0.15;
        }
      }
      if (ball.hitFlash > 0)  ball.hitFlash  = Math.max(0, ball.hitFlash  - dt);
      if (ball.mergeFlash > 0) ball.mergeFlash = Math.max(0, ball.mergeFlash - dt);
    }
    this.state.balls = this.state.balls.filter(b => !b._remove);
  }

  _onWallHit(ball, wall, speed) {
    const wallMult = this.getWallMult(wall);
    if (wallMult === 0) return;

    const threshold = this.getLightspeedThreshold();
    const sr = Math.min(speed / threshold, 1);
    let speedMult = 1;
    if (sr >= 0.9) speedMult = 2.5;
    else if (sr >= 0.7) speedMult = 1.75;
    else if (sr >= 0.4) speedMult = 1.25;

    const now = Date.now();
    this.state.comboHits = this.state.comboHits.filter(t => now - t < 3000);
    const hits = this.state.comboHits.length;
    let comboMult = 1;
    if (hits >= 200) comboMult = 10;
    else if (hits >= 50) comboMult = 3;
    else if (hits >= 15) comboMult = 1.5;
    else if (hits >= 5)  comboMult = 1.1;
    this.state._comboMult = comboMult;
    this.state.comboHits.push(now);

    const critLevel = this.state.upgrades.critChance || 0;
    let critMult = 1;
    const isCrit = critLevel > 0 && Math.random() < critLevel * 0.05;
    if (isCrit) critMult = 10;

    const value = new Decimal(2).pow(ball.tier);
    const payout = value.mul(wallMult).mul(speedMult).mul(comboMult).mul(critMult);

    this.state.money = this.state.money.add(payout);
    this.state.lifetimeMoney = this.state.lifetimeMoney.add(payout);
    this.state.wallHits++;
    this._lastIncomeWindow.push({ t: now, v: payout });

    if (window.audio && now - this._lastWallSound > 50) {
      this._lastWallSound = now;
      if (isCrit) window.audio.playCrit();
      else window.audio.playWallHit(ball.tier);
    }

    // Popup (limit density)
    if (this.state._popups.length < 25) {
      this.state._popups.push({
        x: ball.x, y: ball.y - ball.radius,
        text: '$' + formatMoney(payout),
        life: 1.0, vy: -50,
        isCrit,
      });
    }
  }

  _updateInput(now) {
    if (this._addHeld) {
      const holdMs = now - this._addHoldStart;
      const rate = getRampRate(ADD_RAMP, holdMs, (this.state.upgrades.quickFingers || 0) * 3);
      const interval = 1000 / rate;
      while (this._addHoldLast + interval <= now) {
        this._addHoldLast += interval;
        this.tryAdd();
      }
    }
    if (this._mergeHeld) {
      const holdMs = now - this._mergeHoldStart;
      const rate = getRampRate(MERGE_RAMP, holdMs, (this.state.upgrades.quickMerge || 0) * 2);
      const interval = 1000 / rate;
      while (this._mergeHoldLast + interval <= now) {
        this._mergeHoldLast += interval;
        this.tryMerge();
      }
    }
    const autoLevel = this.state.upgrades.autoPrinter || 0;
    if (autoLevel > 0) {
      const autoInterval = 1000 / autoLevel;
      if (!this._lastAutoAdd) this._lastAutoAdd = now;
      while (this._lastAutoAdd + autoInterval <= now) {
        this._lastAutoAdd += autoInterval;
        this.tryAdd();
      }
    }
  }

  _updateParticles(dt) {
    this.state._particles = this.state._particles.filter(p => p.life > 0);
    for (const p of this.state._particles) {
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.life -= dt * 1.8; p.size *= 0.97;
    }
  }

  _updatePopups(dt) {
    this.state._popups = this.state._popups.filter(p => p.life > 0);
    for (const p of this.state._popups) {
      p.y += p.vy * dt; p.life -= dt;
    }
  }

  _updateIncomePerSec() {
    const now = Date.now();
    this._lastIncomeWindow = this._lastIncomeWindow.filter(x => now - x.t < 3000);
    if (this._lastIncomeWindow.length > 600) this._lastIncomeWindow.splice(0, this._lastIncomeWindow.length - 600);
    let total = new Decimal(0);
    for (const x of this._lastIncomeWindow) total = total.add(x.v);
    this.state.incomePerSec = total.div(3);
  }

  prestige() {
    if (window.audio) window.audio.playPrestige();
    const raw = this.state.lifetimeMoney.div(1e9);
    const shards = raw.pow(0.5).add(this.state.highestTier).floor().add(1);
    this.state.primeShards = this.state.primeShards.add(shards);
    const keepLF = this.state.lightFragments;
    const keepPerm = { ...this.state.permanentUpgrades };
    const keepPrestige = this.state.prestige + 1;
    const keepShards = this.state.primeShards;
    this.state = this._freshState();
    this.state.lightFragments = keepLF;
    this.state.permanentUpgrades = keepPerm;
    this.state.prestige = keepPrestige;
    this.state.primeShards = keepShards;
    this._challengesMergedThisRun = false;
    this._slowBallTimer = 0;
    this._fullHouseTimer = 0;
    this._challengeStartTime = Date.now();
    this._spawnBall(0);
    this._renderUpgradeCards();
    saveGame(this.state, this.canvas.width, this.canvas.height);
  }

  onUpgradePurchased(upg) {
    if (upg.id === 'speedUp') {
      const target = this.getBaseSpeed();
      for (const b of this.state.balls) {
        const s = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
        if (s > 0) { b.vx = (b.vx / s) * target; b.vy = (b.vy / s) * target; }
      }
    }
    this._renderUpgradeCards();
    saveGame(this.state, this.canvas.width, this.canvas.height);
  }

  _updateUI() {
    document.getElementById('money-display').textContent = '$' + formatMoney(this.state.money);
    document.getElementById('income-display').textContent = '$' + formatMoney(this.state.incomePerSec) + '/s';
    document.getElementById('highest-display').textContent = getTierInfo(this.state.highestTier).label;
    document.getElementById('frags-display').textContent = this.state.lightFragments.toFixed(0);
    document.getElementById('prestige-display').textContent = this.state.prestige;
    document.getElementById('stat-numbers').textContent = `${this.state.balls.length}/${this.getCapacity()}`;
    document.getElementById('stat-combo').textContent = 'x' + (this.state._comboMult || 1).toFixed(1);
    document.getElementById('stat-hits').textContent = this.state.wallHits;
    document.getElementById('stat-crit').textContent = ((this.state.upgrades.critChance || 0) * 5) + '%';
    document.getElementById('stat-speed').textContent = BASE_SPEED + (this.state.upgrades.speedUp || 0) * 20;
    document.getElementById('stat-ls').textContent = LIGHTSPEED_BASE + (this.state.permanentUpgrades.lsBuffer || 0) * 50;
    document.getElementById('stat-lifetime').textContent = '$' + formatMoney(this.state.lifetimeMoney);
    document.getElementById('stat-shards').textContent = this.state.primeShards.toFixed(0);

    const cost = this._getAddCost();
    const isFull = this.state.balls.length >= this.getCapacity();
    const addBtn = document.getElementById('btn-add');
    addBtn.disabled = isFull;
    addBtn.classList.toggle('arena-full', isFull);
    document.getElementById('add-cost-display').textContent = isFull
      ? (this.state.prestigeAvailable ? '— Prestige! —' : '— Full —')
      : '$' + formatMoney(cost);

    const pairs = this._countPairs();
    document.getElementById('merge-pairs-display').textContent = pairs + (pairs === 1 ? ' pair' : ' pairs');
    document.getElementById('btn-prestige').style.display = this.state.prestigeAvailable ? '' : 'none';

    // Rebuild upgrade cards and check achievements at most 4×/sec to avoid thrashing the DOM
    const now = Date.now();
    if (!this._lastCardRebuild || now - this._lastCardRebuild > 250) {
      this._lastCardRebuild = now;
      this._renderUpgradeCards();
      this._achievementSystem.check(this.state);
    }
  }

  _countPairs() {
    const c = {};
    for (const b of this.state.balls) c[b.tier] = (c[b.tier] || 0) + 1;
    return Object.values(c).reduce((s, n) => s + Math.floor(n / 2), 0);
  }

  _showOfflinePopup(earned, seconds) {
    const popup = document.getElementById('offline-popup');
    if (!popup) return;

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

    document.getElementById('offline-time').textContent = timeStr;
    document.getElementById('offline-earned').textContent = '$' + formatMoney(earned);
    popup.style.display = 'flex';

    document.getElementById('offline-close').addEventListener('click', () => {
      popup.style.display = 'none';
    }, { once: true });
  }

  _updateChallenges(dt) {
    const threshold = this.getLightspeedThreshold();
    const halfThreshold = threshold * 0.5;
    const allSlow = this.state.balls.length > 0 && this.state.balls.every(b =>
      b.vx * b.vx + b.vy * b.vy < halfThreshold * halfThreshold
    );
    if (allSlow) this._slowBallTimer += dt;
    else this._slowBallTimer = 0;

    if (this.state.balls.length >= this.getCapacity()) this._fullHouseTimer += dt;
    else this._fullHouseTimer = 0;

    this._challengeSystem.check(this.state, this);
  }

  _buildUpgradeTabs() { buildUpgradeTabs(this); }
  _renderUpgradeCards() { renderUpgradeCards(this); }

  _bindInput() {
    const unlockAudio = () => {
      if (window.audio) window.audio.unlock();
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
    };
    document.addEventListener('click', unlockAudio);
    document.addEventListener('keydown', unlockAudio);

    const startAdd = () => {
      if (window.audio) window.audio.playClick();
      this._addHeld = true;
      this._addHoldStart = this._addHoldLast = performance.now();
      this.tryAdd();
    };
    const startMerge = () => {
      this._mergeHeld = true;
      this._mergeHoldStart = this._mergeHoldLast = performance.now();
      this.tryMerge();
    };
    const stopAll = () => { this._addHeld = false; this._mergeHeld = false; };

    const addBtn = document.getElementById('btn-add');
    const mergeBtn = document.getElementById('btn-merge');
    addBtn.addEventListener('mousedown', e => { if (e.button === 0) startAdd(); });
    addBtn.addEventListener('touchstart', e => { e.preventDefault(); startAdd(); }, { passive: false });
    mergeBtn.addEventListener('mousedown', e => { if (e.button === 0) startMerge(); });
    mergeBtn.addEventListener('touchstart', e => { e.preventDefault(); startMerge(); }, { passive: false });
    document.addEventListener('mouseup', stopAll);
    document.addEventListener('touchend', stopAll);

    document.addEventListener('keydown', e => {
      if (e.repeat) return;
      if (e.key === 'a' || e.key === 'A') startAdd();
      if (e.key === 'm' || e.key === 'M') startMerge();
    });
    document.addEventListener('keyup', e => {
      if (e.key === 'a' || e.key === 'A') this._addHeld = false;
      if (e.key === 'm' || e.key === 'M') this._mergeHeld = false;
    });

    document.getElementById('btn-prestige').addEventListener('click', () => {
      if (this.state.prestigeAvailable && confirm('Prestige? Your numbers and money reset, but you keep Light Fragments and earn Prime Shards.')) {
        this.prestige();
      }
    });

    // Click on canvas → find nearest ball and redirect it away from click point
    this.canvas.addEventListener('click', e => {
      const rect = this.canvas.getBoundingClientRect();
      const cx = (e.clientX - rect.left) * (this.canvas.width / rect.width);
      const cy = (e.clientY - rect.top) * (this.canvas.height / rect.height);
      let best = null, bestDist = Infinity;
      for (const b of this.state.balls) {
        const d = Math.sqrt((b.x - cx) ** 2 + (b.y - cy) ** 2);
        if (d < b.radius + 24 && d < bestDist) { bestDist = d; best = b; }
      }
      if (best) {
        const dx = best.x - cx, dy = best.y - cy;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const spd = Math.sqrt(best.vx ** 2 + best.vy ** 2) || this.getBaseSpeed();
        best.vx = (dx / len) * spd;
        best.vy = (dy / len) * spd;
        best.hitFlash = 0.2;
      }
    });

    document.getElementById('btn-clear-save').addEventListener('click', () => {
      if (confirm('Delete all save data and restart?')) { clearSave(); location.reload(); }
    });

    const skipBtn = document.getElementById('tutorial-skip');
    if (skipBtn) skipBtn.addEventListener('click', () => this._tutorial && this._tutorial.skip());
    const nextBtn = document.getElementById('tutorial-next');
    if (nextBtn) nextBtn.addEventListener('click', () => this._tutorial && this._tutorial._advance());

    document.getElementById('btn-mute').addEventListener('click', e => {
      if (!window.audio) return;
      const muted = !window.audio._muted;
      window.audio.setMuted(muted);
      e.currentTarget.textContent = muted ? '🔇' : '🔊';
      window.audio.playClick();
    });
    document.getElementById('vol-music').addEventListener('input', e => {
      if (window.audio) window.audio.setMusicVolume(e.target.value / 100);
    });
    document.getElementById('vol-sfx').addEventListener('input', e => {
      if (window.audio) window.audio.setSfxVolume(e.target.value / 100);
    });
  }

  _loop(timestamp) {
    const dt = Math.min((timestamp - this._lastTime) / 1000, 0.1);
    this._lastTime = timestamp;
    const now = performance.now();

    this._updatePhysics(dt);
    this._updateChallenges(dt);
    this._updateInput(now);
    this._updateParticles(dt);
    this._updatePopups(dt);
    this._updateIncomePerSec();
    renderArena(this.ctx, this.state, this);
    this._updateUI();
    if (this._tutorial) this._tutorial.check(this.state);

    if (Date.now() - this._lastSave > 30000) {
      saveGame(this.state, this.canvas.width, this.canvas.height);
      this._lastSave = Date.now();
    }
    requestAnimationFrame(ts => this._loop(ts));
  }
}
