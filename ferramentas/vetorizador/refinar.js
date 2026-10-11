// Refinamentos de consistência sobre o vetor traçado
(function () {
  const f2 = v => Math.round(v * 100) / 100;
  // translada um path com comandos absolutos M L C A Z
  const shift = (d, dx, dy) => d.replace(/([MLCA])([^MLCAZ]*)/g, (m, cmd, args) => {
    const n = args.trim().split(/[\s,]+/).filter(Boolean).map(Number);
    if (cmd === 'A') { for (let i = 0; i + 6 < n.length + 1; i += 7) { n[i + 5] += dx; n[i + 6] += dy; } }
    else for (let i = 0; i < n.length; i += 2) { n[i] += dx; n[i + 1] += dy; }
    return cmd + n.map(f2).join(' ');
  });
  const getD = (svg, id) => (svg.match(new RegExp(`id="${id}" d="([^"]+)"`)) || [])[1];
  const setD = (svg, id, d) => svg.replace(new RegExp(`(id="${id}" d=")[^"]+`), `$1${d}`);
  const box = (d) => { const host = document.getElementById('bbhost') || document.body.appendChild(Object.assign(document.createElement('div'), { id: 'bbhost', style: 'position:absolute;left:-5000px' }));
    host.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg"><path d="${d}"/></svg>`; const b = host.querySelector('path').getBBox(); return { x0: b.x, y0: b.y, x1: b.x + b.width, y1: b.y + b.height, cx: b.x + b.width / 2, cy: b.y + b.height / 2, w: b.width, h: b.height }; };
  // momentos de uma forma rasterizada -> elipse
  const moments = (d) => {
    const c = document.createElement('canvas'); c.width = 1080; c.height = 1920; const x = c.getContext('2d');
    x.fill(new Path2D(d)); const b = box(d); const X0 = Math.floor(b.x0) - 1, Y0 = Math.floor(b.y0) - 1, w = Math.ceil(b.w) + 3, h = Math.ceil(b.h) + 3;
    const im = x.getImageData(X0, Y0, w, h).data; let n = 0, sx = 0, sy = 0;
    for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) { const a = im[(y * w + xx) * 4 + 3] / 255; n += a; sx += a * (xx + X0 + 0.5); sy += a * (y + Y0 + 0.5); }
    const mx = sx / n, my = sy / n; let cxx = 0, cyy = 0, cxy = 0;
    for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) { const a = im[(y * w + xx) * 4 + 3] / 255; const dx = xx + X0 + 0.5 - mx, dy = y + Y0 + 0.5 - my; cxx += a * dx * dx; cyy += a * dy * dy; cxy += a * dx * dy; }
    cxx /= n; cyy /= n; cxy /= n;
    const tr = cxx + cyy, det = cxx * cyy - cxy * cxy, l1 = tr / 2 + Math.sqrt(tr * tr / 4 - det), l2 = tr / 2 - Math.sqrt(tr * tr / 4 - det);
    let ra = 2 * Math.sqrt(l1), rb = 2 * Math.sqrt(l2); const s = Math.sqrt(n / (Math.PI * ra * rb)); ra *= s; rb *= s;
    return { cx: mx, cy: my, ra, rb, th: 0.5 * Math.atan2(2 * cxy, cxx - cyy), area: n };
  };
  const ellipse = (cx, cy, ra, rb, th) => { const co = Math.cos(th), sn = Math.sin(th), deg = th * 180 / Math.PI;
    const p1 = [cx + ra * co, cy + ra * sn], p2 = [cx - ra * co, cy - ra * sn];
    return `M${f2(p1[0])} ${f2(p1[1])}A${f2(ra)} ${f2(rb)} ${f2(deg)} 1 1 ${f2(p2[0])} ${f2(p2[1])}A${f2(ra)} ${f2(rb)} ${f2(deg)} 1 1 ${f2(p1[0])} ${f2(p1[1])}Z`; };
  const rrect = (x0, y0, w, h, r) => { const x1 = x0 + w, y1 = y0 + h;
    return `M${f2(x0 + r)} ${f2(y0)}L${f2(x1 - r)} ${f2(y0)}A${f2(r)} ${f2(r)} 0 0 1 ${f2(x1)} ${f2(y0 + r)}L${f2(x1)} ${f2(y1 - r)}A${f2(r)} ${f2(r)} 0 0 1 ${f2(x1 - r)} ${f2(y1)}L${f2(x0 + r)} ${f2(y1)}A${f2(r)} ${f2(r)} 0 0 1 ${f2(x0)} ${f2(y1 - r)}L${f2(x0)} ${f2(y0 + r)}A${f2(r)} ${f2(r)} 0 0 1 ${f2(x0 + r)} ${f2(y0)}Z`; };
  const poly = pts => 'M' + pts.map(p => f2(p[0]) + ' ' + f2(p[1])).join('L') + 'Z';
  window.IMP = { shift, getD, setD, box, moments, ellipse };
  window.LOG = [];

  // ---------- 1. Blocos 3D: mesma largura e altura de frente, letras centralizadas, mesmo "A"
  window.improveBlocks = (svg) => {
    const ids = ['bloco-K-rosa', 'bloco-O-azul', 'bloco-A-coral', 'bloco-L-verde', 'bloco-A-laranja'];
    const letters = ['K', 'O', 'A', 'A', 'A'].map((l, i) => i === 1 ? 'O' : i === 3 ? 'L' : l);
    const X0 = 302.2, X1 = 764.3, BW = (X1 - X0) / 5, BACK = 1111.5, FH = 94;
    const BOT = [1222.5, 1228.8, 1228.8, 1228.8, 1222.5]; // fileira em leve arco: blocos do meio mais à frente (como no original)
    const aPath = getD(svg, 'bloco-A-coral-letra-A'), aBox = box(aPath);
    ids.forEach((id, i) => {
      const x0 = X0 + i * BW, x1 = x0 + BW, bot = BOT[i], yF = bot - FH;
      let top;
      if (i === 0) { const slope = (1114.4 - 1129.9) / (366 - 302); top = [[x0, yF], [x0 + (BACK - yF) / slope * 0 + 0, yF], [x0 + (BACK - yF) / slope, BACK], [x1, BACK], [x1, yF]]; top.splice(1, 1); }
      else if (i === 4) { const slope = (1124.9 - 1111.1) / (762 - 714); const xb = x1 - (yF - BACK) / slope; top = [[x0, BACK], [xb, BACK], [x1, yF], [x0, yF]]; }
      else top = [[x0, BACK], [x1, BACK], [x1, yF], [x0, yF]];
      svg = setD(svg, `${id}-topo`, poly(top));
      svg = setD(svg, `${id}-frente`, poly([[x0, yF], [x1, yF], [x1, bot], [x0, bot]]));
      const L = letters[i], lid = `${id}-letra-${L}`;
      let d = L === 'A' ? aPath : getD(svg, lid); const b = L === 'A' ? aBox : box(d);
      const ncx = (x0 + x1) / 2, ncy = (yF + bot) / 2;
      d = shift(d, ncx - b.cx, ncy - b.cy);
      LOG.push(`${lid}: Δx ${f2(ncx - b.cx)}, Δy ${f2(ncy - b.cy)}`);
      svg = setD(svg, lid, d);
    });
    return svg;
  };

  // ---------- 2. Palavra: peças iguais, alinhadas e com espaçamento igual; mesmo "A"
  window.improveWord = (svg) => {
    const ids = ['peca-K-rosa', 'peca-O-azul', 'peca-A-coral', 'peca-L-verde', 'peca-A-amarela'], Ls = ['K', 'O', 'A', 'L', 'A'];
    const bs = ids.map(id => box(getD(svg, `${id}-base`)));
    const W = bs.reduce((s, b) => s + b.w, 0) / 5, H = bs.reduce((s, b) => s + b.h, 0) / 5, CY = bs.reduce((s, b) => s + b.cy, 0) / 5;
    const left = bs[0].x0, right = bs[4].x1, GAP = (right - left - 5 * W) / 4;
    // raio do canto medido nos cantos das peças originais (mediana ≈ 11; peças levemente giradas inflam a medida)
    const R = 10;
    const aPath = getD(svg, 'peca-A-coral-letra-A'), aBox = box(aPath);
    ids.forEach((id, i) => {
      const x0 = left + i * (W + GAP);
      svg = setD(svg, `${id}-base`, rrect(x0, CY - H / 2, W, H, R));
      const lid = `${id}-letra-${Ls[i]}`; let d = Ls[i] === 'A' ? aPath : getD(svg, lid); const b = Ls[i] === 'A' ? aBox : box(d);
      d = shift(d, x0 + W / 2 - b.cx, CY - b.cy); svg = setD(svg, lid, d);
    });
    LOG.push(`peças: ${f2(W)}×${f2(H)}, canto ${f2(R)}, espaço ${f2(GAP)}, centro y ${f2(CY)}`);
    return svg;
  };

  // ---------- 3. Rosto: olhos, brilhos e bochechas iguais dos dois lados (posições mantidas)
  window.improveFace = (svg) => {
    const eL = moments(getD(svg, 'olho-esquerdo')), eR = moments(getD(svg, 'olho-direito'));
    const r = (Math.sqrt(eL.area / Math.PI) + Math.sqrt(eR.area / Math.PI)) / 2;
    svg = setD(svg, 'olho-esquerdo', ellipse(eL.cx, eL.cy, r, r, 0));
    svg = setD(svg, 'olho-direito', ellipse(eR.cx, eR.cy, r, r, 0));
    // brilho: o do olho esquerdo (mais nítido) repetido no direito, na mesma posição relativa
    const hl = getD(svg, 'brilho-olho-esquerdo');
    svg = setD(svg, 'brilho-olho-direito', shift(hl, eR.cx - eL.cx, eR.cy - eL.cy));
    const bL = moments(getD(svg, 'bochecha-esquerda')), bR = moments(getD(svg, 'bochecha-direita'));
    const ra = (bL.ra + bR.ra) / 2, rb = (bL.rb + bR.rb) / 2;
    svg = setD(svg, 'bochecha-esquerda', ellipse(bL.cx, bL.cy, ra, rb, bL.th));
    svg = setD(svg, 'bochecha-direita', ellipse(bR.cx, bR.cy, ra, rb, bR.th));
    LOG.push(`olhos: raio ${f2(r)} (antes ${f2(Math.sqrt(eL.area / Math.PI))} / ${f2(Math.sqrt(eR.area / Math.PI))}); bochechas ${f2(ra)}×${f2(rb)}`);
    return svg;
  };
})();
