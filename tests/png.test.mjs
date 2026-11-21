import test from 'node:test';
import assert from 'node:assert/strict';
import { crc32, pngChunks, pngSize, pngDpi, setPngDpi, clampCanvas, MAX_CANVAS_AREA, MAX_CANVAS_DIM } from '../js/png.js';
import { deflateSync } from 'node:zlib';

function chunk(type, data) {
  const out = new Uint8Array(12 + data.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  out.set([...type].map((c) => c.charCodeAt(0)), 4);
  out.set(data, 8);
  dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

function tinyPng(w = 3, h = 2) {
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, w); dv.setUint32(4, h);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  const raw = new Uint8Array(h * (1 + w * 4));
  const parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', new Uint8Array())];
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

test('crc32 matches known value', () => {
  assert.equal(crc32(new TextEncoder().encode('IEND')), 0xae426082);
  assert.equal(crc32(new TextEncoder().encode('123456789')), 0xcbf43926);
});

test('setPngDpi inserts pHYs right after IHDR', () => {
  const png = tinyPng();
  assert.equal(pngDpi(png), null);
  const out = setPngDpi(png, 300);
  const types = pngChunks(out).map((c) => c.type);
  assert.deepEqual(types, ['IHDR', 'pHYs', 'IDAT', 'IEND']);
  assert.equal(pngDpi(out), 300);
  assert.deepEqual(pngSize(out), { width: 3, height: 2 });
  // CRC of the inserted chunk is valid.
  const c = pngChunks(out)[1];
  const dv = new DataView(out.buffer, out.byteOffset);
  assert.equal(dv.getUint32(c.end - 4), crc32(out.subarray(c.start + 4, c.end - 4)));
});

test('setPngDpi replaces an existing pHYs', () => {
  const twice = setPngDpi(setPngDpi(tinyPng(), 72), 600);
  assert.deepEqual(pngChunks(twice).map((c) => c.type), ['IHDR', 'pHYs', 'IDAT', 'IEND']);
  assert.equal(pngDpi(twice), 600);
});

test('rejects non-PNG data', () => {
  assert.throws(() => pngChunks(new Uint8Array(20)));
});

test('clampCanvas keeps sizes within limits and aspect ratio', () => {
  assert.deepEqual(clampCanvas(1000, 500), { width: 1000, height: 500, clamped: false, factor: 1 });
  const a = clampCanvas(40000, 1000);
  assert.ok(a.clamped && a.width <= MAX_CANVAS_DIM && a.height <= MAX_CANVAS_DIM);
  assert.ok(Math.abs(a.width / a.height - 40) < 0.1);
  const b = clampCanvas(10000, 10000);
  assert.ok(b.clamped && b.width * b.height <= MAX_CANVAS_AREA);
});
