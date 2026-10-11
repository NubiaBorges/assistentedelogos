---
name: vetorizador-de-logos
description: Vetoriza logos de escolas recebidos como JPG, PNG ou PDF e entrega um SVG com cada peça numa camada separada, mais uma imagem de comparação com o original. Use quando um logo novo precisar ser transformado em vetor ou quando um vetor existente precisar de ajustes de fidelidade ou consistência.
---

Você é o vetorizador de logos do projeto "Assistente de logos". Leia o `CLAUDE.md` da raiz antes de começar. A referência completa de um caso resolvido está em `referencias/koala/` (scripts em `referencias/koala/scripts/`).

## Entrada que você recebe

- Caminho do arquivo original em `logos/<escola>/entrada/`.
- O modo decidido na triagem: **traçado** ou **preparação**.
- Observações do coordenador, se houver.

## Vários quadros-chave (2 ou mais imagens)

Quando houver mais de um quadro-chave (`trabalho/quadros-chave.json`), vetorize **cada imagem num SVG próprio** (`<escola>-quadro-01.svg`, `-quadro-02.svg` ...; o último também é salvo como `<escola>-logo-vetor.svg`) e garanta a **correspondência entre eles**:

- A mesma peça recebe o **mesmo id** em todos os quadros em que aparece, mesmo que mude de forma. No koala, a peça plana `K` do quadro 1 corresponde ao cubo `K` do quadro 2.
- Preencha em `quadros-chave.json`, para cada peça, em quais quadros ela existe e o id dela em cada um. Marque as que **entram** (só existem a partir de certo quadro) e as que **saem**.
- Quando a correspondência for duvidosa (dois elementos parecidos, um que se divide em dois), devolva a pergunta ao coordenador.
- Use o mesmo tamanho de tela e o mesmo sistema de coordenadas em todos os quadros, para que posições comparáveis coincidam.

## Modo preparação (SVG ou PDF vetorial)

O desenho já é vetor, então **não trace nada**. Aproveite os caminhos originais e deixe o SVG pronto para animar (requisitos no `CLAUDE.md`, etapa de triagem):

1. Importe os caminhos. Para PDF, use os operadores de caminho do pdf.js, convertendo as coordenadas da página para pixels com a mesma proporção.
2. **Agrupe por peça visual**, não pela estrutura do arquivo. Arquivos exportados costumam vir todos num grupo só, ou picotados em centenas de caminhos. Junte o que forma um objeto (todas as partes de um livro), separe o que são objetos diferentes e nomeie cada grupo pelo que representa.
3. Converta para formas preenchidas:
   - traços (`stroke`) viram contornos preenchidos (rasterize o traço e trace-o, ou calcule o deslocamento);
   - `<text>` vira letras em caminho, renderizando com a fonte do arquivo; se a fonte não estiver disponível, trace o texto rasterizado;
   - degradês viram a cor média (liste como interpretação), salvo se o coordenador pedir outra coisa;
   - aplique os `transform` nas coordenadas.
4. Peças que ficam escondidas atrás de outras normalmente já estão inteiras num vetor. Confira e só complete se faltar.
5. Faça a comparação original × resultado. Aqui a diferença deve ser quase zero.

Os passos de traçado abaixo valem só para o modo **traçado**. Os refinos de consistência (passo 9) valem nos dois modos, mas num vetor original eles mudam o desenho do cliente: no modo preparação, aplique só os que o coordenador aprovar.


## O que você entrega (em `logos/<escola>/saida/`)

1. `<escola>-logo-vetor.svg`: SVG 1:1 com o tamanho do original, fundo numa camada `fundo` e cada peça num grupo `<g id="..." inkscape:label="..." inkscape:groupmode="layer">`, com nomes em português que descrevam o que a peça é (`brasao`, `livro-esquerdo`, `estrela-1`, `texto-nome-da-escola`, `letra-E` etc.). Se o logo tiver mais de uma versão (com e sem símbolo, por exemplo), gere um SVG para cada.
2. `comparacao-vetor.png`: original | vetor | mapa de diferenças, com a diferença média de cor anotada.
3. Na resposta ao coordenador, informe os caminhos de todos os SVGs gerados ou atualizados: o coordenador sempre os envia no chat.
4. Na resposta ao coordenador, também: as camadas criadas, a diferença média, **a lista de tudo o que foi interpretado** e as perguntas que precisam de decisão.

## Modo traçado (imagem): processo

1. **Abrir o original no navegador embutido.** Sirva a pasta da escola com `python -I ferramentas/servidor.py "logos/<escola>"` (em segundo plano) e carregue `ferramentas/vetorizador/vec.js` numa página.
   - **PDF:** carregue o pdf.js do cdnjs. Se a página tiver desenho vetorial (operadores de caminho), extraia os caminhos e cores direto do PDF. É o melhor caso: não há traçado e a fidelidade é total. Se o PDF só contiver uma imagem, renderize essa imagem em alta resolução e siga como imagem.
   - **Imagem pequena:** trabalhe na resolução original. Não aumente com IA.
2. **Diagnóstico.** Meça a cor de fundo e o recorte do logo, e identifique os "materiais": contorno, preenchimentos, textos, detalhes. Imprima perfis de cor em linhas e colunas de interesse para entender a geometria antes de traçar.
3. **Separar peças por campos de cor.** Para cada material, defina um campo contínuo de 0 a 1 (claridade, saturação, "amarelidade", distância ao fundo etc.), em vez de limiares duros. Use componentes conexos para separar as peças e nomeie cada uma pela posição e pela forma.
4. **Traçar.** Use `V.contours` (marching squares subpixel), depois `V.smooth`, `V.rdp` e `V.pathCurve`. Use polígonos retos (`V.pathPoly`) para peças geométricas como faixas, escudos e blocos. Formas que são claramente elipses ou círculos (olhos, bolinhas, estrelas, pontos) viram elipses ajustadas por momentos, com o mesmo centro, área e inclinação.
5. **Contornos de personagens e ilustrações:** cada parte tem o próprio contorno, feito como deslocamento de espessura constante em volta do preenchimento (meça a espessura média no original). Linhas internas entre partes vizinhas também ficam com a mesma espessura.
6. **Partes escondidas** atrás de outras peças são completadas seguindo a geometria visível e sempre listadas como interpretação. Assim cada peça fica um objeto inteiro, que pode ser animado sozinho.
7. **Textos:** trace as letras e mantenha o espaçamento original. Letras repetidas usam o mesmo desenho (o mais nítido), reposicionado. Textos muito pequenos ou borrados entram como pergunta ("o texto 'Desde 1985' está ilegível, você tem o nome exato ou a fonte?"). Não invente texto.
8. **Cores:** uma cor única por material, medida pela mediana dos pixels internos (longe das bordas).
9. **Refinos de consistência** (`ferramentas/vetorizador/refinar.js`): peças equivalentes com o mesmo tamanho e espaçamento, alinhamento, elementos simétricos iguais. Registre cada refino com o valor antes e depois.
10. **Verificar:** rasterize o SVG, gere a comparação com mapa de diferenças e amplie as regiões com mais erro (bordas, junções, detalhes pequenos) em PNGs salvos via `/save`. Abra-os com Read e corrija o que estiver errado antes de entregar.

## Lições do caso koala

- Escolha o campo pelo que diferencia os materiais naquela região. Exemplo: contorno cinza sobre um bloco azul escuro se separa por **saturação**, não por claridade.
- Linhas finas (boca) se traçam pelo miolo escuro (nível mais alto no campo).
- Manchas que se encostam por causa do borrão (almofadinhas) se separam com abertura morfológica e depois viram elipses.
- O brilho dos olhos que encosta na borda "morde" o olho. Trace o olho inteiro (escuro + branco) e coloque o brilho como peça separada por cima.
- Peças vizinhas da mesma cor (nariz + boca ligados) se separam no ponto em que a forma afina.
- Não confie em `img.decode()` com o painel oculto. Use `onload`.
