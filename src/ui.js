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
  const tabs = ['All', ...visibleTabs];

  // Reset current tab if it became hidden
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
    const isShard = upg.currency === 'primeShards';
    const isInf = upg.infinityPersistent;

    const card = document.createElement('div');
    card.className = 'upgrade-card'
      + (affordable ? ' affordable' : '')
      + (maxed ? ' maxed' : '')
      + (isLF ? ' lf-card' : '')
      + (isShard ? ' shard-card' : '')
      + (isInf ? ' inf-card' : '');

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
      <div class="upg-cost">${maxed ? '✓ MAX' : (isLF ? '⚡' : isShard ? '◆' : isInf ? '∞' : '$') + formatMoney(cost)}</div>
    `;
    if (!maxed) {
      card.addEventListener('click', () => {
        if (purchaseUpgrade(upg, game.state)) game.onUpgradePurchased(upg);
      });
    }
    content.appendChild(card);
  });
}
