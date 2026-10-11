# Assistente de logos

Transforma o logo de uma escola em:

- **SVG vetorial** com cada peça numa camada separada;
- **animação de 5 segundos com som**, em MP4 vertical (1080×1920, para Stories e Reels). Se precisar, peça também a versão horizontal (1920×1080, para YouTube e apresentações).

## Como usar

1. Abra esta pasta no Claude Code (app desktop, aba Code).
2. Mande o logo no chat (JPG, PNG ou PDF) e diga o nome da escola.
3. O assistente vetoriza, anima e entrega os arquivos no chat. Eles também ficam salvos em `logos/<nome-da-escola>/saida/`.

## Requisitos

- Claude Code no app desktop, com o navegador embutido. Todo o processamento de imagem e vídeo roda nele.
- Python 3, usado só para o servidor local.
- Internet, para carregar as bibliotecas de PDF e de MP4 via CDN.

## Estrutura

- `CLAUDE.md`: instruções do assistente (coordenador) e modo de trabalho (ESTUDO ou EQUIPE).
- `.claude/agents/`: subagentes `vetorizador-de-logos` e `animador-de-logos`.
- `ferramentas/`: scripts compartilhados (traçado, refinos, motor de animação, servidor local).
- `referencias/`: casos resolvidos que servem de exemplo (scripts de cena e som; os vídeos e os logos das escolas não ficam no repositório).
- `logos/`: um diretório por escola, com `entrada`, `trabalho` e `saida` (ignorado pelo Git, fica só no computador local).
- `docs/aprendizados.md`: registro do que foi aprendido com cada logo.
