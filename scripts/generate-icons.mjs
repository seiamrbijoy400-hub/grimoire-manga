/**
 * KURSO SCROLL brand asset builder (pure Node, zlib only — no native deps).
 *
 * Source artwork: assets/brand-logo-source.png (transparent, 1254²).
 * Draws the app icon plate, trims/fits the artwork and writes:
 *   public/logo.png, icon-512, icon-192, apple-touch-icon, favicon, favicon-32
 *
 *   node scripts/generate-icons.mjs
 */
import { deflateSync, inflateSync } from 'node:zlib';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'assets', 'brand-logo-source.png');
const OUT = join(ROOT, 'public');

/* ------------------------------------------------------------------ decode */

function decodePng(buf) {
  let pos = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  const idat = [];

  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === 'IDAT') {
      idat.push(data);
    }
    pos += 12 + len;
  }

  if (bitDepth !== 8 || colorType !== 6 || interlace !== 0) {
    throw new Error(`Unsupported PNG (depth ${bitDepth}, color ${colorType}, interlace ${interlace})`);
  }

  const channels = 4;
  const stride = width * channels;
  const raw = inflateSync(Buffer.concat(idat));
  const out = Buffer.alloc(stride * height);
  let prev = Buffer.alloc(stride);
  let p = 0;

  for (let y = 0; y < height; y++) {
    const filter = raw[p++];
    const line = Buffer.from(raw.subarray(p, p + stride));
    p += stride;

    if (filter === 1) {
      for (let x = channels; x < stride; x++) line[x] = (line[x] + line[x - channels]) & 255;
    } else if (filter === 2) {
      for (let x = 0; x < stride; x++) line[x] = (line[x] + prev[x]) & 255;
    } else if (filter === 3) {
      for (let x = 0; x < stride; x++) {
        const a = x >= channels ? line[x - channels] : 0;
        line[x] = (line[x] + ((a + prev[x]) >> 1)) & 255;
      }
    } else if (filter === 4) {
      for (let x = 0; x < stride; x++) {
        const a = x >= channels ? line[x - channels] : 0;
        const b = prev[x];
        const c = x >= channels ? prev[x - channels] : 0;
        const pa = Math.abs(b - c);
        const pb = Math.abs(a - c);
        const pc = Math.abs(a + b - 2 * c);
        const pr = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
        line[x] = (line[x] + pr) & 255;
      }
    }

    line.copy(out, y * stride);
    prev = line;
  }

  return { width, height, data: out };
}

/* ------------------------------------------------------------ image maths */

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (e0, e1, x) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};

/** RGBA8 -> premultiplied Float32 buffer. */
function premultiply({ width, height, data }) {
  const out = new Float32Array(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3] / 255;
    out[i] = data[i] * a;
    out[i + 1] = data[i + 1] * a;
    out[i + 2] = data[i + 2] * a;
    out[i + 3] = data[i + 3];
  }
  return out;
}

/** Area-average downscale in premultiplied space (safe for alpha edges). */
function resample(src, sw, sh, dw, dh) {
  const dst = new Float32Array(dw * dh * 4);
  const sx = sw / dw;
  const sy = sh / dh;

  for (let y = 0; y < sh; y++) {
    const y0 = y / sy;
    const y1 = (y + 1) / sy;
    for (let x = 0; x < sw; x++) {
      const x0 = x / sx;
      const x1 = (x + 1) / sx;
      const i = (y * sw + x) * 4;
      const r = src[i];
      const g = src[i + 1];
      const b = src[i + 2];
      const a = src[i + 3];
      if (a === 0 && r === 0 && g === 0 && b === 0) continue;

      for (let dy = Math.floor(y0); dy < Math.ceil(y1); dy++) {
        const wy = Math.min(y1, dy + 1) - Math.max(y0, dy);
        if (wy <= 0) continue;
        for (let dx = Math.floor(x0); dx < Math.ceil(x1); dx++) {
          const wx = Math.min(x1, dx + 1) - Math.max(x0, dx);
          if (wx <= 0) continue;
          const w = (wx * wy) / ((x1 - x0) * (y1 - y0));
          const j = (dy * dw + dx) * 4;
          dst[j] += r * w;
          dst[j + 1] += g * w;
          dst[j + 2] += b * w;
          dst[j + 3] += a * w;
        }
      }
    }
  }
  return dst;
}

/** Trim fully transparent borders, keeping a little breathing room. */
function trim(src, width, height, pad = 0.02) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (src[(y * width + x) * 4 + 3] > 12) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return { src, width, height };

  const w = maxX - minX + 1;
  const h = maxY - minY + 1;
  const px = Math.round(w * pad);
  const py = Math.round(h * pad);
  const x0 = Math.max(0, minX - px);
  const y0 = Math.max(0, minY - py);
  const x1 = Math.min(width - 1, maxX + px);
  const y1 = Math.min(height - 1, maxY + py);
  const tw = x1 - x0 + 1;
  const th = y1 - y0 + 1;
  const out = new Float32Array(tw * th * 4);

  for (let y = 0; y < th; y++) {
    const from = ((y0 + y) * width + x0) * 4;
    out.set(src.subarray(from, from + tw * 4), y * tw * 4);
  }
  return { src: out, width: tw, height: th };
}

/** Fit artwork into a transparent square canvas, centred. */
function fitSquare(src, sw, sh, size, scale = 1, bg = null) {
  const out = new Float32Array(size * size * 4);
  const work = Math.round(size * scale);
  const dw = Math.max(1, Math.round((sw >= sh ? work : (work * sw) / sh)));
  const dh = Math.max(1, Math.round((sh >= sw ? work : (work * sh) / sw)));
  const art = resample(src, sw, sh, dw, dh);
  const ox = Math.round((size - dw) / 2);
  const oy = Math.round((size - dh) / 2);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const j = (y * size + x) * 4;
      const ax = x - ox;
      const ay = y - oy;
      let ar = 0;
      let ag = 0;
      let ab = 0;
      let aa = 0;

      if (ax >= 0 && ay >= 0 && ax < dw && ay < dh) {
        const i = (ay * dw + ax) * 4;
        ar = art[i];
        ag = art[i + 1];
        ab = art[i + 2];
        aa = art[i + 3];
      }

      if (bg) {
        // Composite over an opaque gradient plate (premultiplied maths).
        const t = y / (size - 1);
        const top = [27, 31, 40];
        const mid = [16, 19, 25];
        const bottom = [7, 8, 11];
        const k = t < 0.55 ? t / 0.55 : (t - 0.55) / 0.45;
        const from = t < 0.55 ? top : mid;
        const to = t < 0.55 ? mid : bottom;
        let br = from[0] + (to[0] - from[0]) * k;
        let bgc = from[1] + (to[1] - from[1]) * k;
        let bb = from[2] + (to[2] - from[2]) * k;

        // Warm halo behind the emblem.
        const gx = (x - size * 0.5) / size;
        const gy = (y - size * 0.52) / size;
        const glow = Math.exp(-(gx * gx + gy * gy) / 0.05);
        br += (128 - br) * glow * 0.22;
        bgc += (42 - bgc) * glow * 0.22;
        bb += (52 - bb) * glow * 0.22;

        const a = clamp01(aa / 255);
        out[j] = ar + br * (1 - a);
        out[j + 1] = ag + bgc * (1 - a);
        out[j + 2] = ab + bb * (1 - a);
        out[j + 3] = 255;
      } else {
        // PNG stores straight alpha, so undo the premultiply.
        const a = aa / 255;
        out[j] = a > 0 ? ar / a : 0;
        out[j + 1] = a > 0 ? ag / a : 0;
        out[j + 2] = a > 0 ? ab / a : 0;
        out[j + 3] = aa;
      }
    }
  }
  return { buf: out, width: size, height: size };
}

/** Rounded-square alpha mask with antialiasing. */
function roundMask(size, radius) {
  const mask = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const qx = Math.abs(x + 0.5 - size / 2) - (size / 2 - radius);
      const qy = Math.abs(y + 0.5 - size / 2) - (size / 2 - radius);
      const ax = Math.max(qx, 0);
      const ay = Math.max(qy, 0);
      const d = Math.hypot(ax, ay) + Math.min(Math.max(qx, qy), 0) - radius;
      mask[y * size + x] = smooth(1, -1, d);
    }
  }
  return mask;
}

/* --------------------------------------------------------------- encoding */

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
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 255] ^ (c >>> 8);
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
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    for (let x = 0; x < stride; x++) {
      const v = rgba[y * stride + x];
      raw[y * (stride + 1) + 1 + x] = Math.max(0, Math.min(255, Math.round(v)));
    }
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ------------------------------------------------------------------ build */

const decoded = decodePng(readFileSync(SRC));
const premul = premultiply(decoded);
const trimmed = trim(premul, decoded.width, decoded.height, 0.015);
console.log(`source ${decoded.width}x${decoded.height} → trimmed ${trimmed.width}x${trimmed.height}`);

// Transparent hero logo used across the UI.
const hero = fitSquare(trimmed.src, trimmed.width, trimmed.height, 384, 1);
writeFileSync(join(OUT, 'logo.png'), encodePng(384, hero.buf));
console.log('✓ logo.png (384px, transparent)');

// Compact copy for the navbar / search field (keeps first paint light).
const compact = fitSquare(trimmed.src, trimmed.width, trimmed.height, 96, 1);
writeFileSync(join(OUT, 'logo-96.png'), encodePng(96, compact.buf));
console.log('✓ logo-96.png (96px, transparent)');

// Icon plate + artwork, rounded square.
function icon(size, artScale, radiusRatio) {
  const canvas = fitSquare(trimmed.src, trimmed.width, trimmed.height, size, artScale, true);
  const mask = roundMask(size, Math.round(size * radiusRatio));
  for (let i = 0; i < size * size; i++) {
    canvas.buf[i * 4 + 3] *= mask[i];
  }
  return canvas.buf;
}

const TARGETS = [
  ['icon-512.png', 512, 0.94, 0.22],
  ['icon-192.png', 192, 0.94, 0.22],
  ['apple-touch-icon.png', 180, 0.92, 0.0],
  ['favicon.png', 64, 0.96, 0.18],
  ['favicon-32.png', 32, 0.98, 0.16],
];

for (const [name, size, artScale, radius] of TARGETS) {
  const png = encodePng(size, icon(size, artScale, radius));
  writeFileSync(join(OUT, name), png);
  console.log(`✓ ${name} (${size}px, ${(png.length / 1024).toFixed(1)} KB)`);
}
