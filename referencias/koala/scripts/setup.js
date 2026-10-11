(function () {
  const c01 = v => Math.min(1, Math.max(0, v));
  window.setup = async () => {
    window.D = await V.load('koala.jpg');
    window.DW = await V.load('palavra.jpg');
    window.dbg = k => Math.hypot(D[k] - 189, D[k + 1] - 159, D[k + 2] - 233);
    window.blockish = (y, k) => { if (y < 1100) return false; const r = D[k], g = D[k + 1], b = D[k + 2];
      const yellow = g > 190 && b < 200 && r > 200; return !yellow && (Math.max(r, g, b) - Math.min(r, g, b)) > 45; };
    // pelo amarelo: na faixa dos blocos usa "amarelidade" (R e G altos, B baixo)
    window.yellowF = k => c01((D[k + 1] - 205) / 30 + 0.5) * c01((D[k] - 200) / 30 + 0.5) * c01((205 - D[k + 2]) / 40 + 0.5);
    window.lightFn = (x, y, k) => y > 1098 ? yellowF(k) : c01((V.lum(D, k) - 155) / 85 + 0.5) * c01((dbg(k) - 20) / 30);
    // contorno na faixa dos blocos: escuro E neutro (pouca saturação)
    window.inkBand = k => { const r = D[k], g = D[k + 1], b = D[k + 2]; const sat = Math.max(r, g, b) - Math.min(r, g, b);
      return c01((150 - V.lum(D, k)) / 60) * c01((60 - sat) / 40 + 0.5); };
  };
  window.svgOf = (inner, bg = '#bd9fe9') => `<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="1080" height="1920" viewBox="0 0 1080 1920">\n<g id="fundo" inkscape:label="fundo" inkscape:groupmode="layer"><rect width="1080" height="1920" fill="${bg}"/></g>\n${inner}\n</svg>`;
  window.rasterize = async (svg) => {
    const img = await V.img('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
    const o = document.getElementById('c'); const x = o.getContext('2d');
    x.clearRect(0, 0, 1080, 1920); x.drawImage(img, 0, 0);
    return x.getImageData(0, 0, 1080, 1920).data;
  };
  // original | vetor | diferença ampliada
  window.show = async (svg, region, scale = 1.2, src = 'koala.jpg', withDiff = false) => {
    const vec = await rasterize(svg); window.lastVec = vec;
    const [rx, ry, rw, rh] = region, n = withDiff ? 3 : 2;
    const out = document.getElementById('cmp') || document.body.appendChild(Object.assign(document.createElement('canvas'), { id: 'cmp' }));
    out.width = (rw * scale + 10) * n; out.height = rh * scale;
    out.style.cssText = 'position:fixed;top:0;left:0;width:100vw;z-index:9;background:#000';
    const ox = out.getContext('2d');
    const oi = await V.img(src);
    ox.drawImage(oi, rx, ry, rw, rh, 0, 0, rw * scale, rh * scale);
    ox.drawImage(document.getElementById('c'), rx, ry, rw, rh, rw * scale + 10, 0, rw * scale, rh * scale);
    let err = 0, cnt = 0;
    const O = src === 'koala.jpg' ? D : DW;
    const dc = document.createElement('canvas'); dc.width = rw; dc.height = rh; const dx = dc.getContext('2d'); const id = dx.createImageData(rw, rh);
    for (let y = 0; y < rh; y++) for (let x = 0; x < rw; x++) {
      const k = ((y + ry) * 1080 + x + rx) * 4, e = (Math.abs(O[k] - vec[k]) + Math.abs(O[k + 1] - vec[k + 1]) + Math.abs(O[k + 2] - vec[k + 2])) / 3;
      err += e; cnt++; const j = (y * rw + x) * 4; const v = Math.min(255, e * 4); id.data[j] = v; id.data[j + 1] = v * 0.3; id.data[j + 2] = 0; id.data[j + 3] = 255;
    }
    if (withDiff) { dx.putImageData(id, 0, 0); ox.drawImage(dc, 0, 0, rw, rh, (rw * scale + 10) * 2, 0, rw * scale, rh * scale); }
    return (err / cnt).toFixed(2);
  };
})();
