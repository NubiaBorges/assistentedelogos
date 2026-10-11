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

// ---------- timeline (cada elemento se comporta como o que ele é)
const FOLHA_PAPEL = [0.05, 1.05];                            // folha do canto cai planando e assenta
const BOT0 = 0.0, BOT_STEP = 0.09, BOT_DUR = 0.85;          // ondas sobem; tira de papel com flexão
const DASH = [[0.95, 0.045], [1.05, 0.045]];                 // passos do caminho tracejado
const LIVRO_POUSA = [0.8, 0.32];                             // livro fechado pousa
const VIRA = [[1.12, 0.38], [1.3, 0.4]];                     // páginas viram: de baixo, depois de cima
const STEM = [1.62, 0.55];                                   // caule cresce (mantido)
const PINTA = { 'folha-esquerda': 2.0, 'folha-direita': 2.13, 'folha-pequena': 2.3 };   // folhas pintadas a pincel
const TXT0 = 3.05, TXT_STEP = 0.06, TXT_DUR = 0.2;            // letras pintadas a tinta
const CONTORNO = [2.55, 0.5];                                // contorno branco de legibilidade surge por trás
const BRISA = [3.6, 1.0], SHINE = 3.95;

// ---------- desenho
function fill(c, p) {
  if (p.img) { const im = IMGS[p.img]; if (im && im.complete) c.drawImage(im, p.x, p.y, p.w, p.h); return; }
  if (!P2D[p.id]) return;
  c.fillStyle = p.fill; c.fill(P2D[p.id], p.rule);
}
const around = (c, P, a, s = 1, sy = s) => { c.translate(P.x, P.y); if (a) c.rotate(a); if (s !== 1 || sy !== 1) c.scale(s, sy); c.translate(-P.x, -P.y); };
const isH = () => CW > CH;
const parte = (g, sufixo) => grp(g).filter(p => p.id.endsWith(sufixo));

// Pincel: região já pintada atrás de uma frente com borda de cerdas, avançando na direção (ux, uy)
function pincel(B, ux, uy, p, seed = 0) {
  const n = Math.hypot(ux, uy); ux /= n; uy /= n; const vx = -uy, vy = ux;
  const cs = [[B.x0, B.y0], [B.x1, B.y0], [B.x0, B.y1], [B.x1, B.y1]];
  const pr = cs.map(([x, y]) => x * ux + y * uy), pe = cs.map(([x, y]) => x * vx + y * vy);
  const a0 = Math.min(...pr) - 30, a1 = Math.max(...pr) + 30, s0 = Math.min(...pe) - 30, s1 = Math.max(...pe) + 30;
  const f = lerp(a0, a1, p), path = new Path2D();
  const pt = (a, s) => [ux * a + vx * s, uy * a + vy * s];
  path.moveTo(...pt(a0 - 50, s0));
  for (let s = s0; s <= s1; s += 3) {                         // cerdas: borda irregular de alta frequência
    const cer = 7 * Math.sin(s * 0.9 + seed) + 5 * Math.sin(s * 0.37 + seed * 2) + 4 * Math.sin(s * 2.3 + seed * 3);
    path.lineTo(...pt(f + cer, s));
  }
  path.lineTo(...pt(a0 - 50, s1)); path.closePath(); return path;
}
function pintado(c, partes, B, ux, uy, p, seed) {
  if (p <= 0) return; c.save(); if (p < 1) c.clip(pincel(B, ux, uy, easeInOutSine(p), seed)); partes.forEach(q => fill(c, q)); c.restore();
}

function drawBackground(c, t, final) {
  { const tex = grp('fundo')[0], k = Math.max(CW / 1080, CH / 1920);
    c.save(); c.translate((CW - 1080 * k) / 2, (CH - 1920 * k) / 2); c.scale(k, k); fill(c, tex); c.restore(); }
  // folha do canto: cai planando, balança como papel e assenta
  { const q = final ? 1 : prog(t, FOLHA_PAPEL[0], FOLHA_PAPEL[1]), e = easeOutCubic(q);
    const balanco = final ? 0 : Math.sin(q * Math.PI * 2.5) * 0.16 * Math.pow(1 - q, 1.4);
    c.save(); c.translate(-(1 - e) * 140, -(1 - e) * 420 + Math.sin(q * Math.PI * 2) * 18 * (1 - q));
    around(c, { x: 0, y: 0 }, balanco);
    grp('faixa-superior').forEach(p => fill(c, p));
    TRACOS[0].forEach((d, i) => drawDash(c, d, final ? 1 : prog(t, DASH[0][0] + i * DASH[0][1], 0.22)));
    grp('papel-superior').forEach(p => fill(c, p)); c.restore(); }
  c.save(); if (isH()) c.translate(CW - 1080, CH - 1920 + 260);
  TRACOS[1].forEach((d, i) => drawDash(c, d, final ? 1 : prog(t, DASH[1][0] + i * DASH[1][1], 0.22)));
  c.restore();
  // camadas de baixo
  c.save(); if (isH()) { c.translate(0, CH - 1920); c.scale(CW / 1080, 1); }
  BAIXO.forEach((g, i) => {
    const p = final ? 1 : prog(t, BOT0 + i * BOT_STEP, BOT_DUR), e = easeOutCubic(p);
    if (p <= 0) return;
    const dy = (1 - e) * (520 - i * 40);
    if (g === 'papel-inferior' && !final && p < 1) {          // papel flexiona: onda que percorre a tira
      const N = 36, wS = 1080 / N;
      for (let s = 0; s < N; s++) {
        const flex = Math.sin(p * Math.PI * 3 - s * 0.35) * 9 * Math.pow(1 - p, 1.2);
        c.save(); c.beginPath(); c.rect(s * wS - 0.5, 0, wS + 1, 1920); c.clip(); c.translate(0, dy + flex); grp(g).forEach(q => fill(c, q)); c.restore();
      }
      return;
    }
    c.save(); c.translate(0, dy); grp(g).forEach(q => fill(c, q)); c.restore();
  });
  c.restore();
}
function drawDash(c, d, p) {
  if (p <= 0) return;
  c.save(); around(c, { x: d.cx, y: d.cy }, 0, Math.max(0.001, easeOutBack(p, 2.2))); fill(c, d.p); c.restore();
}

// contorno branco de legibilidade: surge por trás do logo pronto, expandindo como aura
function drawContorno(c, t, final) {
  const B = BX['adesivo'];
  const p = final ? 1 : prog(t, CONTORNO[0], CONTORNO[1]); if (p <= 0) return;
  const s = 0.86 + 0.14 * easeOutBack(p, 1.6);
  c.save(); c.globalAlpha = clamp(p * 5); around(c, { x: B.cx, y: B.cy }, 0, s); grp('adesivo').forEach(q => fill(c, q)); c.restore();
}

// livro: pousa fechado e abre virando as páginas pela lombada
function drawBook(c, t, final) {
  const pz = final ? 1 : prog(t, LIVRO_POUSA[0], LIVRO_POUSA[1]); if (pz <= 0) return;
  c.save(); c.globalAlpha = clamp(pz * 3); c.translate(0, (1 - easeOutBack(pz, 2.0)) * -50);
  const pares = [['pagina-esquerda-inferior', 'pagina-direita-inferior'], ['pagina-esquerda-superior', 'pagina-direita-superior']];
  pares.forEach(([esq, dir], j) => {
    grp(esq).forEach(q => fill(c, q));                       // página da esquerda fica
    const v = final ? 1 : prog(t, VIRA[j][0], VIRA[j][1]);
    const sx = -Math.cos(Math.PI * easeInOutCubic(v));       // -1 (fechada sobre a esquerda) → 1 (aberta)
    const B = BX[dir];
    c.save(); around(c, { x: ESPINHA, y: B.cy }, 0, Math.abs(sx) < 0.02 ? 0.02 * Math.sign(sx || 1) : sx, 1 - 0.06 * (1 - Math.abs(sx)));
    grp(dir).forEach(q => fill(c, q));
    const sombra = (1 - Math.abs(sx)) * 0.35 + (sx < 0 ? 0.12 : 0);   // sombra durante a virada / verso
    if (sombra > 0.005) { c.globalAlpha *= sombra; grp(dir).forEach(q => { if (P2D[q.id]) { c.fillStyle = '#5a3a10'; c.fill(P2D[q.id], q.rule); } }); }
    c.restore();
  });
  c.restore();
}

// broto: caule cresce de dentro do livro; folhas são pintadas a pincel do caule até a ponta
function drawSprout(c, t, final) {
  const qb = final ? 1 : prog(t, BRISA[0], BRISA[1]);
  const sway = final ? 0 : Math.sin(qb * Math.PI * 3) * 0.03 * (1 - qb);
  c.save(); around(c, { x: ESPINHA, y: BX['caule'].y1 }, sway);
  FOLHAS.forEach((g, i) => {
    const s0 = PINTA[g], P = PIVO[g], B = BX[g];
    const tip = [[B.x0, B.y0], [B.x1, B.y0], [B.x0, B.y1], [B.x1, B.y1]].reduce((m, c2) => Math.hypot(c2[0] - P.x, c2[1] - P.y) > Math.hypot(m[0] - P.x, m[1] - P.y) ? c2 : m);
    const ux = tip[0] - P.x, uy = tip[1] - P.y;
    const pb = final ? 1 : prog(t, s0, 0.34), pm = final ? 1 : prog(t, s0 + 0.14, 0.3);
    if (pb <= 0) return;
    const desdobra = final ? 0 : (1 - easeOutCubic(prog(t, s0, 0.5))) * 0.22 * (g === 'folha-esquerda' ? 1 : -1);
    c.save(); around(c, P, desdobra);
    pintado(c, parte(g, '-base'), B, ux, uy, pb, i * 1.7);
    pintado(c, [...parte(g, '-claro'), ...parte(g, '-miolo')], B, ux, uy, pm, i * 1.7 + 0.9);
    c.restore();
  });
  { const p = final ? 1 : prog(t, STEM[0], STEM[1]);
    if (p > 0) { const B = BX['caule'], yTop = lerp(B.y1 + 2, B.y0 - 4, easeOutCubic(p));
      c.save(); c.beginPath(); c.rect(B.x0 - 20, yTop, B.w + 40, B.y1 - yTop + 10); c.clip(); grp('caule').forEach(q => fill(c, q)); c.restore(); } }
  c.restore();
}

// letras pintadas a tinta, da esquerda para a direita
function drawText(c, t, final) {
  LETRAS.forEach((g, i) => { const p = final ? 1 : prog(t, TXT0 + i * TXT_STEP, TXT_DUR); pintado(c, grp(g), BX[g], 1, 0.15, p, i * 0.7); });
}

function drawLogo(c, t, final) { drawContorno(c, t, final); drawBook(c, t, final); drawSprout(c, t, final); drawText(c, t, final); }

function sweep(drawFn, t, start, dur, x0, x1, y0, y1) {
  const q = prog(t, start, dur);
  if (q <= 0 || q >= 1) return;
  const c = tmp.getContext('2d');
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
  c.clearRect(0, 0, CW, CH); c.setTransform(...VIEW); drawFn(c);
  c.globalCompositeOperation = 'source-atop';
  const sx = lerp(x0 - 200, x1 + 200, easeInOutSine(q));
  const cy = (y0 + y1) / 2, gr = c.createLinearGradient(sx - 80, cy - 30, sx + 80, cy + 30);
  gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.5, 'rgba(255,255,255,.4)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
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
  if (!final) { drawFitas(g, t); drawOndas(g, t); }
  drawLogo(g, t, final);
  if (final) return;
  drawFolhinhas(g, t);
  const B = BX['adesivo'];
  sweep(c => drawLogo(c, t, false), t, SHINE, 0.6, B.x0, B.x1, B.y0, B.y1);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); drawAbertura(g, t); g.restore();
}

// ---------- motion design orgânico (camada extra, cores da marca)
const easeInCubic = x => x * x * x;
const ORG = {
  abertura: [{ cor: '#1c9355', canto: [0, 0], t: [0.0, 0.32] },          // verde: recolhe para o canto superior esquerdo
             { cor: '#f19222', canto: [1, 1], t: [0.07, 0.38] },          // laranja: canto inferior direito
             { cor: '#fdde11', canto: [1, 0], t: [0.14, 0.45] }],        // amarelo: canto superior direito
  fitas: [{ cor: '#fdde11', a0: -2.6, giro: 3.4, r0: 330, r1: 250, l: 26, t: 1.6 },
          { cor: '#a5c268', a0: 0.4, giro: 3.0, r0: 360, r1: 280, l: 20, t: 1.78 },
          { cor: '#f19222', a0: 2.2, giro: 2.6, r0: 300, r1: 240, l: 16, t: 1.95 }],
  ondas: [[0, 'rgba(255,255,255,0.55)'], [0.12, 'rgba(253,222,17,0.5)'], [0.24, 'rgba(165,194,104,0.5)']],
  folhinhas: 11, FOLHINHA0: 3.35
};
const CENTRO = { x: 532, y: 880 };

function blobOrg(cx, cy, R, t, seed = 0) {
  const p = new Path2D();
  for (let i = 0; i <= 90; i++) { const a = i / 90 * Math.PI * 2;
    const r = R * (1 + 0.06 * Math.sin(3 * a + t * 5 + seed) + 0.04 * Math.sin(5 * a - t * 7 + seed * 2) + 0.025 * Math.sin(9 * a + t * 4));
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r; i ? p.lineTo(x, y) : p.moveTo(x, y); }
  p.closePath(); return p;
}

// 1. abertura: manchas cobrem a tela e se recolhem para os cantos (coordenadas de tela)
function drawAbertura(c, t) {
  ORG.abertura.slice().reverse().forEach((m, j) => {
    const q = prog(t, m.t[0], m.t[1]); if (q >= 1) return;
    const cx = m.canto[0] * CW, cy = m.canto[1] * CH, R0 = Math.hypot(CW, CH) * 1.02;
    const R = R0 * (1 - easeOutCubic(q));
    if (R < 2) return;
    c.save(); c.fillStyle = m.cor; c.fill(blobOrg(cx, cy, R, t, j * 1.3)); c.restore();
  });
}

// 2. fitas: espiral com espessura variável e pontas finas; cabeça desenha, cauda recolhe
function drawFitas(c, t) {
  ORG.fitas.forEach((f, j) => {
    const cabeca = easeOutCubic(prog(t, f.t, 0.75)), cauda = easeInCubic(prog(t, f.t + 0.5, 0.8));
    if (cabeca <= cauda + 0.005) return;
    const N = 70, L = [], R = [];
    const ponto = s => { const a = f.a0 + f.giro * s, r = lerp(f.r0, f.r1, s) * (1 + 0.05 * Math.sin(s * 9 + j));
      return [CENTRO.x + Math.cos(a) * r * 0.95, CENTRO.y + Math.sin(a) * r * 1.15]; };
    for (let i = 0; i <= N; i++) {
      const s = lerp(cauda, cabeca, i / N), [x, y] = ponto(s), [x2, y2] = ponto(s + 0.002);
      let nx = -(y2 - y), ny = x2 - x; const n = Math.hypot(nx, ny) || 1; nx /= n; ny /= n;
      const w = f.l * Math.sin(Math.PI * i / N) * (0.75 + 0.25 * Math.sin(i * 0.4 + j)) / 2;
      L.push([x + nx * w, y + ny * w]); R.push([x - nx * w, y - ny * w]);
    }
    const p = new Path2D(); L.forEach(([x, y], i) => i ? p.lineTo(x, y) : p.moveTo(x, y)); R.reverse().forEach(([x, y]) => p.lineTo(x, y)); p.closePath();
    c.save(); c.fillStyle = f.cor; c.globalAlpha = 0.92; c.fill(p); c.restore();
  });
}

// 3. ondas orgânicas quando o contorno surge
function drawOndas(c, t) {
  ORG.ondas.forEach(([d, cor], j) => {
    const q = prog(t, CONTORNO[0] + d, 0.85); if (q <= 0 || q >= 1) return;
    c.save(); c.strokeStyle = cor; c.lineWidth = 12 * (1 - q) + 1; c.stroke(blobOrg(CENTRO.x, CENTRO.y + 20, 260 + q * 420, t, j)); c.restore();
  });
}

// 4. folhinhas subindo do broto, girando
function folhinha(c, x, y, s, a, cor, alfa) {
  c.save(); c.globalAlpha = alfa; c.translate(x, y); c.rotate(a); c.scale(s, s);
  c.beginPath(); c.moveTo(0, -14); c.quadraticCurveTo(10, 0, 0, 14); c.quadraticCurveTo(-10, 0, 0, -14); c.closePath();
  c.fillStyle = cor; c.fill(); c.restore();
}
function drawFolhinhas(c, t) {
  const cores = ['#1c9355', '#a5c268', '#38a969', '#fdde11'];
  for (let i = 0; i < ORG.folhinhas; i++) {
    const q = prog(t, ORG.FOLHINHA0 + i * 0.05, 1.05); if (q <= 0 || q >= 1) continue;
    const ang = -Math.PI / 2 + (i - ORG.folhinhas / 2) * 0.22, d = 60 + easeOutCubic(q) * (240 + (i % 3) * 50);
    const x = CENTRO.x + Math.cos(ang) * d * 1.3 + Math.sin(q * 6 + i) * 18, y = 700 + Math.sin(ang) * d - q * 60;
    folhinha(c, x, y, 1.5 + (i % 3) * 0.45, q * 5 * (i % 2 ? 1 : -1) + i, cores[i % 4], Math.sin(Math.PI * q) * 0.95);
  }
}
