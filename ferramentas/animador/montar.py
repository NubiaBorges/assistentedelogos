"""Monta o HTML de animação de um logo a partir do motor de referência.

Uso:
    python -I montar.py <partes.json> <cena.js> <som.js> <saida.html> [--foco CX,CY] [--escala-horizontal S] [--titulo TEXTO]

- partes.json: gerado por svg_para_partes.py (imagens repetidas entre quadros são deduplicadas aqui).
- cena.js: substitui as seções "geometria das peças", "timeline" e "desenho" do motor.
  Precisa definir render(t) e pode usar CW, CH, VIEW, tmp, g, W, H, DURATION e os utilitários do motor.
  Se carregar imagens, exponha uma Promise imgsReady (o motor espera por ela antes do 1º quadro).
- som.js: define scheduleSound(s, t0) usando os instrumentos de buildAudio.
"""
import argparse
import json
import os

AQUI = os.path.dirname(os.path.abspath(__file__))

ap = argparse.ArgumentParser()
ap.add_argument('partes'); ap.add_argument('cena'); ap.add_argument('som'); ap.add_argument('saida')
ap.add_argument('--foco', default='540,900'); ap.add_argument('--escala-horizontal', type=float, default=1.3)
ap.add_argument('--titulo', default='Logo Animado')
a = ap.parse_args()

motor = open(os.path.join(AQUI, 'motor-koala.html'), encoding='utf-8').read()
cena = open(a.cena, encoding='utf-8').read()
som = open(a.som, encoding='utf-8').read()
partes = json.load(open(a.partes, encoding='utf-8'))

# deduplica imagens embutidas
imagens, chave = {}, {}
for q in partes.get('quadros', []):
    for p in q['partes']:
        if p.get('img'):
            if p['img'] not in chave:
                chave[p['img']] = f'img{len(chave)}'
                imagens[chave[p['img']]] = p['img']
            p['img'] = chave[p['img']]
partes['imagens'] = imagens
partes['logo'] = partes['quadros'][-1]['partes'] if partes.get('quadros') else partes.get('logo', [])

def trocar(txt, ini, fim, novo):
    i, j = txt.index(ini), txt.index(fim)
    return txt[:i] + novo + txt[j:]

html = trocar(motor, '// ---------- geometria das peças', '// ---------- som (Web Audio', cena)
html = trocar(html, 'function scheduleSound', '// ---------- reprodução', som + '\n')
cx, cy = a.foco.split(',')
html = html.replace('const FOCO = { cx: 540, cy: 900 };', f'const FOCO = {{ cx: {cx}, cy: {cy} }};')
html = html.replace('horizontal: { w: 1920, h: 1080, s: 1.3 }', f'horizontal: {{ w: 1920, h: 1080, s: {a.escala_horizontal} }}')
html = html.replace('render(DURATION);\nwindow.seek', "(typeof imgsReady !== 'undefined' ? imgsReady : Promise.resolve()).then(() => render(DURATION));\nwindow.seek")
html = html.replace('<title>Koala Logo Animado</title>', f'<title>{a.titulo}</title>')
html = html.replace('const PARTS = __PARTS__;', 'const PARTS = ' + json.dumps(partes, separators=(',', ':')) + ';')
open(a.saida, 'w', encoding='utf-8').write(html)
print(f'{a.saida}: {len(html) / 1e6:.2f} MB, {len(imagens)} imagens únicas')
