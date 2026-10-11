window.loadAll = async () => {
  for (const f of ['vec.js', 'koala.js', 'blocks.js', 'setup.js'])
    await new Promise((res, rej) => { const s = document.createElement('script'); s.src = f + '?' + Date.now(); s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  await setup();
  window.saveCmp = async (name) => { const b = await new Promise(r => document.getElementById('cmp').toBlob(r, 'image/png')); return (await fetch('/save?name=' + name, { method: 'POST', body: b })).text(); };
  window.saveText = async (name, txt) => (await fetch('/save?name=' + name, { method: 'POST', body: new Blob([txt]) })).text();
  const sub = (s, id, col) => s.replace(new RegExp(`(id="${id}" d="[^"]*" fill=")#[0-9a-f]{6}`, 'g'), `$1${col}`);
  window.unify = (s) => {
    s = s.replace(/(-contorno" d="[^"]*" fill=")#[0-9a-f]{6}/g, '$1#4a4950').replace(/(-pelo" d="[^"]*" fill=")#[0-9a-f]{6}/g, '$1#fffd9b')
      .replace(/(almofada-\d" d="[^"]*" fill=")#[0-9a-f]{6}/g, '$1#2b2d33').replace(/(-interior" d="[^"]*" fill=")#[0-9a-f]{6}/g, '$1#eac57b')
      .replace(/(id="bochecha-\w+" d="[^"]*" fill=")#[0-9a-f]{6}/g, '$1#fdaed4');
    for (const id of ['olho-esquerdo', 'olho-direito', 'nariz']) s = sub(s, id, '#1a1918');
    return s;
  };
  window.build = () => {
    window.KL = buildKoala(D, lightFn, blockish, dbg);
    window.BLK = buildBlocks(D);
    const blocksG = `<g id="blocos" inkscape:label="blocos" inkscape:groupmode="layer">\n${BLK.join('\n')}\n</g>`;
    const koalaG = `<g id="koala" inkscape:label="koala" inkscape:groupmode="layer">\n${unify(KL.join('\n'))}\n</g>`;
    window.FULL = svgOf(blocksG + '\n' + koalaG);
    return FULL;
  };
};
