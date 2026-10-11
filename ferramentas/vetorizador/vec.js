// Vetorizador do logo KOALA — traçado por isocontorno subpixel (marching squares)
const W = 1080, H = 1920, BG = [189, 159, 233];
const V = {};

V.img = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
V.load = async (src) => {
  const i = await V.img(src);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d'); x.drawImage(i, 0, 0);
  return x.getImageData(0, 0, W, H).data;
};
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
V.lum = (D, k) => 0.299 * D[k] + 0.587 * D[k + 1] + 0.114 * D[k + 2];

// Campo escalar em uma caixa [x0,y0,x1,y1)
V.field = (box, fn) => {
  const [x0, y0, x1, y1] = box, w = x1 - x0, h = y1 - y0, F = new Float32Array(w * h);
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) F[(y - y0) * w + (x - x0)] = fn(x, y, (y * W + x) * 4);
  return { box, w, h, F };
};

// Componentes conexos (4-viz.) de F >= lv
V.components = (fld, lv = 0.5) => {
  const { w, h, F } = fld, lab = new Int32Array(w * h).fill(-1), comps = [];
  const q = new Int32Array(w * h);
  for (let s = 0; s < w * h; s++) {
    if (lab[s] >= 0 || F[s] < lv) continue;
    const id = comps.length; let qh = 0, qt = 0; q[qt++] = s; lab[s] = id;
    let n = 0, sx = 0, sy = 0, minx = 1e9, miny = 1e9, maxx = -1, maxy = -1;
    while (qh < qt) {
      const p = q[qh++], px = p % w, py = (p / w) | 0; n++; sx += px; sy += py;
      if (px < minx) minx = px; if (px > maxx) maxx = px; if (py < miny) miny = py; if (py > maxy) maxy = py;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = px + dx, ny = py + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const np = ny * w + nx; if (lab[np] < 0 && F[np] >= lv) { lab[np] = id; q[qt++] = np; }
      }
    }
    comps.push({ id, n, cx: sx / n + fld.box[0], cy: sy / n + fld.box[1],
                 bbox: [minx + fld.box[0], miny + fld.box[1], maxx + fld.box[0], maxy + fld.box[1]] });
  }
  return { lab, comps };
};

// Máscara binária -> dilatação quadrada de raio r
V.dilate = (mask, w, h, r) => {
  let cur = mask;
  for (let it = 0; it < r; it++) {
    const nx = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (cur[i] || (x > 0 && cur[i - 1]) || (x < w - 1 && cur[i + 1]) || (y > 0 && cur[i - w]) || (y < h - 1 && cur[i + w])) nx[i] = 1;
    }
    cur = nx;
  }
  return cur;
};
V.erode = (mask, w, h, r) => {
  const inv = mask.map(v => 1 - v); const d = V.dilate(inv, w, h, r); return d.map(v => 1 - v);
};

// Marching squares com interpolação linear -> lista de contornos fechados (coords de imagem)
V.contours = (fld, lv = 0.5) => {
  const { box, w, h, F } = fld;
  const PW = w + 2, PH = h + 2, G = new Float32Array(PW * PH);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) G[(y + 1) * PW + x + 1] = F[y * w + x];
  const g = (i, j) => G[j * PW + i];
  const hid = (i, j) => 2 * (j * PW + i), vid = (i, j) => 2 * (j * PW + i) + 1;
  const pts = new Map(), adj = new Map();
  const pt = (id, i, j) => {
    if (pts.has(id)) return;
    let x, y;
    if (id % 2 === 0) { const a = g(i, j), b = g(i + 1, j); const t = (lv - a) / (b - a); x = i + t; y = j; }
    else { const a = g(i, j), b = g(i, j + 1); const t = (lv - a) / (b - a); x = i; y = j + t; }
    pts.set(id, [x - 1 + 0.5 + box[0], y - 1 + 0.5 + box[1]]);
  };
  const link = (e1, e2) => { (adj.get(e1) || adj.set(e1, []).get(e1)).push(e2); (adj.get(e2) || adj.set(e2, []).get(e2)).push(e1); };
  for (let j = 0; j < PH - 1; j++) for (let i = 0; i < PW - 1; i++) {
    const a = g(i, j), b = g(i + 1, j), c = g(i + 1, j + 1), d = g(i, j + 1);
    const cs = (a >= lv ? 8 : 0) | (b >= lv ? 4 : 0) | (c >= lv ? 2 : 0) | (d >= lv ? 1 : 0);
    if (cs === 0 || cs === 15) continue;
    const T = hid(i, j), B = hid(i, j + 1), L = vid(i, j), R = vid(i + 1, j);
    const E = { T: [T, i, j], B: [B, i, j + 1], L: [L, i, j], R: [R, i + 1, j] };
    const center = (a + b + c + d) / 4 >= lv;
    const tab = {
      1: [['L', 'B']], 2: [['B', 'R']], 3: [['L', 'R']], 4: [['T', 'R']],
      5: center ? [['T', 'L'], ['B', 'R']] : [['T', 'R'], ['L', 'B']],
      6: [['T', 'B']], 7: [['T', 'L']], 8: [['T', 'L']], 9: [['T', 'B']],
      10: center ? [['T', 'R'], ['L', 'B']] : [['T', 'L'], ['B', 'R']],
      11: [['T', 'R']], 12: [['L', 'R']], 13: [['B', 'R']], 14: [['L', 'B']]
    }[cs];
    for (const [p, q] of tab) { const e1 = E[p], e2 = E[q]; pt(...e1); pt(...e2); link(e1[0], e2[0]); }
  }
  const seen = new Set(), out = [];
  for (const start of adj.keys()) {
    if (seen.has(start)) continue;
    const poly = []; let prev = -1, cur = start;
    while (cur !== undefined && !seen.has(cur)) {
      seen.add(cur); poly.push(pts.get(cur));
      const nb = adj.get(cur); const nxt = nb[0] !== prev ? nb[0] : nb[1];
      prev = cur; cur = nxt;
    }
    if (poly.length > 4) out.push(poly);
  }
  return out;
};

V.area = p => { let s = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };

// Douglas-Peucker em polígono fechado
V.rdp = (pts, eps) => {
  if (pts.length < 8) return pts;
  const sq = (a, b, p) => { const dx = b[0] - a[0], dy = b[1] - a[1]; const L = dx * dx + dy * dy || 1e-9;
    let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L; t = clamp(t); const x = a[0] + t * dx - p[0], y = a[1] + t * dy - p[1]; return x * x + y * y; };
  const rec = (arr) => { let md = 0, mi = 0; const a = arr[0], b = arr[arr.length - 1];
    for (let i = 1; i < arr.length - 1; i++) { const d = sq(a, b, arr[i]); if (d > md) { md = d; mi = i; } }
    if (md > eps * eps) { const l = rec(arr.slice(0, mi + 1)), r = rec(arr.slice(mi)); return l.slice(0, -1).concat(r); }
    return [a, b]; };
  // divide no ponto mais distante do primeiro
  let fi = 0, fd = 0; for (let i = 1; i < pts.length; i++) { const d = (pts[i][0] - pts[0][0]) ** 2 + (pts[i][1] - pts[0][1]) ** 2; if (d > fd) { fd = d; fi = i; } }
  const A = rec(pts.slice(0, fi + 1)), B = rec(pts.slice(fi).concat([pts[0]]));
  return A.slice(0, -1).concat(B.slice(0, -1));
};

// suavização leve (média ponderada) para tirar ruído de JPG
V.smooth = (pts, k = 1) => {
  let p = pts;
  for (let it = 0; it < k; it++) p = p.map((q, i) => { const a = p[(i - 1 + p.length) % p.length], b = p[(i + 1) % p.length];
    return [(a[0] + 2 * q[0] + b[0]) / 4, (a[1] + 2 * q[1] + b[1]) / 4]; });
  return p;
};

const f2 = v => Math.round(v * 100) / 100;
// polígono -> path SVG com curvas (Catmull-Rom -> Bézier cúbica)
V.pathCurve = (p) => {
  const n = p.length; let d = `M${f2(p[0][0])} ${f2(p[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = p[(i - 1 + n) % n], p1 = p[i], p2 = p[(i + 1) % n], p3 = p[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${f2(c1[0])} ${f2(c1[1])} ${f2(c2[0])} ${f2(c2[1])} ${f2(p2[0])} ${f2(p2[1])}`;
  }
  return d + 'Z';
};
V.pathPoly = (p) => 'M' + p.map(q => `${f2(q[0])} ${f2(q[1])}`).join('L') + 'Z';

// traça um campo -> d (com buracos se holes=true), filtrando contornos pequenos
V.inPoly = (p, X, Y) => { let ins = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
  const [xi, yi] = p[i], [xj, yj] = p[j]; if ((yi > Y) !== (yj > Y) && X < (xj - xi) * (Y - yi) / (yj - yi) + xi) ins = !ins; } return ins; };
// profundidade de aninhamento de cada contorno (0 = externo, 1 = buraco, 2 = ilha no buraco...)
V.depths = (cs) => cs.map((p, i) => cs.reduce((n, q, j) => n + (j !== i && Math.abs(V.area(q)) > Math.abs(V.area(p)) && V.inPoly(q, p[0][0], p[0][1]) ? 1 : 0), 0));

V.trace = (fld, { lv = 0.5, eps = 0.45, sm = 1, minArea = 4, holes = true, curve = true } = {}) => {
  const cs = V.contours(fld, lv).filter(p => Math.abs(V.area(p)) >= minArea);
  const dp = V.depths(cs);
  const keep = cs.filter((p, i) => holes || dp[i] === 0);
  const mk = curve ? V.pathCurve : V.pathPoly;
  return { d: keep.map(p => mk(V.rdp(V.smooth(p, sm), eps))).join(''), contours: cs, depths: dp };
};

// distância euclidiana aproximada (chamfer 3-4) até o pixel 1 mais próximo
V.dist = (mask, w, h) => {
  const INF = 1e9, d = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) d[i] = mask[i] ? 0 : INF;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; let v = d[i];
    if (x > 0) v = Math.min(v, d[i - 1] + 3); if (y > 0) { v = Math.min(v, d[i - w] + 3); if (x > 0) v = Math.min(v, d[i - w - 1] + 4); if (x < w - 1) v = Math.min(v, d[i - w + 1] + 4); } d[i] = v; }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) { const i = y * w + x; let v = d[i];
    if (x < w - 1) v = Math.min(v, d[i + 1] + 3); if (y < h - 1) { v = Math.min(v, d[i + w] + 3); if (x < w - 1) v = Math.min(v, d[i + w + 1] + 4); if (x > 0) v = Math.min(v, d[i + w - 1] + 4); } d[i] = v; }
  for (let i = 0; i < w * h; i++) d[i] /= 3;
  return d;
};

// preenche buracos de uma máscara (tudo que não alcança a borda)
V.fillHoles = (mask, w, h) => {
  const out = new Uint8Array(w * h).fill(1), q = [];
  const push = (x, y) => { const i = y * w + x; if (out[i] && !mask[i]) { out[i] = 0; q.push(i); } };
  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
  for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
  while (q.length) { const i = q.pop(), x = i % w, y = (i / w) | 0;
    if (x > 0) push(x - 1, y); if (x < w - 1) push(x + 1, y); if (y > 0) push(x, y - 1); if (y < h - 1) push(x, y + 1); }
  return out;
};

// cor mediana dos pixels selecionados
V.median = (D, sel) => {
  const r = [], g = [], b = [];
  sel((k) => { r.push(D[k]); g.push(D[k + 1]); b.push(D[k + 2]); });
  if (!r.length) return '#000000';
  const m = a => a.sort((x, y) => x - y)[a.length >> 1];
  return '#' + [m(r), m(g), m(b)].map(v => v.toString(16).padStart(2, '0')).join('');
};

window.V = V;
