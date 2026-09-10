"use strict";

/**
 * Shared Synk mark — abstract concentric arcs.
 * Single color. No letters, gradients, glass, or multi-tone.
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
  const cx = 64 * s;
  const cy = 64 * s;
  const stroke = 12 * s;

  // Alternating open sides: outer left, middle right, inner left
  const arcs = [
    { r: 48 * s, gapAt: 180 }, // gap faces left
    { r: 31 * s, gapAt: 0 }, // gap faces right
    { r: 14 * s, gapAt: 180 }, // gap faces left
  ];
  const sweep = 268; // leave ~92° open

  function arcPath(r, gapAtDeg) {
    const startDeg = gapAtDeg + (360 - sweep) / 2;
    const start = (startDeg * Math.PI) / 180;
    const end = ((startDeg + sweep) * Math.PI) / 180;
    const x1 = cx + r * Math.cos(start);
    const y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end);
    const y2 = cy + r * Math.sin(end);
    return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r.toFixed(2)} ${r.toFixed(2)} 0 1 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
  }

  const paths = arcs
    .map(
      (a) =>
        `<path d="${arcPath(a.r, a.gapAt)}" fill="none" stroke="${ink}" stroke-width="${stroke.toFixed(2)}" stroke-linecap="round"/>`
    )
    .join("\n  ");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="${title}">
  <title>${title}</title>
  ${paths}
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
