import test from 'node:test';
import assert from 'node:assert/strict';
import { SYMBOLS, CATEGORIES, TEMPLATES, previewTex } from '../js/symbols.js';

const catIds = new Set(CATEGORIES.map((c) => c.id));

function balanced(s) {
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '\\') { i++; continue; }
    if (s[i] === '{') depth++;
    if (s[i] === '}') { depth--; if (depth < 0) return false; }
  }
  return depth === 0;
}

test('catalogue is large and every category is used', () => {
  assert.ok(SYMBOLS.length > 450, `only ${SYMBOLS.length} symbols`);
  for (const id of catIds) assert.ok(SYMBOLS.some((s) => s.cat === id), `empty category ${id}`);
});

test('every entry is well formed', () => {
  for (const s of SYMBOLS) {
    assert.ok(catIds.has(s.cat), `bad category ${s.cat} for ${s.cmd}`);
    assert.equal(typeof s.cmd, 'string');
    assert.ok(s.cmd.length > 0);
    assert.equal(typeof s.snippet, 'string');
    assert.ok(balanced(s.snippet), `unbalanced braces in ${s.snippet}`);
    assert.ok(balanced(previewTex(s)), `unbalanced preview for ${s.cmd}`);
    assert.doesNotMatch(previewTex(s), /#[1-9]/);
  }
});

test('command names are unique', () => {
  const seen = new Map();
  for (const s of SYMBOLS) {
    assert.ok(!seen.has(s.cmd), `duplicate ${s.cmd} in ${s.cat} and ${seen.get(s.cmd)}`);
    seen.set(s.cmd, s.cat);
  }
});

test('tab stops are numbered 1..n without gaps and never adjacent', () => {
  for (const s of SYMBOLS) {
    const nums = [...s.snippet.matchAll(/#([1-9])/g)].map((m) => Number(m[1]));
    const sorted = [...nums].sort((a, b) => a - b);
    sorted.forEach((n, i) => assert.equal(n, i + 1, `stops in ${s.snippet}`));
    assert.doesNotMatch(s.snippet, /#[1-9]#[1-9]/, `adjacent stops in ${s.snippet}`);
  }
});

test('environment snippets close what they open', () => {
  for (const s of SYMBOLS.filter((x) => x.env)) {
    assert.ok(s.snippet.startsWith(`\\begin{${s.env}}`), s.snippet);
    assert.ok(s.snippet.endsWith(`\\end{${s.env}}`), s.snippet);
  }
});

test('templates are balanced', () => {
  for (const t of TEMPLATES) assert.ok(balanced(t.tex), t.name);
});
