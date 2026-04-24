// unlockCondition(state) → true when the upgrade should first appear in the shop
const UPGRADES = [
  // ── Visible from the start ──────────────────────────────────────────────────
  {
    id: 'quickFingers', tab: 'Add',
    name: 'Quick Fingers', desc: 'Hold Add fires faster',
    maxLevel: 5, baseCost: 50, costMult: 2.5,
    effect: l => l > 0 ? `+${l * 3} adds/sec on hold` : 'Faster hold-add',
    unlockCondition: () => true,
  },
  {
    id: 'leftWall', tab: 'Walls',
    name: 'Left Wall Power', desc: 'Left wall income multiplier',
    maxLevel: 10, baseCost: 30, costMult: 2,
    effect: l => `x${(1 + l * 0.5).toFixed(1)} mult`,
    unlockCondition: () => true,
  },
  {
    id: 'rightWall', tab: 'Walls',
    name: 'Right Wall Power', desc: 'Right wall income multiplier',
    maxLevel: 10, baseCost: 30, costMult: 2,
    effect: l => `x${(1 + l * 0.5).toFixed(1)} mult`,
    unlockCondition: () => true,
  },

  // ── Unlock after first merge (first 2) ──────────────────────────────────────
  {
    id: 'quickMerge', tab: 'Merge',
    name: 'Quick Merge', desc: 'Hold Merge fires faster',
    maxLevel: 5, baseCost: 80, costMult: 2.5,
    effect: l => l > 0 ? `+${l * 2} merges/sec on hold` : 'Faster hold-merge',
    unlockCondition: s => s.highestTier >= 1,
  },

  // ── Unlock after first 8 ────────────────────────────────────────────────────
  {
    id: 'cheapNumbers', tab: 'Add',
    name: 'Cheap Numbers', desc: 'Reduces Add 1 cost',
    maxLevel: 5, baseCost: 80, costMult: 3,
    effect: l => l > 0 ? `-${l * 8}% add cost` : 'Cheaper Add 1',
    unlockCondition: s => s.highestTier >= 3,  // tier 3 = value 8
  },
  {
    id: 'speedUp', tab: 'Numbers',
    name: 'Speed Boost', desc: 'All balls move faster',
    maxLevel: 8, baseCost: 200, costMult: 2.2,
    effect: l => `Speed: ${BASE_SPEED + l * 20} (canonical)`,
    unlockCondition: s => s.highestTier >= 3,
  },

  // ── Unlock after first 32 ───────────────────────────────────────────────────
  {
    id: 'moreCapacity', tab: 'Numbers',
    name: 'Expand Arena', desc: '+5 ball slots per level',
    maxLevel: 8, baseCost: 500, costMult: 2.5,
    effect: l => `Capacity: ${BASE_CAPACITY + l * 5}`,
    unlockCondition: s => s.highestTier >= 5,  // tier 5 = value 32
  },
  {
    id: 'critChance', tab: 'Walls',
    name: 'Critical Hit', desc: '10× payout chance on wall hit',
    maxLevel: 5, baseCost: 350, costMult: 3,
    effect: l => l > 0 ? `${l * 5}% crit chance` : 'Random big payouts',
    unlockCondition: s => s.highestTier >= 5,
  },

  // ── Unlock after first 128 ──────────────────────────────────────────────────
  {
    id: 'mergePayout', tab: 'Merge',
    name: 'Merge Payout', desc: 'Each merge generates bonus money',
    maxLevel: 5, baseCost: 1000, costMult: 3,
    effect: l => l > 0 ? `${l * 10}% of merge value` : 'Money on every merge',
    unlockCondition: s => s.highestTier >= 7,  // tier 7 = value 128
  },
  {
    id: 'autoPrinter', tab: 'Add',
    name: 'Auto Printer', desc: 'Automatically adds 1s when affordable',
    maxLevel: 3, baseCost: 2000, costMult: 8,
    effect: l => l > 0 ? `${l} auto-add/sec` : 'Hands-free adding',
    unlockCondition: s => s.highestTier >= 7,
  },

  // ── Lightspeed upgrades — unlock after first Light Fragment ─────────────────
  {
    id: 'lsBuffer', tab: 'Lightspeed',
    name: 'LS Buffer', desc: 'Raises the Lightspeed threshold',
    maxLevel: 10, baseCost: 1, costMult: 2,
    persistent: true, currency: 'lightFragments',
    effect: l => `Threshold: ${LIGHTSPEED_BASE + l * 50} (canonical)`,
    unlockCondition: s => s.lightFragments.gte(1),
  },
  {
    id: 'fragBoost', tab: 'Lightspeed',
    name: 'Fragment Yield', desc: 'More Light Fragments per conversion',
    maxLevel: 5, baseCost: 3, costMult: 2.5,
    persistent: true, currency: 'lightFragments',
    effect: l => l > 0 ? `+${l * 25}% fragment yield` : 'Bonus Light Frags',
    unlockCondition: s => s.lightFragments.gte(3),
  },
];

function getVisibleUpgrades(state, tabFilter) {
  return UPGRADES.filter(u => {
    if (!u.unlockCondition(state)) return false;
    if (tabFilter && tabFilter !== 'All') return u.tab === tabFilter;
    return true;
  });
}

function getUpgradeCost(upg, level) {
  return new Decimal(upg.baseCost * Math.pow(upg.costMult, level));
}

function getUpgradeLevel(upg, state) {
  return (upg.persistent ? state.permanentUpgrades : state.upgrades)[upg.id] || 0;
}

function canAffordUpgrade(upg, state) {
  const level = getUpgradeLevel(upg, state);
  if (level >= upg.maxLevel) return false;
  return state[upg.currency || 'money'].gte(getUpgradeCost(upg, level));
}

function purchaseUpgrade(upg, state) {
  const level = getUpgradeLevel(upg, state);
  if (level >= upg.maxLevel) return false;
  const cost = getUpgradeCost(upg, level);
  const cur = upg.currency || 'money';
  if (!state[cur].gte(cost)) return false;
  state[cur] = state[cur].sub(cost);
  (upg.persistent ? state.permanentUpgrades : state.upgrades)[upg.id] = level + 1;
  return true;
}
