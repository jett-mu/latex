// CodeMirror 5 editor with LaTeX suggestions and snippet tab stops.
import { SYMBOLS, CATEGORIES, previewTex } from './symbols.js';
import { rankSymbols, rankEnvironments, expandSnippet } from './suggest.js';
import { glyphSvg, svgNode } from './render.js';

const R = String.raw;
const CM = window.CodeMirror;
const CAT_LABEL = new Map(CATEGORIES.map((c) => [c.id, c.label]));

/** Number of consecutive backslashes immediately before `ch` on `line`. */
function backslashesBefore(line, ch) {
  let n = 0;
  while (ch - n - 1 >= 0 && line[ch - n - 1] === '\\') n++;
  return n;
}

/** Names of environments opened before `pos` and not yet closed (innermost last). */
function openEnvironments(cm, pos) {
  const text = cm.getRange({ line: 0, ch: 0 }, pos);
  const stack = [];
  const re = /\\(begin|end)\{([^}]*)\}/g;
  let m;
  while ((m = re.exec(text))) {
    if (backslashesBefore(text, m.index) % 2 === 1) continue;
    if (m[1] === 'begin') stack.push(m[2]);
    else {
      const i = stack.lastIndexOf(m[2]);
      if (i >= 0) stack.splice(i, 1);
    }
  }
  return stack;
}

function renderHintRow(el, entry) {
  el.classList.add('hint-row');
  const glyph = document.createElement('span');
  glyph.className = 'hint-glyph';
  if (entry.label && !entry.preview) {
    glyph.textContent = '·';
  } else {
    const svg = glyphSvg(previewTex(entry));
    const node = svg && svgNode(svg);
    if (node) glyph.appendChild(node);
  }
  const cmd = document.createElement('span');
  cmd.className = 'hint-cmd';
  cmd.textContent = entry.cmd;
  const cat = document.createElement('span');
  cat.className = 'hint-cat';
  cat.textContent = CAT_LABEL.get(entry.cat) || '';
  el.append(glyph, cmd, cat);
}

export function createEditor(textarea, { onChange } = {}) {
  let session = null; // { stops: TextMarker[], idx: number }
  let tabEscapes = false; // after Esc, the next Tab moves focus out of the editor

  function clearSession() {
    if (!session) return;
    for (const m of session.stops) m.clear();
    session = null;
  }

  function stopRange(m) {
    const r = m.find();
    if (!r) return null;
    return r.from ? r : { from: r, to: r };
  }

  function selectStop(i) {
    while (session && i >= 0 && i < session.stops.length) {
      const r = stopRange(session.stops[i]);
      if (r) {
        session.idx = i;
        cm.setSelection(r.from, r.to);
        return true;
      }
      i += i > session.idx ? 1 : -1;
    }
    return false;
  }

  function cursorInsideStop(m) {
    const r = stopRange(m);
    if (!r) return false;
    const c = cm.getCursor('from');
    const e = cm.getCursor('to');
    return CM.cmpPos(c, r.from) >= 0 && CM.cmpPos(e, r.to) <= 0;
  }

  /**
   * Insert a snippet with #n tab stops, replacing [from, to] (default: the selection).
   * When text is selected and no range is given, the selection fills stop #1.
   */
  function insertSnippet(snippet, from, to) {
    const useSel = !from;
    from = from || cm.getCursor('from');
    to = to || cm.getCursor('to');
    const fill = useSel && cm.somethingSelected() ? cm.getRange(from, to) : '';
    const indent = /^[ \t]*/.exec(cm.getLine(from.line))[0];
    const { text, stops } = expandSnippet(snippet, { fill, indent });

    // Nest inside the current snippet if we're typing in one of its stops.
    let rest = [];
    if (session) {
      const cur = session.stops[session.idx];
      if (cur && cursorInsideStop(cur)) {
        rest = session.stops.slice(session.idx + 1);
        session.stops.filter((m) => !rest.includes(m)).forEach((m) => m.clear());
      } else {
        clearSession();
      }
      session = null;
    }

    cm.operation(() => {
      cm.replaceRange(text, from, to, '+snippet');
      const base = cm.indexFromPos(from);
      const endPos = cm.posFromIndex(base + text.length);
      if (!stops.length) {
        cm.setCursor(endPos);
        if (rest.length) session = { stops: rest, idx: -1 };
        return;
      }
      const markers = stops.map((s) => cm.markText(
        cm.posFromIndex(base + s.start), cm.posFromIndex(base + s.end),
        { className: 'cm-stop', inclusiveLeft: true, inclusiveRight: true, clearWhenEmpty: false },
      ));
      // A final stop just after the snippet, unless a stop already ends there.
      if (!stops.some((s) => s.end === text.length) && !rest.length) {
        markers.push(cm.markText(endPos, endPos, { clearWhenEmpty: false }));
      }
      session = { stops: markers.concat(rest), idx: 0 };
      // With a filled #1, jump straight to the next stop (e.g. the denominator).
      selectStop(fill && markers.length > 1 ? 1 : 0);
    });
    cm.focus();
  }

  function hintProvider(cmi, options) {
    const cur = cmi.getCursor();
    const line = cmi.getLine(cur.line);
    const before = line.slice(0, cur.ch);
    const after = line.slice(cur.ch);
    const closeTo = after[0] === '}' ? { line: cur.line, ch: cur.ch + 1 } : cur;

    // \begin{… → environment snippets (replace the whole \begin{…} with the snippet)
    let m = /\\begin\{([a-zA-Z*]*)$/.exec(before);
    if (m && backslashesBefore(before, m.index) % 2 === 0) {
      const list = rankEnvironments(m[1], SYMBOLS).map((entry) => ({
        text: entry.cmd,
        entry,
        render: (el) => renderHintRow(el, entry),
        hint: (c, data) => insertSnippet(entry.snippet, data.from, data.to),
      }));
      if (!list.length) return null;
      return { list, from: { line: cur.line, ch: m.index }, to: closeTo };
    }

    // \end{… → close the innermost open environment
    m = /\\end\{([a-zA-Z*]*)$/.exec(before);
    if (m && backslashesBefore(before, m.index) % 2 === 0) {
      const open = openEnvironments(cmi, { line: cur.line, ch: m.index }).reverse();
      const names = [...new Set(open)].filter((n) => n.startsWith(m[1]));
      if (!names.length) return null;
      return {
        list: names.map((n) => ({ text: n + '}', displayText: R`\end{` + n + '}' })),
        from: { line: cur.line, ch: m.index + m[0].length - m[1].length },
        to: closeTo,
      };
    }

    m = /\\([a-zA-Z]*)$/.exec(before);
    if (!m || backslashesBefore(before, m.index) % 2 === 1) return null;
    if (!m[1] && !options.explicit) return null;
    const ranked = rankSymbols(m[1], SYMBOLS, 60);
    if (!ranked.length) return null;
    // Don't keep a popup open whose only suggestion is exactly what's typed.
    if (!options.explicit && ranked.length === 1 && ranked[0].snippet === '\\' + m[1]) return null;
    const list = ranked.map((entry) => ({
      text: entry.snippet,
      entry,
      render: (el) => renderHintRow(el, entry),
      hint: (c, data) => insertSnippet(entry.snippet, data.from, data.to),
    }));
    return { list, from: { line: cur.line, ch: m.index }, to: cur };
  }

  function showHints(explicit) {
    cm.showHint({
      hint: hintProvider,
      completeSingle: false,
      explicit,
      closeCharacters: /[\s()[\];:>,^_&$=+\-*/|<'"!?.~]/,
      container: document.body,
    });
  }

  function openBrace(c) {
    if (c.listSelections().length > 1) return CM.Pass;
    if (c.somethingSelected()) {
      const sel = c.getSelection();
      c.replaceSelection('{' + sel + '}', 'around');
      return undefined;
    }
    const cur = c.getCursor();
    const line = c.getLine(cur.line);
    if (backslashesBefore(line, cur.ch) % 2 === 1) {
      c.replaceSelection('{');
      return undefined;
    }
    c.operation(() => {
      c.replaceRange('{}', cur, cur, '+input');
      c.setCursor({ line: cur.line, ch: cur.ch + 1 });
    });
    if (/\\(begin|end)$/.test(line.slice(0, cur.ch))) showHints(false);
    return undefined;
  }

  function closeBrace(c) {
    if (c.listSelections().length > 1 || c.somethingSelected()) return CM.Pass;
    const cur = c.getCursor();
    const line = c.getLine(cur.line);
    if (line[cur.ch] === '}' && backslashesBefore(line, cur.ch) % 2 === 0) {
      c.setCursor({ line: cur.line, ch: cur.ch + 1 });
      return undefined;
    }
    return CM.Pass;
  }

  function backspace(c) {
    if (c.listSelections().length > 1 || c.somethingSelected()) return CM.Pass;
    const cur = c.getCursor();
    const line = c.getLine(cur.line);
    if (line[cur.ch - 1] === '{' && line[cur.ch] === '}' && backslashesBefore(line, cur.ch - 1) % 2 === 0) {
      c.replaceRange('', { line: cur.line, ch: cur.ch - 1 }, { line: cur.line, ch: cur.ch + 1 }, '+delete');
      return undefined;
    }
    return CM.Pass;
  }

  function tab(c) {
    if (tabEscapes) {
      tabEscapes = false;
      return CM.Pass;
    }
    if (session) {
      const next = session.idx + 1;
      if (next < session.stops.length && selectStop(next)) {
        // Leaving the final stop ends the session.
        if (session.idx === session.stops.length - 1) {
          const r = stopRange(session.stops[session.idx]);
          if (r && CM.cmpPos(r.from, r.to) === 0) clearSession();
        }
        return undefined;
      }
      clearSession();
      return undefined;
    }
    c.execCommand('insertSoftTab');
    return undefined;
  }

  function shiftTab(c) {
    if (tabEscapes) {
      tabEscapes = false;
      return CM.Pass;
    }
    if (session && session.idx > 0) {
      selectStop(session.idx - 1);
      return undefined;
    }
    if (session) return undefined;
    return CM.Pass;
  }

  const cm = CM.fromTextArea(textarea, {
    mode: { name: 'stex', inMathMode: true },
    theme: 'eqset',
    lineNumbers: true,
    lineWrapping: true,
    matchBrackets: true,
    styleActiveLine: true,
    indentUnit: 2,
    tabSize: 2,
    indentWithTabs: false,
    viewportMargin: Infinity,
    cursorBlinkRate: 0, // the caret pulses via CSS instead of blinking out (css/styles.css)
    spellcheck: false,
    autocorrect: false,
    autocapitalize: false,
    // Default input style: a hidden textarea on desktop, so CodeMirror draws the caret we
    // style in CSS. (Touch devices get contenteditable automatically, for better IME support.)
    screenReaderLabel: 'LaTeX source',
    extraKeys: {
      'Ctrl-Space': () => showHints(true),
      'Alt-Space': () => showHints(true),
      '{': openBrace,
      '}': closeBrace,
      Backspace: backspace,
      Tab: tab,
      'Shift-Tab': shiftTab,
      Esc: () => {
        if (session) clearSession();
        else tabEscapes = true;
      },
    },
  });

  cm.on('inputRead', (c, change) => {
    tabEscapes = false;
    if (c.state.completionActive) return;
    const typed = change.text.join('\n');
    if (/^[a-zA-Z]$/.test(typed)) {
      const cur = c.getCursor();
      const before = c.getLine(cur.line).slice(0, cur.ch);
      if (/\\[a-zA-Z]+$|\\(begin|end)\{[a-zA-Z*]*$/.test(before)) showHints(false);
    }
  });

  cm.on('keydown', (c, e) => {
    if (e.key !== 'Escape' && e.key !== 'Tab' && e.key !== 'Shift') tabEscapes = false;
  });

  cm.on('cursorActivity', () => {
    if (!session) return;
    // End the snippet session when the cursor wanders outside all of its stops' span.
    const ranges = session.stops.map(stopRange).filter(Boolean);
    if (!ranges.length) { clearSession(); return; }
    let lo = ranges[0].from;
    let hi = ranges[0].to;
    for (const r of ranges) {
      if (CM.cmpPos(r.from, lo) < 0) lo = r.from;
      if (CM.cmpPos(r.to, hi) > 0) hi = r.to;
    }
    const c = cm.getCursor('head');
    if (CM.cmpPos(c, lo) < 0 || CM.cmpPos(c, hi) > 0) clearSession();
  });

  cm.on('changes', () => onChange && onChange(cm.getValue()));

  return {
    cm,
    insertSnippet,
    getValue: () => cm.getValue(),
    /** Replace the whole document as one undoable change. */
    setValue(text) {
      clearSession();
      const last = cm.lastLine();
      cm.replaceRange(text, { line: 0, ch: 0 }, { line: last, ch: cm.getLine(last).length }, '+load');
      cm.setCursor(cm.posFromIndex(text.length));
    },
    focus: () => cm.focus(),
    refresh: () => cm.refresh(),
    showHints,
  };
}

