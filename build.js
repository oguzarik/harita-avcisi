// Tek dosya derleyici: tüm CSS, JS, harita verisi ve görselleri
// tek bir HTML içine gömer. Çift tıkla açılır, sunucu gerekmez.
//   node build.js
// Çıktı: dist/HaritaAvcisi.html
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const OUT_DIR = path.join(ROOT, "dist");
const OUT = path.join(OUT_DIR, "HaritaAvcisi.html");

const MIME = { ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml" };

function read(name) {
  return fs.readFileSync(path.join(ROOT, name), "utf8");
}
function dataUri(name) {
  const buf = fs.readFileSync(path.join(ROOT, name));
  const mime = MIME[path.extname(name).toLowerCase()] || "application/octet-stream";
  return `data:${mime};base64,${buf.toString("base64")}`;
}

let html = read("index.html");
let css = read("styles.css");
let js = read("game.js");
const map = read("mapdata.js");

// CSS içindeki görseller
css = css.replace(/url\("([^"]+\.(?:png|jpg|webp|svg))"\)/g, (_, f) => `url("${dataUri(f)}")`);

// HTML içindeki görseller
html = html.replace(/(src|href)="([^"]+\.png)"/g, (_, attr, f) => `${attr}="${dataUri(f)}"`);

// manifest ve stil/script etiketlerini kaldır, gömülü hale getir
html = html.replace(/\s*<link rel="manifest"[^>]*>/, "");
html = html.replace(/<link rel="stylesheet"[^>]*>/, `<style>\n${css}\n</style>`);
html = html.replace(/<script src="mapdata\.js[^"]*"><\/script>/, `<script>\n${map}\n</script>`);
html = html.replace(/<script src="game\.js[^"]*"><\/script>/, () => `<script>\n${js}\n</script>`);

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT, html, "utf8");

// PC başlatıcı: Edge/Chrome'u uygulama penceresi olarak açar
const bat = [
  "@echo off",
  "setlocal",
  'set "F=%~dp0HaritaAvcisi.html"',
  'set "P=%TEMP%\\harita-avcisi-app"',
  'set "B="',
  'if exist "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe" set "B=%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe"',
  'if exist "%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe" set "B=%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe"',
  'if "%B%"=="" if exist "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe" set "B=%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe"',
  'if "%B%"=="" if exist "%LOCALAPPDATA%\\Google\\Chrome\\Application\\chrome.exe" set "B=%LOCALAPPDATA%\\Google\\Chrome\\Application\\chrome.exe"',
  'if "%B%"=="" ( start "" "%F%" & exit /b )',
  'start "" "%B%" --app="file:///%F:\\=/%" --window-size=520,940 --user-data-dir="%P%" --no-first-run --no-default-browser-check',
  "",
].join("\r\n");
fs.writeFileSync(path.join(OUT_DIR, "Harita Avcisi (PC).bat"), bat, "utf8");

const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
console.log(`OK  dist/HaritaAvcisi.html  ${kb} KB`);
console.log("OK  dist/Harita Avcisi (PC).bat");
