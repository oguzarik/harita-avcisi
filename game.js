(() => {
  const KEY = "yurt-v1";
  const WEST = 25.62;
  const EAST = 44.82;
  const SOUTH = 35.78;
  const NORTH = 42.12;
  const GEO_ASPECT = (NORTH - SOUTH) / (EAST - WEST);
  let ASPECT = GEO_ASPECT;
  const PHY = {
    nw: [0.1, 0.145],
    ne: [0.905, 0.155],
    sw: [0.048, 0.905],
    se: [0.962, 0.925],
  };
  const FILL = {
    marmara: "#e2d3b4",
    ege: "#e8d09a",
    akdeniz: "#efc98a",
    ic: "#dcc8a0",
    karadeniz: "#c5d2ae",
    dogu: "#d7c09c",
    guney: "#e4c08c",
  };
  const PAINT = ["#2b6cff", "#ff7a18", "#ff3355", "#8ee22a", "#ffd000", "#c44bff", "#22e0c4", "#ff4dd2"];
  const REGIONS = [
    { id: "all", name: "Türkiye" },
    { id: "marmara", name: "Marmara" },
    { id: "ege", name: "Ege" },
    { id: "akdeniz", name: "Akdeniz" },
    { id: "ic", name: "İç Anadolu" },
    { id: "karadeniz", name: "Karadeniz" },
    { id: "dogu", name: "Doğu" },
    { id: "guney", name: "Güneydoğu" },
  ];

  const DEMIR_BIG = ["Sivas", "Malatya", "Bingöl", "Adana", "Kayseri"];
  const DEMIR_SMALL = ["Balıkesir", "İzmir", "Hatay", "Sakarya", "Ankara", "Erzincan"];
  const LETTERS = ["A", "B", "C", "D", "E"];
  const REGION_NAME = {
    marmara: "Marmara Bölgesi",
    ege: "Ege Bölgesi",
    akdeniz: "Akdeniz Bölgesi",
    ic: "İç Anadolu Bölgesi",
    karadeniz: "Karadeniz Bölgesi",
    dogu: "Doğu Anadolu Bölgesi",
    guney: "Güneydoğu Anadolu Bölgesi",
  };
  const SEA_NAME = {
    karadeniz: "Karadeniz",
    marmara: "Marmara Denizi",
    ege: "Ege Denizi",
    akdeniz: "Akdeniz",
  };
  const screens = {
    menu: document.getElementById("menu"),
    play: document.getElementById("play"),
  };
  const canvas = document.getElementById("stage");
  const ctx = canvas.getContext("2d");
  const menuFx = document.getElementById("menu-fx");
  const mctx = menuFx.getContext("2d");

  let save = load();
  let actx = null;
  let noiseBuf = null;
  let master = null;
  let scene = "menu";
  let viewW = 0;
  let viewH = 0;
  let time = 0;
  let last = 0;
  let score = 0;
  let shownScore = 0;
  let combo = 0;
  let comboT = 0;
  let selected = -1;
  let choices = [];
  let tries = 0;
  let wrongNames = [];
  let hintT = 0;
  let shake = 0;
  let flash = 0;
  let parts = [];
  let cam = { x: 0.5, y: 0.48, z: 1.12 };
  let want = { x: 0.5, y: 0.48, z: 1.12 };
  let regionOn = "all";
  let nearSet = new Set();
  let pointers = new Map();
  let dragging = false;
  let moved = 0;
  let hover = -1;
  let overEl = null;
  let pulseI = -1;
  let pulseT = 0;
  let answering = false;
  let mode = "explore";
  let exam = null;
  let mapLabel = null;
  let relief = null;
  let physImg = null;
  let pixToIl = null;
  let lineW = 0;
  let lineH = 0;
  let cellUV = null;
  let tintCv = null;
  let tintKey = "";
  let homeZ = 1.12;
  let speed = null;
  let speedLast = -1;
  let lastExamItems = null;
  const REGION_TOTAL = {};
  YURT_MAP.forEach((il) => {
    REGION_TOTAL[il.r] = (REGION_TOTAL[il.r] || 0) + 1;
  });
  const IS_LOCAL = /^(localhost|127\.|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(location.hostname);
  const IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const STANDALONE =
    (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;

  function blank() {
    return { best: 0, learned: [], kpssBest: 0, speedBest: 0, exams: [] };
  }

  function buzz(pattern) {
    try {
      if (navigator.vibrate) navigator.vibrate(pattern);
    } catch (_) {}
  }

  function regionLearned(id) {
    const L = learnedSet();
    let n = 0;
    YURT_MAP.forEach((il) => {
      if (il.r === id && L.has(il.n)) n += 1;
    });
    return n;
  }

  function load() {
    try {
      return Object.assign(blank(), JSON.parse(localStorage.getItem(KEY) || "{}"));
    } catch (_) {
      return blank();
    }
  }

  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(save));
    } catch (_) {}
  }

  function learnedSet() {
    return new Set(save.learned);
  }

  function audio() {
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === "suspended") actx.resume();
    if (!noiseBuf) {
      noiseBuf = actx.createBuffer(1, actx.sampleRate * 0.4, actx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (!master) {
      master = actx.createDynamicsCompressor();
      master.threshold.value = -16;
      const out = actx.createGain();
      out.gain.value = 0.82;
      master.connect(out);
      out.connect(actx.destination);
    }
    return actx;
  }

  function dest() {
    audio();
    return master;
  }

  function env(g, t, vol, dur) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  function tone(freq, dur, type, vol, slide) {
    const a = audio();
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type || "sine";
    o.frequency.setValueAtTime(freq, a.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), a.currentTime + dur);
    env(g, a.currentTime, vol || 0.04, dur);
    o.connect(g);
    g.connect(dest());
    o.start();
    o.stop(a.currentTime + dur + 0.03);
  }

  function noise(dur, type, freq, q, vol, slide) {
    const a = audio();
    const src = a.createBufferSource();
    src.buffer = noiseBuf;
    const f = a.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, a.currentTime);
    if (slide) f.frequency.exponentialRampToValueAtTime(slide, a.currentTime + dur);
    f.Q.value = q || 1;
    const g = a.createGain();
    env(g, a.currentTime, vol || 0.04, dur);
    src.connect(f);
    f.connect(g);
    g.connect(dest());
    src.start();
    src.stop(a.currentTime + dur + 0.02);
  }

  function sndPaper() {
    noise(0.07, "bandpass", 1400, 0.8, 0.05, 700);
    tone(240, 0.05, "triangle", 0.02);
  }

  function sndOk() {
    tone(523, 0.12, "sine", 0.05, 784);
    setTimeout(() => tone(784, 0.16, "triangle", 0.045), 70);
    setTimeout(() => tone(1046, 0.2, "sine", 0.03), 140);
  }

  function sndBad() {
    noise(0.12, "lowpass", 420, 0.8, 0.07, 90);
    tone(140, 0.16, "sawtooth", 0.03, 70);
  }

  function sndFanfare() {
    [392, 494, 587, 784, 988].forEach((f, i) => {
      setTimeout(() => {
        tone(f, 0.18, "triangle", 0.05);
        tone(f * 2, 0.1, "sine", 0.018);
      }, i * 90);
    });
  }

  function show(id) {
    Object.keys(screens).forEach((k) => screens[k].classList.toggle("active", k === id));
  }

  function say(t, hold) {
    hintT = hold || 2;
    document.getElementById("hint").textContent = t;
  }

  function paintHud() {
    document.getElementById("score").textContent = Math.floor(shownScore);
    document.getElementById("meta-line").textContent =
      save.learned.length + " / 81 · en iyi " + save.best;
    const cmb = document.getElementById("combo");
    cmb.textContent = combo > 1 ? "x" + combo : "";
    cmb.classList.toggle("boom", combo > 1 && comboT > 0);
    document.getElementById("menu-meta").textContent =
      save.learned.length +
      " / 81 il · Bilmece " +
      save.best +
      " · Hız " +
      (save.speedBest || 0) +
      " · KPSS net " +
      (save.kpssBest || 0);
    const bar = document.getElementById("prog-bar");
    if (speed) {
      document.getElementById("score").textContent = Math.floor(shownScore);
      document.getElementById("meta-line").textContent = speed.ok + " doğru · " + speed.bad + " yanlış";
      cmb.textContent = fmtClock(speed.t);
      cmb.classList.toggle("boom", speed.t < 10);
      if (bar) bar.style.width = (speed.t / 60) * 100 + "%";
      return;
    }
    if (exam) {
      document.getElementById("score").textContent = examNet().toFixed(2);
      document.getElementById("meta-line").textContent =
        "soru " + Math.min(exam.q + 1, exam.items.length) + " / " + exam.items.length;
      const cmb = document.getElementById("combo");
      cmb.textContent = fmtClock(exam.t);
      cmb.classList.toggle("boom", exam.t < 30);
      if (bar) bar.style.width = (exam.q / exam.items.length) * 100 + "%";
      return;
    }
    if (bar) bar.style.width = (save.learned.length / 81) * 100 + "%";
  }

  function photoOn() {
    return physImg && (physImg.naturalWidth || physImg.width);
  }

  function toUV(lon, lat) {
    const gx = (lon - WEST) / (EAST - WEST);
    const gy = (NORTH - lat) / (NORTH - SOUTH);
    if (!photoOn()) return { u: gx, v: gy };
    const u0 = PHY.nw[0] + (PHY.sw[0] - PHY.nw[0]) * gy;
    const u1 = PHY.ne[0] + (PHY.se[0] - PHY.ne[0]) * gy;
    const v0 = PHY.nw[1] + (PHY.ne[1] - PHY.nw[1]) * gx;
    const v1 = PHY.sw[1] + (PHY.se[1] - PHY.sw[1]) * gx;
    return { u: u0 + (u1 - u0) * gx, v: v0 + (v1 - v0) * gy };
  }

  function project(lon, lat) {
    const p = toUV(lon, lat);
    const x = (p.u - cam.x) * cam.z * viewW + viewW / 2;
    const y = (p.v - cam.y) * cam.z * viewW * ASPECT + viewH / 2;
    return { x, y };
  }

  function unproject(sx, sy) {
    const u = cam.x + (sx - viewW / 2) / (cam.z * viewW);
    const v = cam.y + (sy - viewH / 2) / (cam.z * viewW * ASPECT);
    if (!photoOn()) {
      return { lon: WEST + u * (EAST - WEST), lat: NORTH - v * (NORTH - SOUTH) };
    }
    let gx = (u - 0.05) / 0.91;
    let gy = (v - 0.14) / 0.78;
    for (let i = 0; i < 8; i++) {
      const u0 = PHY.nw[0] + (PHY.sw[0] - PHY.nw[0]) * gy;
      const u1 = PHY.ne[0] + (PHY.se[0] - PHY.ne[0]) * gy;
      const v0 = PHY.nw[1] + (PHY.ne[1] - PHY.nw[1]) * gx;
      const v1 = PHY.sw[1] + (PHY.se[1] - PHY.sw[1]) * gx;
      gx = (u - u0) / (u1 - u0 + 1e-12);
      gy = (v - v0) / (v1 - v0 + 1e-12);
    }
    return {
      lon: WEST + gx * (EAST - WEST),
      lat: NORTH - gy * (NORTH - SOUTH),
    };
  }

  function hash2(ix, iy) {
    let n = (ix * 374761393 + iy * 668265263) | 0;
    n = (n ^ (n >>> 13)) * 1274126177;
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  }
  function vnoise(x, y) {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = x - x0;
    const fy = y - y0;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const a = hash2(x0, y0);
    const b = hash2(x0 + 1, y0);
    const c = hash2(x0, y0 + 1);
    const d = hash2(x0 + 1, y0 + 1);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  }
  function fbm(x, y) {
    let s = 0;
    let a = 0.52;
    let f = 1;
    for (let i = 0; i < 5; i++) {
      s += a * vnoise(x * f, y * f);
      f *= 2.05;
      a *= 0.5;
    }
    return s;
  }
  function lerpC(a, b, t) {
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    return [
      (a[0] + (b[0] - a[0]) * t) | 0,
      (a[1] + (b[1] - a[1]) * t) | 0,
      (a[2] + (b[2] - a[2]) * t) | 0,
    ];
  }
  function landHeight(lon, lat) {
    let h = 0.22;
    h += 0.2 * Math.exp(-Math.pow((lat - 39.15) / 2.4, 2)) * Math.min(1, Math.max(0, (lon - 29) / 8));
    h += 0.46 * Math.min(1, Math.max(0, (lon - 38.2) / 5.5)) * Math.exp(-Math.pow((lat - 39.6) / 2.6, 2));
    h += 0.3 * Math.exp(-Math.pow((lat - 37.05) / 0.62, 2)) * Math.exp(-Math.pow((lon - 33.2) / 5.2, 2));
    h += 0.24 * Math.exp(-Math.pow((lat - 40.85) / 0.5, 2)) * Math.exp(-Math.pow((lon - 35.5) / 7, 2));
    h += 0.12 * Math.exp(-Math.pow((lat - 38.4) / 0.9, 2)) * Math.exp(-Math.pow((lon - 30.5) / 2.2, 2));
    h -= 0.2 * Math.exp(-Math.pow((lat - 41.55) / 0.42, 2));
    h -= 0.18 * Math.exp(-Math.pow((lat - 36.45) / 0.42, 2));
    h -= 0.16 * Math.exp(-Math.pow((lon - 27.1) / 1.15, 2)) * (lat > 36.2 && lat < 39.8 ? 1 : 0.15);
    h -= 0.14 * Math.exp(-(Math.pow(lon - 28.4, 2) + Math.pow(lat - 40.7, 2)) / 2.1);
    h += (fbm(lon * 0.55, lat * 0.7) - 0.45) * 0.28;
    return h < 0.02 ? 0.02 : h > 1 ? 1 : h;
  }
  function buildRelief() {
    const tw = 1600;
    const th = Math.max(420, Math.round(tw * ASPECT));
    const cv = document.createElement("canvas");
    cv.width = tw;
    cv.height = th;
    const hbuf = new Float32Array(tw * th);
    for (let y = 0; y < th; y++) {
      const lat = NORTH - (y / (th - 1)) * (NORTH - SOUTH);
      for (let x = 0; x < tw; x++) {
        const lon = WEST + (x / (tw - 1)) * (EAST - WEST);
        hbuf[y * tw + x] = landHeight(lon, lat);
      }
    }
    const img = cv.getContext("2d").createImageData(tw, th);
    const d = img.data;
    const green = [46, 92, 42];
    const lime = [110, 142, 58];
    const tan = [186, 150, 82];
    const brown = [122, 78, 46];
    const rock = [92, 78, 68];
    const snow = [232, 228, 220];
    for (let y = 0; y < th; y++) {
      for (let x = 0; x < tw; x++) {
        const i = y * tw + x;
        const h = hbuf[i];
        const hx = x < tw - 1 ? hbuf[i + 1] : h;
        const hy = y < th - 1 ? hbuf[i + tw] : h;
        const lx = -0.55;
        const ly = -0.65;
        const lz = 0.52;
        const nxn = h - hx;
        const nyn = h - hy;
        const inv = 1 / Math.sqrt(nxn * nxn + nyn * nyn + 0.045);
        let sh = (nxn * inv * lx + nyn * inv * ly + 0.21 * inv * lz) * 0.5 + 0.52;
        if (sh < 0.28) sh = 0.28;
        if (sh > 1.15) sh = 1.15;
        let col;
        if (h < 0.28) col = lerpC(green, lime, h / 0.28);
        else if (h < 0.46) col = lerpC(lime, tan, (h - 0.28) / 0.18);
        else if (h < 0.64) col = lerpC(tan, brown, (h - 0.46) / 0.18);
        else if (h < 0.82) col = lerpC(brown, rock, (h - 0.64) / 0.18);
        else col = lerpC(rock, snow, (h - 0.82) / 0.18);
        const o = i * 4;
        d[o] = Math.min(255, col[0] * sh);
        d[o + 1] = Math.min(255, col[1] * sh);
        d[o + 2] = Math.min(255, col[2] * sh);
        d[o + 3] = 255;
      }
    }
    cv.getContext("2d").putImageData(img, 0, 0);
    relief = cv;
  }

  function loadPhys() {
    const im = new Image();
    im.onload = () => {
      physImg = im;
      const iw = im.naturalWidth || im.width;
      const ih = im.naturalHeight || im.height;
      if (iw > 0) ASPECT = ih / iw;
      try {
        buildLineCells(im);
      } catch (_) {
        pixToIl = null;
      }
    };
    im.onerror = () => {
      ASPECT = GEO_ASPECT;
      if (!relief) buildRelief();
    };
    im.src = "haritason.png";
  }

  function imgBox(camx, camy, camz, vw, vh) {
    return {
      dx: (0 - camx) * camz * vw + vw / 2,
      dy: (0 - camy) * camz * vw * ASPECT + vh / 2,
      dw: camz * vw,
      dh: camz * vw * ASPECT,
    };
  }

  function screenToImg(sx, sy) {
    return {
      u: cam.x + (sx - viewW / 2) / (cam.z * viewW),
      v: cam.y + (sy - viewH / 2) / (cam.z * viewW * ASPECT),
    };
  }

  function ilUV(i) {
    if (cellUV && cellUV[i]) return cellUV[i];
    return toUV(YURT_MAP[i].cx, YURT_MAP[i].cy);
  }

  function hitAt(sx, sy) {
    const geo = unproject(sx, sy);
    return hitIl(geo.lon, geo.lat);
  }

  function buildLineCells(src) {
    const w = src.naturalWidth || src.width;
    const h = src.naturalHeight || src.height;
    const cv = document.createElement("canvas");
    cv.width = w;
    cv.height = h;
    const g = cv.getContext("2d");
    g.drawImage(src, 0, 0);
    const data = g.getImageData(0, 0, w, h).data;
    const n = w * h;
    const wall0 = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      const o = i * 4;
      const r = data[o];
      const gr = data[o + 1];
      const b = data[o + 2];
      const lum = 0.3 * r + 0.59 * gr + 0.11 * b;
      const white = r > 185 && gr > 168 && b > 125 && Math.abs(r - gr) < 70;
      const sea = b > r + 14 && b > 65 && lum < 150;
      wall0[i] = white || sea ? 1 : 0;
    }
    const wall = new Uint8Array(n);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (wall0[i]) {
          wall[i] = 1;
          continue;
        }
        if ((x && wall0[i - 1]) || (x < w - 1 && wall0[i + 1]) || (y && wall0[i - w]) || (y < h - 1 && wall0[i + w])) {
          wall[i] = 1;
        }
      }
    }
    const labels = new Int32Array(n);
    const labCent = [];
    let lab = 0;
    const stack = new Int32Array(n);
    for (let i = 0; i < n; i++) {
      if (wall[i] || labels[i]) continue;
      lab += 1;
      let area = 0;
      let sx = 0;
      let sy = 0;
      let top = 0;
      stack[top++] = i;
      labels[i] = lab;
      while (top) {
        const p = stack[--top];
        area += 1;
        const x = p % w;
        const y = (p / w) | 0;
        sx += x;
        sy += y;
        const tryPush = (q) => {
          if (q < 0 || q >= n || wall[q] || labels[q]) return;
          labels[q] = lab;
          stack[top++] = q;
        };
        if (x) tryPush(p - 1);
        if (x < w - 1) tryPush(p + 1);
        if (y) tryPush(p - w);
        if (y < h - 1) tryPush(p + w);
      }
      labCent[lab] = { area, u: sx / area / w, v: sy / area / h };
    }
    const labOk = (id) => {
      const c = labCent[id];
      if (!c || c.area < 28) return false;
      if (c.u < 0.07 && c.v < 0.2) return false;
      if (c.u > 0.94 && c.v < 0.22) return false;
      return true;
    };
    const landNear = (x, y) => {
      x = Math.max(0, Math.min(w - 1, x | 0));
      y = Math.max(0, Math.min(h - 1, y | 0));
      for (let r = 0; r <= 14; r++) {
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
            const xx = x + dx;
            const yy = y + dy;
            if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
            const idx = yy * w + xx;
            if (!wall[idx] && labOk(labels[idx])) return idx;
          }
        }
      }
      return -1;
    };
    const members = [];
    YURT_MAP.forEach((il, i) => {
      const uv = toUV(il.cx, il.cy);
      const idx = landNear(Math.round(uv.u * (w - 1)), Math.round(uv.v * (h - 1)));
      const id = idx >= 0 ? labels[idx] : 0;
      if (!members[id]) members[id] = [];
      members[id].push({
        i,
        u: uv.u,
        v: uv.v,
      });
    });
    const map = new Uint16Array(n);
    map.fill(0xffff);
    const cents = YURT_MAP.map((_, i) => toUV(YURT_MAP[i].cx, YURT_MAP[i].cy));
    const nearestIl = (u, v, list) => {
      let best = list ? list[0].i : 0;
      let bd = 1e9;
      const src = list || cents.map((c, i) => ({ i, u: c.u, v: c.v }));
      for (let k = 0; k < src.length; k++) {
        const d = (src[k].u - u) * (src[k].u - u) + (src[k].v - v) * (src[k].v - v) * 1.4;
        if (d < bd) {
          bd = d;
          best = src[k].i;
        }
      }
      return best;
    };
    for (let i = 0; i < n; i++) {
      if (wall[i]) continue;
      const id = labels[i];
      if (!labOk(id)) continue;
      const ms = members[id];
      const x = i % w;
      const y = (i / w) | 0;
      const u = x / w;
      const v = y / h;
      map[i] = ms && ms.length ? nearestIl(u, v, ms) : nearestIl(u, v, null);
    }
    for (let i = 0; i < n; i++) {
      if (map[i] !== 0xffff) continue;
      const x = i % w;
      const y = (i / w) | 0;
      let found = 0xffff;
      for (let r = 1; r <= 3 && found === 0xffff; r++) {
        for (let dy = -r; dy <= r && found === 0xffff; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            const xx = x + dx;
            const yy = y + dy;
            if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
            const t = map[yy * w + xx];
            if (t !== 0xffff) {
              found = t;
              break;
            }
          }
        }
      }
      if (found !== 0xffff) map[i] = found;
    }
    const sumu = new Float64Array(YURT_MAP.length);
    const sumv = new Float64Array(YURT_MAP.length);
    const cnt = new Float64Array(YURT_MAP.length);
    for (let i = 0; i < n; i++) {
      const il = map[i];
      if (il === 0xffff) continue;
      sumu[il] += (i % w) / w;
      sumv[il] += ((i / w) | 0) / h;
      cnt[il] += 1;
    }
    cellUV = YURT_MAP.map((_, i) =>
      cnt[i] > 0 ? { u: sumu[i] / cnt[i], v: sumv[i] / cnt[i] } : toUV(YURT_MAP[i].cx, YURT_MAP[i].cy)
    );
    pixToIl = map;
    lineW = w;
    lineH = h;
    tintCv = null;
    tintKey = "";
  }

  let landLayer = null;

  function drawTerrain(c, camx, camy, camz, vw, vh) {
    const bg = c.createRadialGradient(vw * 0.5, vh * 0.4, 8, vw * 0.5, vh * 0.48, Math.max(vw, vh) * 0.78);
    bg.addColorStop(0, "#0b2a58");
    bg.addColorStop(0.42, "#071830");
    bg.addColorStop(1, "#02060e");
    c.fillStyle = bg;
    c.fillRect(0, 0, vw, vh);

    c.save();
    pathAll(c, camx, camy, camz, vw, vh);
    c.fillStyle = "rgba(16, 52, 102, 0.78)";
    c.shadowColor = "rgba(70, 160, 255, 0.28)";
    c.shadowBlur = 22;
    c.fill();
    c.restore();
  }

  function pip(lon, lat, ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0];
      const yi = ring[i][1];
      const xj = ring[j][0];
      const yj = ring[j][1];
      if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi + 1e-12) + xi) {
        inside = !inside;
      }
    }
    return inside;
  }

  function hitIl(lon, lat) {
    for (let i = 0; i < YURT_MAP.length; i++) {
      const rings = YURT_MAP[i].rings;
      for (let r = 0; r < rings.length; r++) {
        if (pip(lon, lat, rings[r])) return i;
      }
    }
    let best = -1;
    let bd = 0.22 / cam.z;
    for (let i = 0; i < YURT_MAP.length; i++) {
      const d = Math.hypot(YURT_MAP[i].cx - lon, YURT_MAP[i].cy - lat);
      if (d < bd) {
        bd = d;
        best = i;
      }
    }
    return best;
  }

  function clampCam(c) {
    c.z = Math.max(0.86, Math.min(10, c.z));
    const pad = 0.42 / c.z;
    c.x = Math.max(-pad, Math.min(1 + pad, c.x));
    c.y = Math.max(-pad, Math.min(1 + pad, c.y));
    return c;
  }

  function boundsOf(pred) {
    let minx = 1;
    let miny = 1;
    let maxx = 0;
    let maxy = 0;
    YURT_MAP.forEach((il) => {
      if (pred && !pred(il)) return;
      il.rings.forEach((ring) => {
        ring.forEach((p) => {
          const uv = toUV(p[0], p[1]);
          if (uv.u < minx) minx = uv.u;
          if (uv.u > maxx) maxx = uv.u;
          if (uv.v < miny) miny = uv.v;
          if (uv.v > maxy) maxy = uv.v;
        });
      });
    });
    return { minx, maxx, miny, maxy };
  }

  function camForBounds(b, pad) {
    pad = pad == null ? 0.16 : pad;
    const w = Math.max(0.07, b.maxx - b.minx);
    const h = Math.max(0.07, b.maxy - b.miny);
    const visH = viewH / Math.max(1, viewW * ASPECT);
    const z = Math.min((1 - pad) / w, (visH * (1 - pad)) / h);
    return clampCam({
      x: (b.minx + b.maxx) / 2,
      y: (b.miny + b.maxy) / 2,
      z: Math.max(0.88, Math.min(8.5, z)),
    });
  }

  function flyTo(c) {
    want = clampCam({ x: c.x, y: c.y, z: c.z });
  }

  function homeCam() {
    const c = camForBounds(boundsOf(null), 0.08);
    homeZ = c.z;
    return c;
  }

  function flyRegion(id) {
    regionOn = id;
    paintRegions();
    if (id === "all") {
      flyTo(homeCam());
      return;
    }
    const c = camForBounds(boundsOf((il) => il.r === id), 0.22);
    c.z = Math.min(c.z, Math.max(2.4, homeZ * 2.6));
    flyTo(c);
  }

  function paintRegions() {
    const box = document.getElementById("regions");
    if (!box.childElementCount) {
      REGIONS.forEach((r) => {
        const b = document.createElement("button");
        b.type = "button";
        b.dataset.id = r.id;
        b.innerHTML = "<span></span><i></i>";
        b.querySelector("span").textContent = r.name;
        b.addEventListener("pointerdown", (e) => {
          e.preventDefault();
          audio();
          sndPaper();
          flyRegion(r.id);
          b.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
        });
        box.appendChild(b);
      });
    }
    [...box.children].forEach((b) => {
      const id = b.dataset.id;
      b.classList.toggle("on", id === regionOn);
      const tot = id === "all" ? YURT_MAP.length : REGION_TOTAL[id] || 0;
      const got = id === "all" ? save.learned.length : regionLearned(id);
      b.querySelector("i").textContent = got + "/" + tot;
      b.classList.toggle("done", tot > 0 && got >= tot);
    });
  }

  function zoomAt(sx, sy, factor) {
    const before = unproject(sx, sy);
    cam.z *= factor;
    clampCam(cam);
    const after = project(before.lon, before.lat);
    cam.x += (after.x - sx) / (cam.z * viewW);
    cam.y += (after.y - sy) / (cam.z * viewW * ASPECT);
    clampCam(cam);
    want.x = cam.x;
    want.y = cam.y;
    want.z = cam.z;
  }

  function pickChoices(i) {
    const il = YURT_MAP[i];
    const pool = il.near.slice();
    const opts = [il.n];
    while (opts.length < 3 && pool.length) {
      const n = pool.shift();
      if (!opts.includes(n)) opts.push(n);
    }
    for (let k = opts.length - 1; k > 0; k--) {
      const j = (Math.random() * (k + 1)) | 0;
      const t = opts[k];
      opts[k] = opts[j];
      opts[j] = t;
    }
    return opts;
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      const t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function applyFacts() {
    const seas = {
      karadeniz: ["Artvin", "Rize", "Trabzon", "Giresun", "Ordu", "Samsun", "Sinop", "Kastamonu", "Bartın", "Zonguldak", "Düzce", "Sakarya", "Kocaeli", "İstanbul", "Kırklareli"],
      marmara: ["İstanbul", "Kocaeli", "Yalova", "Bursa", "Balıkesir", "Çanakkale", "Tekirdağ"],
      ege: ["Çanakkale", "Balıkesir", "İzmir", "Aydın", "Muğla"],
      akdeniz: ["Muğla", "Antalya", "Mersin", "Adana", "Hatay"],
    };
    const border = {
      Yunanistan: ["Edirne"],
      Bulgaristan: ["Edirne", "Kırklareli"],
      Gürcistan: ["Artvin", "Ardahan"],
      Ermenistan: ["Ardahan", "Kars", "Iğdır"],
      Nahçıvan: ["Iğdır"],
      İran: ["Iğdır", "Ağrı", "Van", "Hakkari"],
      Irak: ["Hakkari", "Şırnak"],
      Suriye: ["Şırnak", "Mardin", "Şanlıurfa", "Gaziantep", "Kilis", "Hatay"],
    };
    YURT_MAP.forEach((il) => {
      il.seas = [];
      Object.keys(seas).forEach((s) => {
        if (seas[s].includes(il.n)) il.seas.push(s);
      });
      il.borders = [];
      Object.keys(border).forEach((c) => {
        if (border[c].includes(il.n)) il.borders.push(c);
      });
    });
  }

  function fmtClock(sec) {
    const s = Math.max(0, Math.ceil(sec));
    const m = (s / 60) | 0;
    const r = s % 60;
    return m + ":" + (r < 10 ? "0" : "") + r;
  }

  function examNet() {
    if (!exam) return 0;
    return Math.max(0, exam.ok - exam.bad * 0.25);
  }

  function takeFive(answer, pool) {
    const rest = shuffle(pool.filter((x) => x !== answer));
    const opts = shuffle([answer].concat(rest.slice(0, 4)));
    while (opts.length < 5) opts.push("—");
    return opts.slice(0, 5);
  }

  function ilIndex(name) {
    return YURT_MAP.findIndex((x) => x.n === name);
  }

  function makeDemirNitelik(used) {
    const kind = (Math.random() * 3) | 0;
    const all = YURT_MAP.map((x) => x.n);
    const none = all.filter((n) => DEMIR_BIG.indexOf(n) < 0 && DEMIR_SMALL.indexOf(n) < 0);
    const names = kind === 0 ? DEMIR_BIG : kind === 1 ? DEMIR_SMALL : none;
    const n = names[(Math.random() * names.length) | 0];
    const i = ilIndex(n);
    if (i >= 0) used.add(i);
    const labels = ["Büyük ölçekli", "Küçük ölçekli", "Hiçbiri"];
    return {
      type: "demir-nitelik",
      i,
      stem: "İşaretli il büyük ölçekli mi, küçük ölçekli mi, yoksa hiçbiri mi?",
      opts: labels,
      answer: labels[kind],
      why: n + " · " + labels[kind],
    };
  }

  function makeDemirMap(set, need) {
    const list = set === "big" ? DEMIR_BIG : DEMIR_SMALL;
    return {
      type: "demir-map",
      i: -1,
      need,
      set,
      picks: [],
      stem:
        set === "big"
          ? "Büyük ölçekli demir yataklarından 2 il seçiniz."
          : "Küçük ölçekli demir yatağı olan 1 il seçiniz.",
      opts: [],
      answer: list,
      why: list.join(", "),
    };
  }

  function makeItem(type, used) {
    if (type === "demir-nitelik") return makeDemirNitelik(used);
    if (type === "demir-buyuk") return makeDemirMap("big", 2);
    if (type === "demir-kucuk") return makeDemirMap("small", 1);
    const pool = YURT_MAP.map((_, i) => i).filter((i) => !used.has(i));
    const src = pool.length ? pool : YURT_MAP.map((_, i) => i);
    const i = src[(Math.random() * src.length) | 0];
    used.add(i);
    const il = YURT_MAP[i];
    const names = YURT_MAP.map((x) => x.n);
    if (type === "konum") {
      return {
        type,
        i,
        stem: "Haritada işaretli il hangisidir?",
        opts: takeFive(il.n, il.near.concat(names)),
        answer: il.n,
        why: il.n + " · " + REGION_NAME[il.r],
      };
    }
    if (type === "komsu") {
      const near = il.near.filter((n) => n !== il.n);
      const far = names.filter((n) => n !== il.n && !near.includes(n));
      if (near.length >= 4) {
        const no = far[(Math.random() * far.length) | 0];
        const opts = shuffle(near.slice(0, 4).concat([no]));
        return {
          type,
          i,
          stem: "Hangisi bu ile komşu değildir?",
          opts,
          answer: no,
          why: il.n + " ile komşu değil: " + no,
        };
      }
      const yes = near[(Math.random() * near.length) | 0];
      return {
        type,
        i,
        stem: "Hangisi bu ile komşudur?",
        opts: takeFive(yes, far),
        answer: yes,
        why: yes + " · " + il.n + " komşusu",
      };
    }
    if (type === "bolge") {
      const ans = REGION_NAME[il.r];
      const regs = shuffle(Object.values(REGION_NAME));
      return {
        type,
        i,
        stem: "İşaretli il hangi coğrafi bölgededir?",
        opts: takeFive(ans, regs),
        answer: ans,
        why: il.n + " → " + ans,
      };
    }
    if (type === "kiyi") {
      let ans = "Kıyısı yoktur";
      if (il.seas.length === 1) ans = SEA_NAME[il.seas[0]];
      if (il.seas.length >= 2) ans = "İki denize de kıyısı vardır";
      const seaPool = ["Karadeniz", "Marmara Denizi", "Ege Denizi", "Akdeniz", "Kıyısı yoktur", "İki denize de kıyısı vardır"];
      return {
        type,
        i,
        stem: "Bu ilin deniz kıyısı hangisidir?",
        opts: takeFive(ans, seaPool),
        answer: ans,
        why: il.n + " · " + ans,
      };
    }
    let ans = "Kara sınırı yoktur";
    if (il.borders.length) ans = il.borders[(Math.random() * il.borders.length) | 0];
    const countries = ["Yunanistan", "Bulgaristan", "Gürcistan", "Ermenistan", "Nahçıvan", "İran", "Irak", "Suriye", "Kara sınırı yoktur"];
    const borderPool = countries.filter((c) => c === ans || !(il.borders || []).includes(c));
    return {
      type,
      i,
      stem: il.borders.length ? "Bu il hangi ülkeyle kara sınırına sahiptir?" : "Bu ilin kara sınırı hangisidir?",
      opts: takeFive(ans, borderPool),
      answer: ans,
      why: il.n + " · " + (il.borders.length ? il.borders.join(", ") : "kara sınırı yok"),
    };
  }

  function buildExam() {
    const types = shuffle(
      []
        .concat(Array(6).fill("konum"))
        .concat(Array(5).fill("komsu"))
        .concat(Array(3).fill("bolge"))
        .concat(Array(2).fill("kiyi"))
        .concat(Array(1).fill("sinir"))
        .concat(Array(1).fill("demir-nitelik"))
        .concat(Array(1).fill("demir-buyuk"))
        .concat(Array(1).fill("demir-kucuk"))
    );
    const used = new Set();
    return types.map((t) => makeItem(t, used));
  }

  function showExamQ() {
    if (!exam || exam.q >= exam.items.length) {
      endExam();
      return;
    }
    const it = exam.items[exam.q];
    answering = false;
    nearSet = new Set();
    it.picks = [];
    const box = document.getElementById("choices");
    box.innerHTML = "";
    if (it.type !== "demir-map" && !(it.i >= 0)) {
      exam.q += 1;
      showExamQ();
      return;
    }
    if (it.type === "demir-map") {
      selected = -1;
      flyTo(camForBounds(boundsOf(null), 0.1));
      clampCam(want);
      document.getElementById("ask").textContent = it.stem;
      paintHud();
      say("Haritadan " + it.need + " il dokun. Yanlış −0,25 net.", 2.6);
      return;
    }
    selected = it.i;
    const il = YURT_MAP[it.i];
    flyTo(camForBounds(boundsOf((x) => x.n === il.n), 0.28));
    if (want.z < 2.6) want.z = 2.6;
    clampCam(want);
    document.getElementById("ask").textContent = it.stem;
    it.opts.forEach((name, k) => {
      const b = document.createElement("button");
      b.type = "button";
      b.innerHTML = "<b>" + LETTERS[k] + "</b><span>" + name + "</span>";
      b.dataset.ans = name;
      b.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        answerExam(name, b);
      });
      box.appendChild(b);
    });
    paintHud();
    say("Şıkkı seç. Yanlış −0,25 net.", 2);
  }

  function finishExamItem(ok, btn, shown) {
    if (!exam || answering) return;
    answering = true;
    const it = exam.items[exam.q];
    it.ok = ok;
    it.shown = shown || "";
    if (ok) {
      exam.ok += 1;
      sndOk();
      buzz(18);
      if (btn) btn.classList.add("right");
      const mark = [];
      if (it.i >= 0) mark.push(it.i);
      (it.picks || []).forEach((pi) => mark.push(pi));
      mark.forEach((pi) => {
        const n = YURT_MAP[pi] && YURT_MAP[pi].n;
        if (n && !save.learned.includes(n)) save.learned.push(n);
      });
    } else {
      exam.bad += 1;
      sndBad();
      buzz([40, 40, 40]);
      shake = 8;
      if (btn) btn.classList.add("wrong");
      [...document.getElementById("choices").children].forEach((el) => {
        if (el.dataset.ans === it.answer) el.classList.add("right");
      });
    }
    persist();
    const pin = it.i >= 0 ? it.i : (it.picks && it.picks[it.picks.length - 1]) || -1;
    if (pin >= 0) {
      showName(shown || YURT_MAP[pin].n);
      pinName(pin);
    }
    say(it.why, 2.6);
    paintHud();
    setTimeout(() => {
      if (!exam) return;
      exam.q += 1;
      showExamQ();
    }, 1700);
  }

  function tapExamIl(i) {
    if (!exam || answering) return;
    const it = exam.items[exam.q];
    if (!it || it.type !== "demir-map") return;
    const name = YURT_MAP[i].n;
    const okSet = it.set === "big" ? DEMIR_BIG : DEMIR_SMALL;
    selected = i;
    if ((it.picks || []).indexOf(i) >= 0) {
      say(name + " zaten seçili. Başka bir il dokun.", 1.6);
      sndPaper();
      return;
    }
    if (okSet.indexOf(name) < 0) {
      it.picks.push(i);
      it.why = name + " bu listede yok. Doğru: " + okSet.join(", ");
      finishExamItem(false, null, name);
      return;
    }
    it.picks.push(i);
    pinName(i);
    if (it.picks.length >= it.need) {
      const got = it.picks.map((pi) => YURT_MAP[pi].n).join(", ");
      it.why = got + " · " + (it.set === "big" ? "Büyük ölçekli" : "Küçük ölçekli") + ": " + okSet.join(", ");
      finishExamItem(true, null, got);
    } else {
      document.getElementById("ask").textContent = it.stem + " (" + it.picks.length + "/" + it.need + ")";
      say("Tamam. Bir il daha.", 1.8);
    }
  }

  function answerExam(name, btn) {
    if (!exam || answering) return;
    const it = exam.items[exam.q];
    it.pick = name;
    finishExamItem(name === it.answer, btn, it.i >= 0 ? YURT_MAP[it.i].n : name);
  }

  function endExam() {
    if (!exam) return;
    const net = examNet();
    if (net > (save.kpssBest || 0)) {
      save.kpssBest = +net.toFixed(2);
      persist();
    }
    const ok = exam.ok;
    const bad = exam.bad;
    const bos = exam.items.length - ok - bad;
    const items = exam.items;
    lastExamItems = items;
    save.exams = (save.exams || []).concat([{ net: +net.toFixed(2), ok, bad, at: Date.now() }]).slice(-10);
    persist();
    exam = null;
    mode = "explore";
    selected = -1;
    answering = false;
    document.getElementById("choices").innerHTML = "";
    document.getElementById("ask").textContent = "Sınav bitti · net " + net.toFixed(2);
    document.getElementById("play").classList.remove("exam-on");
    scene = "clear";
    sndFanfare();
    buzz([30, 50, 30, 50, 120]);
    if (overEl) overEl.remove();
    overEl = document.createElement("div");
    overEl.className = "over-card";
    const wrong = items.filter((it) => it.ok === false);
    const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
    const rows = wrong
      .map((it, k) => {
        const idx = items.indexOf(it) + 1;
        const pin = it.i >= 0 ? it.i : it.picks && it.picks.length ? it.picks[it.picks.length - 1] : -1;
        return `<li data-k="${k}" data-pin="${pin}"><b>${idx}</b><span>${esc(it.stem)}<br><em>${esc(it.why)}</em></span></li>`;
      })
      .join("");
    const grade = net >= 16 ? "Mükemmel" : net >= 12 ? "Çok iyi" : net >= 8 ? "İyi gidiyor" : "Haritaya dön, tekrar dene";
    overEl.innerHTML = `
      <div class="card-shot exam-card">
        <p class="eyebrow">KPSS NET</p>
        <h2>${net.toFixed(2)}</h2>
        <p>${ok} doğru · ${bad} yanlış · ${bos} boş<br>en iyi net ${save.kpssBest} · ${grade}</p>
        ${wrong.length ? `<p class="rev-title">Yanlışlar · dokun, haritada gör</p><ul class="review">${rows}</ul>` : `<p class="rev-title gold">Hiç yanlış yok!</p>`}
        <button class="btn gold" id="again">Yeniden deneme</button>
        <button class="btn ghost" id="to-menu">Menü</button>
      </div>`;
    screens.play.appendChild(overEl);
    const card = overEl;
    [...overEl.querySelectorAll(".review li")].forEach((li) => {
      li.addEventListener("click", () => {
        const pin = +li.dataset.pin;
        if (pin < 0) return;
        audio();
        sndPaper();
        card.classList.add("peek");
        scene = "play";
        selected = pin;
        nearSet = new Set();
        flyTo(camForBounds(boundsOf((x) => x.n === YURT_MAP[pin].n), 0.3));
        if (want.z < 2.6) want.z = 2.6;
        clampCam(want);
        pinName(pin);
        mapLabel.life = 3;
        showName(YURT_MAP[pin].n);
        setTimeout(() => {
          if (overEl !== card) return;
          card.classList.remove("peek");
          selected = -1;
          scene = "clear";
        }, 2800);
      });
    });
    document.getElementById("again").addEventListener("click", () => {
      if (overEl) {
        overEl.remove();
        overEl = null;
      }
      startKpss();
    });
    document.getElementById("to-menu").addEventListener("click", goMenu);
    paintHud();
    paintRegions();
  }

  function startKpss() {
    if (overEl) {
      overEl.remove();
      overEl = null;
    }
    mode = "kpss";
    try {
      exam = { q: 0, ok: 0, bad: 0, t: 12 * 60, items: buildExam() };
    } catch (err) {
      console.error(err);
      mode = "explore";
      exam = null;
      return;
    }
    combo = 0;
    selected = -1;
    scene = "play";
    document.getElementById("play").classList.add("exam-on");
    bootPlay(() => {
      paintRegions();
      showExamQ();
    });
  }

  function portraitPhone() {
    return window.innerWidth < 640 && window.innerHeight > window.innerWidth;
  }

  function paintRegionGrid(box) {
    box.classList.add("region-grid");
    REGIONS.forEach((r) => {
      const b = document.createElement("button");
      b.type = "button";
      const tot = r.id === "all" ? YURT_MAP.length : REGION_TOTAL[r.id] || 0;
      const got = r.id === "all" ? save.learned.length : regionLearned(r.id);
      b.innerHTML = "<span></span><i></i>";
      b.querySelector("span").textContent = r.name;
      b.querySelector("i").textContent = got + "/" + tot;
      b.classList.toggle("on", regionOn === r.id);
      b.classList.toggle("done", tot > 0 && got >= tot);
      b.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        audio();
        sndPaper();
        flyRegion(r.id);
        paintChoices();
        say(r.id === "all" ? "Bölge seç ya da haritaya dokun." : r.name + " · şimdi haritada bir ile dokun.", 2.2);
      });
      box.appendChild(b);
    });
  }

  function paintChoices() {
    if (exam) return;
    const box = document.getElementById("choices");
    const ask = document.getElementById("ask");
    box.innerHTML = "";
    box.classList.remove("region-grid");
    if (selected < 0) {
      if (speed) return;
      if (portraitPhone()) {
        ask.textContent = "Bölge seç, sonra haritada ile dokun";
        paintRegionGrid(box);
      } else ask.textContent = "Bölgeye yaklaş, ile dokun — ya da Soru";
      return;
    }
    const il = YURT_MAP[selected];
    ask.textContent = tries >= 1 ? "İpucu: " + il.n[0] + "…" : "Üç yakın il. Hangisi bu?";
    choices.forEach((name) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = name;
      if (wrongNames.includes(name)) {
        b.classList.add("wrong");
        b.disabled = true;
      }
      b.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        guess(name, b);
      });
      box.appendChild(b);
    });
  }

  function selectIl(i) {
    if (i < 0) return;
    selected = i;
    answering = false;
    tries = 0;
    wrongNames = [];
    choices = pickChoices(i);
    nearSet = new Set(YURT_MAP[i].near.slice(0, 6));
    sndPaper();
    const il = YURT_MAP[i];
    flyTo(
      camForBounds(
        boundsOf((x) => x.n === il.n || nearSet.has(x.n)),
        0.32
      )
    );
    const zLo = Math.max(1.85, homeZ * 1.7);
    const zHi = Math.max(2.35, homeZ * 2.3);
    if (want.z < zLo) want.z = zLo;
    if (want.z > zHi) want.z = zHi;
    clampCam(want);
    regionOn = il.r;
    paintRegions();
    paintChoices();
    say("Komşular yanıyor. Doğru adı seç.", 2.2);
    const p = project(il.cx, il.cy);
    burst(p.x, p.y, "#e4c36a", 12);
  }

  function showName(text) {
    const el = document.getElementById("float-name");
    el.textContent = text;
    el.classList.remove("on");
    void el.offsetWidth;
    el.classList.add("on");
    setTimeout(() => el.classList.remove("on"), 1400);
  }

  function pinName(i) {
    if (i < 0) return;
    mapLabel = { i, name: YURT_MAP[i].n, life: 3.2 };
  }

  function burst(x, y, hex, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 30 + Math.random() * 160;
      parts.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 30,
        life: 0.5 + Math.random() * 0.35,
        max: 0.85,
        r: 1.4 + Math.random() * 2.8,
        hex,
      });
    }
  }

  function guess(name, btn) {
    if (selected < 0 || answering) return;
    audio();
    const il = YURT_MAP[selected];
    if (name !== il.n) {
      tries += 1;
      combo = 0;
      sndBad();
      buzz([40, 40, 40]);
      shake = 8;
      wrongNames.push(name);
      if (speed) {
        speed.bad += 1;
        answering = true;
        [...document.getElementById("choices").children].forEach((el) => {
          if (el.textContent === il.n) el.classList.add("right");
        });
        showName(il.n);
        pinName(selected);
        say("Bu " + il.n + ".", 1.4);
        paintHud();
        setTimeout(nextSpeed, 900);
        return;
      }
      say(tries >= 1 ? "İpucu: " + il.n[0] + "…" : "Değil. Kalanlardan seç.", 1.8);
      paintHud();
      paintChoices();
      if (tries >= 2) {
        answering = true;
        setTimeout(() => {
          if (selected < 0) return;
          showName(il.n);
          pinName(selected);
          say("Bu " + il.n + ". İsim kapanıyor.", 2);
          closePick();
        }, 480);
      }
      return;
    }
    answering = true;
    sndOk();
    buzz(18);
    btn.classList.add("right");
    combo += 1;
    comboT = 2.4;
    const gain = (tries === 0 ? 100 : 45) + Math.max(0, combo - 1) * 18;
    score += gain;
    const wasNew = !save.learned.includes(il.n);
    if (wasNew) save.learned.push(il.n);
    if (speed) {
      speed.ok += 1;
      if (score > (save.speedBest || 0)) save.speedBest = score;
    } else if (score > save.best) save.best = score;
    persist();
    shownScore = Math.min(shownScore, score);
    const p = project(il.cx, il.cy);
    burst(p.x, p.y, "#7cbc58", 18);
    burst(p.x, p.y, "#e4c36a", 10);
    flash = 0.14;
    showName(il.n);
    pinName(selected);
    say("+" + gain + " · " + il.n + (speed ? "" : " kapanıyor"), 1.6);
    paintHud();
    paintRegions();
    if (speed) {
      setTimeout(nextSpeed, 620);
      return;
    }
    if (save.learned.length >= 81) {
      setTimeout(() => winAll(), 900);
      return;
    }
    if (wasNew && regionLearned(il.r) >= REGION_TOTAL[il.r]) {
      setTimeout(() => {
        sndFanfare();
        buzz([30, 60, 30, 60, 80]);
        burst(viewW / 2, viewH / 2, "#e4c36a", 40);
        showName(REGION_NAME[il.r].replace(" Bölgesi", "") + " tamam!");
        say(REGION_NAME[il.r] + " bitti. Sıradaki bölgeye geç.", 3);
      }, 700);
    }
    setTimeout(() => closePick(), 1150);
  }

  function nextSpeed() {
    if (!speed) return;
    const learned = learnedSet();
    let pool = YURT_MAP.map((_, i) => i).filter((i) => i !== speedLast && !learned.has(YURT_MAP[i].n));
    if (pool.length < 3) pool = YURT_MAP.map((_, i) => i).filter((i) => i !== speedLast);
    const i = pool[(Math.random() * pool.length) | 0];
    speedLast = i;
    selectIl(i);
    document.getElementById("ask").textContent = "Yanan il hangisi?";
    say("", 0);
  }

  function startSpeed() {
    if (overEl) {
      overEl.remove();
      overEl = null;
    }
    mode = "speed";
    exam = null;
    speed = { t: 60, ok: 0, bad: 0 };
    speedLast = -1;
    score = 0;
    shownScore = 0;
    combo = 0;
    selected = -1;
    regionOn = "all";
    scene = "play";
    document.getElementById("play").classList.remove("exam-on");
    document.getElementById("play").classList.add("speed-on");
    bootPlay(() => {
      paintRegions();
      paintHud();
      nextSpeed();
      say("60 saniye. Yanan ilin adını seç.", 2.4);
    });
  }

  function endSpeed() {
    if (!speed) return;
    const s = speed;
    speed = null;
    mode = "explore";
    selected = -1;
    answering = false;
    choices = [];
    nearSet = new Set();
    document.getElementById("choices").innerHTML = "";
    document.getElementById("play").classList.remove("speed-on");
    scene = "clear";
    sndFanfare();
    buzz([30, 50, 30, 50, 120]);
    if (overEl) overEl.remove();
    overEl = document.createElement("div");
    overEl.className = "over-card";
    const total = s.ok + s.bad;
    const acc = total ? Math.round((s.ok / total) * 100) : 0;
    overEl.innerHTML = `
      <div class="card-shot">
        <p class="eyebrow">HIZ TURU</p>
        <b class="big">${score}</b>
        <p>${s.ok} doğru · ${s.bad} yanlış · %${acc} isabet<br>en iyi ${save.speedBest || 0}</p>
        <button class="btn gold" id="again">Yeniden</button>
        <button class="btn ghost" id="to-menu">Menü</button>
      </div>`;
    screens.play.appendChild(overEl);
    document.getElementById("again").addEventListener("click", startSpeed);
    document.getElementById("to-menu").addEventListener("click", goMenu);
  }

  function closePick() {
    answering = false;
    selected = -1;
    choices = [];
    tries = 0;
    wrongNames = [];
    nearSet = new Set();
    paintChoices();
  }

  function resetLearned() {
    if (mode === "kpss" || exam || speed) return;
    if (save.learned.length && !confirm("Öğrenilen " + save.learned.length + " il silinsin mi?")) return;
    save.learned = [];
    persist();
    score = 0;
    shownScore = 0;
    combo = 0;
    closePick();
    if (overEl) {
      overEl.remove();
      overEl = null;
      scene = "play";
    }
    paintHud();
    pulseNext();
    paintRegions();
    say("Bilinenler silindi. Harita yeniden karanlık.", 2.4);
  }

  function winAll() {
    if (speed) return;
    scene = "clear";
    sndFanfare();
    if (overEl) overEl.remove();
    overEl = document.createElement("div");
    overEl.className = "over-card";
    overEl.innerHTML = `
      <div class="card-shot">
        <p class="eyebrow">YURT</p>
        <h2>81 İL</h2>
        <b class="big">${score}</b>
        <p>Yurdu öğrendin. İsimler yine kapalı — istersen baştan.</p>
        <button class="btn gold" id="again">Yeniden</button>
      </div>`;
    screens.play.appendChild(overEl);
    document.getElementById("again").addEventListener("click", () => {
      save.learned = [];
      persist();
      if (overEl) {
        overEl.remove();
        overEl = null;
      }
      startPlay();
    });
  }

  function bootPlay(fn) {
    try {
      audio();
    } catch (_) {}
    show("play");
    requestAnimationFrame(() => {
      try {
        fit();
        const home = homeCam();
        cam = { x: home.x, y: home.y, z: home.z };
        want = { x: home.x, y: home.y, z: home.z };
        fn();
      } catch (err) {
        console.error(err);
        say("Açılamadı. Oyunu kapatıp tekrar dene.", 4);
      }
    });
  }

  function startPlay() {
    if (overEl) {
      overEl.remove();
      overEl = null;
    }
    score = 0;
    shownScore = 0;
    combo = 0;
    selected = -1;
    mode = "explore";
    exam = null;
    speed = null;
    document.getElementById("play").classList.remove("exam-on");
    document.getElementById("play").classList.remove("speed-on");
    regionOn = "all";
    scene = "play";
    bootPlay(() => {
      paintRegions();
      paintHud();
      paintChoices();
      say("Önce bölgeye dokun, sonra ile. Soru rastgele il getirir.", 3.4);
      pulseNext();
    });
  }

  function pulseNext() {
    const learned = learnedSet();
    const rest = YURT_MAP.map((il, i) => i).filter((i) => !learned.has(YURT_MAP[i].n));
    pulseI = rest.length ? rest[(Math.random() * rest.length) | 0] : -1;
    pulseT = 4;
  }

  function goMenu() {
    scene = "menu";
    selected = -1;
    exam = null;
    speed = null;
    mode = "explore";
    document.getElementById("play").classList.remove("exam-on");
    document.getElementById("play").classList.remove("speed-on");
    if (overEl) {
      overEl.remove();
      overEl = null;
    }
    show("menu");
    paintHud();
    fitMenu();
  }

  function fit() {
    const wrap = document.getElementById("stage-wrap");
    const r = wrap.getBoundingClientRect();
    viewW = r.width;
    viewH = r.height;
    const dpr = Math.max(1, Math.min(2.5, window.devicePixelRatio || 1));
    canvas.width = Math.round(viewW * dpr);
    canvas.height = Math.round(viewH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function fitMenu() {
    const r = screens.menu.getBoundingClientRect();
    menuFx.width = r.width;
    menuFx.height = r.height;
  }

  function addRing(c, ring, camx, camy, camz, vw, vh) {
    ring.forEach((p, k) => {
      const uv = toUV(p[0], p[1]);
      const x = (uv.u - camx) * camz * vw + vw / 2;
      const y = (uv.v - camy) * camz * vw * ASPECT + vh / 2;
      if (k === 0) c.moveTo(x, y);
      else c.lineTo(x, y);
    });
    c.closePath();
  }

  function pathAll(c, camx, camy, camz, vw, vh) {
    c.beginPath();
    YURT_MAP.forEach((il) => {
      il.rings.forEach((ring) => addRing(c, ring, camx, camy, camz, vw, vh));
    });
  }

  function pathOne(c, il, camx, camy, camz, vw, vh) {
    c.beginPath();
    il.rings.forEach((ring) => addRing(c, ring, camx, camy, camz, vw, vh));
  }

  function paintIl(c, i, fill, glow, blur, camx, camy, camz, vw, vh) {
    c.save();
    pathOne(c, YURT_MAP[i], camx, camy, camz, vw, vh);
    c.fillStyle = fill;
    c.shadowColor = glow;
    c.shadowBlur = blur;
    c.fill();
    c.restore();
  }

  function drawMap(c, vw, vh, camx, camy, camz) {
    drawTerrain(c, camx, camy, camz, vw, vh);

    const learned = learnedSet();
    const explore = mode !== "kpss";
    YURT_MAP.forEach((il, i) => {
      if (explore && learned.has(il.n) && i !== selected) {
        paintIl(c, i, "rgba(236, 248, 255, 0.82)", "rgba(210, 240, 255, 0.85)", 18, camx, camy, camz, vw, vh);
      }
    });
    if (hover >= 0 && hover !== selected && !(explore && learned.has(YURT_MAP[hover].n))) {
      paintIl(c, hover, "rgba(180, 220, 255, 0.2)", "rgba(160, 220, 255, 0.45)", 10, camx, camy, camz, vw, vh);
    }
    const examIt = exam && exam.items[exam.q];
    if (examIt && examIt.type === "demir-map" && examIt.picks) {
      examIt.picks.forEach((pi) => {
        if (pi !== selected) {
          paintIl(c, pi, "rgba(236, 248, 255, 0.82)", "rgba(210, 240, 255, 0.85)", 18, camx, camy, camz, vw, vh);
        }
      });
    }
    if (selected >= 0) {
      YURT_MAP.forEach((il, i) => {
        if (nearSet.has(il.n) && i !== selected && !(explore && learned.has(il.n))) {
          paintIl(c, i, "rgba(140, 200, 255, 0.12)", "rgba(120, 190, 255, 0.25)", 8, camx, camy, camz, vw, vh);
        }
      });
      const pulse = 0.78 + Math.sin(time * 5.2) * 0.08;
      paintIl(
        c,
        selected,
        `rgba(236, 248, 255, ${pulse})`,
        "rgba(210, 240, 255, 0.95)",
        28,
        camx,
        camy,
        camz,
        vw,
        vh
      );
    }
    if (pulseI >= 0 && pulseT > 0 && pulseI !== selected && !(explore && learned.has(YURT_MAP[pulseI].n))) {
      const a = 0.1 + Math.sin(time * 6) * 0.06;
      paintIl(c, pulseI, `rgba(170, 220, 255, ${a})`, "rgba(140, 210, 255, 0.4)", 12, camx, camy, camz, vw, vh);
    }

    const lw = Math.max(0.55, Math.min(1.7, 0.85 * Math.sqrt(camz)));
    YURT_MAP.forEach((il, i) => {
      c.save();
      pathOne(c, il, camx, camy, camz, vw, vh);
      const sel = i === selected;
      const lit = explore && learned.has(il.n);
      c.strokeStyle = sel || lit ? "rgba(255, 255, 255, 0.98)" : "rgba(150, 205, 255, 0.62)";
      c.lineWidth = sel ? lw + 1.15 : lit ? lw + 0.35 : lw;
      c.shadowColor = sel || lit ? "rgba(220, 245, 255, 0.9)" : "rgba(90, 170, 255, 0.55)";
      c.shadowBlur = sel ? 14 : lit ? 8 : 5;
      c.lineJoin = "round";
      c.stroke();
      c.restore();
    });

    c.save();
    pathAll(c, camx, camy, camz, vw, vh);
    c.strokeStyle = "rgba(190, 225, 255, 0.78)";
    c.lineWidth = Math.max(1.15, 1.35 * Math.sqrt(camz));
    c.shadowColor = "rgba(120, 190, 255, 0.7)";
    c.shadowBlur = 12;
    c.lineJoin = "round";
    c.stroke();
    c.restore();

    if (mapLabel && mapLabel.life > 0) {
      const il = YURT_MAP[mapLabel.i];
      if (il) {
        const uv = ilUV(mapLabel.i);
        const p = {
          x: (uv.u - camx) * camz * vw + vw / 2,
          y: (uv.v - camy) * camz * vw * ASPECT + vh / 2,
        };
        const a = mapLabel.life < 0.4 ? mapLabel.life / 0.4 : 1;
        c.save();
        c.globalAlpha = a;
        c.font = "700 15px Segoe UI, Trebuchet MS, sans-serif";
        c.textAlign = "center";
        c.textBaseline = "middle";
        const w = c.measureText(mapLabel.name).width;
        c.fillStyle = "rgba(6, 10, 18, 0.72)";
        c.strokeStyle = "rgba(180, 220, 255, 0.55)";
        c.lineWidth = 1;
        const rw = w + 18;
        const rh = 24;
        c.beginPath();
        if (c.roundRect) c.roundRect(p.x - rw / 2, p.y - rh / 2, rw, rh, 8);
        else c.rect(p.x - rw / 2, p.y - rh / 2, rw, rh);
        c.fill();
        c.stroke();
        c.fillStyle = "#f4f7ff";
        c.shadowColor = "rgba(0,0,0,0.8)";
        c.shadowBlur = 4;
        c.fillText(mapLabel.name, p.x, p.y);
        c.restore();
      }
    }
  }

  function drawScene() {
    const sx = (Math.random() - 0.5) * shake;
    const sy = (Math.random() - 0.5) * shake;
    ctx.save();
    ctx.translate(sx, sy);
    drawMap(ctx, viewW, viewH, cam.x, cam.y, cam.z);
    parts.forEach((p) => {
      ctx.globalAlpha = p.life / p.max;
      ctx.fillStyle = p.hex;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    if (flash > 0) {
      ctx.fillStyle = `rgba(255,236,180,${flash * 0.28})`;
      ctx.fillRect(0, 0, viewW, viewH);
    }
    ctx.restore();
  }

  function drawMenu(dt) {
    fitMenu();
    const w = menuFx.width;
    const h = menuFx.height;
    const z = 1.35;
    mctx.save();
    drawMap(mctx, w, h, 0.5, 0.5, z);
    mctx.restore();
  }

  function pos(ev, el) {
    const rec = (el || canvas).getBoundingClientRect();
    return { x: ev.clientX - rec.left, y: ev.clientY - rec.top };
  }

  canvas.addEventListener("pointerdown", (ev) => {
    if (scene !== "play") return;
    audio();
    const p = pos(ev);
    pointers.set(ev.pointerId, { x: p.x, y: p.y, sx: p.x, sy: p.y });
    dragging = false;
    moved = 0;
  });

  canvas.addEventListener("pointermove", (ev) => {
    if (scene !== "play") return;
    const p = pos(ev);
    hover = hitAt(p.x, p.y);
    if (!pointers.has(ev.pointerId)) return;
    const prev = pointers.get(ev.pointerId);
    if (pointers.size === 2) {
      const pts = [...pointers.values()];
      const ids = [...pointers.keys()];
      const a = ids[0] === ev.pointerId ? p : pts[0];
      const b = ids[1] === ev.pointerId ? p : pts[1];
      const oldA = ids[0] === ev.pointerId ? prev : pts[0];
      const oldB = ids[1] === ev.pointerId ? prev : pts[1];
      const d0 = Math.hypot(oldA.x - oldB.x, oldA.y - oldB.y) || 1;
      const d1 = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      zoomAt(mid.x, mid.y, d1 / d0);
      dragging = true;
    } else {
      const dx = p.x - prev.x;
      const dy = p.y - prev.y;
      moved += Math.hypot(dx, dy);
      if (moved > 8) {
        dragging = true;
        if (!canvas.hasPointerCapture(ev.pointerId)) {
          try {
            canvas.setPointerCapture(ev.pointerId);
          } catch (_) {}
        }
        cam.x -= dx / (cam.z * viewW);
        cam.y -= dy / (cam.z * viewW * ASPECT);
        clampCam(cam);
        want.x = cam.x;
        want.y = cam.y;
        want.z = cam.z;
      }
    }
    pointers.set(ev.pointerId, { x: p.x, y: p.y, sx: prev.sx, sy: prev.sy });
  });

  function endPointer(ev) {
    if (canvas.hasPointerCapture(ev.pointerId)) {
      try {
        canvas.releasePointerCapture(ev.pointerId);
      } catch (_) {}
    }
    if (!pointers.has(ev.pointerId)) return;
    const p = pointers.get(ev.pointerId);
    pointers.delete(ev.pointerId);
    if (scene !== "play" || dragging || moved > 10) return;
    if (speed) return;
    if (mode === "kpss") {
      const it = exam && exam.items[exam.q];
      if (it && it.type === "demir-map" && !answering) {
        const i = hitAt(p.x, p.y);
        if (i >= 0) tapExamIl(i);
        else say("Bir ile dokun.", 1.4);
      }
      return;
    }
    const i = hitAt(p.x, p.y);
    if (i >= 0) {
      const r = YURT_MAP[i].r;
      if (regionOn === "all" && cam.z < homeZ * 1.25) {
        flyRegion(r);
        if (selected < 0) paintChoices();
        say("Bölgeye yaklaştın. Şimdi ili seç.", 2.2);
        return;
      }
      selectIl(i);
    } else say("Bir ile dokun. Üstten bölge seçebilirsin.", 1.6);
  }

  canvas.addEventListener("pointerup", endPointer);
  canvas.addEventListener("pointercancel", (ev) => pointers.delete(ev.pointerId));
  canvas.addEventListener(
    "wheel",
    (ev) => {
      if (scene !== "play") return;
      ev.preventDefault();
      const p = pos(ev);
      zoomAt(p.x, p.y, ev.deltaY > 0 ? 0.88 : 1.14);
    },
    { passive: false }
  );

  function tick(dt) {
    if (scene !== "play") return;
    time += dt;
    if (speed) {
      const prev = Math.ceil(speed.t);
      speed.t -= dt;
      if (speed.t <= 0) {
        speed.t = 0;
        endSpeed();
        return;
      }
      if (Math.ceil(speed.t) !== prev) paintHud();
    }
    if (exam) {
      const prev = Math.ceil(exam.t);
      exam.t -= dt;
      if (exam.t <= 0) {
        exam.t = 0;
        endExam();
        return;
      }
      if (Math.ceil(exam.t) !== prev) paintHud();
    }
    cam.x += (want.x - cam.x) * Math.min(1, 7.5 * dt);
    cam.y += (want.y - cam.y) * Math.min(1, 7.5 * dt);
    cam.z += (want.z - cam.z) * Math.min(1, 7.5 * dt);
    shake = Math.max(0, shake - dt * 26);
    flash = Math.max(0, flash - dt);
    comboT -= dt;
    hintT -= dt;
    pulseT -= dt;
    if (mapLabel) {
      mapLabel.life -= dt;
      if (mapLabel.life <= 0) mapLabel = null;
    }
    if (pulseT <= 0) pulseNext();
    if (hintT <= 0) document.getElementById("hint").textContent = "";
    if (shownScore < score) {
      shownScore += Math.max(1, (score - shownScore) * 8 * dt);
      if (shownScore > score) shownScore = score;
      paintHud();
    }
    parts.forEach((p) => {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 220 * dt;
    });
    parts = parts.filter((p) => p.life > 0);
    drawScene();
  }

  function loop(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    if (scene === "play") tick(dt);
    else if (scene === "menu") time += dt;
    requestAnimationFrame(loop);
  }

  let menuReady = false;
  let menuLoading = false;

  function openHow() {
    const el = document.getElementById("how");
    if (el) el.hidden = false;
  }
  function closeHow() {
    const el = document.getElementById("how");
    if (el) el.hidden = true;
  }
  function beginMenuLoad() {
    if (menuReady || menuLoading) return;
    menuLoading = true;
    try {
      audio();
    } catch (_) {}
    const hint = document.getElementById("tap-hint");
    const loader = document.getElementById("loader");
    const bar = document.getElementById("load-bar");
    if (hint) hint.hidden = true;
    loader.hidden = false;
    bar.style.width = "0%";
    const t0 = performance.now();
    const DUR = 2200;
    const timer = setInterval(() => {
      const t = Math.min(1, (performance.now() - t0) / DUR);
      const eased = 1 - Math.pow(1 - t, 2.2);
      bar.style.width = (eased * 100).toFixed(1) + "%";
      if (t >= 1) {
        clearInterval(timer);
        setTimeout(() => {
          menuLoading = false;
          menuReady = true;
          loader.hidden = true;
          document.getElementById("menu-actions").hidden = false;
          try {
            sndPaper();
          } catch (_) {}
        }, 260);
      }
    }, 30);
  }
  document.getElementById("menu").addEventListener("click", (e) => {
    if (e.target.closest("button")) return;
    beginMenuLoad();
  });
  document.getElementById("btn-how").addEventListener("click", (e) => {
    e.stopPropagation();
    openHow();
  });
  document.getElementById("how-ok").addEventListener("click", closeHow);
  document.getElementById("btn-tuik").addEventListener("click", (e) => {
    e.stopPropagation();
    audio();
    sndPaper();
    document.getElementById("soon").hidden = false;
  });
  document.getElementById("soon-ok").addEventListener("click", () => {
    document.getElementById("soon").hidden = true;
  });

  document.getElementById("btn-go").addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    startPlay();
  });
  document.getElementById("btn-kpss").addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    startKpss();
  });
  document.getElementById("btn-speed").addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    startSpeed();
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!document.getElementById("how").hidden) {
        closeHow();
        return;
      }
      if (!document.getElementById("soon").hidden) {
        document.getElementById("soon").hidden = true;
        return;
      }
      if (scene === "play" || scene === "clear") goMenu();
      return;
    }
    if (scene !== "play" || answering) return;
    let k = -1;
    if (e.key >= "1" && e.key <= "5") k = e.key.charCodeAt(0) - 49;
    const letter = e.key.toLowerCase();
    if ("abcde".indexOf(letter) >= 0) k = "abcde".indexOf(letter);
    if (!exam && !speed && letter === " ") {
      e.preventDefault();
      document.getElementById("btn-quiz").click();
      return;
    }
    const btns = document.getElementById("choices").children;
    if (k >= 0 && btns[k] && !btns[k].disabled) btns[k].click();
  });
  document.getElementById("btn-back").addEventListener("click", goMenu);
  document.getElementById("z-in").addEventListener("click", () => zoomAt(viewW / 2, viewH / 2, 1.28));
  document.getElementById("z-out").addEventListener("click", () => zoomAt(viewW / 2, viewH / 2, 0.78));
  document.getElementById("z-fit").addEventListener("click", () => flyRegion("all"));
  document.getElementById("btn-quiz").addEventListener("click", () => {
    audio();
    const learned = learnedSet();
    const rest = YURT_MAP.map((_, i) => i).filter((i) => !learned.has(YURT_MAP[i].n));
    const pool = rest.length ? rest : YURT_MAP.map((_, i) => i);
    selectIl(pool[(Math.random() * pool.length) | 0]);
  });
  document.getElementById("btn-reset").addEventListener("click", (e) => {
    e.preventDefault();
    audio();
    resetLearned();
  });
  window.addEventListener("resize", () => {
    if (scene === "play" || scene === "clear") {
      fit();
      if (!exam && !speed && selected < 0) paintChoices();
    } else fitMenu();
  });

  try {
    applyFacts();
  } catch (_) {}
  goMenu();
  const isHttp = location.protocol === "http:" || location.protocol === "https:";
  if (isHttp && IS_LOCAL) {
    fetch("/__lan")
      .then((r) => r.json())
      .then((d) => {
        const el = document.getElementById("phone-url");
        const urls = (d.urls || []).filter((u) => u.indexOf("169.254.") < 0);
        urls.sort((a, b) => (a.indexOf("192.168.") >= 0 ? -1 : 0) - (b.indexOf("192.168.") >= 0 ? -1 : 0));
        if (!el || !urls.length) return;
        el.hidden = false;
        el.textContent = "Telefon: " + urls[0];
      })
      .catch(() => {});
    setInterval(() => fetch("/__ping").catch(() => {}), 1500);
  }
  if (isHttp && "serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    });
  }
  const iosHint = document.getElementById("ios-hint");
  if (iosHint && IS_IOS && !STANDALONE && location.protocol === "https:") iosHint.hidden = false;
  document.addEventListener("gesturestart", (e) => e.preventDefault());
  document.addEventListener("gesturechange", (e) => e.preventDefault());
  document.addEventListener(
    "touchmove",
    (e) => {
      if (e.touches.length > 1 && e.target !== canvas) e.preventDefault();
    },
    { passive: false }
  );
  let lastTouchEnd = 0;
  document.addEventListener(
    "touchend",
    (e) => {
      const now = Date.now();
      if (now - lastTouchEnd < 320 && e.target !== canvas) e.preventDefault();
      lastTouchEnd = now;
    },
    { passive: false }
  );
  last = performance.now();
  requestAnimationFrame(loop);
})();
