import { createEditor } from './editor.js';
import { createPalette } from './palette.js';
import { mathjaxReady, renderTex, texToMathML, svgNode, glyphSvg } from './render.js';
import { buildExportSvg, pixelSize, slugFromTex, sanitizeFileName } from './svgExport.js';
import { rasterize, clampCanvas } from './png.js';
import { TEMPLATES } from './symbols.js';
import * as store from './store.js';

const $ = (id) => document.getElementById(id);

const state = {
  settings: store.loadSettings(),
  last: null,     // { svg, tex, display } of the last successful render
  error: null,    // current error message, or null
  empty: true,
  ready: false,
};

// ---------- toast ----------
let toastTimer = 0;
function toast(msg, kind = 'ok') {
  const el = $('toast');
  el.textContent = msg;
  el.dataset.kind = kind;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), kind === 'error' ? 5000 : 2200);
}

// ---------- editor ----------
const shared = store.parseShareHash(location.hash);
if (shared) {
  if (shared.display != null) {
    state.settings.display = shared.display;
    store.saveSettings(state.settings);
  }
  history.replaceState(null, '', location.pathname + location.search);
}
const initialTex = shared ? shared.tex : (store.loadSource() ?? store.DEFAULT_TEX);
$('source').value = initialTex;

let renderTimer = 0;
const editor = createEditor($('source'), {
  onChange(tex) {
    store.saveSource(tex);
    clearTimeout(renderTimer);
    renderTimer = setTimeout(update, 150);
  },
});
if (shared) store.saveSource(initialTex);

// ---------- settings form ----------
const fields = ['fontPt', 'scale', 'padding', 'dpi', 'unit', 'bgMode', 'bgColor', 'color'];

function syncForm() {
  const s = state.settings;
  $('fontPt').value = s.fontPt;
  $('scale').value = s.scale;
  $('padding').value = s.padding;
  $('dpi').value = s.dpi;
  $('unit').value = s.unit;
  $('bgMode').value = s.bgMode;
  $('bgColor').value = s.bgColor;
  $('bgColor').disabled = s.bgMode !== 'color';
  $('color').value = s.color;
  $('color-hex').value = s.color;
  $('zoom').value = String(s.zoom);
  if ($('zoom').value !== String(s.zoom)) $('zoom').value = 'fit';
  for (const b of document.querySelectorAll('[data-display]')) {
    b.setAttribute('aria-pressed', String(b.dataset.display === String(s.display)));
  }
}

function commitSettings(patch) {
  state.settings = store.sanitizeSettings({ ...state.settings, ...patch });
  store.saveSettings(state.settings);
}

for (const id of fields) {
  const el = $(id);
  const handler = () => {
    if (el.type === 'number') {
      // Ignore incomplete input ("", "1.") until it parses; fix it up on blur.
      const v = el.validity;
      if (el.value === '' || v.badInput || v.rangeUnderflow || v.rangeOverflow) {
        el.classList.toggle('invalid', el.value !== '');
        return;
      }
      el.classList.remove('invalid');
      commitSettings({ [id]: Number(el.value) });
    } else {
      commitSettings({ [id]: el.value });
    }
    if (id === 'color') $('color-hex').value = state.settings.color;
    if (id === 'bgMode') $('bgColor').disabled = state.settings.bgMode !== 'color';
    paint();
  };
  el.addEventListener('input', handler);
  el.addEventListener('change', () => {
    handler();
    if (el.type === 'number') {
      el.classList.remove('invalid');
      el.value = state.settings[id];
    }
  });
}

$('color-hex').addEventListener('input', (e) => {
  let v = e.target.value.trim();
  if (/^[0-9a-fA-F]{6}$/.test(v)) v = '#' + v;
  if (/^#[0-9a-fA-F]{6}$/.test(v)) {
    commitSettings({ color: v });
    $('color').value = state.settings.color;
    e.target.classList.remove('invalid');
    paint();
  } else {
    e.target.classList.toggle('invalid', v.length >= 7);
  }
});
$('color-hex').addEventListener('change', (e) => {
  e.target.value = state.settings.color;
  e.target.classList.remove('invalid');
});

$('zoom').addEventListener('change', (e) => {
  commitSettings({ zoom: e.target.value === 'fit' ? 'fit' : Number(e.target.value) });
  paint();
});

for (const b of document.querySelectorAll('[data-display]')) {
  b.addEventListener('click', () => {
    commitSettings({ display: b.dataset.display === 'true' });
    syncForm();
    update();
  });
}

const fileInput = $('filename');
fileInput.value = store.loadFileName();
fileInput.addEventListener('input', () => store.saveFileName(fileInput.value));
function fileBase() {
  return sanitizeFileName(fileInput.value) || slugFromTex(state.last ? state.last.tex : '');
}

// ---------- rendering ----------
function exportOptions(extra = {}) {
  const s = state.settings;
  return {
    fontPt: s.fontPt,
    scale: s.scale,
    padding: s.padding,
    color: s.color,
    background: s.bgMode === 'color' ? s.bgColor : null,
    unit: s.unit,
    ...extra,
  };
}

function setError(msg) {
  state.error = msg;
  const el = $('error');
  el.hidden = !msg;
  el.textContent = msg ? `Can’t typeset: ${msg}` : '';
  $('stage').classList.toggle('stale', !!msg && !!state.last);
  updateActions();
}

function update() {
  if (!state.ready) return;
  const tex = editor.getValue();
  const r = renderTex(tex, state.settings.display);
  if (r.empty) {
    state.empty = true;
    state.last = null;
    setError(null);
  } else if (r.error) {
    state.empty = false;
    setError(r.error);
  } else {
    state.empty = false;
    state.last = { svg: r.svg, tex, display: state.settings.display };
    setError(null);
  }
  paint();
}

/** Relative luminance of a #rrggbb color (0 = black, 1 = white). */
function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

function paint() {
  const stage = $('stage');
  const sheet = $('sheet');
  const msg = $('stage-msg');
  const s = state.settings;
  // Light ink on a transparent background needs a dark backdrop to be visible.
  stage.dataset.backdrop = s.bgMode === 'transparent' && luminance(s.color) > 0.45 ? 'dark' : 'light';

  if (!state.last) {
    sheet.hidden = true;
    msg.hidden = false;
    msg.textContent = !state.ready ? 'Loading the typesetter…'
      : state.empty ? 'Type LaTeX on the left, or open Templates to start from an example.'
        : 'Fix the error above to see a preview.';
    $('size-readout').textContent = '';
    updateActions();
    return;
  }

  let out;
  try {
    out = buildExportSvg(state.last.svg, exportOptions({ unit: 'px' }));
  } catch (e) {
    setError(e.message);
    return;
  }
  const node = svgNode(out.svg);
  if (!node) { setError('The SVG could not be displayed'); return; }

  const wPx = (out.widthPt * 4) / 3;
  const hPx = (out.heightPt * 4) / 3;
  let z = s.zoom;
  if (z === 'fit') {
    const pad = 48;
    const availW = Math.max(40, stage.clientWidth - pad);
    const availH = Math.max(40, stage.clientHeight - pad);
    z = Math.min(availW / wPx, availH / hPx, 16);
  }
  node.setAttribute('width', String(wPx * z));
  node.setAttribute('height', String(hPx * z));
  node.removeAttribute('role');
  node.setAttribute('aria-hidden', 'true');
  $('sheet-svg').replaceChildren(node);
  sheet.hidden = false;
  msg.hidden = true;
  sheet.setAttribute('role', 'img');
  sheet.setAttribute('aria-label', `Rendered equation: ${state.last.tex}`);

  const px = pixelSize(out.widthPt, out.heightPt, s.dpi);
  const fmt = (n) => (Math.round(n * 10) / 10).toLocaleString();
  const zoomText = s.zoom === 'fit' ? ` · shown at ${Math.round(z * 100)}%` : '';
  $('size-readout').textContent =
    `${fmt(out.widthPt)} × ${fmt(out.heightPt)} pt · PNG ${px.width.toLocaleString()} × ${px.height.toLocaleString()} px at ${s.dpi} dpi${zoomText}`;
  updateActions();
}

function updateActions() {
  const ok = !!state.last && !state.error;
  for (const id of ['dl-svg', 'dl-png', 'copy-svg', 'copy-png', 'copy-mathml']) $(id).disabled = !ok;
  $('export-note').textContent = state.error && state.last
    ? 'Export is paused until the LaTeX typesets without errors.'
    : '';
  fileInput.placeholder = slugFromTex(state.last ? state.last.tex : '');
}

new ResizeObserver(() => { if (state.settings.zoom === 'fit') paint(); }).observe($('stage'));

// ---------- export ----------
function currentSvg() {
  if (!state.last || state.error) throw new Error('Nothing to export yet');
  return buildExportSvg(state.last.svg, exportOptions({ title: state.last.tex }));
}

async function currentPng() {
  if (!state.last || state.error) throw new Error('Nothing to export yet');
  const s = state.settings;
  const geo = buildExportSvg(state.last.svg, exportOptions());
  const want = pixelSize(geo.widthPt, geo.heightPt, s.dpi);
  const size = clampCanvas(want.width, want.height);
  const svg = buildExportSvg(state.last.svg, exportOptions({ pixelBox: size })).svg;
  // If the canvas had to shrink, lower the stored DPI so the physical size stays correct.
  const dpi = size.clamped ? s.dpi * size.factor : s.dpi;
  const blob = await rasterize(svg, size.width, size.height, dpi);
  return { blob, size, want };
}

function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for browsers or contexts without the async clipboard API.
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    ta.remove();
    return ok;
  }
}

function guard(fn) {
  return async () => {
    try {
      await fn();
    } catch (e) {
      toast(e.message || String(e), 'error');
    }
  };
}

const downloadSvg = guard(async () => {
  const { svg } = currentSvg();
  download(new Blob([svg], { type: 'image/svg+xml' }), fileBase() + '.svg');
  toast('Downloaded SVG');
});

const downloadPng = guard(async () => {
  const { blob, size, want } = await currentPng();
  download(blob, fileBase() + '.png');
  if (size.clamped) {
    toast(`Downloaded PNG at ${size.width} × ${size.height} px. ${want.width} × ${want.height} px is larger than browsers can draw.`, 'error');
  } else {
    toast('Downloaded PNG');
  }
});

$('dl-svg').addEventListener('click', downloadSvg);
$('dl-png').addEventListener('click', downloadPng);

$('copy-svg').addEventListener('click', guard(async () => {
  const { svg } = currentSvg();
  if (await copyText(svg)) toast('Copied SVG code');
  else throw new Error('Copying is blocked in this browser. Use Download SVG instead.');
}));

$('copy-png').addEventListener('click', guard(async () => {
  if (!window.ClipboardItem || !navigator.clipboard || !navigator.clipboard.write) {
    throw new Error('This browser can’t copy images. Use Download PNG instead.');
  }
  // Pass a promise so Safari keeps the user gesture while the PNG is drawn.
  const pending = currentPng();
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': pending.then((r) => r.blob) })]);
  } catch (e) {
    await pending.catch(() => {});
    throw new Error('Copying images is blocked here. Use Download PNG instead.');
  }
  const { size } = await pending;
  toast(size.clamped ? `Copied PNG, reduced to ${size.width} × ${size.height} px` : 'Copied PNG image');
}));

$('copy-mathml').addEventListener('click', guard(async () => {
  if (!state.last) throw new Error('Nothing to copy yet');
  const mml = texToMathML(state.last.tex, state.last.display);
  if (await copyText(mml)) toast('Copied MathML. Paste it into Word as an equation.');
  else throw new Error('Copying is blocked in this browser.');
}));

$('copy-tex-btn').addEventListener('click', guard(async () => {
  if (await copyText(editor.getValue())) toast('Copied LaTeX');
  else throw new Error('Copying is blocked in this browser.');
}));

$('clear-btn').addEventListener('click', () => {
  editor.setValue('');
  editor.focus();
});

$('share-btn').addEventListener('click', guard(async () => {
  const tex = editor.getValue();
  if (!tex.trim()) throw new Error('Type an equation first');
  const url = location.origin + location.pathname + store.buildShareHash(tex, state.settings.display);
  if (await copyText(url)) toast('Copied a link to this equation');
  else throw new Error('Copying is blocked in this browser.');
}));

window.addEventListener('hashchange', () => {
  const sh = store.parseShareHash(location.hash);
  if (!sh) return;
  if (sh.display != null) { commitSettings({ display: sh.display }); syncForm(); }
  editor.setValue(sh.tex);
  history.replaceState(null, '', location.pathname + location.search);
});

// ---------- keyboard shortcuts ----------
window.addEventListener('keydown', (e) => {
  const mod = e.metaKey || e.ctrlKey;
  if (!mod || e.altKey || e.code !== 'KeyS') return;
  e.preventDefault();
  if (e.shiftKey) downloadPng();
  else downloadSvg();
}, true);

// ---------- dialogs ----------
for (const b of document.querySelectorAll('[data-open]')) {
  b.addEventListener('click', () => {
    const d = $(b.dataset.open);
    if (d.id === 'saved-dialog') renderSaved();
    d.showModal();
  });
}
for (const d of document.querySelectorAll('dialog')) {
  d.addEventListener('click', (e) => { if (e.target === d) d.close(); }); // backdrop click
  for (const c of d.querySelectorAll('[data-close]')) c.addEventListener('click', () => d.close());
}

function card(tex, title, onOpen, extra) {
  const li = document.createElement('li');
  const open = document.createElement('button');
  open.type = 'button';
  open.className = 'card';
  const g = document.createElement('span');
  g.className = 'card-glyph';
  const node = state.ready && svgNode(glyphSvg(tex.replace(/\s+/g, ' ')) || '<svg xmlns="http://www.w3.org/2000/svg"/>');
  if (node && node.getAttribute('viewBox')) g.appendChild(node);
  else { g.textContent = tex; g.classList.add('code'); }
  const t = document.createElement('span');
  t.className = 'card-title';
  t.textContent = title;
  open.append(g, t);
  open.addEventListener('click', onOpen);
  li.appendChild(open);
  if (extra) li.appendChild(extra);
  return li;
}

function renderTemplates() {
  $('templates-list').replaceChildren(...TEMPLATES.map((tpl) => card(tpl.tex, tpl.name, () => {
    editor.setValue(tpl.tex);
    $('templates-dialog').close();
    editor.focus();
  })));
}

function renderSaved() {
  const list = store.loadSaved();
  $('saved-empty').hidden = list.length > 0;
  $('saved-list').replaceChildren(...list.map((item) => {
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'btn ghost small danger';
    del.textContent = 'Delete';
    del.setAttribute('aria-label', 'Delete saved equation');
    del.addEventListener('click', () => {
      store.storeSaved(store.loadSaved().filter((x) => x.id !== item.id));
      renderSaved();
      toast('Deleted');
    });
    const when = new Date(item.savedAt || Date.now()).toLocaleString();
    return card(item.tex, `Saved ${when}`, () => {
      if (typeof item.display === 'boolean') { commitSettings({ display: item.display }); syncForm(); }
      editor.setValue(item.tex);
      $('saved-dialog').close();
      editor.focus();
    }, del);
  }));
}

$('save-btn').addEventListener('click', () => {
  const tex = editor.getValue();
  if (!tex.trim()) { toast('Type an equation first', 'error'); return; }
  const list = store.loadSaved();
  if (list.some((x) => x.tex === tex)) { toast('Already saved'); return; }
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  list.unshift({ id, tex, display: state.settings.display, savedAt: Date.now() });
  if (store.storeSaved(list.slice(0, 200))) toast('Saved. Find it under Saved.');
  else toast('Couldn’t save: browser storage is full or blocked', 'error');
});

// ---------- theme ----------
function effectiveTheme() {
  const t = document.documentElement.dataset.theme;
  if (t === 'light' || t === 'dark') return t;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
function labelTheme() {
  const next = effectiveTheme() === 'dark' ? 'light' : 'dark';
  $('theme-btn').setAttribute('aria-label', `Switch to ${next} theme`);
  $('theme-btn').title = `Switch to ${next} theme`;
}
$('theme-btn').addEventListener('click', () => {
  const next = effectiveTheme() === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  store.saveTheme(next);
  labelTheme();
});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', labelTheme);
labelTheme();

// ---------- boot ----------
syncForm();
updateActions();
mathjaxReady().then(() => {
  state.ready = true;
  createPalette($('palette'), {
    initialCat: state.settings.paletteCat,
    onCatChange: (id) => commitSettings({ paletteCat: id }),
    onPick: (entry) => editor.insertSnippet(entry.snippet),
  });
  renderTemplates();
  update();
}).catch((e) => {
  $('stage-msg').textContent = `The typesetter failed to load (${e.message}). Reload the page to try again.`;
  toast('The typesetter failed to load', 'error');
});
