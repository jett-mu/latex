// PNG helpers. The byte-level functions are pure and tested in Node; rasterize() needs a browser.

// Chrome/Firefox allow larger canvases, but iOS Safari fails silently above ~16.7 MP.
export const MAX_CANVAS_AREA = 16777216;
export const MAX_CANVAS_DIM = 16384;

let crcTable = null;
function crc32(bytes) {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
  }
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = crcTable[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
export { crc32 };

const SIG = [137, 80, 78, 71, 13, 10, 26, 10];

/** List chunks of a PNG as { type, start, end } byte offsets (end is exclusive). */
export function pngChunks(bytes) {
  for (let i = 0; i < 8; i++) if (bytes[i] !== SIG[i]) throw new Error('Not a PNG file');
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const out = [];
  let p = 8;
  while (p + 12 <= bytes.length) {
    const len = dv.getUint32(p);
    const type = String.fromCharCode(bytes[p + 4], bytes[p + 5], bytes[p + 6], bytes[p + 7]);
    const end = p + 12 + len;
    if (end > bytes.length) throw new Error('Truncated PNG');
    out.push({ type, start: p, end });
    p = end;
    if (type === 'IEND') break;
  }
  return out;
}

/** Read width/height from IHDR. */
export function pngSize(bytes) {
  const chunks = pngChunks(bytes);
  if (!chunks.length || chunks[0].type !== 'IHDR') throw new Error('PNG has no IHDR');
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: dv.getUint32(16), height: dv.getUint32(20) };
}

/** Read the DPI stored in pHYs, or null. */
export function pngDpi(bytes) {
  const c = pngChunks(bytes).find((ch) => ch.type === 'pHYs');
  if (!c) return null;
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes[c.start + 16] !== 1) return null; // unit must be metres
  return Math.round(dv.getUint32(c.start + 8) * 0.0254);
}

/**
 * Return a copy of the PNG with a pHYs chunk declaring `dpi`, so apps such as Word,
 * PowerPoint and Keynote place the image at its intended physical size.
 */
export function setPngDpi(bytes, dpi) {
  const ppm = Math.round(dpi / 0.0254);
  const chunk = new Uint8Array(21);
  const dv = new DataView(chunk.buffer);
  dv.setUint32(0, 9);
  chunk.set([112, 72, 89, 115], 4); // "pHYs"
  dv.setUint32(8, ppm);
  dv.setUint32(12, ppm);
  chunk[16] = 1; // unit: metre
  dv.setUint32(17, crc32(chunk.subarray(4, 17)));

  const chunks = pngChunks(bytes);
  if (!chunks.length || chunks[0].type !== 'IHDR') throw new Error('PNG has no IHDR');
  const parts = [bytes.subarray(0, chunks[0].end), chunk];
  for (const c of chunks.slice(1)) if (c.type !== 'pHYs') parts.push(bytes.subarray(c.start, c.end));
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

/** Fit a requested pixel size inside canvas limits, keeping the aspect ratio. */
export function clampCanvas(width, height) {
  let f = 1;
  if (width > MAX_CANVAS_DIM) f = Math.min(f, MAX_CANVAS_DIM / width);
  if (height > MAX_CANVAS_DIM) f = Math.min(f, MAX_CANVAS_DIM / height);
  if (width * height * f * f > MAX_CANVAS_AREA) f = Math.min(f, Math.sqrt(MAX_CANVAS_AREA / (width * height)));
  if (f >= 1) return { width, height, clamped: false, factor: 1 };
  return {
    width: Math.max(1, Math.floor(width * f)),
    height: Math.max(1, Math.floor(height * f)),
    clamped: true,
    factor: f,
  };
}

/**
 * Rasterize an SVG string whose width/height attributes equal (width, height) in px.
 * @returns {Promise<Blob>} PNG blob with pHYs set to dpi
 */
export async function rasterize(svg, width, height, dpi) {
  const img = new Image();
  img.decoding = 'sync';
  const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = () => reject(new Error('The browser could not draw this SVG'));
    img.src = url;
  });
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available');
  ctx.drawImage(img, 0, 0, width, height);
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('The PNG is too large for this browser'))), 'image/png');
  });
  const bytes = new Uint8Array(await blob.arrayBuffer());
  return new Blob([setPngDpi(bytes, dpi)], { type: 'image/png' });
}
