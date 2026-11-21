// Pure SVG post-processing for export. No DOM access, so it runs in Node tests too.
//
// MathJax's SVG output uses a viewBox in units of 1/1000 em. A formula set at
// F pt therefore measures (viewBoxWidth / 1000) * F pt wide. We rewrite the root
// element with explicit physical dimensions, add optional padding and background,
// replace `currentColor` with a concrete color, and strip MathJax-only attributes.

export const UNITS_PER_EM = 1000;
// MathJax's TeX fonts have an x-height of 0.442em; render.js passes ex = 8px.
export const EX_PER_EM = 0.442;
export const RENDER_EX_PX = 8;

const SVG_NS = 'http://www.w3.org/2000/svg';
const XLINK_NS = 'http://www.w3.org/1999/xlink';

/** Format a number compactly: at most 3 decimals, no trailing zeros, no "-0". */
export function num(n) {
  if (!Number.isFinite(n)) throw new Error(`Invalid number: ${n}`);
  let s = (Math.round(n * 1000) / 1000).toFixed(3).replace(/\.?0+$/, '');
  if (s === '-0') s = '0';
  return s;
}

/** Escape text for use inside an XML element or a double-quoted attribute. */
export function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    // Characters that are illegal in XML 1.0 (control chars other than tab/newline/CR).
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '');
}

/** Split an SVG string into { openTag, attrs, body } for the root <svg> element. */
export function parseRoot(svg) {
  const src = String(svg).trim().replace(/^<\?xml[^>]*\?>\s*/, '');
  const m = /^<svg\b([^>]*)>/.exec(src);
  if (!m) throw new Error('Not an SVG document');
  if (!/<\/svg>$/.test(src)) throw new Error('SVG is not closed');
  const attrs = {};
  const re = /([A-Za-z_:][\w:.-]*)\s*=\s*"([^"]*)"/g;
  let a;
  while ((a = re.exec(m[1]))) attrs[a[1]] = a[2];
  const body = src.slice(m[0].length, src.length - '</svg>'.length);
  return { openTag: m[0], attrs, body };
}

function parseEx(value) {
  const m = /^\s*(-?[\d.]+)ex\s*$/.exec(value || '');
  return m ? parseFloat(m[1]) : NaN;
}

/**
 * MathJax renders formulas with \tag{} (equation labels) as a full-width SVG with no
 * viewBox (width="100%", style="min-width: Nex"). Wrap such output in an outer SVG with
 * a proper 1/1000-em viewBox, sized to the label layout's minimum width, so the rest of
 * the pipeline can treat every formula the same way. Other SVGs are returned unchanged.
 */
export function normalizeMathJaxSvg(svg) {
  const { attrs, body } = parseRoot(svg);
  if (attrs.viewBox) return String(svg).trim();
  const minWidth = /min-width:\s*(-?[\d.]+)ex/.exec(attrs.style || '');
  const wEx = minWidth ? parseFloat(minWidth[1]) : parseEx(attrs.width);
  const hEx = parseEx(attrs.height);
  if (!(wEx > 0) || !(hEx > 0)) throw new Error('Cannot determine the size of this SVG');
  const wPx = wEx * RENDER_EX_PX;
  const hPx = hEx * RENDER_EX_PX;
  const k = (UNITS_PER_EM * EX_PER_EM) / RENDER_EX_PX; // viewBox units per render px
  const inner = `<svg width="${num(wPx)}" height="${num(hPx)}" overflow="visible">${body}</svg>`;
  return `<svg xmlns="${SVG_NS}" xmlns:xlink="${XLINK_NS}" width="${num(wEx)}ex" height="${num(hEx)}ex" viewBox="0 0 ${num(wPx * k)} ${num(hPx * k)}">` +
    `<g transform="scale(${num(k)})">${inner}</g></svg>`;
}

/** Read the 4 viewBox numbers of a (normalized) MathJax SVG. */
export function readViewBox(svg) {
  const { attrs } = parseRoot(svg);
  const parts = (attrs.viewBox || '').trim().split(/[\s,]+/).map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) throw new Error('SVG has no valid viewBox');
  return { x: parts[0], y: parts[1], w: parts[2], h: parts[3] };
}

/**
 * Compute export geometry.
 * @param {{x:number,y:number,w:number,h:number}} vb   MathJax viewBox (1/1000 em units)
 * @param {{fontPt:number, scale:number, padding:number}} o padding is in CSS px (1px = 0.75pt)
 */
export function computeGeometry(vb, o) {
  const fontPt = Number(o.fontPt);
  const scale = Number(o.scale);
  const padding = Math.max(0, Number(o.padding) || 0);
  if (!(fontPt > 0)) throw new Error('Font size must be greater than 0');
  if (!(scale > 0)) throw new Error('Scale must be greater than 0');
  const ptPerUnit = (fontPt * scale) / UNITS_PER_EM; // pt per viewBox unit
  const padUnits = (padding * 0.75) / ptPerUnit;    // px → pt → viewBox units
  const box = { x: vb.x - padUnits, y: vb.y - padUnits, w: vb.w + 2 * padUnits, h: vb.h + 2 * padUnits };
  return { box, widthPt: box.w * ptPerUnit, heightPt: box.h * ptPerUnit, ptPerUnit };
}

/** Pixel dimensions of a raster at the given DPI (1pt = 1/72 in). */
export function pixelSize(widthPt, heightPt, dpi) {
  return {
    width: Math.max(1, Math.ceil((widthPt / 72) * dpi - 1e-6)),
    height: Math.max(1, Math.ceil((heightPt / 72) * dpi - 1e-6)),
  };
}

const COLOR_RE = /^(#[0-9a-fA-F]{3,8}|[a-zA-Z]+|rgba?\([\d\s.,%]+\)|hsla?\([\d\s.,%deg]+\))$/;

/** True for values that are safe to drop into a fill attribute. */
export function isSafeColor(c) {
  return typeof c === 'string' && COLOR_RE.test(c.trim());
}

/** Strip MathJax data-* and a11y attributes and resolve currentColor, inside tags only. */
function cleanBody(body, color, keepData) {
  return body.replace(/<[^>]+>/g, (tag) => {
    if (tag.startsWith('</') || tag.startsWith('<!') || tag.startsWith('<?')) return tag;
    let t = tag;
    if (!keepData) t = t.replace(/\s+data-[\w.-]+="[^"]*"/g, '');
    t = t.replace(/\s+id="mjx-[^"]*"/g, '');
    if (color) t = t.replace(/="currentColor"/g, `="${color}"`);
    return t;
  });
}

/**
 * Build a standalone, sized SVG document from a MathJax SVG.
 * @param {string} svg MathJax output (already normalized or raw)
 * @param {object} o
 * @param {number} o.fontPt     font size in pt
 * @param {number} o.scale      extra multiplier
 * @param {number} o.padding    padding in CSS px
 * @param {string} o.color      formula color, e.g. "#000000"
 * @param {string|null} o.background  background color, or null/"transparent" for none
 * @param {'pt'|'px'} [o.unit]  unit of the width/height attributes (default pt)
 * @param {{width:number,height:number}} [o.pixelBox] force exact px size (raster use)
 * @param {string} [o.title]    LaTeX source to embed in <title>
 * @param {boolean} [o.keepData] keep data-* attributes
 * @returns {{svg:string, widthPt:number, heightPt:number}}
 */
export function buildExportSvg(svg, o) {
  const normalized = normalizeMathJaxSvg(svg);
  const { body } = parseRoot(normalized);
  const vb = readViewBox(normalized);
  const g = computeGeometry(vb, o);
  const color = o.color && isSafeColor(o.color) ? o.color.trim() : null;
  const bg = o.background && o.background !== 'transparent' && isSafeColor(o.background) ? o.background.trim() : null;

  let wAttr;
  let hAttr;
  if (o.pixelBox) {
    wAttr = String(o.pixelBox.width);
    hAttr = String(o.pixelBox.height);
  } else if (o.unit === 'px') {
    wAttr = `${num((g.widthPt * 4) / 3)}px`;
    hAttr = `${num((g.heightPt * 4) / 3)}px`;
  } else {
    wAttr = `${num(g.widthPt)}pt`;
    hAttr = `${num(g.heightPt)}pt`;
  }

  let b = g.box;
  if (o.pixelBox) {
    // Pixel sizes are rounded up, so grow the viewBox (around its center) to the exact
    // pixel aspect ratio. The background then covers every pixel edge to edge, with no
    // half-transparent fringe and no distortion.
    const k = Math.min(o.pixelBox.width / b.w, o.pixelBox.height / b.h); // px per unit
    const w = o.pixelBox.width / k;
    const h = o.pixelBox.height / k;
    b = { x: b.x - (w - b.w) / 2, y: b.y - (h - b.h) / 2, w, h };
  }
  const viewBox = `${num(b.x)} ${num(b.y)} ${num(b.w)} ${num(b.h)}`;
  const parts = [];
  parts.push(`<svg xmlns="${SVG_NS}" xmlns:xlink="${XLINK_NS}" width="${wAttr}" height="${hAttr}" viewBox="${viewBox}"` +
    (color ? ` color="${color}"` : '') + ' role="img">');
  if (o.title) parts.push(`<title>${escapeXml(o.title)}</title>`);
  if (bg) parts.push(`<rect x="${num(b.x)}" y="${num(b.y)}" width="${num(b.w)}" height="${num(b.h)}" fill="${bg}"/>`);
  parts.push(cleanBody(body, color, !!o.keepData));
  parts.push('</svg>');
  return { svg: parts.join(''), widthPt: g.widthPt, heightPt: g.heightPt };
}

/** Make a file-system friendly base name from LaTeX source. */
export function slugFromTex(tex, max = 40) {
  const s = String(tex || '')
    .replace(/\\(begin|end)\{[^}]*\}/g, ' ')
    .replace(/\\([a-zA-Z]+)/g, ' $1 ')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, max)
    .replace(/-+$/, '');
  return s || 'equation';
}

/** Sanitize a user-entered file name (without extension). */
export function sanitizeFileName(name) {
  const s = String(name || '')
    .replace(/\.(svg|png)$/i, '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\\/:*?"<>|\u0000-\u001F]+/g, '-')
    .replace(/^[\s.]+|[\s.]+$/g, '')
    .slice(0, 120);
  return s;
}
