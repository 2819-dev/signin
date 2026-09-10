"use strict";

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const publicDir = path.join(root, "public");
const sourcePublic = path.join(root, "..", "public");
const sourceHtml = path.join(root, "src", "index.html");
const sourceCss = path.join(root, "src", "join.css");
const sourceManifest = path.join(root, "src", "manifest.webmanifest");
const touchIconSrc = path.join(root, "src", "apple-touch-icon.png");

fs.mkdirSync(publicDir, { recursive: true });

const sharedAssets = [
  "face.js",
  "force-refresh.js",
  "synk-logo.svg",
  "version.json",
];

for (const name of sharedAssets) {
  const from = path.join(sourcePublic, name);
  const to = path.join(publicDir, name);
  if (!fs.existsSync(from)) throw new Error(`Missing shared asset: ${from}`);
  fs.copyFileSync(from, to);
}

if (!fs.existsSync(sourceCss)) throw new Error(`Missing CSS: ${sourceCss}`);
fs.copyFileSync(sourceCss, path.join(publicDir, "join.css"));

if (!fs.existsSync(touchIconSrc)) throw new Error(`Missing touch icon: ${touchIconSrc}`);
fs.copyFileSync(touchIconSrc, path.join(publicDir, "apple-touch-icon.png"));

if (!fs.existsSync(sourceManifest)) throw new Error(`Missing manifest: ${sourceManifest}`);
fs.copyFileSync(sourceManifest, path.join(publicDir, "manifest.webmanifest"));

if (!fs.existsSync(sourceHtml)) throw new Error(`Missing page: ${sourceHtml}`);
let html = fs.readFileSync(sourceHtml, "utf8");

const visitorOrigin =
  process.env.VISITOR_SITE_ORIGIN || "https://visitor-signin-kiosk.netlify.app";

html = html
  .replace(/href="\/synk"/g, `href="${visitorOrigin}/synk"`)
  .replace(/__VISITOR_ORIGIN__/g, visitorOrigin);

fs.writeFileSync(path.join(publicDir, "index.html"), html);
console.log(`Prepared Synk ID public/ (visitor origin: ${visitorOrigin})`);
