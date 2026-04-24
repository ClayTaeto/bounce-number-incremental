const CHALLENGES = [
  {
    id: 'speed_run',
    name: 'Speed Runner',
    description: 'Earn $1,000,000 within 5 minutes of starting a fresh run.',
    difficulty: 'Medium',
    reward: { type: 'lightFragments', amount: 5, description: '+5 Light Fragments' },
    checkCompletion: (state, game, elapsed) => state.money.gte(1e6) && elapsed <= 300,
    expiresAfter: 300,
  },
  {
    id: 'no_merges',
    name: 'Pure Numbers',
    description: 'Earn $10,000 without merging any numbers.',
    difficulty: 'Easy',
    reward: { type: 'primeShards', amount: 1, description: '+1 Prime Shard' },
    checkCompletion: (state, game) => state.money.gte(10000) && !game._challengesMergedThisRun,
  },
  {
    id: 'slow_ball',
    name: 'Slow and Steady',
    description: 'Keep all balls under 50% Lightspeed threshold for 30 consecutive seconds.',
    difficulty: 'Easy',
    reward: { type: 'lightFragments', amount: 3, description: '+3 Light Fragments' },
    checkCompletion: (state, game) => game._slowBallTimer >= 30,
  },
  {
    id: 'high_combo',
    name: 'Combo Master',
    description: 'Reach a combo multiplier of x10 (200+ hits in 3 seconds).',
    difficulty: 'Hard',
    reward: { type: 'primeShards', amount: 3, description: '+3 Prime Shards' },
    checkCompletion: (state) => state._comboMult >= 10,
  },
  {
    id: 'tier_rush',
    name: 'Tier Rush',
    description: 'Reach tier 512K (tier index 19) for the first time.',
    difficulty: 'Hard',
    reward: { type: 'lightFragments', amount: 10, description: '+10 Light Fragments' },
    checkCompletion: (state) => state.highestTier >= 19,
  },
  {
    id: 'light_collector',
    name: 'Light Collector',
    description: 'Collect 50 Light Fragments in a single run.',
    difficulty: 'Medium',
    reward: { type: 'primeShards', amount: 2, description: '+2 Prime Shards' },
    checkCompletion: (state) => state.lightFragments.gte(50),
  },
  {
    id: 'wall_hitter',
    name: 'Wall Hitter',
    description: 'Hit walls 10,000 times total.',
    difficulty: 'Easy',
    reward: { type: 'lightFragments', amount: 2, description: '+2 Light Fragments' },
    checkCompletion: (state) => state.wallHits >= 10000,
  },
  {
    id: 'prestige_5',
    name: 'Seasoned Prestige',
    description: 'Prestige 5 times.',
    difficulty: 'Medium',
    reward: { type: 'primeShards', amount: 5, description: '+5 Prime Shards' },
    checkCompletion: (state) => state.prestige >= 5,
  },
  {
    id: 'no_upgrades',
    name: 'Bare Knuckle',
    description: 'Earn $100,000 without purchasing any upgrades.',
    difficulty: 'Medium',
    reward: { type: 'lightFragments', amount: 8, description: '+8 Light Fragments' },
    checkCompletion: (state) => state.money.gte(100000) && Object.keys(state.upgrades).length === 0,
  },
  {
    id: 'max_capacity',
    name: 'Full House',
    description: 'Have the arena at full capacity for 60 consecutive seconds.',
    difficulty: 'Hard',
    reward: { type: 'primeShards', amount: 4, description: '+4 Prime Shards' },
    checkCompletion: (state, game) => game._fullHouseTimer >= 60,
  },
];

class ChallengeSystem {
  constructor() {
    this.completedIds = new Set();
    const saved = localStorage.getItem('bounceNumbers_challenges');
    if (saved) {
      try {
        JSON.parse(saved).forEach(id => this.completedIds.add(id));
      } catch (e) {
        console.warn('Failed to load challenge save:', e);
      }
    }
  }

  getCompleted() { return [...this.completedIds]; }

  isCompleted(id) { return this.completedIds.has(id); }

  check(state, game) {
    for (const ch of CHALLENGES) {
      if (this.completedIds.has(ch.id)) continue;
      const elapsed = ch.expiresAfter
        ? (Date.now() - (game._challengeStartTime || Date.now())) / 1000
        : Infinity;
      if (ch.expiresAfter && elapsed > ch.expiresAfter) continue;
      if (ch.checkCompletion(state, game, elapsed)) {
        this._complete(ch, state, game);
      }
    }
  }

  _complete(ch, state, game) {
    this.completedIds.add(ch.id);
    localStorage.setItem('bounceNumbers_challenges', JSON.stringify([...this.completedIds]));
    if (ch.reward.type === 'lightFragments') {
      state.lightFragments = state.lightFragments.add(ch.reward.amount);
    } else if (ch.reward.type === 'primeShards') {
      state.primeShards = state.primeShards.add(ch.reward.amount);
    } else if (ch.reward.type === 'money') {
      state.money = state.money.add(ch.reward.amount);
    }
    this._showNotification(ch);
    if (game._renderUpgradeCards) game._renderUpgradeCards();
    if (window.saveGame) saveGame(state, game.canvas.width, game.canvas.height);
  }

  _showNotification(ch) {
    const el = document.getElementById('challenge-notif');
    if (!el) return;
    el.textContent = '✓ Challenge: "' + ch.name + '" — ' + ch.reward.description;
    el.style.display = 'block';
    clearTimeout(this._notifTimeout);
    this._notifTimeout = setTimeout(() => { el.style.display = 'none'; }, 4000);
  }
}

window.ChallengeSystem = ChallengeSystem;
window.CHALLENGES = CHALLENGES;
