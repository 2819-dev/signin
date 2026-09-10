"use strict";

/**
 * Shared Synk mark (CLEAR-inspired geometric iris).
 * Used by logo SVG + Synk touch icons.
 */
const ACCENT = "#00B4A6";
const INK = "#0A0A0A";

function synkLogoSvg({ size = 128, ink = INK, accent = ACCENT, title = "Synk" } = {}) {
  const cx = size / 2;
  const cy = size / 2;
  const s = size / 128;

  const ticks = [];
  const tickCount = 8;
  const rInner = 31 * s;
  const rOuter = 42 * s;
  for (let i = 0; i < tickCount; i += 1) {
    const a = (Math.PI * 2 * i) / tickCount - Math.PI / 2;
    // Offset ticks so they sit between clock positions for a quieter look
    const a2 = a + Math.PI / tickCount;
    const x1 = cx + Math.cos(a2) * rInner;
    const y1 = cy + Math.sin(a2) * rInner;
    const x2 = cx + Math.cos(a2) * rOuter;
    const y2 = cy + Math.sin(a2) * rOuter;
    ticks.push(
      `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="${ink}" stroke-width="${(4 * s).toFixed(2)}" stroke-linecap="round"/>`
    );
  }

  const arcR = 50 * s;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="${title}">
  <title>${title}</title>
  <!-- outer ring -->
  <circle cx="${cx}" cy="${cy}" r="${(50 * s).toFixed(2)}" fill="none" stroke="${ink}" stroke-width="${(6.5 * s).toFixed(2)}"/>
  <!-- iris ticks -->
  ${ticks.join("\n  ")}
  <!-- mid ring -->
  <circle cx="${cx}" cy="${cy}" r="${(26 * s).toFixed(2)}" fill="none" stroke="${ink}" stroke-width="${(4.5 * s).toFixed(2)}"/>
  <!-- teal sync arc (top-right) -->
  <path d="M ${(cx + arcR * 0.15).toFixed(2)} ${(cy - arcR * 0.99).toFixed(2)} A ${arcR.toFixed(2)} ${arcR.toFixed(2)} 0 0 1 ${(cx + arcR * 0.99).toFixed(2)} ${(cy - arcR * 0.15).toFixed(2)}" fill="none" stroke="${accent}" stroke-width="${(6.5 * s).toFixed(2)}" stroke-linecap="round"/>
  <!-- pupil -->
  <circle cx="${cx}" cy="${cy}" r="${(15 * s).toFixed(2)}" fill="${accent}"/>
  <!-- specular -->
  <circle cx="${(cx - 4.8 * s).toFixed(2)}" cy="${(cy - 4.8 * s).toFixed(2)}" r="${(3.4 * s).toFixed(2)}" fill="#FFFFFF" fill-opacity="0.95"/>
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
