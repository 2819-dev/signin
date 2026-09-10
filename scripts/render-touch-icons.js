"use strict";

/**
 * Render crisp Apple touch icons (180x180) for:
 * - Visitor kiosk
 * - Visitor admin
 * - Synk Admin
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const SIZE = 180;

function kioskSvg() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 180 180">
  <defs>
    <linearGradient id="bg" x1="18" y1="8" x2="162" y2="172" gradientUnits="userSpaceOnUse">
      <stop stop-color="#5B9BFF"/>
      <stop offset="1" stop-color="#1E4FD6"/>
    </linearGradient>
  </defs>
  <rect width="180" height="180" fill="url(#bg)"/>
  <!-- soft highlight -->
  <circle cx="48" cy="42" r="46" fill="#ffffff" fill-opacity="0.14"/>

  <!-- doorway / tablet frame -->
  <rect x="48" y="40" width="84" height="100" rx="14" fill="none" stroke="#ffffff" stroke-width="8"/>
  <!-- open door -->
  <path d="M78 52 L118 44 L118 136 L78 128 Z" fill="#ffffff"/>
  <circle cx="108" cy="90" r="4.5" fill="#2B6BFF"/>
  <!-- welcome check -->
  <circle cx="132" cy="132" r="22" fill="#ffffff"/>
  <path d="M122 132 l7 7 14-16" fill="none" stroke="#1E4FD6" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}

function visitorAdminSvg() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 180 180">
  <defs>
    <linearGradient id="bg" x1="10" y1="0" x2="170" y2="180" gradientUnits="userSpaceOnUse">
      <stop stop-color="#243B8F"/>
      <stop offset="1" stop-color="#2B6BFF"/>
    </linearGradient>
  </defs>
  <rect width="180" height="180" fill="url(#bg)"/>
  <circle cx="140" cy="34" r="40" fill="#ffffff" fill-opacity="0.10"/>

  <!-- clipboard -->
  <rect x="52" y="42" width="76" height="96" rx="12" fill="#ffffff"/>
  <rect x="72" y="34" width="36" height="16" rx="8" fill="#ffffff"/>
  <rect x="78" y="38" width="24" height="8" rx="4" fill="#2B6BFF"/>

  <!-- list lines -->
  <rect x="68" y="70" width="36" height="7" rx="3.5" fill="#C9D8FF"/>
  <rect x="68" y="88" width="44" height="7" rx="3.5" fill="#C9D8FF"/>
  <rect x="68" y="106" width="28" height="7" rx="3.5" fill="#C9D8FF"/>

  <!-- approve checks -->
  <circle cx="118" cy="73.5" r="8" fill="#1E4FD6"/>
  <path d="M114 73.5 l3 3 6-7" fill="none" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="118" cy="91.5" r="8" fill="#1E4FD6"/>
  <path d="M114 91.5 l3 3 6-7" fill="none" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>

  <!-- admin badge -->
  <circle cx="138" cy="138" r="26" fill="#0B1B4A"/>
  <circle cx="138" cy="138" r="22" fill="#ffffff"/>
  <path d="M138 122.5c8 0 16 4.2 16 10.5v8.2c0 7.2-6.6 13.3-16 16.8-9.4-3.5-16-9.6-16-16.8v-8.2c0-6.3 8-10.5 16-10.5z" fill="#2B6BFF"/>
  <circle cx="138" cy="139" r="4.2" fill="#ffffff"/>
  <rect x="136.2" y="141" width="3.6" height="7.5" rx="1.8" fill="#ffffff"/>
</svg>`;
}

function synkAdminSvg() {
  // Concentric dotted iris + admin shield badge
  const dots = [];
  const cx = 78;
  const cy = 78;
  const rings = [
    { r: 10, n: 8, o: 0.95 },
    { r: 18, n: 12, o: 0.9 },
    { r: 26, n: 16, o: 0.85 },
    { r: 34, n: 20, o: 0.8 },
    { r: 42, n: 24, o: 0.75 },
    { r: 50, n: 28, o: 0.7 },
    { r: 58, n: 32, o: 0.62 },
  ];
  for (const ring of rings) {
    for (let i = 0; i < ring.n; i += 1) {
      const a = (Math.PI * 2 * i) / ring.n - Math.PI / 2;
      // leave gap at bottom-right for badge
      const deg = ((a + Math.PI / 2) * 180) / Math.PI;
      if (ring.r >= 42 && deg > 20 && deg < 95) continue;
      const x = cx + Math.cos(a) * ring.r;
      const y = cy + Math.sin(a) * ring.r;
      dots.push(
        `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="3.1" fill="#2B6BFF" fill-opacity="${ring.o}"/>`
      );
    }
  }
  // center cluster
  dots.push(`<circle cx="${cx}" cy="${cy}" r="3.4" fill="#2B6BFF"/>`);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 180 180">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="180" y2="180" gradientUnits="userSpaceOnUse">
      <stop stop-color="#FFFFFF"/>
      <stop offset="1" stop-color="#EAF1FF"/>
    </linearGradient>
  </defs>
  <rect width="180" height="180" fill="url(#bg)"/>
  ${dots.join("\n  ")}

  <!-- admin badge -->
  <circle cx="132" cy="132" r="28" fill="#101828"/>
  <circle cx="132" cy="132" r="24" fill="#2B6BFF"/>
  <path d="M132 116c8.8 0 17.5 4.4 17.5 11v8.5c0 7.8-7.1 14.4-17.5 18.2-10.4-3.8-17.5-10.4-17.5-18.2V127c0-6.6 8.7-11 17.5-11z" fill="#ffffff"/>
  <circle cx="132" cy="133" r="4.6" fill="#2B6BFF"/>
  <rect x="130" y="135.5" width="4" height="8.5" rx="2" fill="#2B6BFF"/>
</svg>`;
}

async function writePng(svg, outPath) {
  const buf = await sharp(Buffer.from(svg))
    .resize(SIZE, SIZE)
    .png({ compressionLevel: 9 })
    .toBuffer();
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, buf);
  console.log("wrote", outPath, buf.length, "bytes");
}

async function main() {
  const root = path.join(__dirname, "..");
  await writePng(kioskSvg(), path.join(root, "public", "apple-touch-icon.png"));
  await writePng(visitorAdminSvg(), path.join(root, "public", "admin-touch-icon.png"));
  await writePng(synkAdminSvg(), path.join(root, "synk-admin", "src", "apple-touch-icon.png"));
  // also drop a preview copy under artifacts
  await writePng(kioskSvg(), path.join("/opt/cursor/artifacts", "kiosk-apple-touch-icon.png"));
  await writePng(visitorAdminSvg(), path.join("/opt/cursor/artifacts", "admin-apple-touch-icon.png"));
  await writePng(synkAdminSvg(), path.join("/opt/cursor/artifacts", "synk-admin-apple-touch-icon.png"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
