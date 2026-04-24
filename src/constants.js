const TIERS = [
  { label: '1',    color: '#e8e8ff' },
  { label: '2',    color: '#70b8ff' },
  { label: '4',    color: '#50ff80' },
  { label: '8',    color: '#ffe030' },
  { label: '16',   color: '#ff9040' },
  { label: '32',   color: '#ff4040' },
  { label: '64',   color: '#cc70ff' },
  { label: '128',  color: '#00e5ff' },
  { label: '256',  color: '#ff80c0' },
  { label: '512',  color: '#80ffb0' },
  { label: '1K',   color: '#ffd740' },
  { label: '2K',   color: '#ff7000' },
  { label: '4K',   color: '#df80ff' },
  { label: '8K',   color: '#40d0ff' },
  { label: '16K',  color: '#ff2050' },
  { label: '32K',  color: '#00f070' },
  { label: '64K',  color: '#ffff60' },
  { label: '128K', color: '#6080ff' },
  { label: '256K', color: '#ff9060' },
  { label: '512K', color: '#90c0ff' },
];

function getTierInfo(tierIndex) {
  if (tierIndex < TIERS.length) return TIERS[tierIndex];
  const base = TIERS[tierIndex % TIERS.length];
  const val = Math.pow(2, tierIndex);
  let label;
  if (val >= 1e18) label = (val / 1e18).toFixed(0) + 'Qi';
  else if (val >= 1e15) label = (val / 1e15).toFixed(0) + 'Qa';
  else if (val >= 1e12) label = (val / 1e12).toFixed(0) + 'T';
  else if (val >= 1e9)  label = (val / 1e9).toFixed(0) + 'B';
  else if (val >= 1e6)  label = (val / 1e6).toFixed(0) + 'M';
  else if (val >= 1e3)  label = (val / 1e3).toFixed(0) + 'K';
  else label = String(val);
  return { label, color: base.color };
}

function getBallRadius(tier) {
  return Math.min(18 + Math.floor(tier * 0.7), 28);
}

function formatMoney(d) {
  const n = (typeof d === 'object' && d.toNumber) ? d.toNumber() : Number(d);
  if (!isFinite(n)) return '???';
  if (n >= 1e18) return (n / 1e18).toFixed(2) + 'Qi';
  if (n >= 1e15) return (n / 1e15).toFixed(2) + 'Qa';
  if (n >= 1e12) return (n / 1e12).toFixed(2) + 'T';
  if (n >= 1e9)  return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6)  return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3)  return (n / 1e3).toFixed(2) + 'K';
  return Math.floor(n).toString();
}

const BASE_SPEED = 180;           // px/s at REFERENCE_WIDTH
const LIGHTSPEED_BASE = 420;      // px/s at REFERENCE_WIDTH
const REFERENCE_WIDTH = 800;      // arena width that defines the "canonical" speed
const BASE_CAPACITY = 20;
const BASE_ADD_COST = 5;
const ADD_COST_GROWTH = 1.08;

const ADD_RAMP = [
  { until: 500,      rate: 4 },
  { until: 2000,     rate: 8 },
  { until: 5000,     rate: 15 },
  { until: Infinity, rate: 15 },
];

const MERGE_RAMP = [
  { until: 500,      rate: 3 },
  { until: 2000,     rate: 6 },
  { until: 5000,     rate: 12 },
  { until: Infinity, rate: 12 },
];

function getRampRate(ramp, holdMs, bonus) {
  for (const step of ramp) {
    if (holdMs < step.until) return step.rate + (bonus || 0);
  }
  return ramp[ramp.length - 1].rate + (bonus || 0);
}

const ARENA_LAYOUTS = {
  classic: {
    id: 'classic', name: 'Classic Box',
    aspectRatio: 4 / 3,
    wallMults: { left: 1, right: 1, top: 1, bottom: 1 },
    speedMult: 1,
    description: 'Standard arena. Balanced.',
  },
  pinball: {
    id: 'pinball', name: 'Pinball Table',
    aspectRatio: 2 / 3,
    wallMults: { left: 0.3, right: 0.3, top: 2, bottom: 2 },
    speedMult: 1.1,
    description: 'Tall narrow arena. Top/bottom walls are strong.',
  },
  hallway: {
    id: 'hallway', name: 'Long Hallway',
    aspectRatio: 8 / 3,
    wallMults: { left: 3, right: 3, top: 0.5, bottom: 0.5 },
    speedMult: 1.2,
    description: 'Wide flat arena. Side walls pay out big.',
  },
};
