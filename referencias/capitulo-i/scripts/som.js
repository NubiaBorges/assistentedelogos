function scheduleSound(s, t0) {
  const G3 = 196.0, B3 = 246.94, D4 = 293.66, Fs4 = 369.99;
  s.pad([G3, B3, D4, Fs4], t0, t0 + DURATION);                               // acorde suave (Gmaj7)
  // papel: folha caindo planando (farfalhar) e tira de baixo flexionando
  s.flutter(t0 + FOLHA_PAPEL[0] + 0.05, 0.9, 0.05);
  s.whoosh(t0 + FOLHA_PAPEL[0], 0.9, 0.05, 1800, 700);
  s.whoosh(t0 + BOT0, 0.8, 0.08, 180, 800);
  s.flutter(t0 + BOT0 + 0.15, 0.5, 0.035);
  // passos do caminho tracejado
  TRACOS[0].forEach((d, i) => { if (i % 2 === 0) s.tick(t0 + DASH[0][0] + i * DASH[0][1] + 0.05, 0.022); });
  TRACOS[1].forEach((d, i) => { if (i % 2 === 0) s.bubble(t0 + DASH[1][0] + i * DASH[1][1] + 0.05, 0.02, 700 + i * 22); });
  // livro: pousa (baque de capa) e páginas viram
  s.thud(t0 + LIVRO_POUSA[0] + 0.2, 0.28);
  VIRA.forEach(([v0, du]) => { s.flutter(t0 + v0, du + 0.05, 0.08); s.whoosh(t0 + v0, du, 0.05, 900, 2600); });
  // caule cresce
  s.slide(260, 780, t0 + STEM[0], STEM[1], 0.05);
  // pinceladas nas folhas (chiado curto de pincel) + notas
  Object.entries(PINTA).forEach(([g, s0], i) => { s.whoosh(t0 + s0, 0.3, 0.06, 3200, 1600); s.whoosh(t0 + s0 + 0.14, 0.26, 0.045, 3600, 2000); s.marimba([N.E5, N.G5, N.C6][i], t0 + s0 + 0.2, 0.11); });
  // letras a tinta
  [N.C5, N.D5, N.E5, N.G5, N.A5, N.C6, N.D6, N.E6, N.G6].forEach((f, i) => { s.whoosh(t0 + TXT0 + i * TXT_STEP, 0.16, 0.02, 4000, 2500); s.marimba(f, t0 + TXT0 + i * TXT_STEP + 0.12, i === 8 ? 0.15 : 0.08); });
  // contorno de legibilidade surge
  s.bloop(t0 + CONTORNO[0], 0.14); s.whoosh(t0 + CONTORNO[0], 0.5, 0.06, 300, 1400);
  [N.G5, N.D6, N.G6].forEach((f, i) => s.bell(f, t0 + CONTORNO[0] + 0.25 + i * 0.05, 0.1, 1.3));
  // motion orgânico: manchas da abertura recolhendo, fitas girando, folhinhas subindo
  ORG.abertura.forEach((m, i) => { s.bloop(t0 + m.t[0] + 0.05, 0.13 - i * 0.02); s.whoosh(t0 + m.t[0], m.t[1], 0.07, 1600 - i * 300, 300); });
  ORG.fitas.forEach((f, i) => s.whoosh(t0 + f.t, 0.8, 0.05, 500 + i * 200, 2400 + i * 300));
  for (let i = 0; i < ORG.folhinhas; i += 2) s.bubble(t0 + ORG.FOLHINHA0 + i * 0.05 + 0.1, 0.025, 1200 + i * 60);
  // brisa e brilho final
  s.whoosh(t0 + BRISA[0], 0.9, 0.04, 400, 1200);
  [N.C6, N.E6, N.G6, N.C7].forEach((f, i) => s.bell(f, t0 + SHINE + 0.05 + i * 0.07, 0.03, 0.5));
}
