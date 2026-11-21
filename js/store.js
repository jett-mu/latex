// Persistence (localStorage, always guarded) and share-link encoding.

const PREFIX = 'eqset:';

export const DEFAULT_SETTINGS = Object.freeze({
  display: true,
  fontPt: 12,
  scale: 1,
  color: '#000000',
  bgMode: 'transparent', // 'transparent' | 'color'
  bgColor: '#ffffff',
  padding: 4,
  dpi: 300,
  unit: 'pt',
  zoom: 'fit',
  paletteCat: 'structures',
});

export const DEFAULT_TEX = String.raw`x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}`;

function read(key, fallback) {
  try {
    const v = localStorage.getItem(PREFIX + key);
    return v == null ? fallback : JSON.parse(v);
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

const clamp = (n, lo, hi, d) => (Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d);
const HEX = /^#[0-9a-fA-F]{6}$/;

/** Coerce stored or user settings into valid ranges. */
export function sanitizeSettings(s) {
  const d = DEFAULT_SETTINGS;
  const o = s && typeof s === 'object' ? s : {};
  return {
    display: typeof o.display === 'boolean' ? o.display : d.display,
    fontPt: clamp(Number(o.fontPt), 1, 1000, d.fontPt),
    scale: clamp(Number(o.scale), 0.1, 50, d.scale),
    color: HEX.test(o.color) ? o.color.toLowerCase() : d.color,
    bgMode: o.bgMode === 'color' ? 'color' : 'transparent',
    bgColor: HEX.test(o.bgColor) ? o.bgColor.toLowerCase() : d.bgColor,
    padding: clamp(Number(o.padding), 0, 500, d.padding),
    dpi: clamp(Math.round(Number(o.dpi)), 36, 2400, d.dpi),
    unit: o.unit === 'px' ? 'px' : 'pt',
    zoom: o.zoom === 'fit' ? 'fit' : clamp(Number(o.zoom), 0.25, 8, 'fit'),
    paletteCat: typeof o.paletteCat === 'string' ? o.paletteCat : d.paletteCat,
  };
}

export const loadSettings = () => sanitizeSettings(read('settings', {}));
export const saveSettings = (s) => write('settings', s);
export const loadSource = () => {
  const v = read('source', null);
  return typeof v === 'string' ? v : null;
};
export const saveSource = (tex) => write('source', tex);
export const loadFileName = () => {
  const v = read('filename', '');
  return typeof v === 'string' ? v : '';
};
export const saveFileName = (n) => write('filename', n);

export function loadSaved() {
  const v = read('saved', []);
  if (!Array.isArray(v)) return [];
  return v.filter((x) => x && typeof x.tex === 'string' && typeof x.id === 'string');
}
export const storeSaved = (list) => write('saved', list);

export function loadTheme() {
  const t = read('theme', null);
  return t === 'light' || t === 'dark' ? t : null;
}
export const saveTheme = (t) => write('theme', t);

// ---- share links: #tex=<base64url(utf8)>&d=0|1 ----

export function encodeBase64Url(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeBase64Url(s) {
  const b64 = String(s).replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '==='.slice((b64.length + 3) % 4);
  const bin = atob(padded);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

export function buildShareHash(tex, display) {
  return `#tex=${encodeBase64Url(tex)}&d=${display ? 1 : 0}`;
}

/** Parse a location hash; returns null when it holds no equation. */
export function parseShareHash(hash) {
  const params = new URLSearchParams(String(hash || '').replace(/^#/, ''));
  const t = params.get('tex');
  if (t == null) return null;
  try {
    const tex = decodeBase64Url(t);
    const d = params.get('d');
    return { tex, display: d == null ? null : d !== '0' };
  } catch {
    return null;
  }
}
