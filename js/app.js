import { createEditor } from './editor.js';
import { createPalette } from './palette.js';
import { mathjaxReady, renderTex, texToMathML, svgNode, glyphSvg } from './render.js';
import { buildExportSvg, pixelSize, slugFromTex, sanitizeFileName } from './svgExport.js';
import { rasterize, clampCanvas } from './png.js';
import { TEMPLATES } from './symbols.js';
import * as store from './store.js';

const $ = (id) => document.getElementById(id);
const ZOOMS = ['fit', 1, 2, 4];

const state = {
  settings: store.loadSettings(),
  last: null,     // { svg, tex, display } of the last successful render
  error: null,    // current error message, or null
  empty: true,
  ready: false,
};
if (!ZOOMS.includes(state.settings.zoom)) state.settings.zoom = 'fit';

// ---------- feedback ----------
let toastTimer = 0;
function toast(msg, kind = 'ok') {
  const el = $('toast');
  el.textContent = msg;
  el.dataset.kind = kind;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), kind === 'error' ? 5200 : 2400);
}

function announce(msg) {
  const el = $('announce');
  el.textContent = '';
  requestAnimationFrame(() => { el.textContent = msg; });
}

/** Confirm a copy inside the button itself ("Copied"), then restore its label. */
const copyTimers = new WeakMap();
function confirmCopy(btn, spoken) {
  const label = btn.dataset.copyLabel || btn.textContent;
  btn.textContent = 'Copied';
  btn.classList.add('copied');
  announce(spoken);
  clearTimeout(copyTimers.get(btn));
  copyTimers.set(btn, setTimeout(() => {
    btn.textContent = label;
    btn.classList.remove('copied');
  }, 1600));
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

// ---------- settings ----------
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
  for (const b of document.querySelectorAll('[data-display]')) {
    b.setAttribute('aria-pressed', String(b.dataset.display === String(s.display)));
  }
  for (const b of document.querySelectorAll('[data-zoom]')) {
    b.setAttribute('aria-pressed', String(b.dataset.zoom === String(s.zoom)));
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
      // Ignore incomplete input ("", "1.") until it parses; it is restored on blur.
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

for (const b of document.querySelectorAll('[data-zoom]')) {
  b.addEventListener('click', () => {
    commitSettings({ zoom: b.dataset.zoom === 'fit' ? 'fit' : Number(b.dataset.zoom) });
    syncForm();
    paint();
  });
}

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
  el.textContent = msg ? `Can’t typeset this yet: ${msg}` : '';
  $('stage').classList.toggle('stale', !!msg && !!state.last);
  updateActions();
}

// Errors are shown only after a pause, so half-typed commands (\al on the way to
// \alpha) don't flash a warning on every keystroke.
let errorTimer = 0;
const ERROR_DELAY = 700;

function update() {
  if (!state.ready) return;
  const tex = editor.getValue();
  const r = renderTex(tex, state.settings.display);
  clearTimeout(errorTimer);
  if (r.empty) {
    state.empty = true;
    state.last = null;
    setError(null);
  } else if (r.error) {
    state.empty = false;
    const wasError = !!state.error;
    state.error = r.error; // exports stop at once; the message waits for a pause
    updateActions(false);
    if (wasError || !state.last) setError(r.error);
    else errorTimer = setTimeout(() => { setError(r.error); paint(); }, ERROR_DELAY);
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

const fmt = (n) => (Math.round(n * 10) / 10).toLocaleString(undefined, { maximumFractionDigits: 1 });

function showMessage(text, { loading = false, templates = false } = {}) {
  $('sheet').hidden = true;
  $('stage-msg').hidden = false;
  $('stage-text').textContent = text;
  $('stage-text').classList.toggle('loading', loading);
  $('empty-templates').hidden = !templates;
  $('zoom-readout').textContent = '';
  $('ro-size').textContent = '–';
  $('ro-png').textContent = '–';
}

function paint() {
  const stage = $('stage');
  const s = state.settings;
  // Light ink on a transparent background needs a dark backdrop to stay visible.
  stage.dataset.backdrop = s.bgMode === 'transparent' && luminance(s.color) > 0.45 ? 'dark' : 'light';

  if (!state.last) {
    if (!state.ready) showMessage('Loading the typesetter…', { loading: true });
    else if (state.empty) showMessage('Type LaTeX in the editor below, or start from a template.', { templates: true });
    else showMessage('Fix the problem described below to see the preview.');
    updateActions(false);
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
  if (!node) { setError('the SVG could not be displayed'); return; }

  const wPx = (out.widthPt * 4) / 3;
  const hPx = (out.heightPt * 4) / 3;
  let z = s.zoom;
  if (z === 'fit') {
    const pad = 110; // stage padding plus room for the dimension lines
    const availW = Math.max(40, stage.clientWidth - pad);
    const availH = Math.max(40, stage.clientHeight - pad);
    z = Math.min(availW / wPx, availH / hPx, 16);
  }
  node.setAttribute('width', String(wPx * z));
  node.setAttribute('height', String(hPx * z));
  node.removeAttribute('role');
  node.setAttribute('aria-hidden', 'true');
  $('sheet-svg').replaceChildren(node);
  $('sheet').hidden = false;
  $('stage-msg').hidden = true;
  $('sheet').setAttribute('role', 'img');
  $('sheet').setAttribute('aria-label', `Rendered equation: ${state.last.tex}`);

  const px = pixelSize(out.widthPt, out.heightPt, s.dpi);
  $('dim-x').textContent = `${fmt(out.widthPt)} pt`;
  $('dim-y').textContent = `${fmt(out.heightPt)} pt`;
  $('ro-size').textContent = `${fmt(out.widthPt)} × ${fmt(out.heightPt)} pt`;
  $('ro-png').textContent = `${px.width.toLocaleString()} × ${px.height.toLocaleString()} px`;
  $('zoom-readout').textContent = `Shown at ${Math.round(z * 100)}%`;
  updateActions(false);
}

function updateActions(showNote = true) {
  const ok = !!state.last && !state.error;
  for (const id of ['dl-svg', 'dl-png', 'copy-svg', 'copy-png', 'copy-mathml']) $(id).disabled = !ok;
  if (showNote || ok) {
    $('export-note').textContent = state.last && state.error
      ? 'Export is paused until the LaTeX typesets without errors.' : '';
  }
  fileInput.placeholder = slugFromTex(state.last ? state.last.tex : '');
}

new ResizeObserver(() => { if (state.settings.zoom === 'fit' && state.last) paint(); }).observe($('stage'));

// ---------- export ----------
function currentSvg() {
  if (!state.last || state.error) throw new Error('There is nothing to export yet.');
  return buildExportSvg(state.last.svg, exportOptions({ title: state.last.tex }));
}

async function currentPng() {
  if (!state.last || state.error) throw new Error('There is nothing to export yet.');
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
  return async (...args) => {
    try {
      await fn(...args);
    } catch (e) {
      toast(e.message || String(e), 'error');
    }
  };
}

/** Show a busy label on a button while an async task runs. */
async function busy(btn, label, task) {
  const original = btn.dataset.copyLabel || btn.textContent;
  btn.setAttribute('aria-busy', 'true');
  btn.textContent = label;
  try {
    return await task();
  } finally {
    btn.removeAttribute('aria-busy');
    if (!btn.classList.contains('copied')) btn.textContent = original;
  }
}

const downloadSvg = guard(async () => {
  const { svg } = currentSvg();
  const name = fileBase() + '.svg';
  download(new Blob([svg], { type: 'image/svg+xml' }), name);
  toast(`Downloaded ${name}`);
});

let pngRunning = false;
const downloadPng = guard(async () => {
  if (pngRunning) return;
  pngRunning = true;
  try {
    const { blob, size, want } = await busy($('dl-png'), 'Drawing…', currentPng);
    const name = fileBase() + '.png';
    download(blob, name);
    if (size.clamped) {
      toast(`Downloaded at ${size.width} × ${size.height} px. ${want.width} × ${want.height} px is larger than browsers can draw.`, 'error');
    } else {
      toast(`Downloaded ${name}`);
    }
  } finally {
    pngRunning = false;
  }
});

$('dl-svg').addEventListener('click', downloadSvg);
$('dl-png').addEventListener('click', downloadPng);

$('copy-svg').addEventListener('click', guard(async () => {
  const { svg } = currentSvg();
  if (await copyText(svg)) confirmCopy($('copy-svg'), 'SVG code copied');
  else throw new Error('Copying is blocked in this browser. Use Download SVG instead.');
}));

$('copy-png').addEventListener('click', guard(async () => {
  const btn = $('copy-png');
  if (!window.ClipboardItem || !navigator.clipboard || !navigator.clipboard.write) {
    throw new Error('This browser can’t copy images. Use Download PNG instead.');
  }
  // Pass a promise so Safari keeps the user gesture while the PNG is drawn.
  const pending = currentPng();
  await busy(btn, 'Drawing…', async () => {
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': pending.then((r) => r.blob) })]);
    } catch {
      await pending.catch(() => {});
      throw new Error('Copying images is blocked here. Use Download PNG instead.');
    }
  });
  const { size } = await pending;
  confirmCopy(btn, 'PNG image copied');
  if (size.clamped) toast(`Copied, reduced to ${size.width} × ${size.height} px`, 'error');
}));

$('copy-mathml').addEventListener('click', guard(async () => {
  if (!state.last) throw new Error('There is nothing to copy yet.');
  const mml = texToMathML(state.last.tex, state.last.display);
  if (await copyText(mml)) confirmCopy($('copy-mathml'), 'MathML copied. Paste it into Word as an equation.');
  else throw new Error('Copying is blocked in this browser.');
}));

$('copy-tex-btn').addEventListener('click', guard(async () => {
  if (await copyText(editor.getValue())) confirmCopy($('copy-tex-btn'), 'LaTeX copied');
  else throw new Error('Copying is blocked in this browser.');
}));

$('clear-btn').addEventListener('click', () => {
  editor.setValue('');
  editor.focus();
});

$('share-btn').addEventListener('click', guard(async () => {
  const tex = editor.getValue();
  if (!tex.trim()) throw new Error('Type an equation first, then copy its link.');
  const url = location.origin + location.pathname + store.buildShareHash(tex, state.settings.display);
  if (await copyText(url)) toast('Link copied. Anyone who opens it sees this equation.');
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

// ---------- help dialog ----------
for (const b of document.querySelectorAll('[data-open]')) {
  b.addEventListener('click', () => $(b.dataset.open).showModal());
}
for (const d of document.querySelectorAll('dialog')) {
  d.addEventListener('click', (e) => { if (e.target === d) d.close(); }); // backdrop click
  for (const c of d.querySelectorAll('[data-close]')) c.addEventListener('click', () => d.close());
}

// ---------- library: symbols / templates / saved ----------
const libTabs = [...document.querySelectorAll('.lib-tab')];

function setLib(name, { focus = false } = {}) {
  for (const t of libTabs) {
    const on = t.dataset.lib === name;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
    $(t.getAttribute('aria-controls')).hidden = !on;
    if (on && focus) t.focus();
  }
  $('search-wrap').hidden = name !== 'symbols';
  if (name === 'saved') renderSaved();
}
for (const t of libTabs) t.addEventListener('click', () => setLib(t.dataset.lib));
document.querySelector('.lib-switch').addEventListener('keydown', (e) => {
  if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
  const i = libTabs.indexOf(document.activeElement);
  if (i < 0) return;
  const next = libTabs[(i + (e.key === 'ArrowRight' ? 1 : libTabs.length - 1)) % libTabs.length];
  setLib(next.dataset.lib, { focus: true });
  e.preventDefault();
});

$('empty-templates').addEventListener('click', () => {
  setLib('templates', { focus: true });
  $('library').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
});

function tile(tex, title, onOpen, foot) {
  const li = document.createElement('li');
  li.className = 'tile';
  const open = document.createElement('button');
  open.type = 'button';
  open.className = 'tile-open';
  const eq = document.createElement('span');
  eq.className = 'tile-eq';
  const svg = state.ready ? glyphSvg(tex.replace(/\s+/g, ' ')) : '';
  const node = svg && svgNode(svg);
  if (node) eq.appendChild(node);
  else { eq.textContent = tex; eq.classList.add('code'); }
  const name = document.createElement('span');
  name.className = 'tile-name';
  name.textContent = title;
  open.append(eq, name);
  open.setAttribute('aria-label', `Open ${title}`);
  open.addEventListener('click', onOpen);
  li.appendChild(open);
  if (foot) li.appendChild(foot);
  return li;
}

function renderTemplates() {
  $('templates-list').replaceChildren(...TEMPLATES.map((tpl) => tile(tpl.tex, tpl.name, () => {
    editor.setValue(tpl.tex);
    editor.focus();
    announce(`${tpl.name} opened in the editor`);
  })));
}

function updateSavedCount() {
  const n = store.loadSaved().length;
  $('saved-count').textContent = n ? String(n) : '';
}

function renderSaved() {
  const list = store.loadSaved();
  $('saved-empty').hidden = list.length > 0;
  $('saved-note').hidden = list.length === 0;
  $('saved-list').replaceChildren(...list.map((item) => {
    const foot = document.createElement('div');
    foot.className = 'tile-foot';
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'btn quiet danger';
    del.textContent = 'Delete';
    const when = new Date(item.savedAt || Date.now()).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    del.setAttribute('aria-label', `Delete equation saved ${when}`);
    del.addEventListener('click', () => {
      store.storeSaved(store.loadSaved().filter((x) => x.id !== item.id));
      renderSaved();
      updateSavedCount();
      announce('Deleted');
      $('lib-tab-saved').focus();
    });
    foot.appendChild(del);
    return tile(item.tex, `Saved ${when}`, () => {
      if (typeof item.display === 'boolean') { commitSettings({ display: item.display }); syncForm(); }
      editor.setValue(item.tex);
      editor.focus();
      announce('Saved equation opened in the editor');
    }, foot);
  }));
}

$('save-btn').addEventListener('click', () => {
  const tex = editor.getValue();
  if (!tex.trim()) { toast('Type an equation first, then save it.', 'error'); return; }
  const list = store.loadSaved();
  if (list.some((x) => x.tex === tex)) { toast('This equation is already in Saved.'); return; }
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  list.unshift({ id, tex, display: state.settings.display, savedAt: Date.now() });
  if (store.storeSaved(list.slice(0, 200))) {
    toast('Saved. It’s listed under Saved, below the editor.');
    updateSavedCount();
    if (!$('lib-saved').hidden) renderSaved();
  } else {
    toast('Couldn’t save: this browser’s storage is full or blocked.', 'error');
  }
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
updateSavedCount();
updateActions();
paint();
mathjaxReady().then(() => {
  state.ready = true;
  createPalette($('library'), {
    initialCat: state.settings.paletteCat,
    onCatChange: (id) => commitSettings({ paletteCat: id }),
    onPick: (entry) => editor.insertSnippet(entry.snippet),
  });
  renderTemplates();
  update();
}).catch((e) => {
  showMessage(`The typesetter failed to load (${e.message}). Reload the page to try again.`);
  toast('The typesetter failed to load.', 'error');
});
