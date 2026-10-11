"""Converte SVGs com camadas (gerados pelo vetorizador) em JSON de peças para o motor de animação.

Uso:
    python -I svg_para_partes.py <quadro-01.svg> [<quadro-02.svg> ...] <saida.json>

Os SVGs são os quadros-chave na ordem da animação; o ÚLTIMO é o logo final.
Com um único SVG, ele é o logo final.

Saída:
    {
      "bg": cor de fundo do logo final,
      "quadros": [ {"arquivo": ..., "bg": ..., "partes": [...]}, ... ],
      "logo": partes do último quadro,                 # atalho
      "word": partes do primeiro quadro (se houver 2+)   # compatibilidade com motor-koala.html
    }
Cada parte: {g: grupo mais interno, top: camada de 1º nível, id, d, fill, rule}.
A mesma peça usa o mesmo id/grupo em todos os quadros (ver trabalho/quadros-chave.json).
"""
import json
import os
import re
import sys


def parse(path):
    s = open(path, encoding='utf-8').read()
    out, stack, bg = [], [], None
    for m in re.finditer(r'<g id="([^"]+)"|</g>|<path ([^>]*)/>|<image ([^>]*)/>|<rect [^>]*fill="([^"]+)"', s):
        if m.group(1):
            stack.append(m.group(1))
        elif m.group(0) == '</g>':
            stack.pop()
        elif m.group(2):
            a = dict(re.findall(r'([\w-]+)="([^"]*)"', m.group(2)))
            out.append({'g': stack[-1] if stack else '', 'top': stack[0] if stack else '',
                        'id': a['id'], 'd': a['d'], 'fill': a['fill'], 'rule': a.get('fill-rule', 'nonzero')})
        elif m.group(3):  # imagem embutida (textura de fundo, recortes de fitas etc.)
            a = dict(re.findall(r'([\w:-]+)="([^"]*)"', m.group(3)))
            out.append({'g': stack[-1] if stack else '', 'top': stack[0] if stack else '', 'id': a['id'],
                        'img': a.get('href') or a.get('xlink:href'), 'x': float(a.get('x', 0)), 'y': float(a.get('y', 0)),
                        'w': float(a['width']), 'h': float(a['height'])})
        elif m.group(4):
            bg = m.group(4)
    return out, bg


if __name__ == '__main__':
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    quadros = []
    for f in sys.argv[1:-1]:
        partes, bg = parse(f)
        quadros.append({'arquivo': os.path.basename(f), 'bg': bg, 'partes': partes})
    res = {'bg': quadros[-1]['bg'], 'quadros': quadros, 'logo': quadros[-1]['partes'],
           'word': quadros[0]['partes'] if len(quadros) > 1 else []}
    json.dump(res, open(sys.argv[-1], 'w', encoding='utf-8'), separators=(',', ':'))
    for i, q in enumerate(quadros, 1):
        print(f'quadro {i}: {q["arquivo"]} | fundo {q["bg"]} | {len(q["partes"])} peças')
