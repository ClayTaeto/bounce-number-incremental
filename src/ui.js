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
  const tabs = ['All', ...new Set(UPGRADES.map(u => u.tab))];
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

function renderUpgradeCards(game) {
  const content = document.getElementById('upgrade-content');
  const filter = game._currentTab === 'All' ? null : game._currentTab;
  const visible = getVisibleUpgrades(game.state, filter);

  // Track previously unlocked count so we can flash new ones
  const prevCount = game._prevUnlockedCount || 0;
  if (visible.length > prevCount) game._prevUnlockedCount = visible.length;

  content.innerHTML = '';

  if (visible.length === 0) {
    const msg = document.createElement('div');
    msg.style.cssText = 'padding:16px;color:#444;font-size:12px;text-align:center;';
    msg.textContent = filter
      ? `No ${filter} upgrades available yet.`
      : 'Keep playing to unlock upgrades!';
    content.appendChild(msg);
    return;
  }

  visible.forEach(upg => {
    const level = getUpgradeLevel(upg, game.state);
    const affordable = canAffordUpgrade(upg, game.state);
    const maxed = level >= upg.maxLevel;
    const cost = getUpgradeCost(upg, level);
    const isLF = upg.currency === 'lightFragments';

    const card = document.createElement('div');
    card.className = 'upgrade-card'
      + (affordable ? ' affordable' : '')
      + (maxed ? ' maxed' : '')
      + (isLF ? ' lf-card' : '');

    const tabBadge = game._currentTab === 'All'
      ? `<span class="upg-tab-badge">${upg.tab}</span>`
      : '';

    card.innerHTML = `
      <div class="upg-header">
        <span class="upg-name">${upg.name}</span>
        ${tabBadge}
        <span class="upg-level">Lv ${level}/${upg.maxLevel}</span>
      </div>
      <div class="upg-desc">${upg.desc}</div>
      <div class="upg-effect">${upg.effect(level)}</div>
      <div class="upg-cost">${maxed ? '✓ MAX' : (isLF ? '⚡' : '$') + formatMoney(cost)}</div>
    `;
    if (!maxed) {
      card.addEventListener('click', () => {
        if (purchaseUpgrade(upg, game.state)) game.onUpgradePurchased(upg);
      });
    }
    content.appendChild(card);
  });
}
