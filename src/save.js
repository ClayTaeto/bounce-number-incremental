const SAVE_KEY = 'bouncingNumbers_v1';

function _hash(str) {
  let h = 0xdeadbeef;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 0x9e3779b9);
  }
  return ((h ^ (h >>> 16)) >>> 0).toString(16);
}

function saveGame(state, arenaW, arenaH) {
  try {
    const data = {
      money: state.money.toString(),
      lightFragments: state.lightFragments.toString(),
      primeShards: state.primeShards.toString(),
      lifetimeMoney: state.lifetimeMoney.toString(),
      infinityPoints: state.infinityPoints.toString(),
      numbersAdded: state.numbersAdded,
      prestige: state.prestige,
      infinityPrestige: state.infinityPrestige,
      upgrades: { ...state.upgrades },
      permanentUpgrades: { ...state.permanentUpgrades },
      infinityUpgrades: { ...state.infinityUpgrades },
      highestTier: state.highestTier,
      wallHits: state.wallHits,
      prestigeAvailable: state.prestigeAvailable,
      arenaLayout: state.arenaLayout || 'classic',
      savedArenaW: arenaW || REFERENCE_WIDTH,
      savedArenaH: arenaH || REFERENCE_WIDTH * 0.6,
      // Store positions normalized to 0-1 so they scale cleanly on load
      balls: state.balls.map(b => ({
        tier: b.tier,
        nx: b.x / (arenaW || REFERENCE_WIDTH),
        ny: b.y / (arenaH || REFERENCE_WIDTH * 0.6),
        // Store velocities normalized to REFERENCE_WIDTH so they re-scale correctly
        vx: Math.round(b.vx / ((arenaW || REFERENCE_WIDTH) / REFERENCE_WIDTH)),
        vy: Math.round(b.vy / ((arenaH || REFERENCE_WIDTH * 0.6) / (REFERENCE_WIDTH * 0.6))),
      })),
      savedAt: Date.now(),
      lastIncomePerSec: state.incomePerSec.toString(),
    };
    const content = JSON.stringify(data);
    data.checksum = _hash(content);
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Save failed:', e);
  }
}

function loadSave(state, arenaW, arenaH) {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    const { checksum, ...rest } = data;
    if (_hash(JSON.stringify(rest)) !== checksum) {
      console.warn('Checksum mismatch — possible corruption');
    }
    state.money = new Decimal(data.money || 0);
    state.lightFragments = new Decimal(data.lightFragments || 0);
    state.primeShards = new Decimal(data.primeShards || 0);
    state.lifetimeMoney = new Decimal(data.lifetimeMoney || 0);
    state.infinityPoints = new Decimal(data.infinityPoints || 0);
    state.numbersAdded = data.numbersAdded || 0;
    state.prestige = data.prestige || 0;
    state.infinityPrestige = data.infinityPrestige || 0;
    state.upgrades = data.upgrades || {};
    state.permanentUpgrades = data.permanentUpgrades || {};
    state.infinityUpgrades = data.infinityUpgrades || {};
    state.highestTier = data.highestTier || 0;
    state.wallHits = data.wallHits || 0;
    state.prestigeAvailable = data.prestigeAvailable || false;
    state.arenaLayout = data.arenaLayout || 'classic';

    // Calculate offline earnings
    const now = Date.now();
    const savedAt = data.savedAt || now;
    const elapsedMs = now - savedAt;
    const elapsedSec = Math.min(elapsedMs / 1000, 8 * 3600); // cap at 8 hours

    if (elapsedSec > 60) { // only if away for more than 1 minute
      const lastIncome = new Decimal(data.lastIncomePerSec || 0);
      if (lastIncome.gt(0)) {
        const hasAutoPrinter = (data.upgrades && data.upgrades.autoPrinter > 0);
        const efficiency = hasAutoPrinter ? 0.5 : 0.15;
        const earned = lastIncome.mul(elapsedSec).mul(efficiency);
        state.money = state.money.add(earned);
        state.lifetimeMoney = state.lifetimeMoney.add(earned);
        state._offlineEarnings = earned;
        state._offlineTime = elapsedSec;
      }
    }

    const scaleX = arenaW / REFERENCE_WIDTH;
    const scaleY = arenaH / (REFERENCE_WIDTH * 0.6);

    state.balls = (data.balls || []).map((b, i) => {
      // Support both old format (absolute x/y) and new normalized format (nx/ny)
      const x = b.nx != null ? b.nx * arenaW : Math.min(b.x || arenaW / 2, arenaW - 20);
      const y = b.ny != null ? b.ny * arenaH : Math.min(b.y || arenaH / 2, arenaH - 20);
      return {
        id: i,
        tier: b.tier || 0,
        x, y,
        vx: (b.vx || BASE_SPEED) * scaleX,
        vy: (b.vy || BASE_SPEED * 0.7) * scaleY,
        radius: getBallRadius(b.tier || 0),
        hitFlash: 0, mergeFlash: 0, popScale: 1,
        _lastHitTime: 0, _stuckTimer: 0, _remove: false,
      };
    });
    return true;
  } catch (e) {
    console.warn('Load failed:', e);
    return false;
  }
}

function clearSave() {
  localStorage.removeItem(SAVE_KEY);
}
