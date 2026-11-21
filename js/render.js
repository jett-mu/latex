// Thin wrapper around MathJax (loaded globally from vendor/mathjax).
import { RENDER_EX_PX } from './svgExport.js';

const MJ_OPTS = { em: RENDER_EX_PX / 0.5, ex: RENDER_EX_PX, containerWidth: 80 * 16 };

/** Resolves once MathJax is ready. */
export function mathjaxReady() {
  const mj = window.MathJax;
  if (!mj || !mj.startup || !mj.startup.promise) {
    return Promise.reject(new Error('MathJax failed to load'));
  }
  return mj.startup.promise;
}

function cleanMessage(err) {
  const msg = (err && err.message) || String(err);
  return msg.replace(/\s+/g, ' ').trim();
}

/**
 * Render TeX to an SVG string.
 * @returns {{svg:string}|{error:string}|{empty:true}}
 */
export function renderTex(tex, display) {
  if (!tex || !tex.trim()) return { empty: true };
  const mj = window.MathJax;
  try {
    mj.texReset();
    const node = mj.tex2svg(tex, { display: !!display, ...MJ_OPTS });
    const svg = node.querySelector('svg');
    if (!svg) return { error: 'Nothing was rendered' };
    const err = svg.querySelector('[data-mml-node="merror"]');
    if (err) return { error: err.getAttribute('data-mjx-error') || err.textContent || 'TeX error' };
    return { svg: new XMLSerializer().serializeToString(svg) };
  } catch (e) {
    return { error: cleanMessage(e) };
  }
}

/** Convert TeX to MathML (for pasting into Word and similar apps). */
export function texToMathML(tex, display) {
  const mj = window.MathJax;
  mj.texReset();
  return mj.tex2mml(tex, { display: !!display });
}

const glyphCache = new Map();

/** Small SVG markup for palette/suggestion glyphs (cached). Returns '' on error. */
export function glyphSvg(tex) {
  if (glyphCache.has(tex)) return glyphCache.get(tex);
  // Display style shows fractions and big operators at a readable size; \tag needs
  // inline style, because display mode lays labels out at full width.
  const r = renderTex(tex, !/\\tag\b/.test(tex));
  const out = r.svg || '';
  glyphCache.set(tex, out);
  return out;
}

/** Parse an SVG string into a DOM node owned by `doc` (avoids innerHTML on markup). */
export function svgNode(svgString, doc = document) {
  const parsed = new DOMParser().parseFromString(svgString, 'image/svg+xml');
  const root = parsed.documentElement;
  if (!root || root.nodeName !== 'svg' || parsed.querySelector('parsererror')) return null;
  return doc.importNode(root, true);
}
