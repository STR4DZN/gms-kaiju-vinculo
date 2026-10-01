# Referências e dependências


- Script original K-03 v5.1.0 fornecido pelo usuário em `Texto colado.txt`: composição do readout e recursos vetoriais de radar, telemetria, fundo e varredura adaptados diretamente em `src/readout.ts`. Não foram incorporadas as operações da macro sobre o diário original.
- Módulo original de STR4 DZN: https://github.com/STR4DZN/gms-kaiju-vinculo — referência para nomes, ícones e faixas dos três eixos. O código original não foi sobrescrito.
- Watermelon UI: https://ui.watermelon.sh/ — referência de interação: continuous-tabs, adaptive-slider, inline-edit, step-indicator e inline-toast. Implementação própria em Handlebars/CSS; não foi incorporado código React da biblioteca.
- Foundry VTT v13: https://foundryvtt.com/api/v13/classes/foundry.applications.api.ApplicationV2.html e https://foundryvtt.com/api/v13/classes/foundry.documents.JournalEntry.html.
- TypeScript 5.9.3: Apache-2.0. Somente desenvolvimento.
- Foundry VTT Types 13.345.1: MIT. Somente desenvolvimento. https://github.com/League-of-Foundry-Developers/foundry-vtt-types
- Handlebars 4.7.8: MIT. Incluído apenas na prévia; o módulo utiliza o Handlebars do Foundry.
- Font Awesome Free 6.7.2: ícones CC BY 4.0, fontes SIL OFL 1.1, código MIT. https://fontawesome.com/license/free — pacote de ícones apenas na prévia; o módulo utiliza o Font Awesome do Foundry.
- Vite 7.1.12 e esbuild 0.25.11: MIT. Somente desenvolvimento.

Os arquivos de licença das dependências são fornecidos nos respectivos pacotes instalados por `npm ci`. Este projeto não redistribui o programa Foundry VTT.

Integração HoloSuite Core: contrato público `HoloSuiteAppRegistration` em `shared/src/index.ts` e registro/hook de `holosuite-core/src/main.ts`, repositório https://github.com/Thuurvdv/HoloSuite, commit 38b825e836ca837210875958b8afd3aa631a033d. Nenhum código ou recurso visual do Core foi incorporado; adaptador independente opcional.

Ícone `assets/icons/kaiju-app.svg`: desenho vetorial original criado para este módulo. A verificação visual da integração usou o renderizador e CSS públicos atuais do HoloSuite Core em um ambiente local separado; nenhum recurso visual do Core foi incluído no pacote.

Correção 0.1.5: cascata de CSS do Foundry v13 documentada em https://github.com/foundryvtt/foundryvtt/issues/6842. Teste de regressão com a folha pública do tag `holosuite-core-v1.0.11` e inspeção de `holosuite-core/src/core-styles.ts`; essa folha não é redistribuída no módulo.
