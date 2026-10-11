// Monta as camadas vetoriais do koala
(function () {
  const c01 = v => Math.min(1, Math.max(0, v));
  const BOX = [320, 700, 770, 1150];
  const PARTS = [ // id do componente claro -> nome da camada (ordem de baixo para cima)
    ['orelha-esquerda', c => c.cx < 450 && c.cy < 840 && c.n > 5000],
    ['orelha-direita', c => c.cx > 620 && c.cy < 840 && c.n > 5000],
    ['braco-esquerdo', c => c.cx < 440 && c.cy > 1000 && c.cy < 1070 && c.n > 500],
    ['braco-direito', c => c.cx > 620 && c.cy > 1000 && c.cy < 1070 && c.n > 500],
    ['perna-esquerda', c => c.cx > 440 && c.cx < 500 && c.cy > 1000 && c.n > 3000],
    ['perna-direita', c => c.cx > 570 && c.cx < 620 && c.cy > 1000 && c.n > 3000],
    ['barriga', c => c.cx > 500 && c.cx < 570 && c.cy > 1000 && c.n > 3000],
    ['pe-esquerdo', c => c.cx < 470 && c.cy > 1080 && c.cy < 1125 && c.n > 1000],
    ['pe-direito', c => c.cx > 590 && c.cy > 1080 && c.cy < 1125 && c.n > 1000],
    ['cabeca', c => c.n > 30000],
  ];

  window.buildKoala = function (D, lightFn, blockish, dbg) {
    const light = V.field(BOX, lightFn);
    const { lab, comps } = V.components(light, 0.5);
    const [x0, y0] = BOX, w = light.w, h = light.h;
    const outlineFn = (x, y, k) => {
      const L = V.lum(D, k);
      return y > 1098 ? Math.max(inkBand(k), dbg(k) < 40 ? c01((176 - L) / 106) * c01(dbg(k) / 12) : 0) : c01((176 - L) / 106) * c01(dbg(k) / 12);
    };
    const outF = V.field(BOX, outlineFn);
    const pix = (fn) => (cb) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (fn(x, y)) cb(((y + y0) * W + (x + x0)) * 4); };
    const inPoly = (p, X, Y) => { let ins = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
      const [xi, yi] = p[i], [xj, yj] = p[j]; if ((yi > Y) !== (yj > Y) && X < (xj - xi) * (Y - yi) / (yj - yi) + xi) ins = !ins; } return ins; };

    const used = new Set(), layers = [];
    const smallLights = comps.filter(c => c.n >= 8 && c.n < 300 && c.cy < 1000); // brilhos dos olhos

    // pré-passo: pelo de cada parte (para padronizar as linhas internas entre partes vizinhas)
    const T = window.OUTLINE_T || 0;
    const furOwner = new Int16Array(w * h).fill(-1), pre = [];
    { const u2 = new Set();
      PARTS.forEach(([nm, test], pi) => { const c = comps.find(cc => !u2.has(cc.id) && test(cc)); if (!c) return; u2.add(c.id); pre[pi] = c;
        const mk = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) mk[i] = lab[i] === c.id ? 1 : 0;
        const d1 = V.dilate(mk, w, h, 1); for (let i = 0; i < w * h; i++) if (mk[i] || (d1[i] && light.F[i] >= 0.5)) furOwner[i] = pi; }); }

    for (const [pi, [name, test]] of PARTS.entries()) {
      const comp = pre[pi];
      if (!comp) { layers.push(`<!-- ${name}: não encontrado -->`); continue; }
      used.add(comp.id);
      const mask = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) mask[i] = lab[i] === comp.id ? 1 : 0;
      const m1 = V.dilate(mask, w, h, 1), m7 = V.dilate(mask, w, h, 8);
      // pelo; com espessura padrão, recua só onde a linha até a parte vizinha ficaria mais fina que T
      const Lf = { box: BOX, w, h, F: new Float32Array(w * h) };
      for (let i = 0; i < w * h; i++) Lf.F[i] = m1[i] ? light.F[i] : 0;
      if (T) {
        const others = new Uint8Array(w * h), notMine = new Uint8Array(w * h);
        for (let i = 0; i < w * h; i++) { others[i] = furOwner[i] >= 0 && furOwner[i] !== pi ? 1 : 0; notMine[i] = furOwner[i] === pi ? 0 : 1; }
        const dO = V.dist(others, w, h), dIn = V.dist(notMine, w, h);
        for (let i = 0; i < w * h; i++) if (Lf.F[i] > 0) Lf.F[i] = Math.min(Lf.F[i], c01(dO[i] + dIn[i] - T + 0.5));
      }
      // contorno (camada de baixo): linha escura + própria área clara, só o externo
      const U = { box: BOX, w, h, F: new Float32Array(w * h) };
      const fur = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) fur[i] = T ? (Lf.F[i] >= 0.5 ? 1 : 0) : (mask[i] || (m1[i] && light.F[i] >= 0.5) ? 1 : 0);
      const dF = V.dist(fur, w, h);
      for (let i = 0; i < w * h; i++) {
        if (!m7[i]) continue;
        const y = ((i / w) | 0) + y0, k = (y * W + (i % w) + x0) * 4;
        const own = T ? Lf.F[i] : (mask[i] ? 1 : (m1[i] ? light.F[i] : 0));
        let ink;
        if (window.OUTLINE_T) ink = c01(window.OUTLINE_T - dF[i] + 0.5);     // contorno de espessura padrão em volta do pelo
        else if (y > 1098) ink = c01(4.5 - dF[i] + 0.5);
        else ink = c01(dbg(k) / 210) * (1 - light.F[i]);
        U.F[i] = Math.max(own, ink);
      }
      // medição: espessura do contorno original fora da faixa dos blocos (pixels de contorno / perímetro do pelo)
      { let ring = 0, per = 0;
        for (let i = 0; i < w * h; i++) { const y = ((i / w) | 0) + y0; if (y > 1098 || !m7[i]) continue;
          const k = (y * W + (i % w) + x0) * 4;
          if (!fur[i] && c01(dbg(k) / 210) * (1 - light.F[i]) >= 0.5 && dF[i] < 9) ring++;
          if (fur[i] && (dF[i - 1] > 0 || dF[i + 1] > 0 || dF[i - w] > 0 || dF[i + w] > 0)) per++; }
        (window.OUTSTAT = window.OUTSTAT || {})[name] = per ? +(ring / per).toFixed(2) : null; }
      // remove manchas escuras internas que não tocam o contorno (já cobertas): só contorno externo
      const under = V.trace(U, { holes: false, minArea: 200 });
      const solid = V.dilate(V.fillHoles(mask, w, h), w, h, 1);
      const ring = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) ring[i] = m7[i] && !solid[i] && outF.F[i] > 0.92 ? 1 : 0;
      const outlineCol = V.median(D, pix((x, y) => ring[y * w + x]));
      // preenchimento claro
      const er = V.erode(mask, w, h, 3);
      const furCol = V.median(D, pix((x, y) => er[y * w + x] && V.lum(D, ((y + y0) * W + x + x0) * 4) > 225));
      const fill = V.trace(Lf, { holes: false, minArea: 30 });
      let svg = `<g id="${name}" inkscape:label="${name}" inkscape:groupmode="layer">\n`;
      svg += `  <path id="${name}-contorno" d="${under.d}" fill="${outlineCol}"/>\n`;
      svg += `  <path id="${name}-pelo" d="${fill.d}" fill="${furCol}"/>\n`;

      // detalhes claros internos
      if (name.startsWith('orelha')) {
        const er4 = V.erode(mask, w, h, 4);
        const T = { box: BOX, w, h, F: new Float32Array(w * h) };
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (!er4[i]) continue; const k = ((y + y0) * W + x + x0) * 4; T.F[i] = c01((225 - D[k + 1]) / 40 + 0.5); }
        const t = V.trace(T, { holes: false, minArea: 100 });
        const col = V.median(D, pix((x, y) => T.F[y * w + x] > 0.95));
        svg += `  <path id="${name}-interior" d="${t.d}" fill="${col}"/>\n`;
      }
      if (name === 'cabeca') {
        const er3 = V.erode(mask, w, h, 3);
        const Pk = { box: BOX, w, h, F: new Float32Array(w * h) };
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (!er3[i]) continue; const k = ((y + y0) * W + x + x0) * 4; Pk.F[i] = c01((D[k + 2] - D[k + 1] + 31) / 50 + 0.5); }
        const pcs = V.components(Pk, 0.5).comps.filter(c => c.n > 150).sort((a, b) => a.cx - b.cx);
        pcs.forEach((pc, j) => {
          const lab2 = V.components(Pk, 0.5).lab;
          const F2 = { box: BOX, w, h, F: Pk.F.map((v, i) => lab2[i] === pc.id ? v : (V.dilate ? v * 0 : 0)) };
          // inclui borda suave em volta
          const mm = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) mm[i] = lab2[i] === pc.id ? 1 : 0;
          const md = V.dilate(mm, w, h, 2); for (let i = 0; i < w * h; i++) F2.F[i] = md[i] ? Pk.F[i] : 0;
          const t = V.trace(F2, { holes: false, minArea: 50 });
          const col = V.median(D, pix((x, y) => mm[y * w + x] && Pk.F[y * w + x] > 0.95));
          svg += `  <path id="bochecha-${j ? 'direita' : 'esquerda'}" d="${t.d}" fill="${col}"/>\n`;
        });
      }
      // buracos escuros (olhos, nariz, boca, almofadas das patas)
      const holes = V.contours(Lf, 0.5).filter(p => Math.abs(V.area(p)) > 6);
      const hd = V.depths(holes);
      const inner = holes.filter((p, i) => hd[i] === 1).sort((a, b) => a.reduce((s, q) => s + q[0], 0) / a.length - b.reduce((s, q) => s + q[0], 0) / b.length);
      inner.forEach((p, j) => {
        const xs = p.map(q => q[0]), ys = p.map(q => q[1]);
        const bx0 = Math.floor(Math.min(...xs)), bx1 = Math.ceil(Math.max(...xs)), by0 = Math.floor(Math.min(...ys)), by1 = Math.ceil(Math.max(...ys));
        const vals = [];
        const col = V.median(D, (cb) => { for (let Y = by0; Y <= by1; Y++) for (let X = bx0; X <= bx1; X++) if (inPoly(p, X + 0.5, Y + 0.5)) { const k = (Y * W + X) * 4; if (V.lum(D, k) < 90) cb(k); } });
        const cx = xs.reduce((a, b) => a + b, 0) / xs.length, cy = ys.reduce((a, b) => a + b, 0) / ys.length;
        let nm = `${name}-detalhe-${j + 1}`;
        if (name === 'cabeca') nm = Math.abs(V.area(p)) > 3000 ? 'nariz' : (cy < 880 ? (cx < 540 ? 'olho-esquerdo' : 'olho-direito') : 'boca-' + (j + 1));
        if (name.startsWith('pe')) nm = `${name}-almofada-${j + 1}`;
        if (nm === 'nariz') { // nariz + boca vêm ligados: separa onde a forma afina
          let yCut = by1;
          for (let Y = Math.round(cy); Y <= by1; Y++) { let wd = 0; for (let X = bx0; X <= bx1; X++) if (V.inPoly(p, X + 0.5, Y + 0.5)) wd++; if (wd > 0 && wd < 20) { yCut = Y; break; } }
          const bb = [bx0 - 3, by0 - 3, bx1 + 4, by1 + 4];
          const Nf = V.field(bb, (X, Y, k) => Y < yCut && V.inPoly(p, X + 0.5, Y + 0.5) ? 1 - lightFn(X, Y, k) : 0);
          svg += `  <path id="nariz" d="${V.trace(Nf, { holes: false, minArea: 100, eps: 0.4 }).d}" fill="${col}"/>\n`;
          const Mf = V.field(bb, (X, Y, k) => Y >= yCut - 2 && V.inPoly(p, X + 0.5, Y + 0.5) ? 1 - lightFn(X, Y, k) : 0);
          svg += `  <path id="boca" d="${V.trace(Mf, { lv: 0.74, holes: false, minArea: 4, eps: 0.3 }).d}" fill="#4a4950"/>\n`;
          return;
        }
        if (nm.includes('almofada')) { // núcleo escuro, separa almofadas que se tocam
          const bb = [bx0 - 3, by0 - 3, bx1 + 4, by1 + 4];
          const Af = V.field(bb, (X, Y, k) => V.inPoly(p, X + 0.5, Y + 0.5) ? 1 - lightFn(X, Y, k) : 0);
          const aw = Af.w, ah = Af.h, am = new Uint8Array(aw * ah); for (let i = 0; i < aw * ah; i++) am[i] = Af.F[i] >= 0.6 ? 1 : 0;
          const core = V.erode(am, aw, ah, 3);
          const cc = V.components({ box: Af.box, w: aw, h: ah, F: Float32Array.from(core) }, 0.5);
          let dd = '';
          for (const c of cc.comps) {
            const one = new Uint8Array(aw * ah); for (let i = 0; i < aw * ah; i++) one[i] = cc.lab[i] === c.id ? 1 : 0;
            const reg = V.dilate(one, aw, ah, 3);
            // elipse com mesmo centro, área e orientação (momentos de 2ª ordem)
            let n = 0, sx = 0, sy = 0;
            for (let i = 0; i < aw * ah; i++) if (reg[i] && am[i]) { n++; sx += i % aw; sy += (i / aw) | 0; }
            if (n < 6) continue;
            const mx = sx / n, my = sy / n; let cxx = 0, cyy = 0, cxy = 0;
            for (let i = 0; i < aw * ah; i++) if (reg[i] && am[i]) { const dx = i % aw - mx, dy = ((i / aw) | 0) - my; cxx += dx * dx; cyy += dy * dy; cxy += dx * dy; }
            cxx /= n; cyy /= n; cxy /= n;
            const tr = cxx + cyy, det = cxx * cyy - cxy * cxy, l1 = tr / 2 + Math.sqrt(tr * tr / 4 - det), l2 = tr / 2 - Math.sqrt(tr * tr / 4 - det);
            const th = 0.5 * Math.atan2(2 * cxy, cxx - cyy);
            let ra = 2 * Math.sqrt(l1), rb = 2 * Math.sqrt(Math.max(l2, 0.01)); const s = Math.sqrt(n / (Math.PI * ra * rb)); ra *= s; rb *= s;
            const ex = mx + Af.box[0] + 0.5, ey = my + Af.box[1] + 0.5, co = Math.cos(th), sn = Math.sin(th), deg = th * 180 / Math.PI;
            const f2 = v => Math.round(v * 100) / 100;
            dd += `M${f2(ex + ra * co)} ${f2(ey + ra * sn)}A${f2(ra)} ${f2(rb)} ${f2(deg)} 1 1 ${f2(ex - ra * co)} ${f2(ey - ra * sn)}A${f2(ra)} ${f2(rb)} ${f2(deg)} 1 1 ${f2(ex + ra * co)} ${f2(ey + ra * sn)}Z`;
          }
          svg += `  <path id="${nm}" d="${dd}" fill="${col}"/>\n`;
          return;
        }
        if (nm.startsWith('olho')) { // olho inteiro = escuro + brilho branco; brilho vira peça própria
          const bb = [bx0 - 8, by0 - 8, bx1 + 9, by1 + 9];
          const white = k => { const r = D[k], g = D[k + 1], b = D[k + 2]; return c01((V.lum(D, k) - 205) / 35) * c01((45 - (Math.max(r, g, b) - Math.min(r, g, b))) / 30 + 0.5); };
          const dark = k => c01((155 - V.lum(D, k)) / 85 + 0.5);
          const E = V.field(bb, (X, Y, k) => Math.max(dark(k), white(k)));
          const te = V.trace(E, { holes: false, minArea: 100, eps: 0.35 });
          svg += `  <path id="${nm}" d="${te.d}" fill="${col}"/>\n`;
          const Wf = V.field(bb, (X, Y, k) => white(k));
          const tw = V.trace(Wf, { holes: false, minArea: 1, eps: 0.25 });
          svg += `  <path id="brilho-${nm}" d="${tw.d}" fill="#fbfaf6"/>\n`;
          return;
        }
        if (nm.startsWith('boca')) { // linha fina: traça pelo miolo escuro
          const bb = [bx0 - 3, by0 - 3, bx1 + 4, by1 + 4];
          const M = V.field(bb, (X, Y, k) => V.inPoly(p, X + 0.5, Y + 0.5) ? 1 - lightFn(X, Y, k) : 0);
          const t = V.trace(M, { lv: 0.74, holes: false, minArea: 4, eps: 0.3 });
          const mc = V.median(D, (cb) => { for (let Y = by0; Y <= by1; Y++) for (let X = bx0; X <= bx1; X++) if (V.inPoly(p, X + 0.5, Y + 0.5)) { const k = (Y * W + X) * 4; if (V.lum(D, k) < 130) cb(k); } });
          svg += `  <path id="boca" d="${t.d}" fill="#4a4950"/>\n`;
          return;
        }
        svg += `  <path id="${nm}" d="${V.pathCurve(V.rdp(V.smooth(p, 1), 0.4))}" fill="${col}"/>\n`;
      });
      if (false) smallLights.forEach((c, j) => {
        const mm = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) mm[i] = lab[i] === c.id ? 1 : 0;
        const md = V.dilate(mm, w, h, 2); const F2 = { box: BOX, w, h, F: light.F.map((v, i) => md[i] ? v : 0) };
        const t = V.trace(F2, { holes: false, minArea: 2, eps: 0.3 });
        const col = V.median(D, pix((x, y) => mm[y * w + x]));
        svg += `  <path id="brilho-olho-${c.cx < 540 ? 'esquerdo' : 'direito'}" d="${t.d}" fill="${col}"/>\n`;
      });
      svg += `</g>`;
      layers.push(svg);
    }
    return layers;
  };
})();
