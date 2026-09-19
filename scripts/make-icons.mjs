// Renders the app icons from one SVG. Usage: node scripts/make-icons.mjs
import sharp from 'sharp';

const glyph = (scale) => `
  <g transform="translate(256 256) scale(${scale}) translate(-256 -256)" fill="none" stroke="#fff" stroke-width="34" stroke-linecap="round" stroke-linejoin="round">
    <path d="M150 400h212"/>
    <path d="M170 360a86 86 0 0 1 172 0z" fill="#fff"/>
    <path d="M256 190v-24"/>
    <circle cx="256" cy="150" r="16" fill="#fff" stroke="none"/>
  </g>`;
const svg = (scale, rounded) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${rounded ? 112 : 0}" fill="#c2410c"/>
  ${glyph(scale)}
</svg>`;

const out = [
  ['public/icons/icon-192.png', 192, svg(1, true)],
  ['public/icons/icon-512.png', 512, svg(1, true)],
  ['public/icons/maskable-512.png', 512, svg(0.8, false)],
  ['public/icons/apple-touch-icon.png', 180, svg(0.9, false)],
];
for (const [file, size, source] of out) {
  await sharp(Buffer.from(source)).resize(size, size).png().toFile(file);
  console.log('wrote', file);
}
await import('node:fs').then((fs) => fs.writeFileSync('public/favicon.svg', svg(1, true).trim() + '\n'));
