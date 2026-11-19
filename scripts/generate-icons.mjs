// Generates the PWA / Apple touch icons as PNGs without external dependencies.
// Usage: npm run icons
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const BG = [0xf3, 0xe6, 0xd3];
const SHADOW = [0xe2, 0xd0, 0xb6];
const CRUST = [0xa5, 0x69, 0x3a];
const SCORE = [0xef, 0xd3, 0xa8];

// Shapes in unit coordinates (0..1). Everything sits inside the maskable safe zone (r = 0.4).
function colorAt(x, y) {
  // Loaf: upper half-ellipse dome with a flat-ish base
  const cx = 0.5, cy = 0.62, rx = 0.34, ry = 0.3;
  const nx = (x - cx) / rx, ny = (y - cy) / ry;
  const inDome = y <= cy && nx * nx + ny * ny <= 1;
  // Base: short band under the dome with rounded bottom corners
  const bottom = 0.72, cr = 0.07, cornerTop = bottom - cr;
  const halfWidth = y <= cornerTop ? rx : rx - cr + Math.sqrt(Math.max(0, cr * cr - (y - cornerTop) ** 2));
  const inBase = y > cy && y <= bottom && Math.abs(x - cx) <= halfWidth;
  if (inDome || inBase) {
    // Score: arc band of a smaller ellipse, upper part only
    const sx = (x - 0.5) / 0.22, sy = (y - 0.62) / 0.15;
    const d = Math.sqrt(sx * sx + sy * sy);
    if (d > 0.9 && d < 1.07 && y < 0.56) return SCORE;
    return CRUST;
  }
  const shx = (x - 0.5) / 0.3, shy = (y - 0.78) / 0.04;
  if (shx * shx + shy * shy <= 1) return SHADOW;
  return BG;
}

function render(size) {
  const SS = 4; // supersampling for anti-aliasing
  const rowLen = size * 3 + 1;
  const raw = Buffer.alloc(rowLen * size);
  for (let py = 0; py < size; py++) {
    raw[py * rowLen] = 0; // filter: none
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const c = colorAt((px + (sx + 0.5) / SS) / size, (py + (sy + 0.5) / SS) / size);
          r += c[0]; g += c[1]; b += c[2];
        }
      }
      const n = SS * SS, o = py * rowLen + 1 + px * 3;
      raw[o] = Math.round(r / n); raw[o + 1] = Math.round(g / n); raw[o + 2] = Math.round(b / n);
    }
  }
  return encodePng(size, size, raw);
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function encodePng(w, h, raw) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync('public', { recursive: true });
for (const [name, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180]]) {
  writeFileSync(`public/${name}`, render(size));
  console.log(`public/${name} (${size}×${size})`);
}
