// unlockCondition(state) → true when the upgrade should first appear in the shop
const UPGRADES = [
  // ── Prestige upgrades — purchasable with Prime Shards ───────────────────────
  {
    id: 'prestigeIncome', tab: 'Prestige',
    name: 'Prestige Income', desc: '+10% global income per level',
    maxLevel: 10, baseCost: 1, costMult: 2,
    persistent: true, currency: 'primeShards',
    effect: l => l > 0 ? `+${l * 10}% income` : '+10% income/level',
    unlockCondition: s => s.prestige >= 1,
  },
  {
    id: 'prestigeSpeed', tab: 'Prestige',
    name: 'Prestige Speed', desc: '+10 base speed per level',
    maxLevel: 5, baseCost: 2, costMult: 3,
    persistent: true, currency: 'primeShards',
    effect: l => l > 0 ? `+${l * 10} base speed` : '+10 speed/level',
    unlockCondition: s => s.prestige >= 1,
  },
  {
    id: 'prestigeCapacity', tab: 'Prestige',
    name: 'Prestige Capacity', desc: '+3 ball capacity per level',
    maxLevel: 5, baseCost: 2, costMult: 3,
    persistent: true, currency: 'primeShards',
    effect: l => l > 0 ? `+${l * 3} capacity` : '+3 capacity/level',
    unlockCondition: s => s.prestige >= 1,
  },
  {
    id: 'prestigeStartBalls', tab: 'Prestige',
    name: 'Head Start', desc: 'Start each prestige with extra free balls',
    maxLevel: 5, baseCost: 5, costMult: 4,
    persistent: true, currency: 'primeShards',
    effect: l => l > 0 ? `+${l} starting ball(s)` : '+1 starting ball/level',
    unlockCondition: s => s.prestige >= 1,
  },
  {
    id: 'prestigeFragBonus', tab: 'Prestige',
    name: 'Frag Amplifier', desc: '+20% Light Fragment gain per level',
    maxLevel: 5, baseCost: 3, costMult: 3,
    persistent: true, currency: 'primeShards',
    effect: l => l > 0 ? `+${l * 20}% frag yield` : '+20% frags/level',
    unlockCondition: s => s.prestige >= 1,
  },
  {
    id: 'prestigeComboDecay', tab: 'Prestige',
    name: 'Combo Extension', desc: 'Combo window extended by +0.5s per level',
    maxLevel: 5, baseCost: 4, costMult: 3,
    persistent: true, currency: 'primeShards',
    effect: l => l > 0 ? `+${(l * 0.5).toFixed(1)}s combo window` : '+0.5s combo/level',
    unlockCondition: s => s.prestige >= 2,
  },
  {
    id: 'prestigeCritMult', tab: 'Prestige',
    name: 'Crit Power', desc: 'Crit payout multiplier +2x per level',
    maxLevel: 5, baseCost: 5, costMult: 4,
    persistent: true, currency: 'primeShards',
    effect: l => `${10 + l * 2}x crit multiplier`,
    unlockCondition: s => s.prestige >= 3,
  },
  {
    id: 'prestigeMergePower', tab: 'Prestige',
    name: 'Merge Power', desc: '+5% merge payout bonus per level',
    maxLevel: 5, baseCost: 3, costMult: 3,
    persistent: true, currency: 'primeShards',
    effect: l => l > 0 ? `+${l * 5}% merge payout` : '+5% merge/level',
    unlockCondition: s => s.prestige >= 1,
  },
  {
    id: 'prestigeWallBase', tab: 'Prestige',
    name: 'Wall Resonance', desc: 'All walls get +0.2 base multiplier per level',
    maxLevel: 5, baseCost: 8, costMult: 5,
    persistent: true, currency: 'primeShards',
    effect: l => l > 0 ? `+${(l * 0.2).toFixed(1)} wall base mult` : '+0.2 wall mult/level',
    unlockCondition: s => s.prestige >= 5,
  },
  {
    id: 'prestigeAutoSpeed', tab: 'Prestige',
    name: 'Auto Accelerator', desc: 'Auto-printer fires +0.5/sec per level',
    maxLevel: 5, baseCost: 6, costMult: 4,
    persistent: true, currency: 'primeShards',
    effect: l => l > 0 ? `+${(l * 0.5).toFixed(1)} auto-add/sec` : '+0.5 auto-add rate/level',
    unlockCondition: s => s.prestige >= 3,
  },

  // ── Infinity upgrades — purchasable with Infinity Points ────────────────────
  {
    id: 'infIncome', tab: 'Infinity',
    name: 'Infinite Income', desc: 'x2 global income multiplier per level',
    maxLevel: 5, baseCost: 1, costMult: 5,
    infinityPersistent: true, currency: 'infinityPoints',
    effect: l => l > 0 ? `x${Math.pow(2, l)} global income` : 'x2 income/level',
    unlockCondition: s => s.infinityPrestige >= 1,
  },
  {
    id: 'infSpeed', tab: 'Infinity',
    name: 'Infinite Speed', desc: '+50 base speed per level',
    maxLevel: 5, baseCost: 1, costMult: 4,
    infinityPersistent: true, currency: 'infinityPoints',
    effect: l => l > 0 ? `+${l * 50} base speed` : '+50 speed/level',
    unlockCondition: s => s.infinityPrestige >= 1,
  },
  {
    id: 'infCapacity', tab: 'Infinity',
    name: 'Infinite Space', desc: '+10 capacity per level',
    maxLevel: 5, baseCost: 2, costMult: 5,
    infinityPersistent: true, currency: 'infinityPoints',
    effect: l => l > 0 ? `+${l * 10} capacity` : '+10 capacity/level',
    unlockCondition: s => s.infinityPrestige >= 1,
  },
  {
    id: 'infFragYield', tab: 'Infinity',
    name: 'Infinite Fragments', desc: '+100% fragment yield per level',
    maxLevel: 5, baseCost: 2, costMult: 4,
    infinityPersistent: true, currency: 'infinityPoints',
    effect: l => l > 0 ? `+${l * 100}% frag yield` : '+100% frags/level',
    unlockCondition: s => s.infinityPrestige >= 1,
  },
  {
    id: 'infAutoMerge', tab: 'Infinity',
    name: 'Infinite Merge', desc: 'Auto-merge fires per second',
    maxLevel: 5, baseCost: 3, costMult: 5,
    infinityPersistent: true, currency: 'infinityPoints',
    effect: l => l > 0 ? `${l} auto-merge/sec` : 'Auto-merge 1/sec at L1',
    unlockCondition: s => s.infinityPrestige >= 1,
  },
  {
    id: 'infComboWindow', tab: 'Infinity',
    name: 'Infinite Combo', desc: 'Combo window +2s per level',
    maxLevel: 5, baseCost: 2, costMult: 4,
    infinityPersistent: true, currency: 'infinityPoints',
    effect: l => l > 0 ? `+${l * 2}s combo window` : '+2s combo/level',
    unlockCondition: s => s.infinityPrestige >= 1,
  },
  {
    id: 'infStartTier', tab: 'Infinity',
    name: 'Infinite Head Start', desc: 'Starting balls begin at higher tier',
    maxLevel: 5, baseCost: 5, costMult: 6,
    infinityPersistent: true, currency: 'infinityPoints',
    effect: l => l > 0 ? `Starting tier: ${l}` : 'Start at tier 1 at L1',
    unlockCondition: s => s.infinityPrestige >= 1,
  },
  {
    id: 'infPrestigeMult', tab: 'Infinity',
    name: 'Infinite Prestige', desc: 'Prime Shards earned on prestige multiplied',
    maxLevel: 5, baseCost: 4, costMult: 5,
    infinityPersistent: true, currency: 'infinityPoints',
    effect: l => l > 0 ? `x${l + 1} prestige shards` : 'x2 shards at L1',
    unlockCondition: s => s.infinityPrestige >= 1,
  },

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
  if (upg.infinityPersistent) return (state.infinityUpgrades || {})[upg.id] || 0;
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
  if (upg.infinityPersistent) {
    if (!state.infinityUpgrades) state.infinityUpgrades = {};
    state.infinityUpgrades[upg.id] = level + 1;
  } else {
    (upg.persistent ? state.permanentUpgrades : state.upgrades)[upg.id] = level + 1;
  }
  return true;
}
