function scheduleSound(s, t0) {
  const F3 = 174.61, A3 = 220.0;
  s.pad([F3, A3, N.C4, N.E4], t0, t0 + DURATION);
  // fundo: fitas fluindo e pontinhos surgindo como bolhas
  s.whoosh(t0 + 0.02, 0.9, 0.11, 200, 1400);
  DOT_ORDER.forEach((d, i) => { if (i % 2 === 0) s.bubble(t0 + DOT0 + d.i * DOT_STEP + 0.05, 0.025, 900 + ((i * 137) % 600)); });
  // símbolo montando: arcos girando, asas abrindo, ondas, XV
  s.whoosh(t0 + IN['arco-externo'][0], 0.6, 0.11, 500, 3000);
  s.whoosh(t0 + IN['arco-interno'][0], 0.55, 0.08, 800, 3600);
  s.flutter(t0 + IN['asas'][0] + 0.05, 0.55, 0.07);
  s.whoosh(t0 + IN['onda-meio'][0], 0.5, 0.08, 260, 900);
  s.whoosh(t0 + IN['onda-inferior'][0], 0.5, 0.07, 240, 800);
  s.marimba(N.G5, t0 + IN['letra-X'][0] + 0.12, 0.22); s.tok(t0 + IN['letra-X'][0] + 0.12, 0.15);
  s.marimba(N.C6, t0 + IN['letra-V'][0] + 0.12, 0.22); s.tok(t0 + IN['letra-V'][0] + 0.12, 0.15);
  // nome entrando palavra por palavra
  [N.C5, N.D5, N.E5, N.G5, N.A5].forEach((f, i) => s.marimba(f, t0 + WORD0 + i * WORD_STEP + 0.12, 0.14));
  // nome saindo e símbolo girando até o centro
  s.whoosh(t0 + OUT0, 0.32, 0.07, 2400, 500);
  s.whoosh(t0 + MOVE[0], MOVE[1], 0.14, 350, 3200);
  s.bell(N.E6, t0 + MOVE[0] + MOVE[1], 0.06, 0.9);
  // frente líquida revelando as cores
  s.bloop(t0 + REVEAL[0], 0.22);
  s.whoosh(t0 + REVEAL[0], REVEAL[1], 0.12, 300, 2200);
  [0.12, 0.28, 0.44, 0.6].forEach((dt, i) => s.bubble(t0 + REVEAL[0] + dt, 0.05, 700 + i * 180));
  // adesivo assenta, brilho e assinatura final
  s.thud(t0 + SETTLE + 0.05, 0.3);
  [N.C5, N.G5, N.E6].forEach((f, i) => s.bell(f, t0 + SETTLE + 0.05 + i * 0.03, 0.12, 1.4));
  [N.C6, N.D6, N.E6, N.G6, N.C7].forEach((f, i) => s.bell(f, t0 + SHINE + 0.05 + i * 0.07, 0.03, 0.5));
}
