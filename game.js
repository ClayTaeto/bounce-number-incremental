(() => {
  const canvas = document.getElementById('arena');
  const ctx = canvas.getContext('2d');

  const ui = {
    money: document.getElementById('money'),
    fragments: document.getElementById('fragments'),
    combo: document.getElementById('combo'),
    capacity: document.getElementById('capacity'),
    addCost: document.getElementById('addCost'),
    addBtn: document.getElementById('addBtn'),
    mergeBtn: document.getElementById('mergeBtn'),
    prestigeBtn: document.getElementById('prestigeBtn'),
    upgrades: [...document.querySelectorAll('.upgrade')],
    toast: document.getElementById('toast'),
  };

  const SAVE_KEY = 'bouncing-numbers-mvp-v1';
  const WALL_MARGIN = 14;

  const state = {
    numbers: [],
    popups: [],
    money: 25,
    fragments: 0,
    comboHits: [],
    nextId: 1,
    maxCapacity: 20,
    purchasedThisPrestige: 0,
    addBaseCost: 5,
    addGrowth: 1.08,
    lightspeedThreshold: 520,
    globalMult: 1,
    lastTs: performance.now(),
    firstCapacityHit: false,
    hold: {
      add: { active: false, start: 0, next: 0 },
      merge: { active: false, start: 0, next: 0 },
    },
    upgrades: {
      addRate: 0,
      mergeRate: 0,
      wallMult: 0,
      speedMult: 0,
      capacity: 0,
      lightspeed: 0,
    },
  };

  const upgradeDefs = {
    addRate: { base: 100, growth: 3, effect: () => {} },
    mergeRate: { base: 120, growth: 3.2, effect: () => {} },
    wallMult: { base: 90, growth: 2.8, effect: () => {} },
    speedMult: { base: 140, growth: 3.4, effect: () => {} },
    capacity: { base: 250, growth: 2.2, effect: () => { state.maxCapacity += 5; } },
    lightspeed: { base: 20, growth: 1.75, resource: 'fragments', effect: () => { state.lightspeedThreshold += 45; } },
  };

  function format(n) {
    if (n >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
    if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
    if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
    return n.toFixed(n >= 100 ? 0 : 2);
  }

  function valueToRadius(value) {
    return Math.min(12 + Math.log2(value) * 2.2, 32);
  }

  function tierColor(value) {
    const tier = Math.log2(value);
    const hue = (220 + tier * 28) % 360;
    return `hsl(${hue}, 85%, 62%)`;
  }

  function addCost() {
    return state.addBaseCost * (state.addGrowth ** state.purchasedThisPrestige);
  }

  function spawnNumber(value = 1, x, y, vx, vy) {
    if (state.numbers.length >= state.maxCapacity) return false;
    const r = valueToRadius(value);
    state.numbers.push({
      id: state.nextId++,
      value,
      x: x ?? (WALL_MARGIN + r + Math.random() * (canvas.width - 2 * (WALL_MARGIN + r))),
      y: y ?? (WALL_MARGIN + r + Math.random() * (canvas.height - 2 * (WALL_MARGIN + r))),
      vx: vx ?? ((Math.random() * 2 - 1) * 190),
      vy: vy ?? ((Math.random() * 2 - 1) * 190),
      r,
      pulse: 0,
      incomeMult: 1,
    });
    return true;
  }

  function buyOne() {
    const cost = addCost();
    if (state.numbers.length >= state.maxCapacity) {
      showToast('Arena full. Merge or upgrade capacity.');
      unlockPrestigeIfNeeded();
      return false;
    }
    if (state.money < cost) return false;
    state.money -= cost;
    state.purchasedThisPrestige += 1;
    return spawnNumber(1);
  }

  function showToast(msg) {
    ui.toast.textContent = msg;
    ui.toast.classList.add('show');
    clearTimeout(showToast.t);
    showToast.t = setTimeout(() => ui.toast.classList.remove('show'), 1200);
  }

  function holdRate(kind, heldSec) {
    const level = state.upgrades[kind === 'add' ? 'addRate' : 'mergeRate'];
    const bonus = 1 + level * 0.15;
    if (heldSec < 0.5) return (kind === 'add' ? 4 : 3) * bonus;
    if (heldSec < 2) return (kind === 'add' ? 8 : 6) * bonus;
    if (heldSec < 5) return (kind === 'add' ? 15 : 12) * bonus;
    return (kind === 'add' ? 20 : 16) * bonus;
  }

  function mergeOnce() {
    if (state.numbers.length < 2) return false;
    const groups = new Map();
    for (const n of state.numbers) {
      if (!groups.has(n.value)) groups.set(n.value, []);
      groups.get(n.value).push(n);
    }
    const mergeableValue = [...groups.keys()].sort((a, b) => a - b).find(v => groups.get(v).length >= 2);
    if (!mergeableValue) return false;
    const [a, b] = groups.get(mergeableValue);
    state.numbers = state.numbers.filter(n => n.id !== a.id && n.id !== b.id);
    const nx = (a.x + b.x) / 2;
    const ny = (a.y + b.y) / 2;
    const nvx = (a.vx + b.vx) / 2 + (Math.random() * 80 - 40);
    const nvy = (a.vy + b.vy) / 2 + (Math.random() * 80 - 40);
    spawnNumber(mergeableValue * 2, nx, ny, nvx, nvy);
    const newOne = state.numbers[state.numbers.length - 1];
    if (newOne) newOne.pulse = 0.15;
    state.popups.push({ text: `Merge ${mergeableValue}+${mergeableValue}`, x: nx, y: ny, life: 0.8, color: '#95f2ff' });
    return true;
  }

  function comboMult(now) {
    state.comboHits = state.comboHits.filter(t => now - t < 3000);
    const c = state.comboHits.length;
    if (c >= 200) return 10;
    if (c >= 50) return 3;
    if (c >= 15) return 1.5;
    if (c >= 5) return 1.1;
    return 1;
  }

  function wallPayout(n, speed, now) {
    const wallMult = 1 + state.upgrades.wallMult * 0.2;
    const speedScale = Math.min(2.5, 1 + (speed / 400) * (1 + state.upgrades.speedMult * 0.1));
    const payout = n.value * wallMult * speedScale * comboMult(now) * state.globalMult * n.incomeMult;
    state.money += payout;
    state.comboHits.push(now);
    state.popups.push({ text: `+$${format(payout)}`, x: n.x, y: n.y, life: 0.7, color: '#71ffa2' });
  }

  function processHolds(now) {
    for (const kind of ['add', 'merge']) {
      const h = state.hold[kind];
      if (!h.active) continue;
      if (h.next > now) continue;
      const heldSec = (now - h.start) / 1000;
      const rate = holdRate(kind, heldSec);
      h.next = now + (1000 / rate);
      if (kind === 'add') buyOne();
      else mergeOnce();
    }
  }

  function unlockPrestigeIfNeeded() {
    if (!state.firstCapacityHit && state.numbers.length >= state.maxCapacity) {
      state.firstCapacityHit = true;
      showToast('Prestige unlocked!');
    }
  }

  function doPrestige() {
    if (!state.firstCapacityHit) return;
    const charge = Math.max(1, Math.floor(Math.log2(Math.max(1, state.money)) / 6));
    state.globalMult += charge * 0.25;
    state.money = 25;
    state.numbers = [];
    state.comboHits = [];
    state.purchasedThisPrestige = 0;
    spawnNumber(1);
    showToast(`Prestiged! Global multiplier +${(charge * 0.25).toFixed(2)}x`);
  }

  function purchaseUpgrade(key) {
    const def = upgradeDefs[key];
    const lvl = state.upgrades[key];
    const cost = def.base * (def.growth ** lvl);
    const resource = def.resource || 'money';
    if (state[resource] < cost) return;
    state[resource] -= cost;
    state.upgrades[key] += 1;
    def.effect();
  }

  function physicsStep(dt, now) {
    for (const n of state.numbers) {
      n.x += n.vx * dt;
      n.y += n.vy * dt;

      if (n.pulse > 0) n.pulse -= dt;

      const speed = Math.hypot(n.vx, n.vy);
      if (speed > state.lightspeedThreshold) {
        const frags = Math.max(1, Math.floor(Math.log2(n.value) + (speed - state.lightspeedThreshold) / 70));
        state.fragments += frags;
        state.popups.push({ text: `+${frags} ✦`, x: n.x, y: n.y, life: 1, color: '#fef98f' });
        n.dead = true;
        continue;
      }

      if (n.x - n.r <= WALL_MARGIN) {
        n.x = WALL_MARGIN + n.r;
        n.vx = Math.abs(n.vx);
        wallPayout(n, speed, now);
      } else if (n.x + n.r >= canvas.width - WALL_MARGIN) {
        n.x = canvas.width - WALL_MARGIN - n.r;
        n.vx = -Math.abs(n.vx);
        wallPayout(n, speed, now);
      }

      if (n.y - n.r <= WALL_MARGIN) {
        n.y = WALL_MARGIN + n.r;
        n.vy = Math.abs(n.vy);
      } else if (n.y + n.r >= canvas.height - WALL_MARGIN) {
        n.y = canvas.height - WALL_MARGIN - n.r;
        n.vy = -Math.abs(n.vy);
      }

      if (Math.abs(n.vx) + Math.abs(n.vy) < 55) {
        n.vx += Math.random() * 80 - 40;
        n.vy += Math.random() * 80 - 40;
      }
    }

    state.numbers = state.numbers.filter(n => !n.dead);
    for (const p of state.popups) {
      p.y -= 24 * dt;
      p.life -= dt;
    }
    state.popups = state.popups.filter(p => p.life > 0);

    unlockPrestigeIfNeeded();
  }

  function drawArena() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#306e9f';
    ctx.lineWidth = 4;
    ctx.strokeRect(WALL_MARGIN, WALL_MARGIN, canvas.width - WALL_MARGIN * 2, canvas.height - WALL_MARGIN * 2);

    ctx.fillStyle = 'rgba(88, 245, 143, 0.15)';
    ctx.fillRect(0, WALL_MARGIN, WALL_MARGIN, canvas.height - WALL_MARGIN * 2);
    ctx.fillRect(canvas.width - WALL_MARGIN, WALL_MARGIN, WALL_MARGIN, canvas.height - WALL_MARGIN * 2);

    for (const n of state.numbers) {
      const scale = n.pulse > 0 ? 1.08 : 1;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r * scale, 0, Math.PI * 2);
      ctx.fillStyle = tierColor(n.value);
      ctx.fill();

      const speed = Math.hypot(n.vx, n.vy);
      const ratio = Math.min(1, speed / state.lightspeedThreshold);
      if (ratio > 0.8) {
        ctx.strokeStyle = `rgba(255,255,180,${(ratio - 0.75).toFixed(2)})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.fillStyle = '#04111d';
      ctx.font = `${Math.max(11, n.r * 0.9)}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = n.value >= 1024 ? format(n.value) : String(n.value);
      ctx.fillText(label, n.x, n.y + 1);
    }

    for (const p of state.popups) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.font = '14px Inter, sans-serif';
      ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;
  }

  function updateUi(now) {
    ui.money.textContent = `$${format(state.money)}`;
    ui.fragments.textContent = format(state.fragments);
    ui.combo.textContent = `x${comboMult(now).toFixed(2)}`;
    ui.capacity.textContent = `${state.numbers.length}/${state.maxCapacity}`;
    ui.addCost.textContent = `$${format(addCost())}`;

    ui.addBtn.disabled = state.numbers.length >= state.maxCapacity;
    ui.prestigeBtn.disabled = !state.firstCapacityHit;

    for (const b of ui.upgrades) {
      const key = b.dataset.upgrade;
      const def = upgradeDefs[key];
      const lvl = state.upgrades[key];
      const cost = def.base * (def.growth ** lvl);
      const resource = def.resource || 'money';
      const affordable = state[resource] >= cost;
      b.disabled = !affordable;
      b.textContent = `${b.textContent.split(' [')[0]} [Lv.${lvl}] (${resource === 'money' ? '$' : ''}${format(cost)})`;
    }
  }

  function saveGame() {
    const payload = {
      money: state.money,
      fragments: state.fragments,
      numbers: state.numbers,
      nextId: state.nextId,
      maxCapacity: state.maxCapacity,
      purchasedThisPrestige: state.purchasedThisPrestige,
      lightspeedThreshold: state.lightspeedThreshold,
      globalMult: state.globalMult,
      firstCapacityHit: state.firstCapacityHit,
      upgrades: state.upgrades,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
  }

  function loadGame() {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      spawnNumber(1);
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      Object.assign(state, parsed);
      state.hold = {
        add: { active: false, start: 0, next: 0 },
        merge: { active: false, start: 0, next: 0 },
      };
      state.comboHits = [];
      state.popups = [];
      if (!state.numbers?.length) spawnNumber(1);
    } catch {
      spawnNumber(1);
    }
  }

  function startHold(kind) {
    const h = state.hold[kind];
    h.active = true;
    h.start = performance.now();
    h.next = h.start;
  }

  function stopHold(kind) {
    state.hold[kind].active = false;
  }

  ui.addBtn.addEventListener('click', buyOne);
  ui.mergeBtn.addEventListener('click', mergeOnce);
  ui.prestigeBtn.addEventListener('click', doPrestige);

  for (const b of ui.upgrades) {
    b.addEventListener('click', () => purchaseUpgrade(b.dataset.upgrade));
  }

  for (const [el, kind] of [[ui.addBtn, 'add'], [ui.mergeBtn, 'merge']]) {
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      startHold(kind);
    });
    window.addEventListener('pointerup', () => stopHold(kind));
    el.addEventListener('pointerleave', () => stopHold(kind));
  }

  window.addEventListener('beforeunload', saveGame);
  setInterval(saveGame, 15000);

  function loop(ts) {
    const dt = Math.min(0.033, (ts - state.lastTs) / 1000);
    state.lastTs = ts;

    processHolds(ts);
    physicsStep(dt, ts);
    drawArena();
    updateUi(ts);

    requestAnimationFrame(loop);
  }

  loadGame();
  requestAnimationFrame((ts) => {
    state.lastTs = ts;
    loop(ts);
  });
})();
