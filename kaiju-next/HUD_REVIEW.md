# Kaiju // Vínculo — degradês dinâmicos e scanner em camadas v5

Revisão visual v5 integrada ao módulo 0.1.3. Publicação autorizada pelo usuário; sem alteração das regras de jogo.

## Degradês que evoluem com a porcentagem

A porcentagem altera quatro tons, posições dos pontos de cor e distribuição do fundo. O resultado não depende somente da largura da barra. Barras, fundos, contornos, molduras de ícones e controles compartilham a paleta do valor atual.

| Eixo | Evolução dentro da família |
|---|---|
| Influência Kaiju | Vermelho profundo/coral → coral quente/pêssego |
| Sincronia | Petróleo/turquesa → turquesa/menta |
| Identidade Humana | Azul profundo/azul aço → azul vivo/azul gelo |

São quatro âncoras análogas interpoladas por canal RGB, com posições contínuas dos pontos de cor. Não há troca para uma família distante ao atingir um estágio. Foram verificados todos os valores de 0 a 100: os tons do mesmo degradê ficam a até 30° da cor principal; a cor principal se mantém a até 22° de sua família inicial. Esses limites descrevem a implementação, não uma regra universal de gosto pessoal.

A comparação de 0/25/50/75/100 foi capturada a partir da própria interface. Em 0%, a barra continua vazia e o fundo ainda mostra a família do eixo.

## Scanner com aquisição, passagem e confirmação

O scanner usa seis instrumentos animados: um feixe com rastro, malha transitória e marcadores nas pontas; enquadramento que converge; anéis externos e internos em sentidos opostos; amostragem lateral; confirmação segmentada após a passagem.

A sequência de 6,4 segundos começa fora do topo, atravessa toda a fotografia, sai completamente pela base e confirma a aquisição antes do reinício. A malha fica na faixa transitória; o retrato não recebe uma grade permanente, texto estampado, filtro ou deslocamento. Nome e designação permanecem abaixo da fotografia. Os anéis ficam na periferia inferior.

## Movimento dos instrumentos

Cada canal tem assinatura em deslocamento, contorno do ícone, brilho percorrendo todo o preenchimento e aquisição do estágio atual. Influência usa um pulso angular, Sincronia uma órbita e Identidade uma expansão do escudo. Entradas escalonadas, abertura completa das barras, deslocamento do indicador das abas, foco/hover e resposta ao valor terminam no estado final.

Há até dezoito loops decorativos quando todos os instrumentos estão visíveis: quatro por canal e seis no retrato. As camadas animam transform/opacidade em regiões delimitadas. Degradês, malha e brilho são texturas estáticas movidas como camadas; a paleta é recalculada somente ao mudar o valor. Não há laço JavaScript por frame, Canvas, WebGL ou partículas. Os efeitos pausam fora da área visível, em diálogo, com página oculta e movimento reduzido; modos Completo/Só navegação/Desligado continuam disponíveis.

## Avaliação e validação

Abra `Kaiju_Visualizador_HUD_v5.html` e mantenha Animações em Completo. Altere percentuais em Controles e volte a Vínculo. O vídeo mostra um ciclo de 6,4 segundos das animações reais do navegador: 144 capturas obtidas avançando deterministicamente os relógios CSS, codificadas em MP4. Ele serve para avaliar composição e percurso; não é uma medição de desempenho em tempo real.

- TypeScript, build e 13 testes passaram.
- 64 verificações de interface no Chromium passaram, sem exceções de página.
- Verificados evolução cromática, preenchimentos, camadas do scanner, alcance do feixe, saída completa e confirmação posterior.
- Verificados salvamento, descarte, rascunhos, retratos, permissões, teclado e pausas de movimento.
- Verificadas larguras de viewport 360, 430, 720, 850 e 1180 px.
- Inspecionadas as fases de aquisição, passagem e confirmação, a comparação cromática e a composição compacta.

Limite: Foundry/HoloSuite usam adaptadores simulados; execução e desempenho na instância real da mesa ainda precisam ser verificados. Página oculta foi testada por simulação de document.hidden e visibilitychange. Não foi medido FPS no computador do usuário.

## Pesquisa aplicada

A direção usa tons análogos e variações de intensidade, com base no guia de degradês da Adobe. A implementação de movimento prioriza transform/opacidade, regiões pequenas e pausas de visibilidade, conforme o guia de desempenho do Motion. As escolhas concretas de composição são específicas deste HUD.

- [Adobe — guia de degradês](https://www.adobe.com/uk/creativecloud/design/discover/color-gradient.html)
- [Motion — desempenho](https://motion.dev/docs/performance)

## Retrato: origem e prompt

Retrato fictício gerado pela ferramenta integrada image_gen; scanner e HUD feitos em código. Cópia usada pelo projeto: `/workspace/scratch/018086edd314/work/kaiju-motion/kaiju-next/assets/mika-pilot.png`.

Prompt final:

Use case: stylized-concept. Asset type: original portrait asset for a fictional classified sci-fi Kaiju bond dossier web interface. Primary request: a striking mature female futuristic mecha pilot, head and upper torso, near frontal pose, black short hair with one silver strand, understated tactical flight suit with small burnt-orange details and dark armored collar, confident solemn expression, entirely fictional. Style: polished semi-realistic painted science fiction game character concept art, detailed face, tactile materials, no comic outlines. Composition: portrait 2:3, head centered, shoulders visible, generous negative space above and around head for scanner overlays to be added in code. Lighting: subdued cinematic cyan rim light on one side, warm coral rim light on other, face clear, dark blue-black background. Constraints: one person, no UI, no scanner, no lettering, no insignia, no logos, no watermarks, no weapons; purely portrait image to be placed into working UI.

Próximo passo: atualizar o módulo na mesa e verificar os efeitos e o desempenho dentro do Foundry.
