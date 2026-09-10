"use strict";

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { ACCENT, INK, synkLogoSvg, extractSvgBody } = require("./synk-mark");

const ROOT = path.join(__dirname, "..");

function synkAdminTouchSvg(size = 180) {
  const mark = synkLogoSvg({ size: 118, ink: INK, accent: ACCENT });
  const inner = extractSvgBody(mark);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="${size}" y2="${size}" gradientUnits="userSpaceOnUse">
      <stop stop-color="#FFFFFF"/>
      <stop offset="1" stop-color="#E4F8F6"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#bg)"/>
  <g transform="translate(31 24)">
    ${inner}
  </g>
  <circle cx="138" cy="138" r="26" fill="#0A0A0A"/>
  <circle cx="138" cy="138" r="22" fill="${ACCENT}"/>
  <path d="M138 124c7.8 0 15.5 3.9 15.5 9.8v7.5c0 6.9-6.3 12.8-15.5 16.2-9.2-3.4-15.5-9.3-15.5-16.2v-7.5c0-5.9 7.7-9.8 15.5-9.8z" fill="#ffffff"/>
  <circle cx="138" cy="139" r="4" fill="${ACCENT}"/>
  <rect x="136.2" y="141" width="3.6" height="7.2" rx="1.8" fill="${ACCENT}"/>
</svg>`;
}

function synkIdTouchSvg(size = 180) {
  const mark = synkLogoSvg({ size: 118, ink: "#FFFFFF", accent: ACCENT });
  const inner = extractSvgBody(mark);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="10" y1="0" x2="170" y2="180" gradientUnits="userSpaceOnUse">
      <stop stop-color="#1A1A1A"/>
      <stop offset="1" stop-color="#0A0A0A"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#bg)"/>
  <circle cx="40" cy="36" r="40" fill="#ffffff" fill-opacity="0.06"/>
  <g transform="translate(31 24)">
    ${inner}
  </g>
  <circle cx="138" cy="138" r="26" fill="${ACCENT}"/>
  <circle cx="138" cy="138" r="22" fill="#ffffff"/>
  <circle cx="138" cy="128" r="7" fill="${ACCENT}"/>
  <path d="M123 150c0-8.3 6.4-14.2 15-14.2s15 5.9 15 14.2" fill="${ACCENT}"/>
  <circle cx="152" cy="124" r="8" fill="#0A0A0A"/>
  <path d="M152 119.5 v9 M147.5 124 h9" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round"/>
</svg>`;
}

async function writePng(svg, outPath, size) {
  const buf = await sharp(Buffer.from(svg))
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toBuffer();
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, buf);
  console.log("wrote", outPath, buf.length, "bytes");
}

async function main() {
  const logo = synkLogoSvg({ size: 128 });
  const logoPath = path.join(ROOT, "public", "synk-logo.svg");
  fs.writeFileSync(logoPath, logo);
  console.log("wrote", logoPath);

  await writePng(synkAdminTouchSvg(), path.join(ROOT, "synk-admin", "src", "apple-touch-icon.png"), 180);
  await writePng(synkIdTouchSvg(), path.join(ROOT, "synk-id", "src", "apple-touch-icon.png"), 180);

  await writePng(logo, path.join("/opt/cursor/artifacts", "synk-logo-preview.png"), 512);
  await writePng(synkAdminTouchSvg(), path.join("/opt/cursor/artifacts", "synk-admin-apple-touch-icon.png"), 180);
  await writePng(synkIdTouchSvg(), path.join("/opt/cursor/artifacts", "synk-id-apple-touch-icon.png"), 180);
}

module.exports = { synkAdminTouchSvg, synkIdTouchSvg };

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
