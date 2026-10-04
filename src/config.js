export const LEAVES = {
  count: 1800,
  scale: [0.08, 0.26],
  pivot: [0.5, 0],
  spread: 0.25,
  awayBias: 0.3,
  brightness: [0.6, 1.1],
  fold: 0.1,
};

export const FALLING = {
  poolSize: 16,
  interval: [3, 5],
  perSpawn: [1, 2],
  speed: [0.5, 0.9],
  groundY: 0.05,
  easeIn: 0.8,
};

export const GROUND_LEAVES = {
  count: 120,
  scale: [0.1, 0.24],
  brightness: [0.22, 0.5],
  margin: 0.55,
};

export const GROUND_FADE = {
  start: 0.55,
  end: 0.97,
  snowMaxY: 0.4,
};

export const TRANSITION = {
  shedDuration: 1.4,
};

export const SEASONS = {
  spring: {
    tone: { hue: 96 / 360, blend: 0.9, saturation: 1, value: 0.85, scale: 0.45, density: 0.35 },
    ground: { hue: 85 / 360, blend: 0.75, saturation: 0.9, value: 0.62 },
    light: { environment: 0.25, background: 0.1 },
    crown: true, falling: false, litter: false, snow: false, regrow: true,
  },
  summer: {
    tone: { hue: 118 / 360, blend: 0.88, saturation: 0.92, value: 0.66, scale: 1, density: 1 },
    ground: { hue: 100 / 360, blend: 0.8, saturation: 0.85, value: 0.46 },
    light: { environment: 0.35, background: 0.15 },
    crown: true, falling: false, litter: false, snow: false, regrow: true,
  },
  autumn: {
    tone: { hue: 118 / 360, blend: 0, saturation: 1, value: 1, scale: 1, density: 1 },
    ground: { hue: 100 / 360, blend: 0, saturation: 1.2, value: 0.62 },
    light: { environment: 0.2, background: 0.05 },
    crown: true, falling: true, litter: true, snow: false,
  },
  winter: {
    light: { environment: 0.17, background: 0.05 },
    crown: false, falling: false, litter: false, snow: true,
  },
};

const params = new URLSearchParams(window.location.search);

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const MAX_TIME_SCALE = 100;
const MAX_ORBIT_SPEED = 10;

const fast = params.get('fast');
const requestedTimeScale = fast === null ? 1 : Number(fast) || 60;

export const TIME_SCALE = clamp(requestedTimeScale, 1, MAX_TIME_SCALE);

const orbit = params.get('orbit');
const requestedOrbitSpeed = orbit === null ? 0 : orbit === '' ? 1 : Number(orbit);

export const ORBIT_SPEED = Number.isNaN(requestedOrbitSpeed) ? 1 : clamp(requestedOrbitSpeed, 0, MAX_ORBIT_SPEED);
