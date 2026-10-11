function scheduleSound(s, t0) {
  s.pad([N.C4, N.E4, N.G4, N.B4], t0, t0 + DURATION);
  // peças aparecendo: marimba subindo
  [N.C5, N.D5, N.E5, N.G5, N.A5].forEach((f, i) => { const t = t0 + TILE_START + i * TILE_STEP + 0.07; s.marimba(f, t, 0.3); s.tok(t, 0.18); });
  [N.C6, N.E6, N.G6].forEach((f, i) => s.bell(f, t0 + SWEEP1 + 0.08 + i * 0.07, 0.03, 0.5));
  // cada cubo: pulinho (sobe) e batida de madeira ao cair, cada um numa nota
  [N.G4, N.C5, N.E5, N.G5, N.C6].forEach((f, i) => {
    const up = t0 + HOP0 + i * HOP_STEP + HOP_DUR * 0.16;
    s.slide(420 + i * 40, 900 + i * 60, up, 0.12, 0.035);
    const land = t0 + hopLand(i);
    s.tok(land, 0.34, 700 + i * 90); s.tok(land + 0.004, 0.18, 2400); s.marimba(f, land, 0.16);
  });
  // koala espiando: "hum?" curioso, orelhinhas, olhadinhas
  s.slide(260, 520, t0 + PEEK0 + 0.05, 0.28, 0.05);
  s.tick(t0 + PEEK1, 0.05); s.tick(t0 + PEEK1 + 0.08, 0.05);
  // impulso e pulo
  s.slide(380, 1150, t0 + JUMP, 0.3, 0.07);
  // senta: baque macio + cubos de madeira cedendo
  s.thud(t0 + LAND, 0.45);
  [0, 1, 2, 3, 4].forEach(i => s.tok(t0 + LAND + Math.abs(i - 2) * 0.05, 0.16, 650 + i * 70));
  // pezinhos balançando
  [0, 1, 2].forEach(i => s.marimba(N.E6 + i * 0, t0 + FEET + 0.05 + i * 0.1, 0.05));
  s.boing(t0 + EARS + 0.02, 0.06);
  s.tick(t0 + BLINK + 0.06);
  // assinatura final
  [N.C5, N.G5, N.E6].forEach((f, i) => s.bell(f, t0 + SWEEP2 + i * 0.03, 0.13, 1.5));
  [N.C6, N.D6, N.E6, N.G6, N.C7].forEach((f, i) => s.bell(f, t0 + SPARKLE_START + 0.1 + i * 0.07, 0.035, 0.5));
}
