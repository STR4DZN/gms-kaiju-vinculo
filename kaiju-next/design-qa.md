# Revisão visual atual

A revisão viva v2 de 30/09/2026, solicitada pelo usuário, substitui a exigência anterior de preservar o radar e o resumo. Veja `MOTION_REVIEW.md` para pesquisa, mudanças, cores e validação.

# Comparação visual — K-03 / Kaiju

final result: passed

## Referência e estado

Fonte visual: `preview/Script_Original_K03.jpg` e `preview/Comparacao_Script_980.jpg`, capturadas nesta revisão ao renderizar o script do usuário `Texto colado.txt`, K-03 v5.1.0. Apenas o renderizador de leitura foi executado; nenhuma operação da macro sobre os diários.

Implementação: `preview/Modulo_Kaiju_Restaurado.jpg` (moldura funcional) e `preview/Comparacao_Modulo_980.jpg` (leitura isolada, após ajuste final). Estado em ambas: Mika Shiro, eixos 48/62/75, resumo 62/73/27/27, estágios III/IV/IV.

Navegador: viewport CSS 1363 × 936, DPR 1. Capturas amplas: 1363 × 936. Comparação normalizada: largura da leitura 980 CSS px, altura 1023,96875 CSS px em ambos os renderizadores; capturas completas 1363 × 1024 px. Sem redimensionamento ou normalização de densidade. O scroll vertical é esperado em ambos. A moldura do módulo acrescenta seleção de portadores, abas e persistência, ausentes na página estática da macro.

## Histórico da comparação

1. [P1] A versão rejeitada (`preview/Versao_Anterior_Rejeitada.jpg`) eliminava radar, resumo, padrões de canal, telemetria e seis ícones de estágio. Não preservava a referência. Corrigido adaptando os renderizadores e vetores originais para `src/readout.ts` e a moldura do terminal para CSS escopado. Evidência posterior: `preview/Modulo_Kaiju_Restaurado.jpg`.
2. [P2] A leitura inicial recuperada herdava line-height 1.5 da aplicação e crescia 20,67px na largura de 980px. Evidência: `preview/Comparacao_Modulo_Antes_Ajuste.jpg`, altura 1044,640625px. Corrigido isolando a leitura com font-size 16px e line-height normal, como a referência renderizada. Evidência posterior: `preview/Comparacao_Modulo_980.jpg`, altura idêntica à referência.
3. Comparação final: fonte e implementação abertas juntas no mesmo conjunto visual, tanto no painel completo normalizado quanto no recorte dos canais (`preview/Detalhe_Script.jpg` e `preview/Detalhe_Modulo.jpg`, 981 × 388px). Nenhuma diferença P0/P1/P2 pendente no escopo desta restauração.

## Superfícies verificadas

- Tipografia: Arial/Arial Narrow e Consolas nas mesmas posições, tamanhos e hierarquia do script renderizado. O script referencia Roboto Condensed, porém ela não está instalada na referência nem na prévia; ambos usam o mesmo fallback. O line-height da leitura não herda o da moldura.
- Espaçamento: padding 13px, gap 9px, cortes angulares, painel de radar 164px, três painéis verticais e trilhas de seis estágios preservados. A largura e altura normalizadas conferem. A sidebar e o cabeçalho são controles acrescentados pelo módulo.
- Cores: vermelho #e85d48, verde-água #4ac8b7, azul #78abe1; gradientes e padrões adaptados diretamente da referência. Contenção e métricas seguem os valores do script.
- Recursos: vetores de radar, fundo, varredura e telemetria extraídos do script original, sem geração de substitutos. Font Awesome Free, com todos os 18 ícones existentes. Nenhum renderizador de DNA. A posição da varredura varia entre capturas devido à animação e não é desvio de layout.
- Conteúdo: títulos e ícones revisados conforme pedido anterior; leitura preserva eixos e faixas. LIVE FEED virou LEITURA VISUAL e a versão indica 0.1.0. Não são regras ou efeitos adicionais de jogo.

## Interações verificadas no navegador

- Aba Controles do mestre: 48 → 100, estágio VI e ícone biohazard, atualização de radar/resumo ao voltar à aba Vínculo, salvamento e retorno a 48.
- Perspectiva jogador: somente os dois registros compartilhados, ausência da aba Controles e zero campos data-percent/data-range/data-field. Leitura com três indicadores sem edição.
- Janela compacta: 520px, seletor de portador, radar/resumo empilhados, controles persistentes acessíveis; scrollWidth igual ao clientWidth nos contêineres da leitura. Evidência: `preview/Modulo_Kaiju_Compacto.jpg`.
- Prévia independente gerada: aberta em uma nova aba, com os recursos incorporados e zero erros no console. `preview/Modulo_Kaiju_Restaurado.jpg` foi atualizada com a captura final do arquivo entregue.
- Tipagem estrita e dez testes de validação, permissão, persistência e integração simulada passaram.

## Limites e acompanhamento

A revisão passa para a restauração visual e a prévia de navegador. Ainda falta execução numa instância real de Foundry v13, incluindo sincronização entre mestre/jogador, janela nativa, sistema Lancer e HoloSuite real. Não há alegação de compatibilidade verificada. Legendas técnicas de 7–10px foram preservadas do script: aumento de legibilidade é uma possível iteração P3, que deve manter a composição.
