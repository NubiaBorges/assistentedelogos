// ---------- geometria das peças
const Q = PARTS.quadros.map(q => q.partes);                 // 0: nome+símbolo branco, 1: símbolo branco, 2: símbolo colorido (final)
const BGCOLOR = PARTS.bg || '#175843';
const P2D = {}, IMGS = {};
const imgsReady = Promise.all(Q.flat().filter(p => p.img).map(p => {
  if (IMGS[p.img]) return Promise.resolve();
  const im = new Image(); IMGS[p.img] = im;
  return new Promise(r => { im.onload = r; im.onerror = r; im.src = PARTS.imagens[p.img]; });
}));
for (const p of Q.flat()) if (p.d) P2D[p.id] = new Path2D(p.d);
const svgHost = document.createElement('div'); svgHost.style.cssText = 'position:absolute;left:-9999px;top:0;width:0;height:0;overflow:hidden';
document.body.appendChild(svgHost);
function bboxOf(ds) {
  svgHost.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg">' + ds.map(d => `<path d="${d}"/>`).join('') + '</svg>';
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  svgHost.querySelectorAll('path').forEach(p => { const b = p.getBBox(); x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.width); y1 = Math.max(y1, b.y + b.height); });
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}
const grp = (q, g) => Q[q].filter(p => p.g === g);
const camada = (q, t) => Q[q].filter(p => p.top === t);
const PIECES = ['arco-externo', 'arco-interno', 'asas', 'onda-meio', 'onda-inferior', 'letra-X', 'letra-V'];
const WORDS = ['palavra-Colegio', 'palavra-Integrado', 'palavra-XV', 'palavra-de', 'palavra-Novembro'];
const SB = [0, 1, 2].map(q => bboxOf(camada(q, 'simbolo').map(p => p.d)));
const PB = Object.fromEntries(PIECES.map(n => [n, bboxOf(grp(0, n).map(p => p.d))]));   // peças no quadro 1
const WB = Object.fromEntries(WORDS.map(n => [n, bboxOf(grp(0, n).map(p => p.d))]));
const S1 = SB[0].w / SB[1].w;                                   // símbolo do quadro 1 = símbolo do quadro 2 reduzido
const C1 = { x: SB[0].cx, y: SB[0].cy }, C2 = { x: SB[1].cx, y: SB[1].cy };
const STICKER = grp(2, 'adesivo')[0];
const FUNDO_G = ['fundo'], FITAS = ['fita-superior', 'fita-inferior'], PONTOS = ['pontos-esquerda', 'pontos-direita', 'pontos-baixo'];
// pontos individuais (cada subcaminho de um grupo é um ponto)
const DOTS = [];
PONTOS.forEach((g, gi) => grp(2, g).forEach(p => p.d.split('M').filter(Boolean).forEach(sp => {
  const n = sp.match(/-?\d+\.?\d*/g).map(Number); // x+r y A r r 0 1 0 x-r y ...
  DOTS.push({ path: new Path2D('M' + sp), fill: p.fill, cx: (n[0] + n[8]) / 2, cy: n[1], g: gi });
})));
DOTS.forEach(d => d.order = d.g === 0 ? d.cy : d.g === 1 ? 2000 - d.cy : 4000 + d.cx);
const DOT_ORDER = DOTS.slice().sort((a, b) => a.order - b.order);
DOT_ORDER.forEach((d, i) => d.i = i);
const FITA_BOX = Object.fromEntries(FITAS.map(f => { const p = grp(2, f)[0]; return [f, { cx: p.x + p.w / 2, cy: p.y + p.h / 2 }]; }));

// ---------- timeline
const RIB = [0.0, 0.95], DOT0 = 0.22, DOT_STEP = 0.024;
const IN = { 'arco-externo': [0.2, 0.7], 'arco-interno': [0.32, 0.65], 'asas': [0.42, 0.72], 'onda-meio': [0.5, 0.55], 'onda-inferior': [0.56, 0.55], 'letra-X': [0.74, 0.38], 'letra-V': [0.82, 0.38] };
const WORD0 = 0.95, WORD_STEP = 0.1, WORD_DUR = 0.45;               // nome entra palavra por palavra (até 1,8 s)
const OUT0 = 2.1, OUT_STEP = 0.05, OUT_DUR = 0.28;                  // nome sai
const MOVE = [2.2, 0.65];                                           // símbolo gira e cresce até o centro (quadro 2 em 2,85 s)
const REVEAL = [3.15, 0.7];                                         // frente líquida revela o colorido (quadro 3 em 3,85 s)
const SETTLE = 3.82, SHINE = 4.0, TWINKLE = 4.05;

// ---------- desenho
function fill(c, p) {
  if (p.img) { const im = IMGS[p.img]; if (im && im.complete) c.drawImage(im, p.x, p.y, p.w, p.h); return; }
  c.fillStyle = p.fill; c.fill(P2D[p.id], p.rule);
}
const around = (c, P, a, s = 1, sy = s) => { c.translate(P.x, P.y); if (a) c.rotate(a); if (s !== 1 || sy !== 1) c.scale(s, sy); c.translate(-P.x, -P.y); };

// Âncoras do fundo: no horizontal, cada elemento fica preso ao seu canto/borda; a textura cobre a tela.
const ANCORA = { 'fita-superior': ['dir', 'topo'], 'fita-inferior': ['esq', 'base'], 'pontos-esquerda': ['esq', 'topo'],
                 'pontos-direita': ['dir', 'base'], 'pontos-baixo': ['esq', 'base'] };
const ancora = n => { const [h, v] = ANCORA[n]; return { x: h === 'dir' ? CW - 1080 : 0, y: v === 'base' ? CH - 1920 : 0 }; };
function drawBackground(c, t, final) {
  { const tex = camada(2, 'fundo')[0], k = Math.max(CW / 1080, CH / 1920);
    c.save(); c.translate((CW - 1080 * k) / 2, (CH - 1920 * k) / 2); c.scale(k, k); fill(c, tex); c.restore(); }
  FITAS.forEach((f, i) => {
    const e = final ? 1 : easeOutBack(prog(t, RIB[0] + i * 0.08, RIB[1]), 1.2), B = FITA_BOX[f], sgn = i ? -1 : 1;
    c.save(); c.globalAlpha = final ? 1 : clamp(prog(t, RIB[0] + i * 0.08, 0.3));
    const A = ancora(f); c.translate(A.x + (1 - e) * 280 * sgn, A.y + (1 - e) * -240 * sgn);
    around(c, { x: B.cx, y: B.cy }, (1 - e) * 0.35 * sgn);
    grp(2, f).forEach(p => fill(c, p)); c.restore();
  });
  for (const d of DOTS) {
    let s = 1;
    if (!final) {
      s = Math.max(0, easeOutBack(prog(t, DOT0 + d.i * DOT_STEP, 0.3), 2.4));
      s *= 1 + 0.45 * pulse(t, TWINKLE + d.i * 0.012, 0.22);
    }
    if (s <= 0) continue;
    const A = ancora(PONTOS[d.g]); c.save(); c.translate(A.x, A.y); around(c, { x: d.cx, y: d.cy }, 0, s); c.fillStyle = d.fill; c.fill(d.path); c.restore();
  }
}

// símbolo branco do quadro 1 montando-se peça por peça
function drawSymbolIntro(c, t) {
  for (const n of PIECES) {
    const [s0, du] = IN[n], p = prog(t, s0, du); if (p <= 0) continue;
    const e = easeOutCubic(p), B = PB[n];
    c.save(); c.globalAlpha = clamp(p * 4);
    if (n === 'arco-externo') around(c, C1, (1 - e) * -2.0);
    else if (n === 'arco-interno') around(c, C1, (1 - e) * 1.8);
    else if (n === 'asas') { const b = easeOutBack(p, 1.6); around(c, { x: B.x0 + B.w * 0.2, y: B.y1 }, (1 - b) * -0.7, 0.55 + 0.45 * b); }
    else if (n.startsWith('onda')) c.translate((1 - e) * (n === 'onda-meio' ? -55 : 55), 0);
    else around(c, { x: B.cx, y: B.cy }, 0, Math.max(0.001, easeOutBack(p, 2.6)));
    grp(0, n).forEach(q => fill(c, q)); c.restore();
  }
}

function drawWords(c, t) {
  WORDS.forEach((w, i) => {
    const B = WB[w], pin = prog(t, WORD0 + i * WORD_STEP, WORD_DUR), pout = prog(t, OUT0 + i * OUT_STEP, OUT_DUR);
    if (pin <= 0 || pout >= 1) return;
    const dy = (1 - easeOutCubic(pin)) * B.h * 1.15 + easeInQuad(pout) * B.h * 1.15;   // sobe de dentro da linha e depois desce
    c.save(); c.beginPath(); c.rect(B.x0 - 6, B.y0 - 6, B.w + 12, B.h + 8); c.clip();
    c.translate(0, dy); grp(0, w).forEach(p => fill(c, p)); c.restore();
  });
}

// símbolo do quadro 2 (branco) com transformação global; e=0 coincide com o quadro 1
function drawSymbolMoving(c, t) {
  const e = easeInOutCubic(prog(t, MOVE[0], MOVE[1]));
  const s = lerp(S1, 1, e), x = lerp(C1.x, C2.x, e), y = lerp(C1.y, C2.y, e) - Math.sin(Math.PI * e) * 40;
  c.save(); c.translate(x, y); c.rotate(-Math.PI * 2 * e); c.scale(s, s); c.translate(-C2.x, -C2.y);
  camada(1, 'simbolo').forEach(p => fill(c, p)); c.restore();
}

// frente líquida orgânica: região já revelada (atrás da frente)
const U = { x: Math.SQRT1_2, y: -Math.SQRT1_2 }, PERP = { x: Math.SQRT1_2, y: Math.SQRT1_2 };
function frontPath(t, extra = 0) {
  const R = lerp(-300, 310, easeInOutSine(prog(t, REVEAL[0], REVEAL[1]))) + extra, path = new Path2D();
  const wob = s => 20 * Math.sin(s * 0.024 + t * 9) + 9 * Math.sin(s * 0.063 - t * 13);
  const pt = (a, s) => [C2.x + U.x * a + PERP.x * s, C2.y + U.y * a + PERP.y * s];
  path.moveTo(...pt(-900, -450));
  for (let s = -450; s <= 450; s += 6) path.lineTo(...pt(R + wob(s), s));
  path.lineTo(...pt(-900, 450)); path.closePath();
  return path;
}
function drawReveal(c, t) {
  camada(1, 'simbolo').forEach(p => fill(c, p));                               // branco por fora da frente
  c.save(); c.clip(frontPath(t));
  camada(2, 'simbolo').forEach(p => fill(c, p));                               // adesivo + colorido por dentro
  c.restore();
  // faixa verde-limão na borda da onda, só dentro do adesivo
  c.save(); c.clip(P2D[STICKER.id]);
  const inner = frontPath(t, -30), outer = frontPath(t, 0);
  c.clip(outer); c.fillStyle = '#8ed02d';
  c.fill(invertPath(inner), 'evenodd');
  c.restore();
}
function invertPath(p) { const q = new Path2D(); q.rect(-2000, -2000, 6000, 6000); q.addPath(p); return q; }

function drawFinalSymbol(c, t, final) {
  const s = final ? 1 : 1 + 0.045 * pulse(t, SETTLE, 0.38);
  const S = SB[2]; c.save(); around(c, { x: S.cx, y: S.cy }, 0, s);
  camada(2, 'simbolo').forEach(p => fill(c, p)); c.restore();
}

function drawScene(c, t) {
  if (t < MOVE[0]) { if (t < 1.75) drawSymbolIntro(c, t); else camada(0, 'simbolo').forEach(p => fill(c, p)); }
  else if (t < REVEAL[0]) drawSymbolMoving(c, t);
  else if (t < REVEAL[0] + REVEAL[1]) drawReveal(c, t);
  else drawFinalSymbol(c, t, false);
  if (t < OUT0 + 4 * OUT_STEP + OUT_DUR) drawWords(c, t);
}

function sweep(drawFn, t, start, dur, x0, x1, y0, y1) {
  const q = prog(t, start, dur);
  if (q <= 0 || q >= 1) return;
  const c = tmp.getContext('2d');
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
  c.clearRect(0, 0, CW, CH); c.setTransform(...VIEW); drawFn(c);
  c.globalCompositeOperation = 'source-atop';
  const sx = lerp(x0 - 200, x1 + 200, easeInOutSine(q));
  const cy = (y0 + y1) / 2, gr = c.createLinearGradient(sx - 80, cy - 30, sx + 80, cy + 30);
  gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.5, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = gr; c.fillRect(x0 - 50, y0 - 50, x1 - x0 + 100, y1 - y0 + 100);
  c.globalCompositeOperation = 'source-over';
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(tmp, 0, 0); g.restore();
}

function render(t) {
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1;
  g.fillStyle = BGCOLOR; g.fillRect(0, 0, CW, CH);
  const final = t >= DURATION - 1e-6;                    // último quadro = SVG final exato
  drawBackground(g, t, final);
  g.setTransform(...VIEW);
  if (final) { drawFinalSymbol(g, DURATION, true); return; }
  drawScene(g, t);
  const S = SB[2];
  sweep(c => camada(2, 'simbolo').filter(p => p.g !== 'adesivo').forEach(p => fill(c, p)), t, SHINE, 0.6, S.x0, S.x1, S.y0, S.y1);
}

