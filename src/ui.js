function gameConfirm(message, onConfirm) {
  const modal = document.getElementById('confirm-modal');
  document.getElementById('confirm-text').textContent = message;
  modal.style.display = 'flex';

  const ok = document.getElementById('confirm-ok');
  const cancel = document.getElementById('confirm-cancel');

  function cleanup() {
    modal.style.display = 'none';
    ok.replaceWith(ok.cloneNode(true));
    cancel.replaceWith(cancel.cloneNode(true));
  }

  document.getElementById('confirm-ok').addEventListener('click', () => { cleanup(); onConfirm(); }, { once: true });
  document.getElementById('confirm-cancel').addEventListener('click', () => { cleanup(); }, { once: true });
}

function drawSparkline(canvas, history) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  if (history.length < 2) return;

  const values = history.map(d => d.v);
  const maxVal = Math.max(...values, 0.001);

  // Determine trend color
  const last = values[values.length - 1];
  const prev = values[values.length - 2];
  let color = '#ffeb3b'; // flat
  if (last > prev * 1.02) color = '#4caf50';      // rising
  else if (last < prev * 0.98) color = '#f44336';  // dropping

  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.lineJoin = 'round';
  ctx.beginPath();

  for (let i = 0; i < values.length; i++) {
    const x = (i / (values.length - 1)) * w;
    const y = h - (values[i] / maxVal) * (h - 2) - 1;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function buildUpgradeTabs(game) {
  const state = game.state;
  const showPrestige = state.prestige >= 1;
  const showInfinity = state.infinityPrestige >= 1 || state.prestige >= 10;
  const allTabs = [...new Set(UPGRADES.map(u => u.tab))];
  const visibleTabs = allTabs.filter(tab => {
    if (tab === 'Prestige') return showPrestige;
    if (tab === 'Infinity') return showInfinity;
    return true;
  });
  const tabs = ['All', ...visibleTabs, 'Achievements', 'Challenges'];

  if (!tabs.includes(game._currentTab)) game._currentTab = 'All';


  const el = document.getElementById('upgrade-tabs');
  el.innerHTML = '';
  tabs.forEach(tab => {
    const btn = document.createElement('button');
    btn.className = 'tab-btn' + (tab === game._currentTab ? ' active' : '');
    btn.textContent = tab;
    btn.dataset.tab = tab;
    btn.addEventListener('click', () => {
      game._currentTab = tab;
      el.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
      renderUpgradeCards(game);
    });
    el.appendChild(btn);
  });
}

function renderAchievements(game, content) {
  const sys = game._achievementSystem;
  const all = window.ACHIEVEMENTS || [];
  const unlockedCount = sys ? sys.getUnlocked().length : 0;

  const countEl = document.createElement('div');
  countEl.className = 'ach-count';
  countEl.textContent = `${unlockedCount} / ${all.length} Unlocked`;
  content.appendChild(countEl);

  const grid = document.createElement('div');
  grid.className = 'ach-grid';

  all.forEach(ach => {
    const unlocked = sys ? sys.isUnlocked(ach.id) : false;
    const card = document.createElement('div');
    card.className = 'ach-card ' + (unlocked ? 'unlocked' : 'locked');

    const icon = document.createElement('div');
    icon.className = 'ach-icon';
    icon.textContent = unlocked ? ach.icon : '?';

    const name = document.createElement('div');
    name.className = 'ach-name';
    name.textContent = ach.name;

    card.appendChild(icon);
    card.appendChild(name);

    if (unlocked) {
      const desc = document.createElement('div');
      desc.className = 'ach-desc';
      desc.textContent = ach.desc;
      card.appendChild(desc);
    }

    grid.appendChild(card);
  });

  content.appendChild(grid);
}

function _renderChallengeCards(game, content) {
  const system = game._challengeSystem;
  const difficultyColor = { Easy: '#44bb44', Medium: '#ffaa33', Hard: '#ff4444' };

  CHALLENGES.forEach(ch => {
    const completed = system.isCompleted(ch.id);
    const card = document.createElement('div');
    card.className = 'upgrade-card' + (completed ? ' maxed' : '');
    card.style.cursor = 'default';

    const dColor = difficultyColor[ch.difficulty] || '#888';
    const dBadge = `<span style="font-size:9px;color:${dColor};border:1px solid ${dColor};border-radius:3px;padding:0 4px;margin-left:4px;">${ch.difficulty}</span>`;

    let progressHtml = '';
    const state = game.state;
    if (!completed) {
      if (ch.id === 'wall_hitter') {
        const pct = Math.min(100, Math.round((state.wallHits / 10000) * 100));
        progressHtml = `<div class="upg-desc" style="color:#5577aa;">Wall Hits: ${state.wallHits.toLocaleString()} / 10,000 (${pct}%)</div>`;
      } else if (ch.id === 'prestige_5') {
        progressHtml = `<div class="upg-desc" style="color:#5577aa;">Prestige: ${state.prestige} / 5</div>`;
      } else if (ch.id === 'light_collector') {
        const cur = state.lightFragments.toFixed(0);
        progressHtml = `<div class="upg-desc" style="color:#5577aa;">Fragments: ${cur} / 50</div>`;
      } else if (ch.id === 'tier_rush') {
        progressHtml = `<div class="upg-desc" style="color:#5577aa;">Highest Tier: ${state.highestTier} / 19</div>`;
      } else if (ch.id === 'slow_ball') {
        const t = game._slowBallTimer ? game._slowBallTimer.toFixed(1) : '0.0';
        progressHtml = `<div class="upg-desc" style="color:#5577aa;">Timer: ${t}s / 30s</div>`;
      } else if (ch.id === 'max_capacity') {
        const t = game._fullHouseTimer ? game._fullHouseTimer.toFixed(1) : '0.0';
        progressHtml = `<div class="upg-desc" style="color:#5577aa;">Timer: ${t}s / 60s</div>`;
      }
    }

    card.innerHTML = `
      <div class="upg-header">
        <span class="upg-name">${completed ? '✓ ' : ''}${ch.name}</span>
        ${dBadge}
      </div>
      <div class="upg-desc">${ch.description}</div>
      ${progressHtml}
      <div class="upg-effect" style="color:#42a5f5;">${ch.reward.description}</div>
      <div class="upg-cost" style="color:${completed ? '#44bb44' : '#888'};">${completed ? '✓ Completed' : 'Incomplete'}</div>
    `;
    content.appendChild(card);
  });
}

function renderUpgradeCards(game) {
  const content = document.getElementById('upgrade-content');

  if (game._currentTab === 'Achievements') {
    content.innerHTML = '';
    renderAchievements(game, content);
    return;
  }

  if (game._currentTab === 'Challenges') {
    content.innerHTML = '';
    _renderChallengeCards(game, content);
    return;
  }

  const filter = game._currentTab === 'All' ? null : game._currentTab;
  const visible = getVisibleUpgrades(game.state, filter);

  if (visible.length === 0) {
    if (content.children.length !== 1 || !content.children[0].dataset.empty) {
      content.innerHTML = '';
      const msg = document.createElement('div');
      msg.dataset.empty = '1';
      msg.style.cssText = 'padding:16px;color:#444;font-size:12px;text-align:center;';
      msg.textContent = filter
        ? `No ${filter} upgrades available yet.`
        : 'Keep playing to unlock upgrades!';
      content.appendChild(msg);
    }
    return;
  }

  // Build an id→card map of what's currently rendered
  const existing = {};
  for (const el of content.querySelectorAll('.upgrade-card[data-upg-id]')) {
    existing[el.dataset.upgId] = el;
  }

  const fragment = document.createDocumentFragment();

  visible.forEach(upg => {
    const level = getUpgradeLevel(upg, game.state);
    const affordable = canAffordUpgrade(upg, game.state);
    const maxed = level >= upg.maxLevel;
    const cost = getUpgradeCost(upg, level);
    const isLF = upg.currency === 'lightFragments';
    const isShard = upg.currency === 'primeShards';
    const isInf = upg.infinityPersistent;

    const newClass = 'upgrade-card'
      + (affordable ? ' affordable' : '')
      + (maxed ? ' maxed' : '')
      + (isLF ? ' lf-card' : '')
      + (isShard ? ' shard-card' : '')
      + (isInf ? ' inf-card' : '');

    const costText = maxed ? '✓ MAX' : (isLF ? '⚡' : isShard ? '◆' : isInf ? '∞' : '$') + formatMoney(cost);
    const effectText = upg.effect(level);
    const tabBadge = game._currentTab === 'All'
      ? `<span class="upg-tab-badge">${upg.tab}</span>`
      : '';
    const levelText = `Lv ${level}/${upg.maxLevel}`;

    let card = existing[upg.id];

    if (!card) {
      // First time seeing this upgrade — create the card
      card = document.createElement('div');
      card.dataset.upgId = upg.id;
      card.innerHTML = `
        <div class="upg-header">
          <span class="upg-name">${upg.name}</span>
          ${tabBadge}
          <span class="upg-level">${levelText}</span>
        </div>
        <div class="upg-desc">${upg.desc}</div>
        <div class="upg-effect">${effectText}</div>
        <div class="upg-cost">${costText}</div>
      `;

      if (!maxed) {
        let holdTimer = null;
        let holdInterval = null;

        function tryBuy() {
          if (purchaseUpgrade(upg, game.state)) game.onUpgradePurchased(upg);
        }

        card.addEventListener('mousedown', e => {
          if (e.button !== 0) return;
          tryBuy();
          holdTimer = setTimeout(() => { holdInterval = setInterval(tryBuy, 80); }, 400);
        });
        card.addEventListener('mouseup',    () => { clearTimeout(holdTimer); clearInterval(holdInterval); });
        card.addEventListener('mouseleave', () => { clearTimeout(holdTimer); clearInterval(holdInterval); });
        card.addEventListener('touchstart', e => {
          e.preventDefault();
          tryBuy();
          holdTimer = setTimeout(() => { holdInterval = setInterval(tryBuy, 80); }, 400);
        }, { passive: false });
        card.addEventListener('touchend',   () => { clearTimeout(holdTimer); clearInterval(holdInterval); });
        card.addEventListener('touchcancel',() => { clearTimeout(holdTimer); clearInterval(holdInterval); });
      }
    } else {
      // Card exists — only patch the parts that change
      card.querySelector('.upg-level').textContent = levelText;
      card.querySelector('.upg-effect').textContent = effectText;
      card.querySelector('.upg-cost').textContent = costText;
    }

    // Always sync className (affordable/maxed can change every tick)
    card.className = newClass;
    fragment.appendChild(card);
  });

  // Replace content only if the set of visible upgrades changed, otherwise just reorder in-place
  const renderedIds = [...content.querySelectorAll('.upgrade-card[data-upg-id]')].map(el => el.dataset.upgId).join(',');
  const visibleIds = visible.map(u => u.id).join(',');
  if (renderedIds !== visibleIds) {
    content.innerHTML = '';
    content.appendChild(fragment);
  }
}
