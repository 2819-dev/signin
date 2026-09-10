"use strict";

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const publicDir = path.join(root, "public");
const sourcePublic = path.join(root, "..", "public");
const sourceHtml = path.join(root, "src", "index.html");
const sourceCss = path.join(root, "src", "admin.css");
const touchIconSrc = path.join(root, "src", "apple-touch-icon.png");

fs.mkdirSync(publicDir, { recursive: true });

const sharedAssets = [
  "face.js",
  "synk-logo.svg",
  "version.json",
];

for (const name of sharedAssets) {
  const from = path.join(sourcePublic, name);
  const to = path.join(publicDir, name);
  if (!fs.existsSync(from)) throw new Error(`Missing shared asset: ${from}`);
  fs.copyFileSync(from, to);
}

const localForceRefresh = path.join(root, "src", "force-refresh.js");
if (!fs.existsSync(localForceRefresh)) throw new Error(`Missing force-refresh: ${localForceRefresh}`);
fs.copyFileSync(localForceRefresh, path.join(publicDir, "force-refresh.js"));

if (!fs.existsSync(sourceCss)) throw new Error(`Missing CSS: ${sourceCss}`);
fs.copyFileSync(sourceCss, path.join(publicDir, "admin.css"));

if (!fs.existsSync(touchIconSrc)) throw new Error(`Missing touch icon: ${touchIconSrc}`);
fs.copyFileSync(touchIconSrc, path.join(publicDir, "apple-touch-icon.png"));

if (!fs.existsSync(sourceHtml)) throw new Error(`Missing page: ${sourceHtml}`);
let html = fs.readFileSync(sourceHtml, "utf8");

const synkIdOrigin = process.env.SYNK_ID_ORIGIN || "https://synkid.netlify.app";

html = html
  .replace(/href="\/synk"/g, `href="${synkIdOrigin}/verify"`)
  .replace(/href="\/synk-join"/g, `href="${synkIdOrigin}/join"`);

fs.writeFileSync(path.join(publicDir, "index.html"), html);
console.log(`Prepared Synk Admin public/ (synk id origin: ${synkIdOrigin})`);
