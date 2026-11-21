import test from 'node:test';
import assert from 'node:assert/strict';
import {
  num, escapeXml, parseRoot, normalizeMathJaxSvg, readViewBox, computeGeometry,
  pixelSize, buildExportSvg, slugFromTex, sanitizeFileName, isSafeColor,
} from '../js/svgExport.js';

// Trimmed real MathJax 3.2.2 output for \frac{a}{b} (paths shortened).
const FRAC = '<svg xmlns="http://www.w3.org/2000/svg" width="2.192ex" height="4.104ex" role="img" focusable="false" viewBox="0 -1117 969 1814" aria-hidden="true" style="vertical-align: -1.577ex;"><g stroke="currentColor" fill="currentColor" stroke-width="0" transform="scale(1,-1)"><g data-mml-node="math"><g data-mml-node="mfrac"><g data-mml-node="mi" transform="translate(220,676)"><path data-c="1D44E" d="M33 15Z"></path></g><rect width="729" height="60" x="120" y="220"></rect></g></g></g></svg>';

// Trimmed real output for "x \tag{1}" in display mode (no viewBox, width 100%).
const TAGGED = '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="2.262ex" role="img" focusable="false" aria-hidden="true" style="vertical-align: -0.566ex; min-width: 10.697ex;"><g stroke="currentColor" fill="currentColor" stroke-width="0" transform="scale(0.0181,-0.0181) translate(0, -750)"><g data-mml-node="math"><svg data-table="true" preserveAspectRatio="xMidYMid" viewBox="286 -750 1 1000"><g><path d="M1 1Z"></path></g></svg><svg data-labels="true" preserveAspectRatio="xMaxYMid" viewBox="1278 -750 1 1000"><g data-labels="true"><g data-mml-node="mtd" id="mjx-eqn:1"><path d="M2 2Z"></path></g></g></svg></g></g></svg>';

const base = { fontPt: 12, scale: 1, padding: 0, color: '#000000', background: null };

test('num formats compactly', () => {
  assert.equal(num(1.23456), '1.235');
  assert.equal(num(2), '2');
  assert.equal(num(-0.0001), '0');
  assert.equal(num(10.5), '10.5');
  assert.throws(() => num(NaN));
});

test('escapeXml escapes markup and strips illegal control chars', () => {
  assert.equal(escapeXml('a<b & "c">'), 'a&lt;b &amp; &quot;c&quot;&gt;');
  assert.equal(escapeXml('x\u0001y\n'), 'xy\n');
});

test('parseRoot reads attributes and body', () => {
  const { attrs, body } = parseRoot(FRAC);
  assert.equal(attrs.viewBox, '0 -1117 969 1814');
  assert.ok(body.startsWith('<g stroke='));
  assert.ok(body.endsWith('</g>'));
  assert.throws(() => parseRoot('<div></div>'));
});

test('readViewBox parses numbers', () => {
  assert.deepEqual(readViewBox(FRAC), { x: 0, y: -1117, w: 969, h: 1814 });
});

test('geometry: 12pt and 2x scale', () => {
  const vb = readViewBox(FRAC);
  const g1 = computeGeometry(vb, { fontPt: 12, scale: 1, padding: 0 });
  assert.ok(Math.abs(g1.widthPt - 969 / 1000 * 12) < 1e-9);
  assert.ok(Math.abs(g1.heightPt - 1814 / 1000 * 12) < 1e-9);
  const g2 = computeGeometry(vb, { fontPt: 12, scale: 2, padding: 0 });
  assert.ok(Math.abs(g2.widthPt - 2 * g1.widthPt) < 1e-9);
  const g3 = computeGeometry(vb, { fontPt: 24, scale: 1, padding: 0 });
  assert.ok(Math.abs(g3.widthPt - g2.widthPt) < 1e-9);
});

test('geometry: padding in px adds exactly 2 * 0.75pt per px', () => {
  const vb = readViewBox(FRAC);
  const g0 = computeGeometry(vb, { fontPt: 12, scale: 1, padding: 0 });
  const g = computeGeometry(vb, { fontPt: 12, scale: 1, padding: 8 });
  assert.ok(Math.abs(g.widthPt - (g0.widthPt + 2 * 8 * 0.75)) < 1e-9);
  assert.ok(Math.abs(g.heightPt - (g0.heightPt + 12)) < 1e-9);
  // Padding is independent of font size.
  const gBig = computeGeometry(vb, { fontPt: 48, scale: 3, padding: 8 });
  const gBig0 = computeGeometry(vb, { fontPt: 48, scale: 3, padding: 0 });
  assert.ok(Math.abs(gBig.widthPt - gBig0.widthPt - 12) < 1e-9);
});

test('geometry rejects invalid sizes', () => {
  const vb = readViewBox(FRAC);
  assert.throws(() => computeGeometry(vb, { fontPt: 0, scale: 1, padding: 0 }));
  assert.throws(() => computeGeometry(vb, { fontPt: 12, scale: -1, padding: 0 }));
});

test('pixelSize at DPI', () => {
  assert.deepEqual(pixelSize(72, 36, 300), { width: 300, height: 150 });
  assert.deepEqual(pixelSize(72, 36, 96), { width: 96, height: 48 });
  assert.deepEqual(pixelSize(1.1, 1.1, 72), { width: 2, height: 2 });
  assert.deepEqual(pixelSize(0.001, 0.001, 72), { width: 1, height: 1 });
});

test('buildExportSvg writes pt size, viewBox and namespaces', () => {
  const { svg, widthPt, heightPt } = buildExportSvg(FRAC, base);
  assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" xmlns:xlink="http:\/\/www\.w3\.org\/1999\/xlink"/);
  assert.match(svg, / width="11\.628pt" height="21\.768pt"/);
  assert.match(svg, / viewBox="0 -1117 969 1814"/);
  assert.ok(Math.abs(widthPt - 11.628) < 1e-9);
  assert.ok(Math.abs(heightPt - 21.768) < 1e-9);
  assert.ok(svg.endsWith('</svg>'));
  assert.equal((svg.match(/<svg\b/g) || []).length, 1);
});

test('buildExportSvg px unit and pixelBox', () => {
  const px = buildExportSvg(FRAC, { ...base, unit: 'px' }).svg;
  assert.match(px, / width="15\.504px" height="29\.024px"/);
  const box = buildExportSvg(FRAC, { ...base, pixelBox: { width: 49, height: 91 } }).svg;
  assert.match(box, / width="49" height="91"/);
});

test('buildExportSvg removes MathJax-only attributes and vertical-align', () => {
  const { svg } = buildExportSvg(FRAC, base);
  assert.doesNotMatch(svg, /vertical-align/);
  assert.doesNotMatch(svg, /data-mml-node|data-c=/);
  assert.doesNotMatch(svg, /focusable|aria-hidden/);
  assert.match(svg, /<rect width="729" height="60" x="120" y="220">/);
});

test('buildExportSvg resolves currentColor to the chosen color', () => {
  const { svg } = buildExportSvg(FRAC, { ...base, color: '#ff0000' });
  assert.doesNotMatch(svg, /currentColor/);
  assert.match(svg, /stroke="#ff0000" fill="#ff0000"/);
  assert.match(svg, / color="#ff0000"/);
});

test('buildExportSvg ignores unsafe colors', () => {
  const { svg } = buildExportSvg(FRAC, { ...base, color: '"/><script>', background: 'url(x)"' });
  assert.doesNotMatch(svg, /<script/);
  assert.doesNotMatch(svg, /<rect x=/);
  assert.equal(isSafeColor('#abc'), true);
  assert.equal(isSafeColor('rgb(1, 2, 3)'), true);
  assert.equal(isSafeColor('red"'), false);
});

test('background rect covers the padded viewBox, first after title', () => {
  const { svg } = buildExportSvg(FRAC, { ...base, background: '#ffffff', padding: 4, title: 'x' });
  const vb = / viewBox="([^"]+)"/.exec(svg)[1].split(' ');
  const rect = /<rect x="([^"]+)" y="([^"]+)" width="([^"]+)" height="([^"]+)" fill="#ffffff"\/>/.exec(svg);
  assert.ok(rect, 'background rect present');
  assert.deepEqual(rect.slice(1), vb);
  assert.ok(svg.indexOf('<title>') < svg.indexOf('<rect x='));
  assert.ok(svg.indexOf('<rect x=') < svg.indexOf('<g '));
});

test('no background rect when transparent', () => {
  const a = buildExportSvg(FRAC, { ...base, background: null }).svg;
  const b = buildExportSvg(FRAC, { ...base, background: 'transparent' }).svg;
  assert.doesNotMatch(a, /<rect x=/);
  assert.doesNotMatch(b, /<rect x=/);
});

test('title embeds escaped LaTeX', () => {
  const { svg } = buildExportSvg(FRAC, { ...base, title: String.raw`a < b & \text{"q"}` });
  assert.match(svg, /<title>a &lt; b &amp; \\text\{&quot;q&quot;\}<\/title>/);
});

test('cleaning does not touch text content', () => {
  const withText = FRAC.replace('</g></g></g></svg>', '<text font-family="serif"> data-x="1" currentColor</text></g></g></g></svg>');
  const { svg } = buildExportSvg(withText, { ...base, color: '#00ff00' });
  assert.match(svg, /<text font-family="serif"> data-x="1" currentColor<\/text>/);
});

test('normalizeMathJaxSvg wraps tagged equations in a sized viewBox', () => {
  const n = normalizeMathJaxSvg(TAGGED);
  const vb = readViewBox(n);
  // min-width 10.697ex, height 2.262ex; 1ex = 442 units
  assert.ok(Math.abs(vb.w - 10.697 * 442) < 0.01, `w=${vb.w}`);
  assert.ok(Math.abs(vb.h - 2.262 * 442) < 0.01, `h=${vb.h}`);
  assert.match(n, /<g transform="scale\(55\.25\)"><svg width="85\.576" height="18\.096" overflow="visible">/);
  // Untagged output passes through unchanged.
  assert.equal(normalizeMathJaxSvg(FRAC), FRAC);
  const { svg, widthPt } = buildExportSvg(TAGGED, base);
  assert.ok(Math.abs(widthPt - 10.697 * 0.442 * 12) < 0.001);
  assert.doesNotMatch(svg, /mjx-eqn/);
  assert.doesNotMatch(svg, /width="100%"/);
});

test('slugFromTex and sanitizeFileName', () => {
  assert.equal(slugFromTex(String.raw`x = \frac{-b \pm \sqrt{b^2-4ac}}{2a}`), 'x-frac-b-pm-sqrt-b-2-4ac-2a');
  assert.equal(slugFromTex(''), 'equation');
  assert.equal(slugFromTex(String.raw`\begin{pmatrix} 1 \end{pmatrix}`), '1');
  assert.ok(slugFromTex('a'.repeat(100)).length <= 40);
  assert.equal(sanitizeFileName('my/eq:1.svg'), 'my-eq-1');
  assert.equal(sanitizeFileName('  ..  '), '');
});

test('pixelBox grows the viewBox to the exact pixel aspect ratio', () => {
  const { svg } = buildExportSvg(FRAC, { ...base, background: '#ffffff', pixelBox: { width: 50, height: 91 } });
  const vb = / viewBox="([^"]+)"/.exec(svg)[1].split(' ').map(Number);
  assert.ok(Math.abs(vb[2] / vb[3] - 50 / 91) < 1e-3, `aspect ${vb[2] / vb[3]}`);
  // Content stays centered: the box grows equally on both sides.
  assert.ok(Math.abs((vb[0] + vb[2] / 2) - 969 / 2) < 0.01);
  assert.ok(Math.abs((vb[1] + vb[3] / 2) - (-1117 + 1814 / 2)) < 0.01);
  const rect = /<rect x="([^"]+)" y="([^"]+)" width="([^"]+)" height="([^"]+)"/.exec(svg).slice(1).map(Number);
  assert.deepEqual(rect, vb);
});
