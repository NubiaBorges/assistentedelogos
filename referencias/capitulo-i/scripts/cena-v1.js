// ---------- geometria das peças
const Q = PARTS.quadros.map(q => q.partes);                 // um quadro: o logo final
const BGCOLOR = '#5b8c84';
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
const grp = g => Q[0].filter(p => p.g === g);
const boxG = g => bboxOf(grp(g).filter(p => p.d).map(p => p.d));
const LETRAS = [...new Set(Q[0].filter(p => p.g.startsWith('letra-')).map(p => p.g))];
const PAGINAS = ['pagina-esquerda-inferior', 'pagina-direita-inferior', 'pagina-esquerda-superior', 'pagina-direita-superior'];
const FOLHAS = ['folha-esquerda', 'folha-direita', 'folha-pequena'];
const BX = Object.fromEntries(['adesivo', 'caule', ...PAGINAS, ...FOLHAS, ...LETRAS].map(g => [g, boxG(g)]));
const ESPINHA = BX['caule'].cx;                              // lombada do livro = linha do caule
// pontos de fixação das folhas no caule
const PIVO = { 'folha-esquerda': { x: BX['folha-esquerda'].x1 - 4, y: BX['folha-esquerda'].y0 + BX['folha-esquerda'].h * 0.72 },
               'folha-direita': { x: BX['folha-direita'].x0 + 6, y: BX['folha-direita'].y0 + BX['folha-direita'].h * 0.78 },
               'folha-pequena': { x: BX['folha-pequena'].x1 - 6, y: BX['folha-pequena'].y1 - 6 } };
// traços individuais (na ordem do caminho) com centro
const TRACOS = ['tracejado-superior', 'tracejado-direita'].map(g => grp(g).map(p => { const b = bboxOf([p.d]); return { p, cx: b.cx, cy: b.cy }; }));
const BAIXO = ['papel-inferior', 'onda-escura', 'onda-verde', 'forma-clara'];

// ---------- timeline
const TL = [0.1, 0.75];                                      // papel + faixa do canto superior
const BOT0 = 0.0, BOT_STEP = 0.09, BOT_DUR = 0.85;          // camadas de baixo subindo
const DASH = [[0.8, 0.045], [1.0, 0.045]];                   // passos do caminho tracejado
const STK = [0.72, 0.6];                                     // adesivo se espalhando como líquido
const BOOK = 1.15, STEM = [1.55, 0.55];
const LEAF = { 'folha-esquerda': [1.95, 0.55], 'folha-direita': [2.07, 0.55], 'folha-pequena': [2.25, 0.5] };
const TXT0 = 2.45, TXT_STEP = 0.07, TXT_DUR = 0.42;
const SWAY = [3.05, 1.35], SHINE = 3.6, SPARK = 3.45;

// ---------- desenho
function fill(c, p) {
  if (p.img) { const im = IMGS[p.img]; if (im && im.complete) c.drawImage(im, p.x, p.y, p.w, p.h); return; }
  if (!P2D[p.id]) return;
  c.fillStyle = p.fill; c.fill(P2D[p.id], p.rule);
}
const around = (c, P, a, s = 1, sy = s) => { c.translate(P.x, P.y); if (a) c.rotate(a); if (s !== 1 || sy !== 1) c.scale(s, sy); c.translate(-P.x, -P.y); };
const isH = () => CW > CH;

function drawBackground(c, t, final) {
  // textura cobre a tela
  { const tex = grp('fundo')[0], k = Math.max(CW / 1080, CH / 1920);
    c.save(); c.translate((CW - 1080 * k) / 2, (CH - 1920 * k) / 2); c.scale(k, k); fill(c, tex); c.restore(); }
  // canto superior: faixa + papel deslizam da quina
  { const e = final ? 1 : easeOutCubic(prog(t, TL[0], TL[1]));
    c.save(); c.translate(-(1 - e) * 330, -(1 - e) * 300); around(c, { x: 0, y: 0 }, -(1 - e) * 0.25);
    grp('faixa-superior').forEach(p => fill(c, p));
    TRACOS[0].forEach((d, i) => drawDash(c, d, final ? 1 : prog(t, DASH[0][0] + i * DASH[0][1], 0.22)));
    grp('papel-superior').forEach(p => fill(c, p)); c.restore(); }
  // caminho tracejado da direita (preso à borda direita no horizontal)
  c.save(); if (isH()) c.translate(CW - 1080, CH - 1920 + 260);
  TRACOS[1].forEach((d, i) => drawDash(c, d, final ? 1 : prog(t, DASH[1][0] + i * DASH[1][1], 0.22)));
  c.restore();
  // camadas de baixo sobem com balanço orgânico
  c.save(); if (isH()) { c.translate(0, CH - 1920); c.scale(CW / 1080, 1); }
  BAIXO.forEach((g, i) => {
    const p = final ? 1 : prog(t, BOT0 + i * BOT_STEP, BOT_DUR), e = easeOutCubic(p);
    if (p <= 0) return;
    const onda = Math.sin(Math.PI * e) * 14 * (i % 2 ? 1 : -1);                 // ondulação só vertical (sem expor as bordas laterais)
    c.save(); c.translate(0, (1 - e) * (520 - i * 40) + Math.max(0, onda));
    grp(g).forEach(q => fill(c, q)); c.restore();
  });
  c.restore();
}
function drawDash(c, d, p) {
  if (p <= 0) return;
  c.save(); around(c, { x: d.cx, y: d.cy }, 0, Math.max(0.001, easeOutBack(p, 2.2))); fill(c, d.p); c.restore();
}

// adesivo se espalhando: mancha de borda ondulada a partir do centro
function blob(cx, cy, R, t) {
  const p = new Path2D();
  for (let i = 0; i <= 72; i++) { const a = i / 72 * Math.PI * 2;
    const r = R * (1 + 0.07 * Math.sin(3 * a + t * 6) + 0.045 * Math.sin(5 * a - t * 8) + 0.03 * Math.sin(8 * a + t * 3));
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r; i ? p.lineTo(x, y) : p.moveTo(x, y); }
  p.closePath(); return p;
}
function drawSticker(c, t, final) {
  const B = BX['adesivo'];
  if (final) { grp('adesivo').forEach(p => fill(c, p)); return; }
  const p = prog(t, STK[0], STK[1]); if (p <= 0) return;
  // ondas concêntricas orgânicas
  for (const [d, col] of [[0, 'rgba(255,255,255,0.35)'], [0.12, 'rgba(214,236,120,0.35)']]) {
    const q = prog(t, STK[0] + d, 0.9); if (q > 0 && q < 1) { c.save(); c.strokeStyle = col; c.lineWidth = 10 * (1 - q) + 1; c.stroke(blob(B.cx, B.cy, 60 + q * 520, t + d)); c.restore(); }
  }
  c.save(); if (p < 1) c.clip(blob(B.cx, B.cy, easeOutCubic(p) * 470, t)); grp('adesivo').forEach(q => fill(c, q)); c.restore();
}

function drawBook(c, t, final) {
  PAGINAS.forEach((g, i) => {
    const B = BX[g], esq = g.includes('esquerda');
    const p = final ? 1 : prog(t, BOOK + (i >> 1) * 0.12, 0.5); if (p <= 0) return;
    const e = easeOutBack(p, 1.5);
    c.save(); around(c, { x: esq ? B.x1 : B.x0, y: B.cy }, (1 - e) * (esq ? 0.5 : -0.5), Math.max(0.001, e), 1);
    grp(g).forEach(q => fill(c, q)); c.restore();
  });
}

function drawSprout(c, t, final) {
  const sway = final ? 0 : Math.sin(prog(t, SWAY[0], SWAY[1]) * Math.PI * 3) * 0.035 * (1 - prog(t, SWAY[0], SWAY[1]));
  const base = { x: ESPINHA, y: BX['caule'].y1 };
  c.save(); around(c, base, sway);                           // a planta inteira balança a partir da base
  FOLHAS.forEach(g => {
    const [s0, du] = LEAF[g], p = final ? 1 : prog(t, s0, du); if (p <= 0) return;
    const e = easeOutBack(p, 1.8), P = PIVO[g], dir = g === 'folha-esquerda' ? 1 : -1;
    const brisa = final ? 0 : Math.sin(prog(t, SWAY[0] + 0.1, SWAY[1]) * Math.PI * 4) * 0.05 * (1 - prog(t, SWAY[0] + 0.1, SWAY[1])) * dir;
    c.save(); around(c, P, (1 - e) * 0.9 * dir + brisa, Math.max(0.001, 0.2 + 0.8 * e)); grp(g).forEach(q => fill(c, q)); c.restore();
  });
  { const p = final ? 1 : prog(t, STEM[0], STEM[1]);           // caule cresce de dentro do livro
    if (p > 0) { const B = BX['caule'], yTop = lerp(B.y1 + 2, B.y0 - 4, easeOutCubic(p));
      c.save(); c.beginPath(); c.rect(B.x0 - 20, yTop, B.w + 40, B.y1 - yTop + 10); c.clip(); grp('caule').forEach(q => fill(c, q)); c.restore(); } }
  c.restore();
}

function drawText(c, t, final) {
  LETRAS.forEach((g, i) => {
    const B = BX[g], p = final ? 1 : prog(t, TXT0 + i * TXT_STEP, TXT_DUR); if (p <= 0) return;
    const ultima = i === LETRAS.length - 1, e = easeOutBack(p, ultima ? 3.2 : 2.0);
    c.save(); c.globalAlpha = clamp(p * 3); c.translate(0, (1 - easeOutCubic(p)) * 26);
    around(c, { x: B.cx, y: B.y1 }, 0, Math.max(0.001, e)); grp(g).forEach(q => fill(c, q)); c.restore();
  });
}

function drawSparks(c, t) {                                    // pontinhos de luz saindo do broto
  const q = prog(t, SPARK, 0.85); if (q <= 0 || q >= 1) return;
  const S = BX['folha-pequena'];
  for (let i = 0; i < 9; i++) { const a = -Math.PI / 2 + (i - 4) * 0.33, d = 30 + easeOutCubic(q) * 150;
    c.save(); c.globalAlpha = (1 - q) * 0.9; c.fillStyle = i % 2 ? '#fdde11' : '#ffffff';
    c.beginPath(); c.arc(S.x1 - 10 + Math.cos(a) * d, S.y0 + 20 + Math.sin(a) * d, 6 * (1 - q) + 1.5, 0, Math.PI * 2); c.fill(); c.restore(); }
}

function drawLogo(c, t, final) { drawSticker(c, t, final); drawBook(c, t, final); drawSprout(c, t, final); drawText(c, t, final); }

function sweep(drawFn, t, start, dur, x0, x1, y0, y1) {
  const q = prog(t, start, dur);
  if (q <= 0 || q >= 1) return;
  const c = tmp.getContext('2d');
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
  c.clearRect(0, 0, CW, CH); c.setTransform(...VIEW); drawFn(c);
  c.globalCompositeOperation = 'source-atop';
  const sx = lerp(x0 - 200, x1 + 200, easeInOutSine(q));
  const cy = (y0 + y1) / 2, gr = c.createLinearGradient(sx - 80, cy - 30, sx + 80, cy + 30);
  gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.5, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = gr; c.fillRect(x0 - 50, y0 - 50, x1 - x0 + 100, y1 - y0 + 100);
  c.globalCompositeOperation = 'source-over';
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(tmp, 0, 0); g.restore();
}

function render(t) {
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1;
  g.fillStyle = BGCOLOR; g.fillRect(0, 0, CW, CH);
  const final = t >= DURATION - 1e-6;                          // último quadro = SVG exato
  drawBackground(g, t, final);
  g.setTransform(...VIEW);
  drawLogo(g, t, final);
  if (final) return;
  drawSparks(g, t);
  const B = BX['adesivo'];
  sweep(c => drawLogo(c, t, false), t, SHINE, 0.6, B.x0, B.x1, B.y0, B.y1);
}

