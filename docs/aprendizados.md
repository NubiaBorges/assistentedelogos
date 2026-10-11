# Aprendizados por logo

Registro da fase de estudo. Para cada logo: o que chegou, o que deu trabalho, as decisões tomadas e as correções pedidas. Use estes registros para melhorar os subagentes e as ferramentas.

## 1. Koala (logo infantil, JPG 1080×1920 de baixa qualidade)

**Entrada:** duas versões, só o nome em peças planas e mascote sentado sobre cubos 3D, com fundo lilás liso `#BD9FE9`. Logo pequeno (cerca de 460 px) e borrado pela compressão.

**Vetorização**
- Traçado subpixel por campos de cor. Diferença média final de 5,2 níveis de cor (de 0 a 255), quase toda nas bordas borradas do original.
- Pedidos da usuária: contorno com espessura padrão (5 px, média medida). Feito como deslocamento do preenchimento de cada parte, incluindo as linhas internas.
- Refinos aprovados: os dois "A" com o mesmo desenho; blocos com a mesma largura e altura; letras centralizadas nos blocos; olhos, brilhos e bochechas iguais dos dois lados; peças do nome alinhadas, do mesmo tamanho, com raio de canto de 10 px e espaçamento igual.
- Mantido: leve inclinação do rosto (consistente, então intencional) e arco da fileira de blocos (perspectiva).

**Animação**
- 1ª versão (recortes do JPG): a usuária rejeitou porque havia alterações visuais e recortes no formato do personagem.
- 2ª versão (vetor): defeito de dois pontinhos no bloco K, causado por crossfade entre a peça arredondada e o cubo.
- 3ª versão (aprovada): peças agacham, saltam e viram no ar como carta para se tornarem cubos; koala espia, olha em volta, pula, senta, balança os pés, inclina a cabeça e pisca. A usuária pediu explicitamente que o movimento leve em conta o que cada peça representa.

**Preferências da usuária (koala)**
- Fidelidade ao logo acima de tudo. Redesenhar é aceitável se o resultado ficar visualmente o mais parecido possível, mas toda interpretação deve ser listada.
- Sempre com som. Sem roteiro prévio.
- Saídas: SVG com camadas, MP4 vertical e MP4 horizontal.

## 2. Colégio Integrado XV de Novembro (3 quadros-chave, JPG 1080×1920 com fundo de arte)

**Entrada:** (1) nome + símbolo em branco, (2) símbolo em branco centralizado, (3) símbolo colorido sobre adesivo branco (final, feito pela usuária). Fundo de fechamento de vídeo idêntico nos três: textura verde-escura, duas fitas orgânicas nos cantos, grades de pontos. Briefing escrito: os brancos são por causa do fundo escuro; o fundo existe porque o vídeo fecha outros vídeos; pode usar motion design orgânico.

**Vetorização**
- Logo branco sobre textura: campo de claridade + desfoque leve do campo antes de traçar, para a textura não fazer a borda tremer. Formas curvas com suavização forte; letras com suavização menor.
- O símbolo do quadro 1 era o do quadro 2 reduzido (escala 0,4605, IoU 0,966): um vetor só para os dois, com a transformação aplicada às coordenadas.
- O símbolo branco e o colorido **não são o mesmo desenho** (XV serifado × sem serifa, ondas diferentes), mas as peças têm os mesmos papéis: mesma nomenclatura nos dois, mais `adesivo` e duas linhas vermelhas no colorido.
- Peças coloridas separadas por classes de cor dentro do adesivo (limão: G alto e B baixo; escuro: claridade baixa e R-G negativo; vermelho: R-G alto). Cor de linhas finas pela mediana do núcleo saturado, não da linha inteira.
- Texto: a fonte instalada mais próxima (Tahoma Bold, IoU 0,8) era mais grossa que o original. A usuária preferiu manter o texto traçado. Uma camada por palavra.
- Fundo: textura limpa combinando os quadros (onde o logo não cobre) + cópia deslocada de textura para os buracos. Fitas detectadas por G-B (verde puro × fundo verde-azulado), recortadas com alfa e cor desmisturada. Pontos viram círculos vetoriais. A usuária quis manter os tamanhos diferentes dos grupos de pontos.
- Diferença média final abaixo de 1 nível de cor nos três quadros.

**Animação (1ª versão)**
- Entrada: fitas fluem dos cantos, pontos surgem em cascata (sons de bolha), arcos giram até o lugar, asas abrem em leque, ondas deslizam, XV aparece, nome sobe palavra por palavra de dentro da linha.
- 1→2: palavras descem para dentro da linha; o símbolo gira uma volta (redemoinho) enquanto cresce até o centro.
- 2→3: frente líquida orgânica (borda ondulada, faixa limão de 30 px) revela adesivo + cores; troca de forma escondida pela frente.
- Formato horizontal: fundo recomposto, com a textura cobrindo a tela e as fitas e pontos ancorados nos cantos e bordas, e o logo com escala 1,2.

**Problemas técnicos encontrados**
- `const top` conflita com `window.top` e `BG` conflitava com uma constante do vec.js. Evite nomes globais genéricos nas cenas.
- Faixa da frente líquida com 16 px parecia uma "minhoca"; com 30 px lê como onda de tinta.

**Retorno da usuária**
- Gostou da animação. O vertical pareceu fora do formato Reels, mas era só a prévia do chat, que redimensiona os vídeos. O arquivo estava em 1080×1920, conferido nos cabeçalhos do MP4 (tkhd e avc1). Nas entregas, informe as dimensões conferidas no arquivo e avise que a prévia não mostra a proporção real.
- O formato horizontal passa a ser gerado só quando for pedido.

## 3. Capítulo I (1 imagem, JPG 1080×1920, logo em adesivo + fundo de arte)

**Entrada:** uma imagem só, que é o quadro final: broto nascendo de livro aberto + "Capítulo I" em adesivo branco. Fundo com degradê texturizado, papel rasgado em cima e embaixo, ondas chapadas, faixa verde texturizada e caminhos tracejados amarelos. Briefing: "formas orgânicas e motion design".

**Vetorização**
- Desenho em estilo pincelada, com camadas sobrepostas: cada peça foi vetorizada como base (cor da borda) + miolo por cima. O livro tem laranja + amarelo; as folhas têm borda verde-viva + miolo verde-azulado + parte de baixo verde-clara; a folhinha foi separada das outras folhas pelo canal vermelho (R alto).
- O laranja de cada página foi atribuído à mancha amarela mais próxima (por distância), separando as páginas que se tocam.
- **Caule (correção pedida):** o 1º vetor (bastão reto, largura constante) foi rejeitado. O original afina de 29 para 22 px, ondula e é verde-azulado em cima, com um filete verde-vivo na borda direita. Solução: bordas medidas linha por linha (pista certa em cada trecho, interpolação onde se funde com a folha e filtro robusto contra saltos) + duas camadas de cor.
- Atenção: duas formas sobrepostas no mesmo `path` com `fill-rule="evenodd"` se cancelam e abrem buraco. Use formas separadas.
- Texto: a Rockwell instalada tinha o mesmo desenho, mas era mais grossa que o original. A usuária preferiu o texto traçado (de novo).
- Com uma imagem só não há como combinar quadros para limpar o fundo. Solução que funcionou: **degradê reconstruído por difusão numa grade reduzida (16 px) + granulado copiado de áreas vizinhas**. Copiar textura direto de outra altura trouxe "fantasmas" com a cor errada.
- Formas chapadas do fundo (ondas, papel) viram vetor; as texturizadas (faixa verde) viram recorte com alfa suave.
- Ao vetorizar camadas que ficam escondidas em repouso, confira se elas aguentam ser animadas: a sombra na base do papel deixou um sulco que só apareceu quando as camadas subiram. Preencha a parte escondida.

**Animação (aprovada para entrega)**
- O cenário se forma (camadas de baixo sobem em ritmos diferentes, papel e faixa entram pelo canto, traços surgem um a um como passos), o adesivo se espalha como mancha líquida com ondas concêntricas, o livro abre pela lombada, o caule cresce de dentro do livro, as folhas se desenrolam a partir do ponto de fixação, as letras sobem em sequência com ênfase no "I", a planta balança com uma brisa, faíscas e brilho.
- Não mova lateralmente camadas que terminam na borda da tela (expõe a borda).

**Retorno da usuária sobre a 1ª animação (não gostou tanto)**
- Pediu que cada elemento se comporte como o que ele é: o papel como papel, o livro com movimento de livro, a pincelada como pincelada. O crescimento do caule ela aprovou.
- O contorno branco atrás do logo **não é um objeto**: é um contorno de legibilidade que ela mesma acrescentou. Ele deve ser tratado assim.
- Lição geral: movimentos genéricos (escalar, subir, espalhar como líquido) não bastam. Antes de animar, pergunte **qual é o material e o gesto natural de cada peça**: papel cai planando e flexiona; livro pousa fechado e abre virando as páginas pela lombada; pincelada é pintada por um pincel com borda de cerdas na direção do traço; texto à mão/tinta é pintado; contorno de legibilidade surge por trás quando o logo já está montado, e sempre **antes** do texto escuro que depende dele para ser lido.

**2ª animação**
- Folha do canto cai planando e balançando; a tira de papel de baixo sobe com uma onda de flexão; o livro pousa fechado e as páginas viram (de baixo e depois de cima, com sombra na virada); o caule cresce (mantido); as folhas são pintadas a pincel do caule até a ponta (borda e depois miolo); o contorno branco surge por trás; as letras são pintadas a tinta; brisa e brilho no final.

**Pedido seguinte: "motion design com formas orgânicas para criar algum diferencial"**
- Camada extra por cima dos comportamentos de material, sempre nas cores da marca:
  1. abertura líquida: três manchas de borda ondulante cobrem a tela no 1º quadro e se recolhem para os cantos em 0,45 s (mais que isso esconde a montagem do cenário);
  2. fitas orgânicas em espiral, com espessura variável e pontas finas, que se desenham (cabeça) e se recolhem (cauda) em volta do logo durante o crescimento;
  3. anéis ondulados quando o contorno de legibilidade surge;
  4. folhinhas subindo do broto e girando (tamanho visível: 1,5 a 2,4× a forma base).
- Tudo termina antes de 4,6 s, e o logo fica limpo no final.
- O código reutilizável está em `ferramentas/animador/organico-exemplo.js` (blobOrg, abertura, fitas, ondas, partículas).
- **Aprovado pela usuária** (versão com material + camada orgânica).
