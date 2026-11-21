// Symbol palette: category tabs, search, and a grid of clickable glyphs.
import { SYMBOLS, CATEGORIES, previewTex } from './symbols.js';
import { rankSymbols } from './suggest.js';
import { glyphSvg, svgNode } from './render.js';

export function createPalette(root, { onPick, initialCat, onCatChange }) {
  const tabs = root.querySelector('[data-palette-tabs]');
  const grid = root.querySelector('[data-palette-grid]');
  const search = root.querySelector('[data-palette-search]');
  const status = root.querySelector('[data-palette-status]');
  let cat = CATEGORIES.some((c) => c.id === initialCat) ? initialCat : CATEGORIES[0].id;

  for (const c of CATEGORIES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tab';
    b.setAttribute('role', 'tab');
    b.dataset.cat = c.id;
    b.textContent = c.label;
    b.addEventListener('click', () => {
      search.value = '';
      setCat(c.id);
    });
    tabs.appendChild(b);
  }

  // Arrow-key navigation between tabs.
  tabs.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const all = [...tabs.querySelectorAll('.tab')];
    const i = all.indexOf(document.activeElement);
    if (i < 0) return;
    const next = all[(i + (e.key === 'ArrowRight' ? 1 : all.length - 1)) % all.length];
    next.focus();
    next.click();
    e.preventDefault();
  });

  function button(entry) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'sym';
    b.title = entry.cmd;
    b.setAttribute('aria-label', `Insert ${entry.cmd}`);
    const glyph = document.createElement('span');
    glyph.className = 'sym-glyph';
    const svg = glyphSvg(previewTex(entry));
    const node = svg && svgNode(svg);
    if (node) glyph.appendChild(node);
    else glyph.textContent = entry.cmd;
    b.appendChild(glyph);
    if (entry.label) {
      const l = document.createElement('span');
      l.className = 'sym-label';
      l.textContent = entry.label;
      b.appendChild(l);
      b.classList.add('sym-wide');
    }
    b.addEventListener('click', () => onPick(entry));
    return b;
  }

  function fill(entries, emptyText) {
    grid.replaceChildren(...entries.map(button));
    status.textContent = entries.length ? '' : emptyText;
    status.hidden = !!entries.length;
  }

  function setCat(id) {
    cat = id;
    for (const b of tabs.querySelectorAll('.tab')) {
      const on = b.dataset.cat === id;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
    }
    fill(SYMBOLS.filter((s) => s.cat === id), '');
    grid.setAttribute('aria-label', CATEGORIES.find((c) => c.id === id).label);
    if (onCatChange) onCatChange(id);
  }

  let t = 0;
  search.addEventListener('input', () => {
    clearTimeout(t);
    t = setTimeout(() => {
      const q = search.value.trim();
      if (!q) { setCat(cat); return; }
      for (const b of tabs.querySelectorAll('.tab')) b.setAttribute('aria-selected', 'false');
      fill(rankSymbols(q, SYMBOLS, 80), `No symbols match “${q}”. Try a name like “arrow” or “integral”.`);
      grid.setAttribute('aria-label', `Search results for ${q}`);
    }, 80);
  });
  search.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && search.value) {
      search.value = '';
      setCat(cat);
      e.stopPropagation();
    }
  });

  setCat(cat);
  return { setCat };
}
