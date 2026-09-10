// 依存なしで PNG アイコンを生成する（zlib で PNG をエンコード）。
// デザイン：紙(paper)地に墨(sumi)の枠、朱(shu)のコマ。角丸なし。
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";

// 秘密の書庫パレット
const VAULT = [0x16, 0x11, 0x0b]; // 書庫の闇（地）
const PARCHMENT = [0xec, 0xe1, 0xc6]; // 羊皮紙
const BRASS = [0xc6, 0xa5, 0x61]; // 真鍮の金（枠）
const SEAL = [0x9d, 0x2b, 0x22]; // 封蝋の朱

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePNG(size, draw) {
  const px = (x, y) => {
    const p = draw(x, y);
    return p;
  };
  // rawデータ：各行の先頭にフィルタバイト0
  const raw = Buffer.alloc(size * (size * 4 + 1));
  let o = 0;
  for (let y = 0; y < size; y++) {
    raw[o++] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b] = px(x, y);
      raw[o++] = r;
      raw[o++] = g;
      raw[o++] = b;
      raw[o++] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// pad: マスカブル用に周囲余白を増やす（0〜1）
function makeDrawer(size, pad = 0.0) {
  const inset = Math.floor(size * (0.06 + pad)); // 外余白
  const border = Math.max(2, Math.floor(size * 0.045)); // 枠線幅
  const frameL = inset;
  const frameR = size - inset;
  const gutter = Math.floor(size * 0.035);
  // 下部に朱のコマ、上部に紙のコマ（コマ割り）
  const splitY = Math.floor(size * 0.6);
  return (x, y) => {
    // 外側は書庫の闇
    if (x < frameL || x >= frameR || y < frameL || y >= frameR) return VAULT;
    // 金の外枠
    const onFrame =
      x < frameL + border ||
      x >= frameR - border ||
      y < frameL + border ||
      y >= frameR - border;
    if (onFrame) return BRASS;
    // 上段：羊皮紙／ガター（闇）／下段：封蝋の朱
    if (y > splitY && y < splitY + gutter) return VAULT;
    if (y >= splitY + gutter) {
      const b = border;
      const inFrame =
        x < frameL + border + b ||
        x >= frameR - border - b ||
        y >= frameR - border - b;
      if (inFrame) return BRASS;
      return SEAL;
    }
    return PARCHMENT;
  };
}

mkdirSync(new URL("../public/icons", import.meta.url), { recursive: true });

const targets = [
  ["icon-192.png", 192, 0.0],
  ["icon-512.png", 512, 0.0],
  ["icon-maskable-512.png", 512, 0.06],
  ["apple-touch-icon.png", 180, 0.0],
];

for (const [name, size, pad] of targets) {
  const buf = encodePNG(size, makeDrawer(size, pad));
  writeFileSync(new URL(`../public/icons/${name}`, import.meta.url), buf);
  console.log(`✓ ${name} (${size}x${size})`);
}
console.log("=== アイコン生成完了 ===");
