// Generates every brand bitmap from one vector definition, so the mark never drifts between apps.
// Usage: cd design/brand && npm install && npm run generate
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');

const INK = '#0A0C08';
const LIME = '#C9F45A';
const CANVAS = 1024;

/** Coin + crown (watch face) with a rounded M. Drawn on a 1024 canvas, optically centered. */
function mark({ scale = 1 } = {}) {
  const center = CANVAS / 2;
  return `
  <g transform="translate(${center} ${center}) scale(${scale}) translate(${-center - 20} ${-center})">
    <rect x="828" y="468" width="58" height="88" rx="20" fill="${LIME}"/>
    <circle cx="512" cy="512" r="330" fill="${LIME}"/>
    <path d="M382 640 V392 L512 530 L642 392 V640" fill="none" stroke="${INK}" stroke-width="74"
          stroke-linecap="round" stroke-linejoin="round"/>
  </g>`;
}

const svg = (body, background) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS}" height="${CANVAS}" viewBox="0 0 ${CANVAS} ${CANVAS}">` +
  (background ? `<rect width="${CANVAS}" height="${CANVAS}" fill="${background}"/>` : '') +
  body +
  `</svg>`;

const variants = {
  // Full-bleed store / legacy icon.
  icon: { svg: svg(mark({ scale: 0.86 }), INK), size: 1024 },
  // Android adaptive foreground: content must live inside the central 66% safe zone.
  adaptive: { svg: svg(mark({ scale: 0.6 })), size: 1024 },
  // Splash: mark alone, the background color comes from app.json.
  splash: { svg: svg(mark({ scale: 0.9 })), size: 512 },
};

const targets = ['apps/mobile/assets', 'apps/watch/wearos/assets'];

writeFileSync(join(here, 'mark.svg'), svg(mark({ scale: 0.86 }), INK));

for (const target of targets) {
  const dir = join(root, target);
  mkdirSync(dir, { recursive: true });
  for (const [name, { svg: source, size }] of Object.entries(variants)) {
    const file = join(dir, `${name}.png`);
    await sharp(Buffer.from(source)).resize(size, size).png().toFile(file);
    console.log(`wrote ${target}/${name}.png`);
  }
}
