const SIZE = 64;
const VIEW = 512;
const DIR = '/assets/avatar/';
const SKIN_SRC = [243, 181, 110];
const PEACH = '#F3B56E';

const SRC = {
  body: 'body.png',
  hair: 'hair-green.png',
  shirt: 'shirt-black.png',
  overshirt: 'overshirt-mint.png',
  pants: 'pants-blue.png',
  shoes: 'shoes-white.png',
  string: 'string-lime.png',
  yoyo: 'yoyo-red.png',
};

const KEEP_INK = {
  hair: true,
  shirt: false,
  overshirt: true,
  pants: true,
  shoes: true,
  string: false,
  yoyo: true,
};

const LEGACY = {
  bg: { sky: '#639BB8', black: '#111111', white: '#F4F4F4', pink: '#E8A0B8', gray: '#8A8A8A', orange: '#E07A3D' },
  skin: { peach: PEACH, tan: '#C48858', deep: '#8A562E' },
  hair: { green: '#61A720', black: '#1A1A1A', brown: '#5A3820', blonde: '#D2B06A', red: '#E23B32', blue: '#2F5FA8', short: '#1A1A1A' },
  shirt: { black: '#1C1C1C', white: '#F0F0F0', red: '#E23B32', blue: '#2F5FA8', gray: '#8A8A8A' },
  overshirt: { mint: '#AAE0AE', black: '#1C1C1C', white: '#F0F0F0', red: '#E23B32', blue: '#2F5FA8', gray: '#8A8A8A' },
  pants: { blue: '#3B638D', black: '#1C1C1C', gray: '#8A8A8A', red: '#E23B32', beige: '#C4A574' },
  shoes: { white: '#F0F0F0', black: '#1C1C1C', red: '#E23B32', blue: '#2F5FA8', mint: '#AAE0AE' },
  string: { lime: '#70EA00', brown: '#6B3F1F', black: '#1A1A1A', white: '#EDEDED', red: '#E23B32' },
  yoyo: { red: '#EA0000', black: '#1C1C1C', white: '#F0F0F0', yellow: '#E6C84A', blue: '#2F5FA8' },
};

export const SLOTS = [
  { id: 'bg', optional: true, color: '#639BB8', name: 'ground' },
  { id: 'skin', optional: false, color: PEACH, name: 'skin' },
  { id: 'hair', optional: true, color: '#61A720', name: 'hair' },
  { id: 'shirt', optional: true, color: '#1C1C1C', name: 'shirt' },
  { id: 'overshirt', optional: true, color: '#AAE0AE', name: 'sweater' },
  { id: 'pants', optional: true, color: '#3B638D', name: 'pants' },
  { id: 'shoes', optional: true, color: '#F0F0F0', name: 'shoes' },
  { id: 'string', optional: true, color: '#70EA00', name: 'string' },
  { id: 'yoyo', optional: true, color: '#EA0000', name: 'yo-yo' },
];

const STACK = ['pants', 'shoes', 'shirt', 'overshirt', 'hair', 'string', 'yoyo'];
const cache = new Map();
const tinted = new Map();
let ready;

function hexToRgb(hex) {
  const n = String(hex || '').replace('#', '');
  if (n.length !== 6) return null;
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)];
}

function asHex(slotId, value) {
  if (value == null || value === 'none' || value === false) return null;
  if (typeof value === 'string' && value.charAt(0) === '#' && hexToRgb(value)) {
    return value.toUpperCase();
  }
  return LEGACY[slotId]?.[value] || null;
}

export function normalize(saved) {
  const out = {};
  for (const s of SLOTS) {
    if (!(s.id in (saved || {}))) {
      out[s.id] = s.color;
      continue;
    }
    const hex = asHex(s.id, saved[s.id]);
    out[s.id] = hex || (s.optional ? null : s.color);
  }
  return out;
}

function loadImage(src) {
  if (cache.has(src)) return cache.get(src);
  const p = new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(src));
    img.src = DIR + src;
  });
  cache.set(src, p);
  return p;
}

function preload() {
  if (!ready) ready = Promise.all(Object.values(SRC).map(loadImage));
  return ready;
}

function isSkin(r, g, b) {
  return Math.abs(r - SKIN_SRC[0]) < 28 && Math.abs(g - SKIN_SRC[1]) < 28 && Math.abs(b - SKIN_SRC[2]) < 28;
}

function isInk(r, g, b) {
  return r < 28 && g < 28 && b < 28;
}

function recolor(data, target, keepInk) {
  const d = data.data;
  let lumSum = 0;
  let lumN = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 10) continue;
    if (keepInk && isInk(d[i], d[i + 1], d[i + 2])) continue;
    lumSum += (d[i] + d[i + 1] + d[i + 2]) / 3;
    lumN += 1;
  }
  const median = lumN ? lumSum / lumN : 255;
  const flat = median < 48;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 10) continue;
    if (keepInk && isInk(d[i], d[i + 1], d[i + 2])) continue;
    if (flat) {
      d[i] = target[0];
      d[i + 1] = target[1];
      d[i + 2] = target[2];
      continue;
    }
    const k = 0.4 + 0.6 * (Math.max(d[i], d[i + 1], d[i + 2]) / 255);
    d[i] = Math.min(255, Math.round(target[0] * k));
    d[i + 1] = Math.min(255, Math.round(target[1] * k));
    d[i + 2] = Math.min(255, Math.round(target[2] * k));
  }
}

async function layerCanvas(src, hex, keepInk) {
  const key = src + '|' + hex + '|' + keepInk;
  if (tinted.has(key)) return tinted.get(key);
  const img = await loadImage(src);
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0);
  const rgb = hexToRgb(hex);
  if (rgb) {
    const data = ctx.getImageData(0, 0, SIZE, SIZE);
    recolor(data, rgb, keepInk);
    ctx.putImageData(data, 0, 0);
  }
  tinted.set(key, canvas);
  return canvas;
}

async function compose(traits) {
  await preload();
  const t = normalize(traits);
  const work = document.createElement('canvas');
  work.width = SIZE;
  work.height = SIZE;
  const wctx = work.getContext('2d');
  wctx.imageSmoothingEnabled = false;

  if (t.bg) {
    wctx.fillStyle = t.bg;
    wctx.fillRect(0, 0, SIZE, SIZE);
  }

  wctx.drawImage(await loadImage(SRC.body), 0, 0);
  if (t.skin && t.skin.toUpperCase() !== PEACH) {
    const img = wctx.getImageData(0, 0, SIZE, SIZE);
    const skin = hexToRgb(t.skin);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 10) continue;
      if (isSkin(d[i], d[i + 1], d[i + 2])) {
        d[i] = skin[0];
        d[i + 1] = skin[1];
        d[i + 2] = skin[2];
      }
    }
    wctx.putImageData(img, 0, 0);
  }

  for (const id of STACK) {
    if (!t[id]) continue;
    wctx.drawImage(await layerCanvas(SRC[id], t[id], KEEP_INK[id]), 0, 0);
  }

  return work;
}

export async function paint(canvas, traits) {
  const work = await compose(traits);
  canvas.width = VIEW;
  canvas.height = VIEW;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, VIEW, VIEW);
  ctx.drawImage(work, 0, 0, VIEW, VIEW);
}

export async function pngDataUrl(traits) {
  const work = await compose(traits);
  return work.toDataURL('image/png');
}
