# GMS // Vínculo Kaiju — 2.0.0-dev.4

Aplicação K-03 independente de Journal para Foundry VTT v13.351, com banco próprio de portadores e análise xenogenômica procedural.

## Arquitetura funcional

- Tela própria para GM e players.
- Aba de **Portadores retrátil**, com pesquisa, ordenação e carregamento individual.
- Apenas o portador aberto recebe a renderização pesada do DNA.
- Editor K-03 exclusivo do GM: criar, editar, apagar, reordenar, vincular usuários e controlar visibilidade.
- Banco interno em `game.settings` de mundo; nenhum `JournalEntry` é usado.
- Sincronização entre clientes pelo socket do módulo.
- Histórico automático para alterações de Vontade, Comunhão e Humanidade.
- Estado da sidebar e último portador aberto são lembrados por usuário.

## dev.4 — Xenogenomic Canvas

A `dev.4` abandona o DNA em SVG da `dev.3`. A nova análise usa um renderer procedural em **Canvas 2D com geometria tridimensional projetada**, seguindo a linguagem técnica do console `DNA ANALYSIS` do projeto `STR4DZN/teste-hud`, mas conectado aos dados reais do Vínculo Kaiju.

### Renderer molecular

- 128 amostras por backbone, com duas fitas projetadas em 3D.
- 64 pares de bases.
- 12 micro-pérolas internas por par de base.
- Nós volumétricos, anéis vesiculares, anéis satélite e constrições nos cruzamentos.
- Plexo molecular de fundo com até 140 nós móveis e conexões pré-calculadas.
- Z-sort para que estruturas traseiras e dianteiras tenham profundidade coerente.
- Scanner dourado contínuo com halo, núcleo branco e reação local.
- Faíscas e partículas geradas quando o scanner encontra a molécula.
- Paralaxe tridimensional sutil ao mover o mouse sobre o DNA.
- Fidelidade adaptativa: se o cliente sustentar frames lentos, o renderer reduz amostras secundárias sem remover a morfologia principal e volta ao nível máximo quando o desempenho estabiliza.
- Clique no DNA alterna a velocidade de rotação e dispara uma excitação molecular local.

### Evolução visual real

A geometria não é fixa. O renderer recebe a seed, os três eixos, a memória genética e as mutações do portador.

- **Vontade:** altera raio local, assimetria, nós, espessura e cria ramificações orgânicas reais.
- **Comunhão:** cria malhas externas, pontes de ressonância e pode manifestar uma terceira fita parcial/completa.
- **Humanidade baixa:** aumenta deformações, irregularidade de pares, assimetria e rupturas reais no backbone.
- **Seed:** define onde hotspots, ramificações, rupturas e estruturas persistentes aparecem; dois portadores com os mesmos valores continuam visualmente diferentes.
- **Memória genética:** preserva marcas de limiares já atravessados e adiciona anéis/marcas persistentes na estrutura.

### Console K-03

A tela de análise foi refeita como um console xenobiológico completo, não como cards de dashboard:

- header nativo do Foundry ocultado;
- top bar própria K-03, arrastável;
- scanlines CRT e vignette;
- sidebar de portadores integrada à carcaça e retrátil;
- dials laterais para Fera, Comunhão e Humanidade;
- retículo molecular animado;
- telemetria e memória estrutural;
- réguas laterais no viewport;
- bloco de ressequenciamento;
- matriz inferior de códons;
- leituras técnicas e códigos gerados a partir da seed;
- abas funcionais para análise ao vivo, memória genética, estágios, histórico e notas.

## Acesso

O botão `K-03 // Vínculo Kaiju` aparece no diretório de Atores.

Também pode ser aberto por API:

```js
game.modules.get("gms-kaiju-vinculo").api.open();
```

Editor do GM:

```js
game.modules.get("gms-kaiju-vinculo").api.openEditor();
```

## Compatibilidade

- Foundry VTT: mínimo `13.341`
- Verificado para `13.351`
- Sem dependências externas obrigatórias
- Sem Journal
- Sem imagens pesadas para o DNA; o visual central é procedural
