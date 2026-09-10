"use strict";

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const publicDir = path.join(root, "public");
const sourcePublic = path.join(root, "..", "public");
const sourceHtml = path.join(root, "src", "index.html");

fs.mkdirSync(publicDir, { recursive: true });

const assets = [
  "styles.css",
  "face.js",
  "force-refresh.js",
  "synk-logo.svg",
  "version.json",
];

for (const name of assets) {
  const from = path.join(sourcePublic, name);
  const to = path.join(publicDir, name);
  if (!fs.existsSync(from)) {
    throw new Error(`Missing shared asset: ${from}`);
  }
  fs.copyFileSync(from, to);
}

// Synk-branded home-screen icon (not the visitor kiosk icon).
const touchIconSrc = path.join(root, "src", "apple-touch-icon.png");
const touchIconDest = path.join(publicDir, "apple-touch-icon.png");
if (!fs.existsSync(touchIconSrc)) {
  throw new Error(`Missing Synk Admin touch icon: ${touchIconSrc}`);
}
fs.copyFileSync(touchIconSrc, touchIconDest);

if (!fs.existsSync(sourceHtml)) {
  throw new Error(`Missing Synk Admin page: ${sourceHtml}`);
}

let html = fs.readFileSync(sourceHtml, "utf8");

const visitorOrigin =
  process.env.VISITOR_SITE_ORIGIN || "https://visitor-signin-kiosk.netlify.app";

html = html
  .replace(/href="\/synk"/g, `href="${visitorOrigin}/synk"`)
  .replace(/href="\/admin"/g, `href="${visitorOrigin}/admin"`);

fs.writeFileSync(path.join(publicDir, "index.html"), html);
console.log(`Prepared Synk Admin public/ (visitor origin: ${visitorOrigin})`);
