"use strict";

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { ACCENT, INK, synkLogoSvg, extractSvgBody } = require("./synk-mark");

const ROOT = path.join(__dirname, "..");

function synkAdminTouchSvg(size = 180) {
  const mark = synkLogoSvg({ size: 120, ink: INK, accent: ACCENT });
  const inner = extractSvgBody(mark);
  const pad = (size - 120) / 2;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#FFFFFF"/>
  <g transform="translate(${pad} ${pad})">
    ${inner}
  </g>
</svg>`;
}

function synkIdTouchSvg(size = 180) {
  const mark = synkLogoSvg({ size: 120, ink: "#FFFFFF", accent: ACCENT });
  const inner = extractSvgBody(mark);
  const pad = (size - 120) / 2;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#0A0A0A"/>
  <g transform="translate(${pad} ${pad})">
    ${inner}
  </g>
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

  const body = extractSvgBody(logo);
  const onLight = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#F5F5F7"/>
  <g transform="translate(96 96) scale(2.5)">${body}</g>
</svg>`;
  const onDark = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#0A0A0A"/>
  <g transform="translate(96 96) scale(2.5)">${extractSvgBody(synkLogoSvg({ size: 128, ink: "#FFFFFF", accent: ACCENT }))}</g>
</svg>`;

  await writePng(onLight, path.join("/opt/cursor/artifacts", "synk-logo-preview.png"), 512);
  await writePng(onDark, path.join("/opt/cursor/artifacts", "synk-logo-preview-dark.png"), 512);
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
