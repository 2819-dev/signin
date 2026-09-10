"use strict";

/**
 * Shared Synk mark — two horizontal sync bars.
 * Abstract, modern, minimal. Not a letterform.
 */
const INK = "#041A55";
const ACCENT = "#041A55";

function synkLogoSvg({
  size = 128,
  ink = INK,
  accent = ACCENT,
  title = "Synk",
} = {}) {
  void accent;
  const s = size / 128;

  // Two parallel rounded bars — reads as "sync", never as "S"
  const bar = (x, y, w, h) =>
    `<rect x="${(x * s).toFixed(2)}" y="${(y * s).toFixed(2)}" width="${(w * s).toFixed(2)}" height="${(h * s).toFixed(2)}" rx="${((h * s) / 2).toFixed(2)}" fill="${ink}"/>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="${title}">
  <title>${title}</title>
  ${bar(18, 40, 92, 18)}
  ${bar(18, 70, 92, 18)}
</svg>
`;
}

function extractSvgBody(svg) {
  return svg
    .replace(/^[\s\S]*?<svg[^>]*>/, "")
    .replace(/<\/svg>\s*$/, "")
    .replace(/<title>[\s\S]*?<\/title>\s*/g, "");
}

module.exports = {
  ACCENT,
  INK,
  synkLogoSvg,
  extractSvgBody,
};
