"use strict";

/**
 * Shared Synk mark — solid single-color S monogram.
 * One color only. No gradients, glass, or multi-tone splits.
 */
const INK = "#041A55";
const ACCENT = "#041A55"; // API compat; mark is monochrome

function synkLogoSvg({
  size = 128,
  ink = INK,
  accent = ACCENT,
  title = "Synk",
} = {}) {
  void accent;
  const s = size / 128;

  // Solid geometric S — single fill, no stroke tricks
  const path =
    `M ${(64 * s).toFixed(2)} ${(12 * s).toFixed(2)} ` +
    `C ${(45.5 * s).toFixed(2)} ${(12 * s).toFixed(2)} ${(32 * s).toFixed(2)} ${(24.5 * s).toFixed(2)} ${(32 * s).toFixed(2)} ${(41 * s).toFixed(2)} ` +
    `H ${(49.5 * s).toFixed(2)} ` +
    `C ${(49.5 * s).toFixed(2)} ${(34 * s).toFixed(2)} ${(55.5 * s).toFixed(2)} ${(28 * s).toFixed(2)} ${(64 * s).toFixed(2)} ${(28 * s).toFixed(2)} ` +
    `C ${(73.5 * s).toFixed(2)} ${(28 * s).toFixed(2)} ${(79 * s).toFixed(2)} ${(33.5 * s).toFixed(2)} ${(79 * s).toFixed(2)} ${(41 * s).toFixed(2)} ` +
    `C ${(79 * s).toFixed(2)} ${(48 * s).toFixed(2)} ${(74 * s).toFixed(2)} ${(52.5 * s).toFixed(2)} ${(61.5 * s).toFixed(2)} ${(56.5 * s).toFixed(2)} ` +
    `L ${(49 * s).toFixed(2)} ${(60.5 * s).toFixed(2)} ` +
    `C ${(36.5 * s).toFixed(2)} ${(64.5 * s).toFixed(2)} ${(30 * s).toFixed(2)} ${(73 * s).toFixed(2)} ${(30 * s).toFixed(2)} ${(85 * s).toFixed(2)} ` +
    `C ${(30 * s).toFixed(2)} ${(104 * s).toFixed(2)} ${(44 * s).toFixed(2)} ${(116 * s).toFixed(2)} ${(64 * s).toFixed(2)} ${(116 * s).toFixed(2)} ` +
    `C ${(84.5 * s).toFixed(2)} ${(116 * s).toFixed(2)} ${(98 * s).toFixed(2)} ${(103 * s).toFixed(2)} ${(98 * s).toFixed(2)} ${(85 * s).toFixed(2)} ` +
    `H ${(80.5 * s).toFixed(2)} ` +
    `C ${(80.5 * s).toFixed(2)} ${(94.5 * s).toFixed(2)} ${(74 * s).toFixed(2)} ${(100.5 * s).toFixed(2)} ${(64 * s).toFixed(2)} ${(100.5 * s).toFixed(2)} ` +
    `C ${(53.5 * s).toFixed(2)} ${(100.5 * s).toFixed(2)} ${(47.5 * s).toFixed(2)} ${(94.5 * s).toFixed(2)} ${(47.5 * s).toFixed(2)} ${(86 * s).toFixed(2)} ` +
    `C ${(47.5 * s).toFixed(2)} ${(78.5 * s).toFixed(2)} ${(52.5 * s).toFixed(2)} ${(74 * s).toFixed(2)} ${(64.5 * s).toFixed(2)} ${(70 * s).toFixed(2)} ` +
    `L ${(77 * s).toFixed(2)} ${(66 * s).toFixed(2)} ` +
    `C ${(90 * s).toFixed(2)} ${(61.5 * s).toFixed(2)} ${(96.5 * s).toFixed(2)} ${(52.5 * s).toFixed(2)} ${(96.5 * s).toFixed(2)} ${(40 * s).toFixed(2)} ` +
    `C ${(96.5 * s).toFixed(2)} ${(23.5 * s).toFixed(2)} ${(83.5 * s).toFixed(2)} ${(12 * s).toFixed(2)} ${(64 * s).toFixed(2)} ${(12 * s).toFixed(2)} ` +
    `Z`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="${title}">
  <title>${title}</title>
  <path d="${path}" fill="${ink}"/>
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
