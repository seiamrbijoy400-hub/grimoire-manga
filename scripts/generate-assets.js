import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function crc32(buf) {
  let table = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    table[i] = c;
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  return (crc ^ (-1)) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const toCrc = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(toCrc), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function parsePNG(buf) {
  let offset = 8;
  let width, height;
  const idats = [];
  while (offset < buf.length) {
    const len = buf.readUInt32BE(offset);
    const type = buf.toString('ascii', offset + 4, offset + 8);
    const data = buf.slice(offset + 8, offset + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
    } else if (type === 'IDAT') {
      idats.push(data);
    }
    offset += 12 + len;
  }
  const decompressed = zlib.inflateSync(Buffer.concat(idats));
  const bpp = 4;
  const stride = width * bpp;
  const pixels = Buffer.alloc(width * height * 4);
  let srcPos = 0;
  
  for (let y = 0; y < height; y++) {
    const filter = decompressed[srcPos++];
    for (let x = 0; x < stride; x++) {
      const raw = decompressed[srcPos++];
      let a = x >= bpp ? pixels[y * stride + x - bpp] : 0;
      let b = y > 0 ? pixels[(y - 1) * stride + x] : 0;
      let c = (x >= bpp && y > 0) ? pixels[(y - 1) * stride + x - bpp] : 0;
      let val = raw;
      if (filter === 1) val = (raw + a) & 0xff;
      else if (filter === 2) val = (raw + b) & 0xff;
      else if (filter === 3) val = (raw + Math.floor((a + b) / 2)) & 0xff;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        const pr = (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
        val = (raw + pr) & 0xff;
      }
      pixels[y * stride + x] = val;
    }
  }
  return { width, height, pixels };
}

function encodePNG(width, height, pixels) {
  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdr = makeChunk('IHDR', ihdrData);

  const rawScanlines = Buffer.alloc(height * (1 + width * 4));
  let srcPos = 0;
  let dstPos = 0;
  for (let y = 0; y < height; y++) {
    rawScanlines[dstPos++] = 0; // Filter 0
    for (let x = 0; x < width * 4; x++) {
      rawScanlines[dstPos++] = pixels[srcPos++];
    }
  }

  const idat = makeChunk('IDAT', zlib.deflateSync(rawScanlines));
  const iend = makeChunk('IEND', Buffer.alloc(0));
  return Buffer.concat([sig, ihdr, idat, iend]);
}

// High quality bilinear resizer
function resizeImage(src, targetW, targetH, options = {}) {
  const { padFraction = 0, bgColor = [0, 0, 0, 0], circular = false } = options;
  const outPixels = Buffer.alloc(targetW * targetH * 4);
  
  // Fill background
  for (let i = 0; i < targetW * targetH; i++) {
    outPixels[i * 4] = bgColor[0];
    outPixels[i * 4 + 1] = bgColor[1];
    outPixels[i * 4 + 2] = bgColor[2];
    outPixels[i * 4 + 3] = bgColor[3];
  }

  const padX = Math.round(targetW * padFraction);
  const padY = Math.round(targetH * padFraction);
  const innerW = targetW - 2 * padX;
  const innerH = targetH - 2 * padY;

  const xRatio = src.width / innerW;
  const yRatio = src.height / innerH;

  const centerX = targetW / 2;
  const centerY = targetH / 2;
  const radius = Math.min(targetW, targetH) / 2;

  for (let y = 0; y < innerH; y++) {
    const srcY = y * yRatio;
    const yFloor = Math.floor(srcY);
    const yCeil = Math.min(src.height - 1, yFloor + 1);
    const yFrac = srcY - yFloor;

    const outY = y + padY;

    for (let x = 0; x < innerW; x++) {
      const srcX = x * xRatio;
      const xFloor = Math.floor(srcX);
      const xCeil = Math.min(src.width - 1, xFloor + 1);
      const xFrac = srcX - xFloor;

      const outX = x + padX;

      if (circular) {
        const dx = outX - centerX;
        const dy = outY - centerY;
        if (dx * dx + dy * dy > radius * radius) {
          continue;
        }
      }

      const idxTL = (yFloor * src.width + xFloor) * 4;
      const idxTR = (yFloor * src.width + xCeil) * 4;
      const idxBL = (yCeil * src.width + xFloor) * 4;
      const idxBR = (yCeil * src.width + xCeil) * 4;

      const outIdx = (outY * targetW + outX) * 4;

      for (let c = 0; c < 4; c++) {
        const top = src.pixels[idxTL + c] * (1 - xFrac) + src.pixels[idxTR + c] * xFrac;
        const bot = src.pixels[idxBL + c] * (1 - xFrac) + src.pixels[idxBR + c] * xFrac;
        const val = Math.round(top * (1 - yFrac) + bot * yFrac);

        // Alpha blend over background
        if (c < 3) {
          const srcAlpha = (top * (1 - yFrac) + bot * yFrac); // alpha is channel 3
          // for RGB we store directly if alpha > 0
          outPixels[outIdx + c] = val;
        } else {
          outPixels[outIdx + c] = val;
        }
      }
    }
  }

  return encodePNG(targetW, targetH, outPixels);
}

// Generate splash screen with centered logo
function generateSplash(src, targetW, targetH) {
  const outPixels = Buffer.alloc(targetW * targetH * 4);
  // Editorial background: #090A0C
  const bgR = 9, bgG = 10, bgB = 12, bgA = 255;
  for (let i = 0; i < targetW * targetH; i++) {
    outPixels[i * 4] = bgR;
    outPixels[i * 4 + 1] = bgG;
    outPixels[i * 4 + 2] = bgB;
    outPixels[i * 4 + 3] = bgA;
  }

  // Logo size ~ 45% of shortest side
  const logoSize = Math.round(Math.min(targetW, targetH) * 0.45);
  const startX = Math.round((targetW - logoSize) / 2);
  const startY = Math.round((targetH - logoSize) / 2);

  const ratio = src.width / logoSize;

  for (let y = 0; y < logoSize; y++) {
    const srcY = Math.min(src.height - 1, Math.floor(y * ratio));
    const outY = startY + y;
    for (let x = 0; x < logoSize; x++) {
      const srcX = Math.min(src.width - 1, Math.floor(x * ratio));
      const outX = startX + x;

      const srcIdx = (srcY * src.width + srcX) * 4;
      const outIdx = (outY * targetW + outX) * 4;

      const alpha = src.pixels[srcIdx + 3] / 255;
      if (alpha > 0) {
        outPixels[outIdx] = Math.round(src.pixels[srcIdx] * alpha + bgR * (1 - alpha));
        outPixels[outIdx + 1] = Math.round(src.pixels[srcIdx + 1] * alpha + bgG * (1 - alpha));
        outPixels[outIdx + 2] = Math.round(src.pixels[srcIdx + 2] * alpha + bgB * (1 - alpha));
        outPixels[outIdx + 3] = 255;
      }
    }
  }

  return encodePNG(targetW, targetH, outPixels);
}

console.log('Reading master logo...');
const masterBuf = fs.readFileSync('public/logo.png');
const parsed = parsePNG(masterBuf);
console.log(`Master logo parsed: ${parsed.width}x${parsed.height}`);

// 1. Web assets
console.log('Generating web assets...');
fs.writeFileSync('public/favicon.png', resizeImage(parsed, 64, 64));
fs.writeFileSync('public/favicon-32.png', resizeImage(parsed, 32, 32));
fs.writeFileSync('public/apple-touch-icon.png', resizeImage(parsed, 180, 180, { padFraction: 0.05, bgColor: [9, 10, 12, 255] }));
fs.writeFileSync('public/icon-192.png', resizeImage(parsed, 192, 192));
fs.writeFileSync('public/icon-512.png', resizeImage(parsed, 512, 512));

// 2. Android Mipmaps
const mipmaps = [
  { dir: 'android/app/src/main/res/mipmap-mdpi', size: 48, fgSize: 108 },
  { dir: 'android/app/src/main/res/mipmap-hdpi', size: 72, fgSize: 162 },
  { dir: 'android/app/src/main/res/mipmap-xhdpi', size: 96, fgSize: 216 },
  { dir: 'android/app/src/main/res/mipmap-xxhdpi', size: 144, fgSize: 324 },
  { dir: 'android/app/src/main/res/mipmap-xxxhdpi', size: 192, fgSize: 432 }
];

console.log('Generating Android launcher icons...');
for (const m of mipmaps) {
  if (!fs.existsSync(m.dir)) fs.mkdirSync(m.dir, { recursive: true });
  // Standard launcher icon
  fs.writeFileSync(path.join(m.dir, 'ic_launcher.png'), resizeImage(parsed, m.size, m.size, { bgColor: [9, 10, 12, 255], padFraction: 0.05 }));
  // Round launcher icon
  fs.writeFileSync(path.join(m.dir, 'ic_launcher_round.png'), resizeImage(parsed, m.size, m.size, { bgColor: [9, 10, 12, 255], padFraction: 0.05, circular: true }));
  // Foreground for adaptive icons (inner 72dp safe zone in 108dp canvas -> padFraction ~0.16)
  fs.writeFileSync(path.join(m.dir, 'ic_launcher_foreground.png'), resizeImage(parsed, m.fgSize, m.fgSize, { padFraction: 0.16 }));
}

// 3. Android Splash Screens
const splashes = [
  { file: 'android/app/src/main/res/drawable/splash.png', w: 480, h: 800 },
  { file: 'android/app/src/main/res/drawable-port-mdpi/splash.png', w: 320, h: 480 },
  { file: 'android/app/src/main/res/drawable-port-hdpi/splash.png', w: 480, h: 800 },
  { file: 'android/app/src/main/res/drawable-port-xhdpi/splash.png', w: 720, h: 1280 },
  { file: 'android/app/src/main/res/drawable-port-xxhdpi/splash.png', w: 960, h: 1600 },
  { file: 'android/app/src/main/res/drawable-port-xxxhdpi/splash.png', w: 1280, h: 1920 },
  { file: 'android/app/src/main/res/drawable-land-mdpi/splash.png', w: 480, h: 320 },
  { file: 'android/app/src/main/res/drawable-land-hdpi/splash.png', w: 800, h: 480 },
  { file: 'android/app/src/main/res/drawable-land-xhdpi/splash.png', w: 1280, h: 720 },
  { file: 'android/app/src/main/res/drawable-land-xxhdpi/splash.png', w: 1600, h: 960 },
  { file: 'android/app/src/main/res/drawable-land-xxxhdpi/splash.png', w: 1920, h: 1280 }
];

console.log('Generating Android splash screens...');
for (const s of splashes) {
  const dir = path.dirname(s.file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(s.file, generateSplash(parsed, s.w, s.h));
}

console.log('✅ ALL BRAND ASSETS GENERATED SUCCESSFULLY!');
