// Pure ranking for symbol suggestions (editor popup and palette search).

/** The text an entry is matched on: its command without the leading backslash. */
export function entryName(entry) {
  return entry.env ? entry.env : entry.cmd.replace(/^\\/, '');
}

/** Score how well `query` matches `entry`; 0 means no match. */
export function scoreEntry(query, entry) {
  const q = query.replace(/^\\/, '');
  if (!q) return 1;
  const name = entryName(entry);
  const ql = q.toLowerCase();
  const nl = name.toLowerCase();
  // The bare command word, e.g. "frac" for "\frac{}{}" or "left" for "\left( \right)".
  const word = (/^[a-zA-Z]+/.exec(name) || [''])[0];
  const wl = word.toLowerCase();

  if (word === q || name === q) return 1000;
  if (wl === ql) return 950;
  if (word.startsWith(q)) return 800 - Math.min(50, word.length - q.length);
  if (wl.startsWith(ql)) return 750 - Math.min(50, word.length - q.length);
  if (nl.startsWith(ql)) return 700;

  const kw = (entry.kw || '').toLowerCase().split(/\s+/).filter(Boolean);
  if (kw.includes(ql)) return 600;
  if (kw.some((k) => k.startsWith(ql))) return 550;
  if (nl.includes(ql)) return 450 - Math.min(50, nl.indexOf(ql));
  if (ql.length >= 3 && kw.some((k) => k.includes(ql))) return 350;

  // Fuzzy subsequence on the command word, e.g. "lra" → "leftrightarrow".
  if (ql.length >= 2) {
    let i = 0;
    let gaps = 0;
    let last = -1;
    for (let j = 0; j < wl.length && i < ql.length; j++) {
      if (wl[j] === ql[i]) {
        if (last >= 0) gaps += j - last - 1;
        last = j;
        i++;
      }
    }
    if (i === ql.length && wl[0] === ql[0]) return Math.max(101, 300 - gaps * 10);
  }
  return 0;
}

/**
 * Rank entries for a query. Ties are broken by popularity, then shorter names, then
 * catalogue order, so results are deterministic.
 */
export function rankSymbols(query, entries, limit = 50) {
  const q = String(query || '').replace(/^\\/, '');
  const scored = [];
  entries.forEach((e, i) => {
    const s = scoreEntry(q, e);
    if (s > 0) scored.push({ e, s, i });
  });
  scored.sort((a, b) =>
    b.s - a.s ||
    (b.e.pop || 0) - (a.e.pop || 0) ||
    entryName(a.e).length - entryName(b.e).length ||
    a.i - b.i);
  return scored.slice(0, limit).map((x) => x.e);
}

/** Environment entries matching a partial name typed inside \begin{…}. */
export function rankEnvironments(query, entries, limit = 50) {
  const envs = entries.filter((e) => e.env);
  const q = String(query || '');
  const scored = [];
  envs.forEach((e, i) => {
    let s = 0;
    if (!q) s = 1;
    else if (e.env === q) s = 1000;
    else if (e.env.startsWith(q)) s = 800 - (e.env.length - q.length);
    else if (e.env.toLowerCase().startsWith(q.toLowerCase())) s = 700;
    else if (e.env.toLowerCase().includes(q.toLowerCase())) s = 400;
    else if ((e.kw || '').toLowerCase().split(/\s+/).some((k) => k.startsWith(q.toLowerCase()))) s = 300;
    if (s > 0) scored.push({ e, s, i });
  });
  scored.sort((a, b) => b.s - a.s || (b.e.pop || 0) - (a.e.pop || 0) || a.i - b.i);
  return scored.slice(0, limit).map((x) => x.e);
}

/**
 * Turn a snippet with #1..#9 tab stops into plain text plus stop offsets.
 * Stops are returned in navigation order (#1 first). If `fill` is given, it is
 * placed into stop #1 (used to wrap the current selection).
 * Each line after the first is prefixed with `indent`.
 */
export function expandSnippet(snippet, { fill = '', indent = '' } = {}) {
  let text = '';
  const stops = [];
  const re = /#([1-9])/g;
  let last = 0;
  let m;
  const src = indent ? snippet.replace(/\n/g, '\n' + indent) : snippet;
  while ((m = re.exec(src))) {
    text += src.slice(last, m.index);
    const n = Number(m[1]);
    const start = text.length;
    if (n === 1 && fill) text += fill;
    stops.push({ n, start, end: text.length });
    last = m.index + m[0].length;
  }
  text += src.slice(last);
  stops.sort((a, b) => a.n - b.n);
  return { text, stops: stops.map(({ start, end }) => ({ start, end })) };
}
