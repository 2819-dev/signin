"use strict";

/**
 * Shared Synk mark — minimal dual-tone S monogram.
 * CLEAR-adjacent simplicity (bold, geometric, high-contrast) without copying CLEAR's halo.
 */
const ACCENT = "#00B4A6";
const INK = "#0A0A0A";

/**
 * A continuous S drawn as two stroke segments that meet in the middle.
 * Upper = ink, lower = teal accent. viewBox 0 0 128 128.
 */
function synkLogoSvg({
  size = 128,
  ink = INK,
  accent = ACCENT,
  title = "Synk",
} = {}) {
  const s = size / 128;
  const stroke = 15 * s;

  // Classic S geometry, split at the waist for the two-tone brand treatment
  const upper =
    `M ${(34 * s).toFixed(2)} ${(40 * s).toFixed(2)} ` +
    `C ${(34 * s).toFixed(2)} ${(24 * s).toFixed(2)} ${(48 * s).toFixed(2)} ${(16 * s).toFixed(2)} ${(64 * s).toFixed(2)} ${(16 * s).toFixed(2)} ` +
    `C ${(84 * s).toFixed(2)} ${(16 * s).toFixed(2)} ${(96 * s).toFixed(2)} ${(28 * s).toFixed(2)} ${(96 * s).toFixed(2)} ${(44 * s).toFixed(2)} ` +
    `C ${(96 * s).toFixed(2)} ${(56 * s).toFixed(2)} ${(88 * s).toFixed(2)} ${(62 * s).toFixed(2)} ${(74 * s).toFixed(2)} ${(66 * s).toFixed(2)} ` +
    `L ${(54 * s).toFixed(2)} ${(72 * s).toFixed(2)}`;

  const lower =
    `M ${(74 * s).toFixed(2)} ${(66 * s).toFixed(2)} ` +
    `L ${(54 * s).toFixed(2)} ${(72 * s).toFixed(2)} ` +
    `C ${(40 * s).toFixed(2)} ${(76 * s).toFixed(2)} ${(32 * s).toFixed(2)} ${(82 * s).toFixed(2)} ${(32 * s).toFixed(2)} ${(94 * s).toFixed(2)} ` +
    `C ${(32 * s).toFixed(2)} ${(110 * s).toFixed(2)} ${(46 * s).toFixed(2)} ${(122 * s).toFixed(2)} ${(64 * s).toFixed(2)} ${(122 * s).toFixed(2)} ` +
    `C ${(80 * s).toFixed(2)} ${(122 * s).toFixed(2)} ${(94 * s).toFixed(2)} ${(114 * s).toFixed(2)} ${(94 * s).toFixed(2)} ${(98 * s).toFixed(2)}`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="${title}">
  <title>${title}</title>
  <path d="${upper}" fill="none" stroke="${ink}" stroke-width="${stroke.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="${lower}" fill="none" stroke="${accent}" stroke-width="${stroke.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/>
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
