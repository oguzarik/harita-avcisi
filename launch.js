const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const ROOT = __dirname;
const ALLOWED = new Set(["index.html", "styles.css", "game.js", "mapdata.js", "b-hocam.png", "menu-bg.png", "menu-earth.png", "turkey-phys.png", "haritason.png", "yazi.png", "title-gold2.png", "manifest.webmanifest"]);
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".ico": "image/png",
  ".webmanifest": "application/manifest+json",
};

function lanIPs() {
  const out = [];
  const ifs = os.networkInterfaces();
  for (const list of Object.values(ifs)) {
    for (const a of list || []) {
      const fam = a.family === "IPv4" || a.family === 4;
      if (fam && !a.internal && !String(a.address).startsWith("169.254.")) out.push(a.address);
    }
  }
  return out;
}

function insideRoot(file) {
  const rel = path.relative(ROOT, file);
  return Boolean(rel) && !rel.startsWith("..") && !path.isAbsolute(rel);
}

let lastBeat = Date.now();
let gotBeat = false;

const server = http.createServer((req, res) => {
  if ((req.url || "").startsWith("/__ping")) {
    lastBeat = Date.now();
    gotBeat = true;
    res.writeHead(204);
    res.end();
    return;
  }
  if ((req.url || "").startsWith("/__lan")) {
    const port = server.address() && server.address().port;
    const ips = lanIPs();
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    res.end(JSON.stringify({ port, urls: ips.map((ip) => `http://${ip}:${port}/`) }));
    return;
  }
  const name = decodeURIComponent((req.url || "/").split("?")[0]);
  const rel = name === "/" ? "index.html" : name.replace(/^\/+/, "");
  if (!ALLOWED.has(rel)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  const file = path.normalize(path.join(ROOT, rel));
  if (!insideRoot(file)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, {
      "Content-Type": MIME[path.extname(file)] || "text/plain",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
    });
    res.end(data);
  });
});

function findBrowser() {
  const candidates = [
    path.join(process.env["ProgramFiles(x86)"] || "", "Microsoft", "Edge", "Application", "msedge.exe"),
    path.join(process.env.ProgramFiles || "", "Microsoft", "Edge", "Application", "msedge.exe"),
    path.join(process.env.LOCALAPPDATA || "", "Microsoft", "Edge", "Application", "msedge.exe"),
    path.join(process.env["ProgramFiles(x86)"] || "", "Google", "Chrome", "Application", "chrome.exe"),
    path.join(process.env.LOCALAPPDATA || "", "Google", "Chrome", "Application", "chrome.exe"),
  ];
  return candidates.find((c) => c && fs.existsSync(c));
}

function openApp(url) {
  const browser = findBrowser();
  if (!browser) return;
  const profile = path.join(os.tmpdir(), "yurt-benimhocam");
  spawn(
    browser,
    [
      `--app=${url}`,
      "--window-size=880,940",
      `--user-data-dir=${profile}`,
      "--no-first-run",
      "--no-default-browser-check",
    ],
    { stdio: "ignore", detached: true }
  ).unref();
}

function tryListen(port) {
  server.once("error", (err) => {
    if (err.code === "EADDRINUSE" && port < 17872) tryListen(port + 1);
  });
  server.listen(port, "0.0.0.0", () => {
    const p = server.address().port;
    openApp(`http://127.0.0.1:${p}/`);
    const urls = lanIPs().map((ip) => `http://${ip}:${p}/`);
    try {
      fs.writeFileSync(
        path.join(ROOT, "TELEFON.txt"),
        urls.length
          ? "iPhone Safari:\n" + urls.join("\n") + "\n\nPaylaş → Ana Ekrana Ekle\nBilgisayar penceresi açık kalsın.\n"
          : "Aynı Wi-Fi bulunamadı.\n",
        "utf8"
      );
    } catch (_) {}
  });
}

tryListen(17867);

setInterval(() => {
  if (gotBeat && Date.now() - lastBeat > 4000) process.exit(0);
}, 1000);
