// Logo só com o nome: 5 peças planas + letras
(function () {
  const c01 = v => Math.min(1, Math.max(0, v));
  const TILES = [
    { id: 'peca-K-rosa', letra: 'K', x0: 304, x1: 403 },
    { id: 'peca-O-azul', letra: 'O', x0: 401, x1: 498 },
    { id: 'peca-A-coral', letra: 'A', x0: 496, x1: 596 },
    { id: 'peca-L-verde', letra: 'L', x0: 594, x1: 693 },
    { id: 'peca-A-amarela', letra: 'A', x0: 691, x1: 791 },
  ];
  window.buildWord = function (D) {
    const dbgW = k => Math.hypot(D[k] - 189, D[k + 1] - 159, D[k + 2] - 233);
    const out = [];
    for (const T of TILES) {
      const box = [T.x0, 915, T.x1, 1034];
      // silhueta: transição real para o fundo; separa das vizinhas pela faixa de x da peça
      const sil = V.field(box, (x, y, k) => c01(dbgW(k) / 70));
      const comps = V.components(sil, 0.5);
      const main = comps.comps.reduce((m, c) => c.n > m.n ? c : m, comps.comps[0]);
      const mask = comps.lab.map(v => v === main.id ? 1 : 0);
      const md = V.dilate(Uint8Array.from(mask), sil.w, sil.h, 2);
      const silF = { ...sil, F: sil.F.map((v, i) => md[i] ? v : 0) };
      const shape = V.trace(silF, { holes: false, minArea: 500, eps: 0.4 });
      // cor da peça (sem letra, sem borda)
      const er = V.erode(Uint8Array.from(mask), sil.w, sil.h, 5);
      const fill = V.median(D, cb => { for (let y = 0; y < sil.h; y++) for (let x = 0; x < sil.w; x++) { if (!er[y * sil.w + x]) continue; const k = ((y + box[1]) * 1080 + x + box[0]) * 4; if (V.lum(D, k) > 110) cb(k); } });
      const fr = parseInt(fill.slice(1, 3), 16), fg = parseInt(fill.slice(3, 5), 16), fb = parseInt(fill.slice(5, 7), 16);
      const fl = 0.299 * fr + 0.587 * fg + 0.114 * fb, mid = (fl + 28) / 2;
      const L = V.field(box, (x, y, k) => er[(y - box[1]) * sil.w + (x - box[0])] || V.erode ? (md[(y - box[1]) * sil.w + (x - box[0])] ? c01((mid - V.lum(D, k)) / (fl - 28) + 0.5) : 0) : 0);
      // só o que está bem dentro da peça
      const er2 = V.erode(Uint8Array.from(mask), sil.w, sil.h, 3);
      L.F = L.F.map((v, i) => er2[i] ? v : 0);
      const letter = V.trace(L, { holes: true, minArea: 40, eps: 0.4 });
      const lc = V.median(D, cb => { for (let y = 0; y < sil.h; y++) for (let x = 0; x < sil.w; x++) { const k = ((y + box[1]) * 1080 + x + box[0]) * 4; if (er2[y * sil.w + x] && V.lum(D, k) < 45) cb(k); } });
      out.push(`<g id="${T.id}" inkscape:label="${T.id}" inkscape:groupmode="layer">
  <path id="${T.id}-base" d="${shape.d}" fill="${fill}"/>
  <path id="${T.id}-letra-${T.letra}" d="${letter.d}" fill="${lc}" fill-rule="evenodd"/>
</g>`);
    }
    return out;
  };
})();
