function buildUpgradeTabs(game) {
  const tabs = ['All', ...new Set(UPGRADES.map(u => u.tab)), 'Achievements'];
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

function renderUpgradeCards(game) {
  const content = document.getElementById('upgrade-content');

  if (game._currentTab === 'Achievements') {
    content.innerHTML = '';
    renderAchievements(game, content);
    return;
  }

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
