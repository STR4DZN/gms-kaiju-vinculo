# Validação atual — degradês dinâmicos e scanner v5

TypeScript, build, 13 testes de dados/adaptação e 64 verificações de interface no Chromium passaram. Foram inspecionadas as fases de aquisição, passagem e confirmação, a composição compacta e a comparação dos degradês de 0 a 100%. Um vídeo de um ciclo foi gerado a partir dos relógios CSS reais. Veja `HUD_REVIEW.md` para pesquisa, escopo e limites. Execução e desempenho na mesa real de Foundry permanecem pendentes.

Os registros abaixo documentam a versão anterior e não descrevem a interface atual.

# Validação — 0.1.0

Verificações executadas em 30/09/2026:

- TypeScript em modo estrito: passou.
- Bundle JavaScript para o módulo: gerado.
- Prévia independente final aberta em nova aba: sem erros no console. Comparação visual normalizada aprovada em `design-qa.md`.
- Dez testes automatizados: passaram, com falhas reportadas pelo runner Node.
- Limiares dos seis estágios, incluindo 99 e 100: verificados para os três eixos.
- Rejeição de dados inválidos, versão desconhecida e números fora da faixa: verificada.
- Preservação de semente, identidade e campos não editados: verificada.
- Conflito de edição no mesmo campo e mesclagem de campos diferentes: verificados.
- Escape de nome/anotações no template: verificado.
- Adaptador Foundry com Documents simulados: consulta por permissão, edição restrita ao mestre, criação restrita e atualização somente dos campos alterados verificadas.
- Prévia no navegador: edição numérica para 100, troca para o ícone/estágio VI, salvamento, descarte, criação de portador em zero, seleção de registros e navegação por teclado nas abas verificados.
- Perspectiva jogador na prévia: registros restritos ausentes; três indicadores de leitura, valores em texto, ausência de sliders, campos de edição, formulários de criação e salvamento; aba Registro exibe texto.
- Composição do terminal K-03 v5.1.0 recuperada a partir do script fornecido; radar, resumo, telemetria e trilhas de seis ícones renderizados. Nenhum renderizador de DNA.
- Nesta revisão: aba Controles exclusiva do mestre; edição de 48 para 100, troca para VI, resumo/radar recalculados, salvamento e restauração para 48 na prévia.
- Jogador: somente os dois portadores compartilhados aparecem, aba Controles ausente e zero campos de edição no DOM.
- Todos os 18 ícones de estágios existem como recursos solid no Font Awesome Free instalado.
- Adaptador HoloSuite com API simulada: ausência do Core não bloqueia o painel, mesmo objeto de API não duplica registro, registro rejeitado pode ser tentado novamente, aplicativo possui visibilidade de jogador e abre o painel.
- Composição ampla e compacta de 520px: inspecionadas. Janela compacta utiliza seletor de portador e rolagem vertical; não apresentou rolagem horizontal no painel.

Limite da validação: **nenhum teste foi executado dentro de uma instância real do Foundry VTT**. A tipagem usa as definições comunitárias da versão 13.345.1. A prévia simula persistência e usuário. As permissões reais entre clientes, o comportamento da janela nativa e a integração real com HoloSuite, a compatibilidade com Lancer e outros módulos continuam pendentes de teste na mesa.

Esta entrega é uma base inicial para avaliação, não uma substituição completa de todos os recursos do módulo 2.0.2.
