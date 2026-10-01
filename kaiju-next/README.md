# Kaiju // Vínculo — 0.1.5

Primeira base da reconstrução do Módulo Kaiju, em TypeScript com modo estrito, compilada para JavaScript ES2022. Interface em Handlebars e CSS. Sem React ou serviço externo em tempo de execução.

## O que funciona nesta etapa

- Criar portadores e selecionar registros.
- Ajustar os três eixos em inteiros de 0 a 100, com slider ou entrada numérica.
- Trocar ícone e rótulo conforme os seis estágios, com títulos e ícones revisados para a temática Kaiju.
- Consultar o dossiê visual do portador, a telemetria de cada eixo e o mapa completo de estágios.
- HUD classificado K-03 inspirado nas referências fornecidas: retrato com scanner, molduras angulares e seis ícones por canal.
- Degradês em famílias cromáticas estáveis; o preenchimento revela mais da faixa conforme a porcentagem aumenta.
- Aba Controles exclusiva do mestre; a aba Vínculo usa a mesma leitura visual para mestre e jogador.
- Editar nome, designação, retrato e anotações compartilhadas.
- Salvar, descartar alterações e manter rascunhos ao trocar de portador.
- Compartilhar consulta com todos os jogadores; somente o mestre recebe campos, sliders e ações de edição. Jogadores veem valores, indicadores, estágios e anotações como texto.
- Aplicativo Kaiju no HoloSuite Core, quando instalado e ativo, com emblema vetorial exclusivo de Kaiju em coral/turquesa e abertura do mesmo painel.
- Prévia independente, com três portadores de exemplo e perspectiva mestre/jogador.

As faixas originais são I: 0–19, II: 20–39, III: 40–59, IV: 60–79, V: 80–99 e VI: 100. As faixas e as chaves salvas continuam iguais. Os títulos visíveis agora são Influência Kaiju (`vontade`), Sincronia (`comunhao`) e Identidade Humana (`humanidade`); rótulos e ícones dos estágios foram revisados. Os indicadores não calculam efeitos de jogo.

## Instalação manual para teste

Para conhecer a interface antes de instalar, abra `preview/Modulo_Kaiju_Previa.html` no navegador. O arquivo incorpora código, estilos e fontes; não precisa de npm ou internet. Ele contém os dados de demonstração, não os registros do mundo. Os controles do cabeçalho alternam largura da janela, perspectiva de consulta e motion. Também permitem restaurar os exemplos.

Alvo: Foundry VTT **v13**, com `minimum: 13`, `verified: 13.351` e `maximum: 13` no manifest. A versão 13.351 é a compatibilidade declarada para esta entrega. Os testes automatizados e o build não substituem a validação completa dentro do Foundry. A prévia de navegador utiliza os mesmos template, controlador e renderizador, mas simula a persistência e o usuário.

1. Extraia `instalar/kaiju-vinculo-0.1.5.zip` na pasta `Data/modules/` do Foundry.
2. Confirme a estrutura `Data/modules/kaiju-vinculo/module.json`.
3. Reinicie o Foundry, abra o mundo e ative **Kaiju // Vínculo** em Gerenciar módulos.
4. Abra Configurar definições → Definições de módulos → Kaiju // Vínculo → Abrir Módulo Kaiju. Também há um botão no diretório de Atores, quando o sistema usa o cabeçalho padrão.
5. Se utilizar HoloSuite Core, ative os dois módulos e abra o aplicativo **Kaiju** no launcher. O registro usa `registerApp` e o hook `holosuite-core.apiReady`, além de uma tentativa no `ready`, sem depender da ordem de carga. O acesso do jogador ao launcher respeita as configurações do próprio HoloSuite; o painel Kaiju sempre consulta a permissão nativa dos registros.
6. Como mestre, crie um portador, ajuste valores na aba Controles e salve. Na aba Registro, marque compartilhar, salve e confira a consulta com um jogador.

Uma macro opcional:

```js
game.modules.get("kaiju-vinculo").api.open();
```

O novo módulo tem identificador diferente de `gms-kaiju-vinculo`. Os arquivos e o banco do módulo antigo não são alterados. Esta etapa não importa os registros antigos automaticamente. Instale a nova base com o manifest https://raw.githubusercontent.com/STR4DZN/gms-kaiju-vinculo/main/kaiju-next/module.json. Desative o módulo antigo ao utilizar esta base.

Na 0.1.5, somente `styles/holosuite.css` declara `layer: null` no manifest. O Foundry v13 envolve as outras folhas na camada `modules`; o HoloSuite Core 1.0.11 carrega suas folhas por links sem camada. Essa declaração permite que o CSS específico do Kaiju substitua a máscara genérica sem alterar os outros aplicativos. Consultar apenas links com “kaiju” não detecta as folhas incorporadas por `@import` no Foundry.

## Estrutura e persistência

```text
src/domain.ts               regras, validação e alterações de campos
src/foundry-repository.ts   adaptação para Documents do Foundry
src/local-repository.ts     dados de demonstração da prévia
src/main.ts                 janela nativa ApplicationV2 e entrada do módulo
src/panel.ts                interação e estado dos rascunhos
src/readout.ts              leitura dos três canais
src/palette.ts              famílias cromáticas estáveis e intensidade da superfície
src/holosuite.ts            registro opcional do aplicativo no launcher
templates/panel.hbs         composição da interface
styles/kaiju.css            estilos limitados ao módulo
tests/                     testes de regras e persistência
dist/                      arquivos compilados para instalar
```

Cada portador utiliza um JournalEntry nativo, sem páginas de texto, com flag `kaiju-vinculo.carrier`, versão de schema 1 e permissões do Document. Esses registros aparecem no diretório de Diários. Não há uma configuração global contendo todo o banco ou socket personalizado enviando os registros. Esta versão não armazena notas secretas do mestre junto às notas compartilhadas.

O salvamento envia apenas os campos alterados. Edições concorrentes de campos diferentes são preservadas. Alterações remotas já recebidas no mesmo campo geram conflito e permitem descartar/carregar o registro atual. Não há bloqueio transacional no servidor: duas edições do mesmo campo enviadas simultaneamente ainda seguem o comportamento normal do Foundry, com a última atualização prevalecendo.

As strings do usuário passam pelo escape padrão do Handlebars. Os eixos e metadados são validados em tempo de execução, além da tipagem TypeScript. Um registro incompatível é ignorado e reportado no console.

## Desenvolvimento

Node.js 22.18+ ou 24 e npm. As dependências não acompanham o ZIP; use o lockfile:

```bash
npm ci
npm run dev
npm run typecheck
npm test
npm run package
```

`npm run dev` executa a prévia Vite. Os dados de exemplo são gravados no localStorage do navegador, separados dos dados do Foundry. A troca de perspectiva usa esse mesmo conjunto de demonstração; não é uma simulação de proteção no servidor.

`npm run build` gera o módulo em `dist/` e a prévia independente em `preview/`. `npm run package` gera o ZIP instalável e o pacote contendo fonte + instalação em `release/`. Os tipos do Foundry v13 são uma dependência de desenvolvimento; não são incluídos no JavaScript do módulo. A fonte Handlebars é incorporada ao bundle, compilada pelo Handlebars já fornecido pelo Foundry.

## Direção visual

O dossiê K-03 combina as referências fornecidas com os três eixos do projeto. O retrato recebe um scanner em camadas: feixe e rastro com malha transitória, enquadramento, anéis periféricos, amostragem lateral e confirmação. Nome e designação ficam abaixo da imagem; a fotografia permanece estática.

A porcentagem transforma o próprio degradê: quatro tons análogos, pontos de cor e distribuição do fundo evoluem continuamente. Influência mantém vermelho/coral/pêssego; Sincronia, petróleo/turquesa/menta; Identidade, azul/azul gelo. Barras, fundos, molduras e controles refletem o valor atual. Nenhum efeito de jogo foi alterado.

A varredura sai inteiramente pela base e confirma a aquisição; o brilho percorre todo o preenchimento e a abertura das barras termina sem cobertura. Molduras, sinais, órbitas, pulsos, estágio e ações usam movimentos locais. Há até dezoito loops, pausados fora da área visível, em diálogo, página oculta e movimento reduzido. São usados CSS e Web Animations API, sem laço JavaScript por frame.

Na aba Registro, o mestre pode escolher uma imagem pelo FilePicker do Foundry ou informar um caminho/URL. Registros anteriores sem retrato continuam válidos. A prévia permite escolher uma imagem do dispositivo, de até 2 MB, e salvar no armazenamento da demonstração. Ela inclui um retrato fictício gerado para Mika, incorporado apenas ao visualizador; o módulo não inclui personagens de demonstração.

Veja a revisão atual em `HUD_REVIEW.md`. `MOTION_REVIEW.md` e `design-qa.md` documentam revisões anteriores.

Ícones: Font Awesome Free, já disponível no Foundry. A prévia utiliza o pacote npm Font Awesome 6.7.2. Licenças e referências estão em `THIRD_PARTY.md`.

## Validação e próximos passos

Os resultados desta entrega estão em `VALIDACAO.md`. É necessário testar dentro do Foundry v13, com o sistema e os demais módulos usados na mesa: abrir/fechar/reabrir, arrastar/redimensionar/minimizar, consultar como jogador e salvar por dois mestres. A compatibilidade com Lancer ainda não foi verificada.

As próximas etapas são planejar a migração de dados, histórico, ligação com Actor e possíveis efeitos de jogo. Esses recursos ainda não estão implementados.

Os títulos e ícones são compartilhados entre mestre e jogador. Mudanças em rascunho aparecem imediatamente ao mestre; jogadores recebem os valores salvos através dos Documents do Foundry.
