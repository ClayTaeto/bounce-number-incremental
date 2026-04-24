// Static combo threshold table — defined once, read every frame
const COMBO_THRESHOLDS = [
  { min: 0,   next: 5,   mult: 1.0,  color: '#555555' },
  { min: 5,   next: 15,  mult: 1.1,  color: '#4caf50' },
  { min: 15,  next: 50,  mult: 1.5,  color: '#ffeb3b' },
  { min: 50,  next: 200, mult: 3.0,  color: '#ff9800' },
  { min: 200, next: null, mult: 10.0, color: '#f44336' },
];

class Game {
  constructor() {
    this.canvas = document.getElementById('arena');
    this.ctx = this.canvas.getContext('2d');
    this._ballId = 0;
    this.state = this._freshState();

    // Cache DOM refs used every frame
    this._elComboFill = null;
    this._elComboHint = null;
    this._elComboMult = null;
    this._elSparkline = null;

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

    // Cache frequently-accessed DOM elements
    this._elComboFill = document.getElementById('combo-bar-fill');
    this._elComboHint = document.getElementById('combo-next-hint');
    this._elComboMult = document.getElementById('combo-mult-display');
    this._elSparkline = document.getElementById('income-sparkline');

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
      infinityPoints: new Decimal(0),
      balls: [],
      numbersAdded: 0,
      prestige: 0,
      infinityPrestige: 0,
      upgrades: {},
      permanentUpgrades: {},
      infinityUpgrades: {},
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
      _incomeHistory: [],
      _shakeIntensity: 0,
      _particlesEnabled: true,
      _shakeEnabled: true,
      _holdBoostEnd: 0,
      _mergeComboCount: 0,
      _mergeComboWindow: 0,
      _wallHitHistory: [],
      wallMultiplierActive: false,
      wallMultiplierEnd: 0,
      arenaLayout: 'classic',
    };
  }

  _resizeCanvas() {
    const container = document.getElementById('arena-container');
    const oldW = this.canvas.width || container.clientWidth;
    const oldH = this.canvas.height || container.clientHeight;

    const layout = ARENA_LAYOUTS[(this.state && this.state.arenaLayout) || 'classic'] || ARENA_LAYOUTS.classic;
    const containerW = container.clientWidth;
    const containerH = container.clientHeight;
    const targetRatio = layout.aspectRatio; // width / height

    let newW, newH;
    if (containerW / containerH > targetRatio) {
      // Container is wider than target ratio — constrain by height
      newH = containerH;
      newW = Math.round(newH * targetRatio);
    } else {
      // Container is taller — constrain by width
      newW = containerW;
      newH = Math.round(newW / targetRatio);
    }

    this.canvas.width  = newW;
    this.canvas.height = newH;
    this.canvas.style.width  = newW + 'px';
    this.canvas.style.height = newH + 'px';
    // Center the canvas in the container
    this.canvas.style.position = 'absolute';
    this.canvas.style.left = Math.round((containerW - newW) / 2) + 'px';
    this.canvas.style.top  = Math.round((containerH - newH) / 2) + 'px';

    // Scale existing ball positions and velocities to the new arena size
    if (this.state && this.state.balls.length > 0 && oldW > 0) {
      const sx = newW / oldW;
      const sy = newH / oldH;
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
      + (this.state.permanentUpgrades.capacityPlus || 0) * 5
      + (this.state.permanentUpgrades.prestigeCapacity || 0) * 3
      + (this.state.infinityUpgrades.infCapacity || 0) * 10;
  }

  getBaseSpeed() {
    const layout = ARENA_LAYOUTS[this.state.arenaLayout] || ARENA_LAYOUTS.classic;
    const layoutMult = (layout && layout.speedMult) ? layout.speedMult : 1;
    return (BASE_SPEED
      + (this.state.upgrades.speedUp || 0) * 20
      + (this.state.permanentUpgrades.prestigeSpeed || 0) * 10
      + (this.state.infinityUpgrades && (this.state.infinityUpgrades.infSpeed || 0)) * 50
    ) * this._speedScale() * layoutMult;
  }

  getBallTargetSpeed(ball) {
    const base = this.getBaseSpeed();
    if (!ball || !ball.trait) return base;
    if (ball.trait === 'hot')   return base * 1.25;
    if (ball.trait === 'heavy') return base * 0.7;
    return base;
  }

  _pickInheritedTrait(parents) {
    const traitParents = parents.filter(p => p.trait);
    if (!traitParents.length) return null;
    return traitParents[Math.floor(Math.random() * traitParents.length)].trait;
  }

  _emitMergeParticles(nx, ny, count, speed, tier) {
    const color = getTierInfo(tier).color;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      this.state._particles.push({ x: nx, y: ny, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: 0.5 + speed / 300, size: 3, color });
    }
  }

  getLightspeedThreshold() {
    return (LIGHTSPEED_BASE + (this.state.permanentUpgrades.lsBuffer || 0) * 50) * this._speedScale();
  }

  // Base wall mult from upgrades only (no global boost) — used for visual glow
  getBaseWallMult(wall) {
    const key = { left: 'leftWall', right: 'rightWall', top: 'topWall', bottom: 'bottomWall' }[wall];
    return key ? 1 + (this.state.upgrades[key] || 0) * 0.5 : 1;
  }

  getWallMult(wall) {
    const layout = ARENA_LAYOUTS[this.state.arenaLayout] || ARENA_LAYOUTS.classic;
    const layoutMult = layout.wallMults && layout.wallMults[wall] !== undefined ? layout.wallMults[wall] : 1;
    if (layoutMult === 0) return 0;
    const wallBase = (this.state.permanentUpgrades.prestigeWallBase || 0) * 0.2;
    let upgradeMult = 1 + wallBase;
    if (wall === 'left')  upgradeMult = 1 + (this.state.upgrades.leftWall  || 0) * 0.5 + wallBase;
    else if (wall === 'right') upgradeMult = 1 + (this.state.upgrades.rightWall || 0) * 0.5 + wallBase;
    let mult = upgradeMult * layoutMult;
    if (this.state.wallMultiplierActive) {
      if (Date.now() < this.state.wallMultiplierEnd) {
        mult *= 2;
      } else {
        this.state.wallMultiplierActive = false;
      }
    }
    return mult;
  }

  setLayout(layoutId) {
    if (!ARENA_LAYOUTS[layoutId]) return;
    this.state.arenaLayout = layoutId;
    this._resizeCanvas();
    this._updateLayoutButtons();
    saveGame(this.state, this.canvas.width, this.canvas.height);
  }

  _updateLayoutButtons() {
    const layoutId = this.state.arenaLayout || 'classic';
    const perm = this.state.permanentUpgrades;
    document.querySelectorAll('.layout-btn').forEach(btn => {
      const id = btn.dataset.layout;
      const locked = (id === 'pinball' && !perm.unlockPinball) ||
                     (id === 'hallway' && !perm.unlockHallway);
      btn.classList.toggle('active', id === layoutId);
      btn.classList.toggle('locked', locked);
      btn.disabled = locked;
    });
  }

  _getBumpers() {
    const level = this.state.upgrades.bumperUpgrade || 0;
    if (level === 0) return [];
    const bumperRadius = 14;
    const payoutMult = 0.5 + level * 0.5;
    const positions = [
      [0.25, 0.4], [0.75, 0.6],
      [0.5,  0.4],
      [0.25, 0.65],
    ];
    const counts = [0, 2, 2, 3, 4, 4];
    const count = counts[level];
    return positions.slice(0, count).map(([fx, fy]) => ({
      fx, fy, radius: bumperRadius, payoutMult,
    }));
  }

  _getAddCost() {
    const discount = 1 - (this.state.upgrades.cheapNumbers || 0) * 0.08;
    return new Decimal(BASE_ADD_COST * Math.pow(ADD_COST_GROWTH, this.state.numbersAdded) * discount);
  }

  _spawnBall(tier, forceX, forceY) {
    const w = this.canvas.width, h = this.canvas.height;
    const r = getBallRadius(tier);
    const angle = Math.random() * Math.PI * 2;
    const traitChanceLevel = this.state.upgrades.traitChance || 0;
    let trait = null;
    if (traitChanceLevel > 0 && Math.random() < traitChanceLevel * 0.05) {
      const traits = ['golden', 'hot', 'lucky', 'heavy'];
      trait = traits[Math.floor(Math.random() * traits.length)];
    }
    const ball = {
      id: this._ballId++,
      tier,
      trait,
      x: forceX !== undefined ? forceX : r * 2 + Math.random() * (w - r * 4),
      y: forceY !== undefined ? forceY : r * 2 + Math.random() * (h - r * 4),
      radius: r,
      hitFlash: 0, mergeFlash: 0, popScale: 1,
      _lastHitTime: 0, _stuckTimer: 0, _remove: false,
    };
    const speed = this.getBallTargetSpeed(ball);
    ball.vx = Math.cos(angle) * speed;
    ball.vy = Math.sin(angle) * speed;
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
    if (this.state.upgrades.holdBoost) this.state._holdBoostEnd = Date.now() + 3000;
    this._spawnBall(0);
    const bulkLevel = this.state.upgrades.bulkAdder || 0;
    for (let i = 0; i < bulkLevel && this.state.balls.length < cap; i++) this._spawnBall(0);
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
    const megaLevel = this.state.upgrades.megaMerge || 0;
    // Try mega merge: 4→1 into tier+2
    if (megaLevel > 0 && Math.random() < megaLevel * 0.05) {
      for (const tier of Object.keys(counts).map(Number).sort((a, b) => a - b)) {
        if (counts[tier].length >= 4) {
          this._megaMergeBalls(counts[tier][0], counts[tier][1], counts[tier][2], counts[tier][3]);
          return true;
        }
      }
    }
    for (const tier of Object.keys(counts).map(Number).sort((a, b) => a - b)) {
      if (counts[tier].length >= 2) {
        this._mergeBalls(counts[tier][0], counts[tier][1]);
        return true;
      }
    }
    return false;
  }

  _megaMergeBalls(a, b, c, d) {
    const newTier = a.tier + 2;
    const nx = (a.x + b.x + c.x + d.x) / 4;
    const ny = (a.y + b.y + c.y + d.y) / 4;
    const angle = Math.random() * Math.PI * 2;
    const pop = 100;
    const nvx = (a.vx + b.vx + c.vx + d.vx) / 4 + Math.cos(angle) * pop;
    const nvy = (a.vy + b.vy + c.vy + d.vy) / 4 + Math.sin(angle) * pop;
    a._remove = b._remove = c._remove = d._remove = true;
    this.state.balls = this.state.balls.filter(x => !x._remove);
    this.state.balls.push({ id: this._ballId++, tier: newTier, trait: this._pickInheritedTrait([a, b, c, d]),
      x: nx, y: ny, vx: nvx, vy: nvy,
      radius: getBallRadius(newTier), hitFlash: 0, mergeFlash: 0.5, popScale: 1.6,
      _lastHitTime: 0, _stuckTimer: 0, _remove: false });
    if (newTier > this.state.highestTier) this.state.highestTier = newTier;
    this._emitMergeParticles(nx, ny, 12, 110, newTier);
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

    this.state.balls.push({ id: this._ballId++, tier: newTier, trait: this._pickInheritedTrait([a, b]),
      x: nx, y: ny, vx: nvx, vy: nvy,
      radius: getBallRadius(newTier), hitFlash: 0, mergeFlash: 0.35, popScale: 1.45,
      _lastHitTime: 0, _stuckTimer: 0, _remove: false });
    if (newTier > this.state.highestTier) this.state.highestTier = newTier;

    const mergeComboLevel = this.state.upgrades.mergeCombo || 0;
    const now = Date.now();
    if (now - this.state._mergeComboWindow > 3000) this.state._mergeComboCount = 0;
    this.state._mergeComboCount++;
    this.state._mergeComboWindow = now;
    const mergeComboMult = mergeComboLevel > 0 ? 1 + mergeComboLevel * 0.1 * (this.state._mergeComboCount - 1) : 1;

    const mergePayLevel = this.state.upgrades.mergePayout || 0;
    if (mergePayLevel > 0) {
      const mergePowerBonus = 1 + (this.state.permanentUpgrades.prestigeMergePower || 0) * 0.05;
      const bonus = new Decimal(2).pow(newTier).mul(mergePayLevel * 0.1).mul(mergeComboMult).mul(mergePowerBonus);
      this.state.money = this.state.money.add(bonus);
      this.state.lifetimeMoney = this.state.lifetimeMoney.add(bonus);
    }

    const splitLevel = this.state.upgrades.splitMerge || 0;
    if (splitLevel > 0 && newTier >= 10 && Math.random() < splitLevel * 0.25) {
      if (this.state.balls.length < this.getCapacity()) this._spawnBall(0, nx, ny);
    }

    this._emitMergeParticles(nx, ny, 8, 90, newTier);
  }

  _triggerLightspeed(ball) {
    if (window.audio) window.audio.playLightspeed();
    const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
    ball._remove = true;
    const fragMult = (1 + (this.state.permanentUpgrades.fragBoost || 0) * 0.25)
      * (1 + (this.state.permanentUpgrades.prestigeFragBonus || 0) * 0.2)
      * (1 + (this.state.infinityUpgrades.infFragYield || 0) * 1.0);
    const frags = Math.ceil(Math.max(1, ball.tier / 2) * fragMult);
    this.state.lightFragments = this.state.lightFragments.add(frags);

    const scLevel = this.state.permanentUpgrades.speedConverter || 0;
    if (scLevel > 0) {
      const bonus = new Decimal(Math.floor(speed * 0.1 * scLevel));
      this.state.money = this.state.money.add(bonus);
      this.state.lifetimeMoney = this.state.lifetimeMoney.add(bonus);
    }

    const lsBonusLevel = this.state.permanentUpgrades.lsBonus || 0;
    if (lsBonusLevel > 0) {
      const boost = 1 + lsBonusLevel * 0.1;
      for (const b of this.state.balls) {
        if (!b._remove) {
          b.vx *= boost;
          b.vy *= boost;
        }
      }
    }

    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      this.state._particles.push({ x: ball.x, y: ball.y, vx: Math.cos(a) * 140, vy: Math.sin(a) * 140, life: 0.9, size: 4, color: '#ffffff' });
    }
    this.state._popups.push({ x: ball.x, y: ball.y - 10, text: '+' + frags + ' ⚡', life: 1.5, vy: -55, isLight: true });
  }

  _updatePhysics(dt) {
    const w = this.canvas.width, h = this.canvas.height;
    const threshold = this.getLightspeedThreshold();
    const magnetLevel = this.state.upgrades.ballMagnet || 0;
    const speedRampLevel = this.state.upgrades.speedRamp || 0;
    const elasticLevel = this.state.upgrades.elasticBounce || 0;

    for (const ball of this.state.balls) {
      if (ball._remove) continue;
      if (ball.popScale > 1) ball.popScale = Math.max(1, ball.popScale - dt * 6);

      let curSpd = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);

      if (ball.tier >= 6) {
        if (!ball._trail) ball._trail = [];
        const last = ball._trail[ball._trail.length - 1];
        const tdx = ball.x - (last ? last.x : ball.x);
        const tdy = ball.y - (last ? last.y : ball.y);
        if (!last || Math.sqrt(tdx * tdx + tdy * tdy) > ball.radius) {
          ball._trail.push({ x: ball.x, y: ball.y });
          if (ball._trail.length > 3) ball._trail.shift();
        }
      }

      if (speedRampLevel > 0) {
        const targetSpd = this.getBallTargetSpeed(ball) * (1 + speedRampLevel * 0.1);
        if (curSpd > 0 && curSpd < targetSpd) {
          const scale = Math.min(1 + 0.001 * speedRampLevel * dt * 60, targetSpd / curSpd);
          ball.vx *= scale;
          ball.vy *= scale;
          curSpd *= scale;
        }
      }

      if (magnetLevel > 0) {
        if (curSpd < this.getBallTargetSpeed(ball) * 0.6) {
          const dx = w / 2 - ball.x;
          const dy = h / 2 - ball.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = magnetLevel * 30 * dt;
          ball.vx += (dx / dist) * force;
          ball.vy += (dy / dist) * force;
        }
      }

      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      const spd = curSpd;
      if (spd >= threshold) { this._triggerLightspeed(ball); continue; }

      if (this.state._particlesEnabled !== false && spd / threshold > 0.85 && Math.random() < 0.3) {
        this.state._particles.push({
          x: ball.x, y: ball.y,
          vx: (Math.random() - 0.5) * 30, vy: (Math.random() - 0.5) * 30,
          life: 0.4, size: 2, color: '#aaddff',
        });
      }


      if (spd < 25) {
        ball._stuckTimer += dt;
        if (ball._stuckTimer > 1.5) {
          const a = Math.random() * Math.PI * 2;
          const s = this.getBallTargetSpeed(ball);
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
        if (elasticLevel > 0) {
          const boostFactor = 1 + elasticLevel * 0.05;
          const newSpd = spd * boostFactor;
          if (newSpd < threshold * 0.95) {
            ball.vx *= boostFactor;
            ball.vy *= boostFactor;
          }
        }
        const now = performance.now();
        if (now - ball._lastHitTime > 80) {
          ball._lastHitTime = now;
          this._onWallHit(ball, hitWall, Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy));
          ball.hitFlash = 0.15;
        }
      }
      if (ball.hitFlash > 0)  ball.hitFlash  = Math.max(0, ball.hitFlash  - dt);
      if (ball.mergeFlash > 0) ball.mergeFlash = Math.max(0, ball.mergeFlash - dt);
    }
    this.state.balls = this.state.balls.filter(b => !b._remove);
  }

  _onWallHit(ball, wall, speed) {
    if ((wall === 'left' || wall === 'right') && ball.tier >= 10) {
      this.state.wallMultiplierActive = true;
      this.state.wallMultiplierEnd = Date.now() + 5000;
    }

    let wallMult = this.getWallMult(wall);
    if (wallMult === 0) {
      const wallSynergyLevel = this.state.upgrades.wallSynergy || 0;
      if (wallSynergyLevel > 0 && (wall === 'top' || wall === 'bottom')) {
        const lBonus = (this.state.upgrades.leftWall  || 0) * 0.5;
        const rBonus = (this.state.upgrades.rightWall || 0) * 0.5;
        wallMult = 1 + (lBonus + rBonus) * 0.5 * 0.5;
      }
      if (wallMult === 0) return;
    }

    const threshold = this.getLightspeedThreshold();
    const sr = Math.min(speed / threshold, 1);
    let speedMult = 1;
    if (sr >= 0.9) speedMult = 2.5;
    else if (sr >= 0.7) speedMult = 1.75;
    else if (sr >= 0.4) speedMult = 1.25;

    const now = Date.now();
    const comboWindowMs = 3000
      + (this.state.permanentUpgrades.prestigeComboDecay || 0) * 500
      + (this.state.infinityUpgrades.infComboWindow || 0) * 2000;
    this.state.comboHits = this.state.comboHits.filter(t => now - t < comboWindowMs);
    const hits = this.state.comboHits.length;
    let comboMult = 1;
    if (hits >= 200) comboMult = 10;
    else if (hits >= 50) comboMult = 3;
    else if (hits >= 15) comboMult = 1.5;
    else if (hits >= 5)  comboMult = 1.1;
    this.state._comboMult = comboMult;
    this.state.comboHits.push(now);

    const critLevel = this.state.upgrades.critChance || 0;
    const critChance = critLevel * 0.05 + (ball.trait === 'lucky' ? 0.1 : 0);
    let critMult = 1;
    const isCrit = critChance > 0 && Math.random() < critChance;
    if (isCrit) {
      const critComboLevel = this.state.upgrades.critCombo || 0;
      const prestigeCritBonus = (this.state.permanentUpgrades.prestigeCritMult || 0) * 2;
      critMult = (10 + prestigeCritBonus) * (critComboLevel > 0 ? comboMult : 1);
    }

    const holdBoostLevel = this.state.upgrades.holdBoost || 0;
    const holdBoostMult = (holdBoostLevel > 0 && Date.now() < this.state._holdBoostEnd)
      ? (1 + holdBoostLevel * 0.05) : 1;

    const massProdLevel = this.state.upgrades.massProduction || 0;
    const massProdMult = massProdLevel > 0
      ? Math.pow(1 + 0.01 * massProdLevel, this.state.balls.length) : 1;

    const wallMemoryLevel = this.state.upgrades.wallMemory || 0;
    let wallMemoryMult = 1;
    if (wallMemoryLevel > 0) {
      this.state._wallHitHistory = this.state._wallHitHistory.filter(h => now - h.time < 5000);
      this.state._wallHitHistory.push({ wall, time: now });
      const uniqueWalls = new Set(this.state._wallHitHistory.map(h => h.wall)).size;
      wallMemoryMult = 1 + wallMemoryLevel * 0.05 * uniqueWalls;
    }

    const richWallsLevel = this.state.upgrades.richWalls || 0;
    let richWallsMult = 1;
    if (richWallsLevel > 0) {
      const moneyK = this.state.money.div(1000).toNumber();
      richWallsMult = 1 + Math.min(0.5, moneyK * 0.01 * richWallsLevel);
    }

    let traitMult = 1;
    if (ball.trait === 'golden') traitMult = 2;
    if (ball.trait === 'heavy')  traitMult = 3;

    if (isCrit && ball.tier >= 8 && this.state._shakeEnabled !== false) {
      this.state._shakeIntensity = Math.min(6, ball.tier * 0.4);
    }

    const prestigeIncomeMult = 1 + (this.state.permanentUpgrades.prestigeIncome || 0) * 0.1;
    const infIncomeMult = Math.pow(2, this.state.infinityUpgrades.infIncome || 0);
    const value = new Decimal(2).pow(ball.tier);
    const payout = value
      .mul(wallMult)
      .mul(speedMult)
      .mul(comboMult)
      .mul(critMult)
      .mul(holdBoostMult)
      .mul(massProdMult)
      .mul(wallMemoryMult)
      .mul(richWallsMult)
      .mul(traitMult)
      .mul(prestigeIncomeMult)
      .mul(infIncomeMult);

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
    const autoLevel = (this.state.upgrades.autoPrinter || 0)
      + (this.state.permanentUpgrades.prestigeAutoSpeed || 0) * 0.5;
    if (autoLevel > 0) {
      const autoInterval = 1000 / autoLevel;
      if (!this._lastAutoAdd) this._lastAutoAdd = now;
      while (this._lastAutoAdd + autoInterval <= now) {
        this._lastAutoAdd += autoInterval;
        this.tryAdd();
      }
    }

    const autoMergeLevel = this.state.infinityUpgrades.infAutoMerge || 0;
    if (autoMergeLevel > 0) {
      const autoMergeInterval = 1000 / autoMergeLevel;
      if (!this._lastAutoMerge) this._lastAutoMerge = now;
      while (this._lastAutoMerge + autoMergeInterval <= now) {
        this._lastAutoMerge += autoMergeInterval;
        this.tryMerge();
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

  _updateBumpers() {
    const bumpers = this._getBumpers();
    if (bumpers.length === 0) return;
    const w = this.canvas.width, h = this.canvas.height;
    const now = performance.now();

    for (const ball of this.state.balls) {
      if (ball._remove) continue;
      for (const b of bumpers) {
        const bx = b.fx * w, by = b.fy * h;
        const dx = ball.x - bx, dy = ball.y - by;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = ball.radius + b.radius;
        if (dist < minDist && dist > 0) {
          // Debounce per ball per bumper hit
          const key = `_bumperHit_${b.fx}_${b.fy}`;
          if (now - (ball[key] || 0) < 100) continue;
          ball[key] = now;

          // Reflect velocity off bumper normal
          const nx = dx / dist, ny = dy / dist;
          const dot = ball.vx * nx + ball.vy * ny;
          ball.vx -= 2 * dot * nx;
          ball.vy -= 2 * dot * ny;

          // Push ball out of overlap
          ball.x = bx + nx * (minDist + 1);
          ball.y = by + ny * (minDist + 1);

          // Bonus payout
          const bonus = new Decimal(2).pow(ball.tier).mul(b.payoutMult);
          this.state.money = this.state.money.add(bonus);
          this.state.lifetimeMoney = this.state.lifetimeMoney.add(bonus);
          this._lastIncomeWindow.push({ t: Date.now(), v: bonus });

          // Visual feedback
          ball.hitFlash = 0.15;
          if (this.state._popups.length < 25) {
            this.state._popups.push({
              x: ball.x, y: ball.y - ball.radius,
              text: '$' + formatMoney(bonus),
              life: 1.0, vy: -50,
            });
          }
          const pc = getTierInfo(ball.tier).color;
          for (let i = 0; i < 5; i++) {
            const pa = (i / 5) * Math.PI * 2;
            this.state._particles.push({ x: bx, y: by, vx: Math.cos(pa) * 70, vy: Math.sin(pa) * 70, life: 0.4, size: 2.5, color: pc });
          }
        }
      }
    }
  }

  _updateIncomePerSec() {
    const now = Date.now();
    this._lastIncomeWindow = this._lastIncomeWindow.filter(x => now - x.t < 3000);
    if (this._lastIncomeWindow.length > 600) this._lastIncomeWindow.splice(0, this._lastIncomeWindow.length - 600);
    let total = new Decimal(0);
    for (const x of this._lastIncomeWindow) total = total.add(x.v);
    this.state.incomePerSec = total.div(3);

    // Sample income history every 2 seconds for sparkline
    if (!this._lastIncomeSample) this._lastIncomeSample = now;
    if (now - this._lastIncomeSample >= 2000) {
      this._lastIncomeSample = now;
      this.state._incomeHistory.push({ t: now, v: parseFloat(this.state.incomePerSec.toFixed(4)) });
      if (this.state._incomeHistory.length > 30) this.state._incomeHistory.shift();
    }
  }

  prestige() {
    if (window.audio) window.audio.playPrestige();
    const raw = this.state.lifetimeMoney.div(1e9);
    let shards = raw.pow(0.5).add(this.state.highestTier).floor().add(1);
    const infPrestigeMultLevel = this.state.infinityUpgrades.infPrestigeMult || 0;
    if (infPrestigeMultLevel > 0) shards = shards.mul(infPrestigeMultLevel + 1);
    this.state.primeShards = this.state.primeShards.add(shards);

    const keepLF = this.state.lightFragments;
    const keepPerm = { ...this.state.permanentUpgrades };
    const keepPrestige = this.state.prestige + 1;
    const keepShards = this.state.primeShards;
    const keepLayout = this.state.arenaLayout || 'classic';
    const keepIP = this.state.infinityPoints;
    const keepInfinityPrestige = this.state.infinityPrestige;
    const keepInfinityUpgrades = { ...this.state.infinityUpgrades };

    this.state = this._freshState();
    this.state.lightFragments = keepLF;
    this.state.permanentUpgrades = keepPerm;
    this.state.prestige = keepPrestige;
    this.state.primeShards = keepShards;
    this.state.arenaLayout = keepLayout;
    this.state.infinityPoints = keepIP;
    this.state.infinityPrestige = keepInfinityPrestige;
    this.state.infinityUpgrades = keepInfinityUpgrades;
    this._challengesMergedThisRun = false;
    this._slowBallTimer = 0;
    this._fullHouseTimer = 0;
    this._challengeStartTime = Date.now();

    const startTier = keepInfinityUpgrades.infStartTier || 0;
    this._spawnBall(startTier);
    const extraBalls = keepPerm.prestigeStartBalls || 0;
    for (let i = 0; i < extraBalls; i++) this._spawnBall(startTier);

    this._buildUpgradeTabs();
    this._renderUpgradeCards();
    saveGame(this.state, this.canvas.width, this.canvas.height);
  }

  breakInfinity() {
    // Calculate infinity points: floor(sqrt(primeShards / 10)) + 1
    const ip = this.state.primeShards.div(10).sqrt().floor().add(1);

    const keepLF = this.state.lightFragments;
    const keepPerm = { ...this.state.permanentUpgrades };
    const keepInfinityPrestige = this.state.infinityPrestige + 1;
    const keepInfinityUpgrades = { ...this.state.infinityUpgrades };
    const keepIP = this.state.infinityPoints.add(ip);

    this.state = this._freshState();
    this.state.lightFragments = keepLF;
    this.state.permanentUpgrades = keepPerm;
    this.state.infinityPrestige = keepInfinityPrestige;
    this.state.infinityUpgrades = keepInfinityUpgrades;
    this.state.infinityPoints = keepIP;

    const startTier = keepInfinityUpgrades.infStartTier || 0;
    this._spawnBall(startTier);

    this._renderUpgradeCards();
    this._buildUpgradeTabs();
    saveGame(this.state, this.canvas.width, this.canvas.height);
  }

  onUpgradePurchased(upg) {
    if (upg.id === 'speedUp') {
      for (const b of this.state.balls) {
        const s = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
        const target = this.getBallTargetSpeed(b);
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
    const traitCount = this.state.balls.filter(b => b.trait).length;
    document.getElementById('stat-traits').textContent = traitCount;

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
    const prestigeBtn = document.getElementById('btn-prestige');
    prestigeBtn.style.display = this.state.prestigeAvailable ? 'block' : 'none';
    prestigeBtn.classList.toggle('prestige-available', this.state.prestigeAvailable);
    const prestigeHint = document.getElementById('prestige-hint');
    if (prestigeHint) prestigeHint.style.display = this.state.prestigeAvailable ? 'block' : 'none';
    const biBtn = document.getElementById('btn-break-infinity');
    if (biBtn) biBtn.style.display = this.state.prestige >= 10 ? '' : 'none';

    // Update combo meter
    this._updateComboMeter();

    // Draw income sparkline
    if (this._elSparkline) drawSparkline(this._elSparkline, this.state._incomeHistory);

    // Rebuild upgrade cards and check achievements at most 4×/sec to avoid thrashing the DOM
    const now = Date.now();
    if (!this._lastCardRebuild || now - this._lastCardRebuild > 250) {
      this._lastCardRebuild = now;
      this._renderUpgradeCards();
      this._achievementSystem.check(this.state);
      this._updateLayoutButtons();
    }
  }

  _updateComboMeter() {
    if (!this._elComboFill) return;
    const now = Date.now();
    const hits = (this.state.comboHits || []).filter(t => now - t < 3000).length;

    let tierIdx = 0;
    for (let i = 0; i < COMBO_THRESHOLDS.length; i++) {
      if (hits >= COMBO_THRESHOLDS[i].min) tierIdx = i;
    }
    const tier = COMBO_THRESHOLDS[tierIdx];

    this._elComboMult.textContent = 'x' + tier.mult.toFixed(1);
    this._elComboFill.style.backgroundColor = tier.color;
    if (tier.next !== null) {
      const progress = Math.min(1, (hits - tier.min) / (tier.next - tier.min));
      this._elComboFill.style.width = (progress * 100).toFixed(1) + '%';
      const nextMult = COMBO_THRESHOLDS[tierIdx + 1].mult.toFixed(1);
      this._elComboHint.textContent = (tier.next - hits) + ' more hits for x' + nextMult + '!';
    } else {
      this._elComboFill.style.width = '100%';
      this._elComboHint.textContent = 'MAX COMBO!';
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
      if (!this.state.prestigeAvailable) return;
      gameConfirm('Prestige? Your numbers and money reset, but you keep Light Fragments and earn Prime Shards.', () => this.prestige());
    });

    const biBtn = document.getElementById('btn-break-infinity');
    if (biBtn) {
      biBtn.addEventListener('click', () => {
        if (this.state.prestige < 10) return;
        gameConfirm('Break Infinity? All prestige progress resets, but you keep Light Fragments, permanent upgrades, and earn Infinity Points.', () => this.breakInfinity());
      });
    }

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
      gameConfirm('Delete all save data and restart?', () => { clearSave(); location.reload(); });
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

    const settingsPanel = document.getElementById('settings-panel');
    const btnSettings = document.getElementById('btn-settings');
    const btnCloseSettings = document.getElementById('btn-close-settings');
    if (btnSettings && settingsPanel) {
      btnSettings.addEventListener('click', () => { settingsPanel.style.display = ''; });
      settingsPanel.addEventListener('click', e => {
        if (e.target === settingsPanel) settingsPanel.style.display = 'none';
      });
    }
    if (btnCloseSettings && settingsPanel) {
      btnCloseSettings.addEventListener('click', () => { settingsPanel.style.display = 'none'; });
    }
    const settingMute = document.getElementById('setting-mute');
    if (settingMute) {
      settingMute.addEventListener('change', () => { window._gameMuted = settingMute.checked; });
    }
    const settingParticles = document.getElementById('setting-particles');
    if (settingParticles) {
      settingParticles.addEventListener('change', () => { this.state._particlesEnabled = settingParticles.checked; });
    }
    const settingShake = document.getElementById('setting-shake');
    if (settingShake) {
      settingShake.addEventListener('change', () => { this.state._shakeEnabled = settingShake.checked; });
    }

    document.querySelectorAll('.layout-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const layoutId = btn.dataset.layout;
        const perm = this.state.permanentUpgrades;
        if (layoutId === 'pinball' && !perm.unlockPinball) return;
        if (layoutId === 'hallway' && !perm.unlockHallway) return;
        this.setLayout(layoutId);
      });
    });
    this._updateLayoutButtons();
  }

  _loop(timestamp) {
    const dt = Math.min((timestamp - this._lastTime) / 1000, 0.1);
    this._lastTime = timestamp;
    const now = performance.now();

    this._updatePhysics(dt);
    this._updateChallenges(dt);
    this._updateBumpers();
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
