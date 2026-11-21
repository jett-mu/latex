import test from 'node:test';
import assert from 'node:assert/strict';
import { rankSymbols, rankEnvironments, expandSnippet, scoreEntry } from '../js/suggest.js';
import { SYMBOLS } from '../js/symbols.js';

const top = (q, n = 1) => rankSymbols(q, SYMBOLS, n).map((e) => e.cmd);

test('exact command ranks first', () => {
  assert.equal(top('alpha')[0], '\\alpha');
  assert.equal(top('\\alpha')[0], '\\alpha');
  assert.equal(top('sum')[0], '\\sum');
  assert.equal(top('int')[0], '\\int');
});

test('case-sensitive exact match wins', () => {
  assert.equal(top('Delta')[0], '\\Delta');
  assert.equal(top('delta')[0], '\\delta');
});

test('prefix matches', () => {
  assert.equal(top('fr')[0], '\\frac{}{}');
  assert.ok(top('alp', 5).includes('\\alpha'));
  assert.ok(top('righ', 10).includes('\\rightarrow'));
  assert.ok(top('sq', 5).includes('\\sqrt{}'));
});

test('keyword matches', () => {
  assert.ok(top('infinity', 5).includes('\\infty'));
  assert.ok(top('implies', 5).includes('\\Rightarrow') || top('implies', 5).includes('\\implies'));
  assert.ok(top('integral', 10).includes('\\int'));
});

test('fuzzy subsequence', () => {
  assert.ok(scoreEntry('lra', { cmd: '\\leftrightarrow', kw: '' }) > 0);
  assert.equal(scoreEntry('zzz', { cmd: '\\alpha', kw: '' }), 0);
});

test('empty query returns popular first', () => {
  const r = rankSymbols('', SYMBOLS, 5).map((e) => e.cmd);
  assert.equal(r[0], '\\frac{}{}');
});

test('ranking is deterministic', () => {
  assert.deepEqual(top('ar', 30), top('ar', 30));
});

test('environment completion', () => {
  const r = rankEnvironments('pm', SYMBOLS).map((e) => e.env);
  assert.equal(r[0], 'pmatrix');
  assert.ok(rankEnvironments('', SYMBOLS).length > 10);
  assert.deepEqual(rankEnvironments('zzzz', SYMBOLS), []);
});

test('expandSnippet computes stops in #n order', () => {
  const r = expandSnippet('\\frac{#1}{#2}');
  assert.equal(r.text, '\\frac{}{}');
  assert.deepEqual(r.stops, [{ start: 6, end: 6 }, { start: 8, end: 8 }]);
  const o = expandSnippet('\\overset{#2}{#1}');
  assert.equal(o.text, '\\overset{}{}');
  assert.deepEqual(o.stops, [{ start: 11, end: 11 }, { start: 9, end: 9 }]);
});

test('expandSnippet fills #1 and indents lines', () => {
  const r = expandSnippet('\\sqrt{#1}', { fill: 'x+1' });
  assert.equal(r.text, '\\sqrt{x+1}');
  assert.deepEqual(r.stops, [{ start: 6, end: 9 }]);
  const m = expandSnippet('\\begin{a}\n  #1\n\\end{a}', { indent: '    ' });
  assert.equal(m.text, '\\begin{a}\n      \n    \\end{a}');
  assert.deepEqual(m.stops, [{ start: 16, end: 16 }]);
});
