const ACHIEVEMENTS = [
  // First actions
  { id: 'first_ball', name: 'Getting Started', desc: 'Add your first number to the arena.', icon: '1️⃣',
    check: s => s.numbersAdded >= 1 },
  { id: 'first_earn', name: 'First Dollar', desc: 'Earn your first dollar.', icon: '💵',
    check: s => s.lifetimeMoney && s.lifetimeMoney.gte(1) },
  { id: 'first_merge', name: 'Two Become One', desc: 'Merge two numbers for the first time.', icon: '🔀',
    check: s => s.highestTier >= 1 },
  { id: 'first_lightspeed', name: 'Breaking the Limit', desc: 'Send your first number to Lightspeed.', icon: '⚡',
    check: s => s.lightFragments && s.lightFragments.gte(1) },
  { id: 'first_prestige', name: 'Fresh Start', desc: 'Prestige for the first time.', icon: '✨',
    check: s => s.prestige >= 1 },

  // Money milestones
  { id: 'earn_1k', name: 'Thousandaire', desc: 'Earn $1,000 lifetime.', icon: '💰',
    check: s => s.lifetimeMoney && s.lifetimeMoney.gte(1000) },
  { id: 'earn_1m', name: 'Millionaire', desc: 'Earn $1,000,000 lifetime.', icon: '🤑',
    check: s => s.lifetimeMoney && s.lifetimeMoney.gte(1e6) },
  { id: 'earn_1b', name: 'Billionaire', desc: 'Earn $1,000,000,000 lifetime.', icon: '🏦',
    check: s => s.lifetimeMoney && s.lifetimeMoney.gte(1e9) },
  { id: 'earn_1t', name: 'Trillionaire', desc: 'Earn $1,000,000,000,000 lifetime.', icon: '🌌',
    check: s => s.lifetimeMoney && s.lifetimeMoney.gte(1e12) },

  // Tier milestones
  { id: 'tier_8', name: 'Growing Strong', desc: 'Reach tier 8.', icon: '🔢',
    check: s => s.highestTier >= 3 },
  { id: 'tier_128', name: 'Big Numbers', desc: 'Reach tier 128.', icon: '📈',
    check: s => s.highestTier >= 7 },
  { id: 'tier_1k', name: 'Four Digits', desc: 'Reach tier 1K.', icon: '🔭',
    check: s => s.highestTier >= 10 },
  { id: 'tier_512k', name: 'Astronomical', desc: 'Reach tier 512K.', icon: '🌠',
    check: s => s.highestTier >= 19 },

  // Activity milestones
  { id: 'wall_hits_100', name: 'Bouncing Away', desc: 'Hit walls 100 times.', icon: '🏓',
    check: s => s.wallHits >= 100 },
  { id: 'wall_hits_10k', name: 'Wall Destroyer', desc: 'Hit walls 10,000 times.', icon: '💥',
    check: s => s.wallHits >= 10000 },
  { id: 'combo_master', name: 'Combo King', desc: 'Achieve a x3.0 combo multiplier.', icon: '🔥',
    check: s => s._comboMult >= 3 },
  { id: 'max_combo', name: 'Unstoppable', desc: 'Achieve the maximum x10 combo multiplier.', icon: '⚡',
    check: s => s._comboMult >= 10 },
  { id: 'fragments_50', name: 'Light Hoarder', desc: 'Accumulate 50 Light Fragments.', icon: '💎',
    check: s => s.lightFragments && s.lightFragments.gte(50) },
  { id: 'prestige_3', name: 'Cycle Master', desc: 'Prestige 3 times.', icon: '🔄',
    check: s => s.prestige >= 3 },
  { id: 'prestige_10', name: 'Veteran', desc: 'Prestige 10 times.', icon: '🏆',
    check: s => s.prestige >= 10 },
];

class AchievementSystem {
  constructor() {
    this.unlockedIds = new Set();
    this._notifTimeout = null;
    this._loadFromStorage();
  }

  _loadFromStorage() {
    try {
      const raw = localStorage.getItem('bounceNumbers_achievements');
      if (raw) JSON.parse(raw).forEach(id => this.unlockedIds.add(id));
    } catch(e) {}
  }

  _save() {
    localStorage.setItem('bounceNumbers_achievements', JSON.stringify([...this.unlockedIds]));
  }

  check(state) {
    for (const ach of ACHIEVEMENTS) {
      if (this.unlockedIds.has(ach.id)) continue;
      if (ach.check(state)) {
        this._unlock(ach);
      }
    }
  }

  _unlock(ach) {
    this.unlockedIds.add(ach.id);
    this._save();
    this._showNotification(ach);
  }

  _showNotification(ach) {
    const el = document.getElementById('achievement-notif');
    if (!el) return;
    document.getElementById('achievement-notif-icon').textContent = ach.icon;
    document.getElementById('achievement-notif-name').textContent = ach.name;
    document.getElementById('achievement-notif-desc').textContent = ach.desc;
    el.style.display = 'flex';
    el.style.animation = 'achievement-slide-in 0.3s ease-out';
    clearTimeout(this._notifTimeout);
    this._notifTimeout = setTimeout(() => {
      el.style.animation = 'achievement-slide-out 0.3s ease-in';
      setTimeout(() => el.style.display = 'none', 300);
    }, 3500);
  }

  isUnlocked(id) { return this.unlockedIds.has(id); }
  getAll() { return ACHIEVEMENTS; }
  getUnlocked() { return ACHIEVEMENTS.filter(a => this.unlockedIds.has(a.id)); }
}

window.AchievementSystem = AchievementSystem;
window.ACHIEVEMENTS = ACHIEVEMENTS;
