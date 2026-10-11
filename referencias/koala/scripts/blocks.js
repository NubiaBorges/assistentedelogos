// Blocos 3D do logo com koala: faces medidas + letras traçadas
(function () {
  const c01 = v => Math.min(1, Math.max(0, v));
  const BACK = 1111.5; // borda de trás do topo (medida no K e no último A)
  // x limites, base (medida), amostras para cor do topo, colunas visíveis para medir a borda topo/frente
  const BL = [
    { id: 'bloco-K-rosa', letra: 'K', x0: 302.2, x1: 394, bot: 1223.5, topS: [[336, 366, 1120, 1126]], fcols: [[330, 366]] },
    { id: 'bloco-O-azul', letra: 'O', x0: 394, x1: 488, bot: 1228.7, topS: [[474, 486, 1124, 1136], [398, 402, 1134, 1138]], fcols: [[396, 404], [474, 486]] },
    { id: 'bloco-A-coral', letra: 'A', x0: 488, x1: 581, bot: 1228.8, topS: [[494, 500, 1124, 1128], [566, 576, 1124, 1128]], fcols: [[490, 500], [564, 578]] },
    { id: 'bloco-L-verde', letra: 'L', x0: 581, x1: 675.5, bot: 1228.9, topS: [[584, 590, 1124, 1130], [664, 668, 1128, 1132]], fcols: [[584, 600], [662, 672]] },
    { id: 'bloco-A-laranja', letra: 'A', x0: 675.5, x1: 764.3, bot: 1221.6, topS: [[692, 750, 1114, 1124]], fcols: [[690, 750]] },
  ];
  const med = a => a.slice().sort((x, y) => x - y)[a.length >> 1];
  const hex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');

  window.buildBlocks = function (D) {
    const P = (X, Y) => { const k = (Y * 1080 + X) * 4; return [D[k], D[k + 1], D[k + 2]]; };
    const colOf = (rects, skipDark = true) => { const r = [], g = [], b = [];
      for (const [xa, xb, ya, yb] of rects) for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++) { const p = P(x, y); if (skipDark && Math.max(...p) < 120) continue; r.push(p[0]); g.push(p[1]); b.push(p[2]); }
      return [med(r), med(g), med(b)]; };
    const dist = (p, c) => Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]);
    const out = [];
    for (const B of BL) {
      const front = colOf([[Math.ceil(B.x0) + 4, Math.floor(B.x1) - 4, Math.round(B.bot) - 40, Math.round(B.bot) - 6]]);
      const top = colOf(B.topS.map(([xa, xb, ya, yb]) => [xa, xb, ya, yb]));
      // borda topo/frente: primeira linha (subpixel) em que o pixel fica mais perto da cor da frente
      const ys = [];
      for (const [xa, xb] of B.fcols) for (let x = xa; x <= xb; x++) {
        for (let y = 1112; y < 1160; y++) { const p = P(x, y), q = P(x, y - 1);
          if (dist(q, top) < dist(q, front) && dist(p, front) < dist(p, top)) {
            const a = dist(q, top) - dist(q, front), b = dist(p, top) - dist(p, front); ys.push(y - 1 + (-a) / (b - a) + 0.5); break; } }
      }
      const yF = med(ys);
      B.front = front; B.top = top; B.yF = yF;
      out.push(B);
    }
    // ---- polígonos
    const f = v => Math.round(v * 100) / 100;
    const poly = pts => 'M' + pts.map(p => f(p[0]) + ' ' + f(p[1])).join('L') + 'Z';
    const svg = [];
    for (let i = 0; i < out.length; i++) {
      const B = out[i];
      let topPoly;
      if (i === 0) { // K: lado esquerdo inclinado (medido) até a borda de trás
        const slope = (1114.4 - 1129.9) / (366 - 302); // ≈ -0.242
        const xb = 302.2 + (BACK - 1129.9) / slope;
        topPoly = [[B.x0, B.yF], [B.x0, 1129.9], [xb, BACK], [B.x1, BACK], [B.x1, B.yF]];
      } else if (i === out.length - 1) { // último A: lado direito inclinado (medido)
        const slope = (1124.9 - 1111.1) / (762 - 714);
        const xb = 714; const yr = BACK + (B.x1 - xb) * slope;
        topPoly = [[B.x0, BACK], [xb, BACK], [B.x1, yr], [B.x1, B.yF], [B.x0, B.yF]];
      } else topPoly = [[B.x0, BACK], [B.x1, BACK], [B.x1, B.yF], [B.x0, B.yF]];
      const frontPoly = [[B.x0, B.yF], [B.x1, B.yF], [B.x1, B.bot], [B.x0, B.bot]];
      // letra: campo escuro dentro da frente
      const fl = 0.299 * B.front[0] + 0.587 * B.front[1] + 0.114 * B.front[2];
      const mid = (fl + 28) / 2;
      const box = [Math.ceil(B.x0) + 2, Math.ceil(B.yF) + 2, Math.floor(B.x1) - 2, Math.floor(B.bot) - 2];
      const fld = V.field(box, (x, y, k) => c01((mid - V.lum(D, k)) / (fl - 28) + 0.5));
      const tr = V.trace(fld, { holes: true, minArea: 40, eps: 0.4 });
      const letterCol = V.median(D, cb => { for (let y = box[1]; y < box[3]; y++) for (let x = box[0]; x < box[2]; x++) { const k = (y * 1080 + x) * 4; if (V.lum(D, k) < 45) cb(k); } });
      svg.push(`<g id="${B.id}" inkscape:label="${B.id}" inkscape:groupmode="layer">
  <path id="${B.id}-topo" d="${poly(topPoly)}" fill="${hex(B.top)}"/>
  <path id="${B.id}-frente" d="${poly(frontPoly)}" fill="${hex(B.front)}"/>
  <path id="${B.id}-letra-${B.letra}" d="${tr.d}" fill="${letterCol}" fill-rule="evenodd"/>
</g>`);
    }
    window.BLinfo = out.map(B => ({ id: B.id, yF: B.yF.toFixed(1), top: hex(B.top), front: hex(B.front) }));
    return svg;
  };
})();
