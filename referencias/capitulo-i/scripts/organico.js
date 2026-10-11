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
