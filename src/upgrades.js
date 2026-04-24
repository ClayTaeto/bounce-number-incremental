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
  {
    id: 'topWall', tab: 'Walls',
    name: 'Top Wall Power', desc: 'Top wall income multiplier',
    maxLevel: 10, baseCost: 30, costMult: 2,
    effect: l => `x${(1 + l * 0.5).toFixed(1)} mult`,
    unlockCondition: () => true,
  },
  {
    id: 'bottomWall', tab: 'Walls',
    name: 'Bottom Wall Power', desc: 'Bottom wall income multiplier',
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
  {
    id: 'bumperUpgrade', tab: 'Walls',
    name: 'Bumpers', desc: 'Add circular bumpers that pay bonus money on hit',
    maxLevel: 5, baseCost: 400, costMult: 3,
    effect: l => {
      const counts = [0, 2, 2, 3, 4, 4];
      return l > 0 ? `${counts[l]} bumpers, x${(0.5 + l * 0.5).toFixed(1)} payout` : 'Place bumpers in arena';
    },
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

  // ── Arena layout unlocks — require prestige ─────────────────────────────────
  {
    id: 'unlockPinball', tab: 'Arena',
    name: 'Pinball Table', desc: 'Unlock the tall narrow Pinball arena layout',
    maxLevel: 1, baseCost: 500, costMult: 1,
    persistent: true, currency: 'primeShards',
    effect: l => l > 0 ? 'Unlocked' : 'Unlock Pinball layout',
    unlockCondition: s => s.prestige >= 1,
  },
  {
    id: 'unlockHallway', tab: 'Arena',
    name: 'Long Hallway', desc: 'Unlock the wide horizontal Hallway arena layout',
    maxLevel: 1, baseCost: 500, costMult: 1,
    persistent: true, currency: 'primeShards',
    effect: l => l > 0 ? 'Unlocked' : 'Unlock Hallway layout',
    unlockCondition: s => s.prestige >= 2,
  },

  // ── Add tab extras ───────────────────────────────────────────────────────────
  {
    id: 'holdBoost', tab: 'Add',
    name: 'Hold Multiplier', desc: 'Hold Add for a 3s income boost',
    maxLevel: 5, baseCost: 150, costMult: 2.5,
    effect: l => l > 0 ? `+${l * 5}% income for 3s after adding` : 'Income boost on hold-add',
    unlockCondition: s => s.highestTier >= 2,
  },
  {
    id: 'massProduction', tab: 'Add',
    name: 'Mass Production', desc: 'Each ball adds +1% income bonus per level',
    maxLevel: 5, baseCost: 400, costMult: 3,
    effect: l => l > 0 ? `+${l}% income per ball in arena` : 'More balls = more money',
    unlockCondition: s => s.highestTier >= 4,
  },
  {
    id: 'bulkAdder', tab: 'Add',
    name: 'Bulk Add', desc: 'Adds extra free balls when Add is clicked',
    maxLevel: 5, baseCost: 300, costMult: 4,
    effect: l => l > 0 ? `+${l} free balls per add` : 'Spawn extra balls on add',
    unlockCondition: s => s.highestTier >= 5,
  },

  // ── Merge tab extras ─────────────────────────────────────────────────────────
  {
    id: 'chainMerge', tab: 'Merge',
    name: 'Chain Merge', desc: 'First merge after a merge is free and instant',
    maxLevel: 3, baseCost: 500, costMult: 4,
    effect: l => l > 0 ? `Free merge window: ${l}s` : 'Chain merges together',
    unlockCondition: s => s.highestTier >= 3,
  },
  {
    id: 'mergeCombo', tab: 'Merge',
    name: 'Merge Combo', desc: 'Consecutive merges increase merge payout',
    maxLevel: 5, baseCost: 600, costMult: 3,
    effect: l => l > 0 ? `+${l * 10}% per merge in 3s window` : 'Combo merge payouts',
    unlockCondition: s => s.highestTier >= 4,
  },
  {
    id: 'megaMerge', tab: 'Merge',
    name: 'Mega Merge', desc: 'Chance to merge 4 balls into tier+2',
    maxLevel: 4, baseCost: 2000, costMult: 5,
    effect: l => l > 0 ? `${l * 5}% chance for 4→1 merge` : 'Merge 4 into tier+2',
    unlockCondition: s => s.highestTier >= 7,
  },
  {
    id: 'splitMerge', tab: 'Merge',
    name: 'Bonus Split', desc: 'High-tier merges may spawn a free tier-0 ball',
    maxLevel: 4, baseCost: 1500, costMult: 4,
    effect: l => l > 0 ? `${l * 25}% chance to spawn tier-0 on merge (tier>=10)` : 'Bonus ball on big merges',
    unlockCondition: s => s.highestTier >= 10,
  },

  // ── Numbers tab extras ───────────────────────────────────────────────────────
  {
    id: 'ballMagnet', tab: 'Numbers',
    name: 'Ball Magnet', desc: 'Slow balls drift toward the center',
    maxLevel: 3, baseCost: 350, costMult: 3,
    effect: l => l > 0 ? `Center pull at <60% speed (x${l})` : 'Slow balls gravitate to center',
    unlockCondition: s => s.highestTier >= 4,
  },
  {
    id: 'speedRamp', tab: 'Numbers',
    name: 'Speed Ramp', desc: 'Balls gradually accelerate over time',
    maxLevel: 5, baseCost: 250, costMult: 2.5,
    effect: l => l > 0 ? `Ramp to ${100 + l * 10}% base speed` : 'Balls slowly speed up',
    unlockCondition: s => s.highestTier >= 3,
  },
  {
    id: 'elasticBounce', tab: 'Numbers',
    name: 'Elastic Bounce', desc: 'Wall bounces preserve extra speed',
    maxLevel: 5, baseCost: 400, costMult: 3,
    effect: l => l > 0 ? `+${l * 5}% speed on each wall hit` : 'Bouncy walls',
    unlockCondition: s => s.highestTier >= 5,
  },
  {
    id: 'traitChance', tab: 'Numbers',
    name: 'Trait Spawn', desc: 'New balls may spawn with special traits',
    maxLevel: 5, baseCost: 800, costMult: 3,
    effect: l => l > 0 ? `${l * 5}% chance for trait on spawn` : 'Enable trait balls',
    unlockCondition: s => s.highestTier >= 6,
  },

  // ── Walls tab extras ─────────────────────────────────────────────────────────
  {
    id: 'wallSynergy', tab: 'Walls',
    name: 'Wall Synergy', desc: 'Left/right multipliers also boost top/bottom',
    maxLevel: 1, baseCost: 1200, costMult: 1,
    effect: l => l > 0 ? 'Top/bottom get 50% of L/R mult bonus' : 'Synergize wall multipliers',
    unlockCondition: s => s.highestTier >= 6,
  },
  {
    id: 'critCombo', tab: 'Walls',
    name: 'Crit Combo', desc: 'Critical hits also apply the combo multiplier',
    maxLevel: 1, baseCost: 800, costMult: 1,
    effect: l => l > 0 ? 'Crits × combo multiplier' : 'Combo-boosted crits',
    unlockCondition: s => s.highestTier >= 8,
  },
  {
    id: 'wallMemory', tab: 'Walls',
    name: 'Wall Memory', desc: 'Unique wall hits in 5s add income bonus',
    maxLevel: 5, baseCost: 700, costMult: 3,
    effect: l => l > 0 ? `+${l * 5}% per unique wall hit in 5s` : 'Reward hitting all walls',
    unlockCondition: s => s.highestTier >= 6,
  },
  {
    id: 'richWalls', tab: 'Walls',
    name: 'Rich Walls', desc: 'Current money boosts wall payout',
    maxLevel: 5, baseCost: 1000, costMult: 3.5,
    effect: l => l > 0 ? `+${l}% per $1000 held, cap 50%` : 'Wealth feeds income',
    unlockCondition: s => s.highestTier >= 8,
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
  {
    id: 'lightShard', tab: 'Lightspeed',
    name: 'Light Shard Multiplier', desc: 'Multiplies Light Fragment value for prestige',
    maxLevel: 5, baseCost: 5, costMult: 3,
    persistent: true, currency: 'lightFragments',
    effect: l => l > 0 ? `Fragment value x${Math.pow(2, l).toFixed(0)}` : 'Boost fragment prestige value',
    unlockCondition: s => s.lightFragments.gte(5),
  },
  {
    id: 'speedConverter', tab: 'Lightspeed',
    name: 'Speed Converter', desc: 'Lightspeed balls also earn bonus money',
    maxLevel: 5, baseCost: 8, costMult: 3,
    persistent: true, currency: 'lightFragments',
    effect: l => l > 0 ? `Earn ${l * 10}% of ball speed as money` : 'Money from lightspeed',
    unlockCondition: s => s.lightFragments.gte(10),
  },
  {
    id: 'lsBonus', tab: 'Lightspeed',
    name: 'Lightspeed Cascade', desc: 'Lightspeed removal boosts remaining balls',
    maxLevel: 3, baseCost: 4, costMult: 3,
    persistent: true, currency: 'lightFragments',
    effect: l => l > 0 ? `+${l * 10}% speed to remaining balls on LS` : 'Cascade speed boost',
    unlockCondition: s => s.lightFragments.gte(8),
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
