// ---------- timeline
// Cubos de brinquedo: aparecem como peças planas, agacham, saltam virando no ar e caem como cubos.
const TILE_START = 0.2, TILE_STEP = 0.14, TILE_DUR = 0.5;
const SWEEP1 = 1.12;
const HOP0 = 1.55, HOP_STEP = 0.1, HOP_DUR = 0.62;
const hopLand = i => HOP0 + i * HOP_STEP + HOP_DUR * 0.85;
// Koala: espia por trás dos cubos, olha em volta, toma impulso, pula e senta.
const PEEK0 = 2.55, PEEK1 = 2.9, CROUCH = 3.08, JUMP = 3.18, JUMP_DUR = 0.37, LAND = JUMP + JUMP_DUR;
const FEET = LAND + 0.08, EARS = LAND + 0.05, TILT = 3.95, BLINK = 4.22;
const SWEEP2 = 3.85, SPARKLE_START = 3.8;
const HIDDEN = 430, PEEK_Y = 245, CROUCH_Y = 278, JUMP_H = 220;

const sparkles = [[318, 700, 26], [770, 680, 30], [262, 980, 20], [822, 960, 24],
                  [420, 600, 18], [690, 585, 22], [255, 1250, 16], [830, 1262, 20], [540, 540, 14]];
const NECK = { x: 540, y: 990 };
const FOOT_L = bboxOf(LG.get('pe-esquerdo').map(p => p.d)), FOOT_R = bboxOf(LG.get('pe-direito').map(p => p.d));
const PIV_FL = { x: FOOT_L.x1 - 14, y: FOOT_L.y0 + 16 }, PIV_FR = { x: FOOT_R.x0 + 14, y: FOOT_R.y0 + 16 };

// ---------- desenho
const fill = (c, p) => { c.fillStyle = p.fill; c.fill(P2D[p.id], p.rule); };
// desenha um grupo com centro (cx, cy) e escala (sx, sy) relativa ao tamanho natural
function drawGroupAt(c, parts, B, cx, cy, sx, sy, anchorBottom = false) {
  c.save();
  const ay = anchorBottom ? B.y1 : B.cy;
  c.translate(cx, cy + (anchorBottom ? B.h / 2 : 0)); c.scale(sx, sy); c.translate(-B.cx, -ay);
  parts.forEach(p => fill(c, p)); c.restore();
}

function cubeWave(i, t) { return pulse(t, LAND + Math.abs(i - 2) * 0.05, 0.26); } // cubos cedem quando o koala senta

function drawCubesAndTiles(c, t, final = false) {
  TILE_IDS.forEach((tid, i) => {
    const T = TILE_BOX[i], B = BLOCK_BOX[i], tile = WG.get(tid), cube = LG.get(BLOCK_IDS[i]);
    if (final) { cube.forEach(p => fill(c, p)); return; }
    const pop = prog(t, TILE_START + i * TILE_STEP, TILE_DUR);
    if (pop <= 0) return;
    const q = prog(t, HOP0 + i * HOP_STEP, HOP_DUR);
    if (q <= 0) { // peça plana aparecendo
      const sc = Math.max(0, easeOutBack(pop, 2.2)), lift = (1 - easeOutCubic(pop)) * 60;
      c.save(); c.globalAlpha = clamp(pop * 4); drawGroupAt(c, tile, T, T.cx, T.cy + lift, sc, sc); c.restore();
    } else if (q < 0.18) { // agacha (antecipação)
      const s = Math.sin(Math.PI * q / 0.18) * 0.14;
      drawGroupAt(c, tile, T, T.cx, T.cy, 1 + s * 0.6, 1 - s, true);
    } else if (q < 0.85) { // voo: arco + virada de carta (peça -> cubo)
      const f = (q - 0.18) / 0.67, e = easeInOutSine(f);
      const cx = lerp(T.cx, B.cx, e), cy = lerp(T.cy, B.cy, e) - 4 * 200 * f * (1 - f);
      const flip = Math.abs(Math.cos(Math.PI * f)), stretch = 1 + 0.08 * Math.sin(Math.PI * f);
      if (f < 0.5) drawGroupAt(c, tile, T, cx, cy, Math.max(flip, 0.02), stretch);
      else drawGroupAt(c, cube, B, cx, cy, Math.max(flip, 0.02), stretch);
    } else { // pouso com amassado elástico
      const k = (q - 0.85) / 0.15, s = Math.cos(k * Math.PI * 1.5) * (1 - k) * 0.16;
      drawGroupAt(c, cube, B, B.cx, B.cy, 1 + s * 0.5, 1 - s, true);
    }
    if (q >= 1) { // já no lugar
      const w = cubeWave(i, t);
      if (w) { c.save(); c.globalCompositeOperation = 'source-over'; }
      if (w) { drawGroupAt(c, cube, B, B.cx, B.cy, 1 + w * 0.025, 1 - w * 0.06, true); c.restore(); }
      else cube.forEach(p => fill(c, p));
    }
  });
}

// deslocamento vertical do koala (positivo = abaixo da posição final, atrás dos cubos)
function koalaY(t) {
  if (t < PEEK0) return null;
  if (t < PEEK1) return lerp(HIDDEN, PEEK_Y, easeOutBack(prog(t, PEEK0, PEEK1 - PEEK0), 1.4));
  if (t < CROUCH) return PEEK_Y;
  if (t < JUMP) return lerp(PEEK_Y, CROUCH_Y, easeInOutSine(prog(t, CROUCH, JUMP - CROUCH)));
  if (t < LAND) { const u = prog(t, JUMP, JUMP_DUR); return CROUCH_Y * (1 - u) - 4 * JUMP_H * u * (1 - u); }
  return 0;
}

function drawKoala(c, t, front, final = false) {
  const y = final ? 0 : koalaY(t);
  if (y === null) return;
  const u = prog(t, JUMP, JUMP_DUR);
  const inFront = final || t >= LAND || (t >= JUMP && (u > 0.66 || y < -20));
  if (inFront !== front) return;
  // corpo: estica no salto, amassa ao sentar
  let sx = 1, sy = 1;
  if (!final) {
    if (t >= CROUCH && t < JUMP) { const s = 0.06 * easeInOutSine(prog(t, CROUCH, JUMP - CROUCH)); sx = 1 + s * 0.5; sy = 1 - s; }
    else if (t >= JUMP && t < LAND) { const s = 0.07 * Math.sin(Math.PI * u); sx = 1 - s * 0.5; sy = 1 + s; }
    else if (t >= LAND) { const q = prog(t, LAND, 0.5); const s = q < 1 ? Math.cos(q * Math.PI * 3) * Math.pow(1 - q, 2) * 0.08 : 0; sx = 1 + s * 0.6; sy = 1 - s; }
  }
  // olhos olhando para os lados enquanto espia
  const look = final ? 0 : (pulse(t, PEEK1 + 0.02, 0.09) * -6 + pulse(t, PEEK1 + 0.1, 0.09) * 6);
  // orelhas: mexidinha ao espiar + balanço depois de sentar
  let earL = 0, earR = 0;
  if (!final) {
    earL += pulse(t, PEEK1, 0.08) * 0.14; earR -= pulse(t, PEEK1 + 0.08, 0.08) * 0.14;
    const eq = prog(t, EARS, 0.6); if (eq > 0 && eq < 1) { const w = Math.sin(eq * Math.PI * 4) * 0.10 * (1 - eq); earL -= w; earR += w; }
  }
  // pezinhos balançando de alegria
  let fl = 0, fr = 0;
  { const fq = final ? 1 : prog(t, FEET, 0.42); if (fq > 0 && fq < 1) { const w = Math.sin(fq * Math.PI * 4) * 0.12 * (1 - fq); fl = w; fr = w; } }
  const tilt = final ? 0 : 0.07 * easeInOutSine(pulse(t, TILT, 0.6));
  const blink = final ? 1 : 1 - pulse(t, BLINK, 0.18) * 0.92;

  c.save();
  if (!front) { c.beginPath(); c.rect(0, 0, W, 1221); c.clip(); } // atrás dos cubos: o chão esconde o resto
  c.translate(ANCHOR.x, ANCHOR.y + y); c.scale(sx, sy); c.translate(-ANCHOR.x, -ANCHOR.y);
  const rot = (P, a) => { if (a) { c.translate(P.x, P.y); c.rotate(a); c.translate(-P.x, -P.y); } };
  for (const id of KOALA_IDS) {
    c.save();
    const isHead = id === 'cabeca' || id.startsWith('orelha');
    if (isHead) rot(NECK, tilt);
    if (id === 'orelha-esquerda') rot(PIVOT_L, -earL);
    if (id === 'orelha-direita') rot(PIVOT_R, earR);
    if (id === 'pe-esquerdo') rot(PIV_FL, -fl);
    if (id === 'pe-direito') rot(PIV_FR, fr);
    for (const p of LG.get(id)) {
      const eye = p.id.replace('brilho-', '');
      if (EYE[eye]) {
        if (p.id.startsWith('brilho') && blink < 0.6) continue;
        const E = EYE[eye]; c.save(); c.translate(look, 0);
        c.translate(E.cx, E.cy); c.scale(1, blink); c.translate(-E.cx, -E.cy); fill(c, p); c.restore();
      } else fill(c, p);
    }
    c.restore();
  }
  c.restore();
}

function drawScene(c, t) { drawKoala(c, t, false); drawCubesAndTiles(c, t); drawKoala(c, t, true); }
function drawLogoFinal(c) { drawCubesAndTiles(c, DURATION, true); drawKoala(c, DURATION, true, true); }

function sweep(drawFn, t, start, dur, x0, x1, y0, y1) {
  const q = prog(t, start, dur);
  if (q <= 0 || q >= 1) return;
  const c = tmp.getContext('2d');
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
  c.clearRect(0, 0, W, H); drawFn(c);
  c.globalCompositeOperation = 'source-atop';
  const sx = lerp(x0 - 200, x1 + 200, easeInOutSine(q));
  const cy = (y0 + y1) / 2, gr = c.createLinearGradient(sx - 90, cy - 30, sx + 90, cy + 30);
  gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.5, 'rgba(255,255,255,.38)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = gr; c.fillRect(x0 - 50, y0 - 50, x1 - x0 + 100, y1 - y0 + 100);
  c.globalCompositeOperation = 'source-over';
  g.drawImage(tmp, 0, 0);
}

function drawStar(x, y, r, a) {
  g.save(); g.globalAlpha = a; g.translate(x, y);
  g.fillStyle = '#ffffff'; g.shadowColor = 'rgba(255,255,255,.9)'; g.shadowBlur = 16;
  g.beginPath(); g.moveTo(0, -r); g.quadraticCurveTo(0, 0, r, 0); g.quadraticCurveTo(0, 0, 0, r);
  g.quadraticCurveTo(0, 0, -r, 0); g.quadraticCurveTo(0, 0, 0, -r); g.fill(); g.restore();
}
function drawSparkles(t) {
  sparkles.forEach(([x, y, r], i) => {
    const q = prog(t, SPARKLE_START + i * 0.06, 0.55);
    if (q <= 0 || q >= 1) return;
    const k = Math.sin(Math.PI * q); drawStar(x, y, r * (0.4 + 0.8 * k), k * 0.95);
  });
  const pp = prog(t, LAND - 0.02, 0.5);                        // faíscas quando ele senta
  if (pp > 0 && pp < 1) for (let i = 0; i < 12; i++) {
    const ang = Math.PI + (i / 11) * Math.PI, d = 40 + easeOutCubic(pp) * 230;
    drawStar(540 + Math.cos(ang) * d * 1.3, 1120 + Math.sin(ang) * d * 0.55, 11 * (1 - pp), 1 - pp);
  }
}

function render(t) {
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1;
  g.fillStyle = PARTS.bg; g.fillRect(0, 0, W, H);
  if (t >= DURATION - 1e-6) { drawLogoFinal(g); return; }   // último quadro = logo vetorial exato
  drawScene(g, t);
  if (t < HOP0) sweep(c => drawCubesAndTiles(c, t), t, SWEEP1, 0.4, 300, 790, 910, 1035);
  else sweep(c => drawScene(c, t), t, SWEEP2, 0.7, 300, 770, 715, 1232);
  drawSparkles(t);
}

