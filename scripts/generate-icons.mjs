/**
 * KURSO SCROLL icon generator — pure Node (zlib only, no native deps).
 *
 * Draws the K emblem with signed-distance fields so every size stays crisp:
 *   node scripts/generate-icons.mjs
 *
 * Outputs into public/: icon-512, icon-192, apple-touch-icon, favicon, favicon-32, logo.
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

/* ---------- colour helpers ---------- */
const hex = (h) => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];
const mix = (a, b, t) => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (edge0, edge1, x) => {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};

const GOLD = [hex('#F9EDD2'), hex('#E7C083'), hex('#C69A45'), hex('#8A6428')];
const goldAt = (t) => {
  t = clamp01(t);
  return t < 0.45
    ? mix(GOLD[0], GOLD[1], t / 0.45)
    : t < 0.75
      ? mix(GOLD[1], GOLD[2], (t - 0.45) / 0.3)
      : mix(GOLD[2], GOLD[3], (t - 0.75) / 0.25);
};

/* ---------- signed distance fields ---------- */
const sdRoundRect = (px, py, cx, cy, hw, hh, r) => {
  const qx = Math.abs(px - cx) - (hw - r);
  const qy = Math.abs(py - cy) - (hh - r);
  const ax = Math.max(qx, 0);
  const ay = Math.max(qy, 0);
  return Math.hypot(ax, ay) + Math.min(Math.max(qx, qy), 0) - r;
};

const sdSegment = (px, py, ax, ay, bx, by, r) => {
  const pax = px - ax;
  const pay = py - ay;
  const bax = bx - ax;
  const bay = by - ay;
  const h = clamp01((pax * bax + pay * bay) / (bax * bax + bay * bay));
  return Math.hypot(pax - bax * h, pay - bay * h) - r;
};

const sdDiamond = (px, py, cx, cy, rx, ry) => {
  const dx = Math.abs(px - cx) / rx;
  const dy = Math.abs(py - cy) / ry;
  return (dx + dy - 1) * Math.min(rx, ry) * 0.7;
};

/* ---------- artwork ---------- */
function renderIcon(size) {
  const px = 1 / size; // one pixel in normalised units
  const buf = Buffer.alloc(size * size * 4);

  const plate = { cx: 0.5, cy: 0.5, hw: 0.5, hh: 0.5, r: 0.225 };
  const stroke = 0.028; // stem width (radius)
  const borderT = 0.008;

  const bgTop = hex('#1B1E27');
  const bgMid = hex('#101218');
  const bgBottom = hex('#07080B');

  // K geometry
  const sx = 0.315;
  const top = 0.255;
  const bottom = 0.755;
  const armX = 0.655;
  const midY = 0.505;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size;
      const v = (y + 0.5) / size;

      // --- plate ---
      const dPlate = sdRoundRect(u, v, plate.cx, plate.cy, plate.hw, plate.hh, plate.r);
      const plateCov = smooth(px, -px, dPlate); // 1 inside
      if (plateCov <= 0) continue;

      // background gradient + soft corner sheen
      const g = clamp01(v);
      let col = g < 0.55 ? mix(bgTop, bgMid, g / 0.55) : mix(bgMid, bgBottom, (g - 0.55) / 0.45);
      const sheen = Math.exp(-((u - 0.28) ** 2 + (v - 0.16) ** 2) / 0.06);
      col = mix(col, [46, 50, 62], sheen * 0.55);

      // --- warm glow behind the glyph ---
      const gd = Math.hypot(u - 0.5, v - 0.52);
      const glow = Math.exp(-(gd * gd) / 0.085);
      col = mix(col, [138, 100, 40], glow * 0.35);

      // --- border hairline ---
      const dBorder = Math.abs(dPlate + borderT * 0.5) - borderT * 0.5;
      const borderCov = smooth(px, -px, dBorder) * 0.55;
      if (borderCov > 0) {
        const bt = clamp01((u + v) / 2);
        col = mix(col, goldAt(0.25 + bt * 0.65), borderCov);
      }

      // --- glyph ---
      let dGlyph = Infinity;
      dGlyph = Math.min(dGlyph, sdSegment(u, v, sx, top, sx, bottom, stroke)); // stem
      dGlyph = Math.min(dGlyph, sdSegment(u, v, armX, top, sx + 0.035, midY, stroke)); // upper arm
      dGlyph = Math.min(dGlyph, sdSegment(u, v, sx + 0.115, 0.452, 0.665, bottom, stroke)); // lower arm
      const glyphCov = smooth(px, -px, dGlyph);
      if (glyphCov > 0) {
        // gradient follows the diagonal so the K reads as one ribbon
        const t = clamp01((u * 0.55 + v * 0.45 - 0.16) / 0.68);
        col = mix(col, goldAt(t), glyphCov);
      }

      // inner highlight on the glyph edge
      const highlight = smooth(px * 2.4, px * 0.2, Math.abs(dGlyph)) * 0.18;
      if (highlight > 0) col = mix(col, [255, 250, 235], highlight);

      // --- spark ---
      const sparkA = sdDiamond(u, v, 0.705, 0.275, 0.075, 0.016);
      const sparkB = sdDiamond(u, v, 0.705, 0.275, 0.016, 0.075);
      const sparkCov = smooth(px, -px, Math.min(sparkA, sparkB));
      if (sparkCov > 0) col = mix(col, [247, 231, 193], sparkCov * 0.95);

      const i = (y * size + x) * 4;
      buf[i] = Math.round(col[0]);
      buf[i + 1] = Math.round(col[1]);
      buf[i + 2] = Math.round(col[2]);
      buf[i + 3] = Math.round(255 * plateCov);
    }
  }

  return buf;
}

/* ---------- minimal PNG encoder ---------- */
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

const crc32 = (buf) => {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};

const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const TARGETS = [
  ['icon-512.png', 512],
  ['icon-192.png', 192],
  ['apple-touch-icon.png', 180],
  ['favicon.png', 64],
  ['favicon-32.png', 32],
  ['logo.png', 512],
];

for (const [name, size] of TARGETS) {
  const png = encodePng(size, renderIcon(size));
  writeFileSync(join(OUT, name), png);
  console.log(`✓ ${name} (${size}px, ${(png.length / 1024).toFixed(1)} KB)`);
}
