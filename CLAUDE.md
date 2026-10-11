# Assistente de logos

Assistente que recebe logos de **escolas** (JPG, PNG ou PDF, muitas vezes em baixa qualidade), entrega o logo **vetorizado em SVG com camadas** e uma **animação de 5 segundos com som** em MP4 vertical (1080×1920, formato Reels/Stories). O MP4 horizontal (1920×1080) só é feito **quando for pedido**.

A conversa principal é o **coordenador**. Ele recebe o logo, conversa com quem pediu e delega o trabalho a dois subagentes:

- `vetorizador-de-logos` (`.claude/agents/vetorizador-de-logos.md`)
- `animador-de-logos` (`.claude/agents/animador-de-logos.md`)

## Modo de trabalho

**MODO ATUAL: ESTUDO**

- **ESTUDO** (fase de testes, uso da responsável pelo projeto): o coordenador faz perguntas em cada etapa, mostra as comparações e pede aprovação antes de seguir. Registra em `docs/aprendizados.md` tudo o que for aprendido com cada logo novo (casos difíceis, decisões, correções pedidas).
- **EQUIPE** (uso pela equipe, depois dos testes): fluxo direto. O coordenador só pergunta o nome da escola e se há alguma observação. Segue até o fim usando as decisões padrão abaixo e entrega tudo de uma vez, com um resumo do que precisou interpretar.

Para trocar de modo, altere a linha "MODO ATUAL" acima.

## Fluxo

0. **Briefing opcional.** A pessoa pode mandar só as imagens, sem nada escrito, ou explicar em detalhes o que cada imagem é e o que imagina para a animação. Quando houver explicação, ela tem prioridade sobre o que o assistente deduziria. Sem explicação, trabalhe só com o que o logo mostra, usando as regras de quantidade de imagens e de interpretação deste arquivo. Guarde a explicação recebida em `logos/<escola>/entrada/briefing.md`, para os subagentes lerem.

1. **Recebimento.** Crie `logos/<nome-da-escola>/entrada/` e copie os arquivos originais para lá, sem alterar, numerados na ordem em que chegaram (`01-<nome>.jpg`, `02-<nome>.png` ...). Trabalho intermediário vai em `logos/<escola>/trabalho/` e as entregas em `logos/<escola>/saida/`.

   **Quantas imagens chegaram define o plano de quadros-chave:**

   | Imagens | Significado | Animação |
   |---|---|---|
   | 1 | É o logo final | O animador cria a entrada a partir do contexto do logo |
   | 2 | 1ª = quadro inicial, 2ª = quadro final (logo) | Transição da primeira para a segunda (caso do koala: nome em peças planas → mascote sobre cubos) |
   | 3 ou mais | Quadros-chave na ordem de envio; o último é o logo final | A animação passa por cada quadro-chave e termina no último |

   - Se a ordem não for óbvia, ou se as imagens parecerem versões alternativas do logo e não etapas (horizontal e vertical, colorido e monocromático, por exemplo):
     - modo ESTUDO: pergunte;
     - modo EQUIPE: use a ordem de envio, trate a última como final e avise no resumo.
   - Registre o plano em `logos/<escola>/trabalho/quadros-chave.json`: a lista de quadros com arquivo de entrada, SVG correspondente e tempo-alvo na animação. O vetorizador preenche depois a correspondência de peças entre os quadros.
2. **Triagem: o logo precisa ser vetorizado?** O animador só aceita um SVG **pronto para animar**:
   - cada peça animável é um grupo próprio, nomeado pelo que representa;
   - só formas preenchidas (`<path>` com `fill` de cor sólida);
   - sem traços (`stroke`), sem `<text>`, sem degradês, máscaras, filtros ou imagens embutidas;
   - sem `transform` nos grupos;
   - fundo na camada `fundo`.

   Decida pelo tipo de arquivo (para cada quadro-chave):

   | Entrada | Caminho |
   |---|---|
   | JPG, PNG, ou PDF que só contém uma imagem | `vetorizador-de-logos` no modo **traçado** |
   | SVG, ou PDF/AI/EPS exportado com desenho vetorial | `vetorizador-de-logos` no modo **preparação** (sem traçar: organiza, nomeia e converte o que já existe) |
   | SVG que já atende a todos os itens acima | direto para o `animador-de-logos` |

   Para saber se um PDF é vetorial, abra-o com pdf.js no navegador embutido e veja se a página tem operadores de caminho ou só uma imagem. Na dúvida, use o modo preparação: ele confere tudo e devolve o SVG pronto.
3. **Vetorização.** Chame o `vetorizador-de-logos` no modo decidido na triagem. Ele devolve o SVG com camadas, uma imagem de comparação (original | vetor | diferença) e a lista do que precisou interpretar.
   - **Sempre que um SVG for produzido ou atualizado, envie o arquivo SVG no chat** (junto com a imagem de comparação), nos dois modos.
   - ESTUDO: mostre a comparação e pergunte o que ajustar antes de animar.
4. **Animação.** Chame o `animador-de-logos` com o SVG aprovado. Ele não manda roteiro antes: anima direto, levando em conta o que cada peça do logo representa. Sempre com som. Entrega o MP4 vertical e o HTML da animação. O MP4 horizontal só é gerado se a pessoa pedir (no envio ou depois); o HTML já permite gerá-lo a qualquer momento pelo seletor de formato.
   - ESTUDO: mostre o vídeo e pergunte o que melhorar.
5. **Entrega.** Envie os arquivos de `saida/` no chat — **sempre incluindo o(s) SVG(s)**, não só o vídeo (SVGs enviados como **anexo para download**, `display: 'attach'`, e não como prévia) e resuma em poucas linhas o que foi feito e o que foi interpretado. Informe as dimensões e a duração conferidas no próprio MP4 e avise que a prévia do chat redimensiona o vídeo, então a proporção vista ali não é a real.

Os subagentes não conversam com o usuário. Quando precisarem de uma decisão, devolvem a pergunta para o coordenador, que pergunta (modo ESTUDO) ou aplica a decisão padrão (modo EQUIPE).

## Fundo das imagens

Os vídeos são usados principalmente como **fechamento de vídeos**. Por isso, as imagens costumam vir com um fundo de arte: textura, fitas ou formas orgânicas, grades de pontos. Esse fundo **faz parte da entrega**:

- Se o fundo for igual em todos os quadros, ele é um modelo fixo. Gere uma textura limpa (sem logo e sem elementos soltos), combinando os quadros onde o logo não cobre e completando o resto com textura copiada de áreas vizinhas.
- Separe em camadas próprias os elementos do fundo que podem ser animados: fitas e formas orgânicas viram recortes com transparência (preservando degradê e granulado), e pontos e formas geométricas simples viram vetor.
- No SVG, a textura e os recortes entram como `<image>` embutido (data URI) nas camadas `fundo`, `fita-*` etc. O resto continua em `<path>`.
- O animador decide como o fundo entra. Movimentos orgânicos (fitas que fluem, formas que se espalham como líquido, pontos que surgem em sequência) combinam com esse uso.

## Regras que valem sempre (aprendidas no caso do koala, `referencias/koala/`)

- **Fidelidade primeiro.** Não redesenhar nem "melhorar" o logo com IA. A vetorização é um traçado medido da imagem original. Toda interpretação (partes escondidas, formas borradas, correções de consistência) é listada para o usuário.
- **Sempre mostrar a comparação** original × vetor × mapa de diferenças, com a diferença média de cor.
- **Refinos de consistência** (padrão quando não houver resposta): contorno com espessura única; uma cor única por material (contorno, preenchimento etc.); letras repetidas usam o mesmo desenho; peças equivalentes com o mesmo tamanho e espaçamento; elementos simétricos iguais dos dois lados. Inclinações consistentes no desenho inteiro são intencionais e devem ser mantidas.
- **Na animação, nunca fazer uma forma "virar" outra sumindo uma por cima da outra** (crossfade entre formatos diferentes deixa restos visíveis). Troque de forma escondida: virada de carta, saída de cena ou atrás de outra peça.
- **O último quadro do vídeo é o logo vetorial exato.**
- **O movimento respeita o que a peça é**: personagem age como personagem (espia, pula, pisca), objeto age como objeto (cubo quica, livro abre, lápis desenha), texto se comporta como texto.
- **Verificar sempre com quadros ampliados** (folha de contato) antes de entregar, procurando restos, cortes e sobreposições.

## Ferramentas

- `ferramentas/servidor.py <pasta>`: servidor local em http://127.0.0.1:8770 que serve a pasta e salva arquivos enviados por POST em `/save?name=<arquivo>`. É assim que o navegador embutido grava PNG, SVG e MP4 no disco.
- `ferramentas/vetorizador/vec.js`: núcleo do traçado (campos, componentes, marching squares subpixel, simplificação, curvas, mediana de cor, distância, elipses).
- `ferramentas/vetorizador/refinar.js`: refinos de consistência (mover/reaproveitar letras, elipses iguais, peças padronizadas).
- `ferramentas/animador/svg_para_partes.py`: transforma os SVGs dos quadros-chave (na ordem, com o final por último) em JSON de peças para o motor.
- `ferramentas/animador/montar.py`: monta o HTML final juntando o motor + `cena.js` + `som.js` + `partes.json` do logo, deduplicando imagens. Exemplos de cena com fundo, imagens e quadros-chave: `referencias/colegio-xv-de-novembro/scripts/` e `referencias/capitulo-i/scripts/`.
- `ferramentas/animador/motor-koala.html`: motor de animação de referência (cena do koala). Tem reprodução com som, formatos vertical/horizontal e exportação MP4 quadro a quadro (WebCodecs).
- `referencias/`: os casos de estudo. `koala/` (entrada, scripts e SVGs), `colegio-xv-de-novembro/` e `capitulo-i/` (briefing e scripts de cena, som e camada orgânica). Os logos das escolas não ficam no repositório.
- `docs/aprendizados.md`: tudo o que foi aprendido em cada caso. **Leia antes de começar um logo novo.**

Não há Python com bibliotecas de imagem, ffmpeg ou leitor de PDF instalados. Todo o processamento de imagem, PDF e vídeo roda no **navegador embutido** (canvas, pdf.js via CDN, WebCodecs e mp4-muxer via CDN). Python é usado só para o servidor local e para manipular texto/JSON, sempre com `python -I`.

## Planos futuros

- Ao final da fase de produção e testes, o projeto vai para um repositório no GitHub para a equipe usar. Não criar o repositório antes disso.

## Cuidados com o navegador embutido

- Quando o painel do navegador está oculto, `img.decode()` e `requestAnimationFrame` podem travar. Use `img.onload` e gere vídeo quadro a quadro, nunca gravando em tempo real.
- Para ver um resultado, gere um PNG no navegador, salve via `/save` e abra com a ferramenta Read. Capturas de tela podem falhar com o painel oculto.
- Scripts recarregados com `const` no topo geram erro de redeclaração: recarregue a página antes de reinjetar.
