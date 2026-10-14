# Kaiju // Vínculo — 0.1.6

Painel de vínculos para Foundry VTT v13, com consulta para jogadores e edição exclusiva do mestre. A versão 0.1.6 aplica ao módulo a interface aprovada no visualizador e mantém as animações anteriores.

## Instalação e atualização

Use este manifesto no instalador de módulos do Foundry:

https://raw.githubusercontent.com/STR4DZN/gms-kaiju-vinculo/main/kaiju-next/module.json

O identificador continua sendo **kaiju-vinculo**. Os registros da base 0.1.5 permanecem compatíveis. O módulo legado **gms-kaiju-vinculo** é um pacote separado; esta base não importa seus registros automaticamente.

Abra Kaiju pelo HoloSuite Core, pelas definições do módulo ou pelo botão do diretório de Atores. Macro opcional:

```js
game.modules.get("kaiju-vinculo").api.open();
```

## Interface

- Retrato vertical à esquerda, nome centralizado à direita e descrição/anotações abaixo do nome.
- Imagens ajustadas ao espaço com `object-fit: contain`.
- Três colunas para Influência Kaiju, Sincronia e Identidade Humana; números sólidos sem recorte.
- Paleta escura com vermelho, turquesa e índigo, mantendo a saturação até 100%.
- Texturas leves em CSS e molduras vetoriais.
- Dezoito símbolos; os três símbolos máximos usam os desenhos aprovados.
- Movimentos anteriores de navegação, molduras, contornos e sinais. As animações articuladas experimentais e o inspetor foram retirados.
- Pausa dos símbolos fora da área visível, com a página oculta, em diálogo e com movimento reduzido.

As abas Vínculo, Estágios e Registro permitem consulta. Controles, criação, campos e salvamento são exclusivos do mestre. A edição das anotações atualiza o cabeçalho imediatamente. Salvar publica os campos alterados; Descartar recupera o registro salvo.

## Dados

Os três eixos usam valores inteiros de 0 a 100. Limiares: I 0–19, II 20–39, III 40–59, IV 60–79, V 80–99, VI 100. Os indicadores não criam efeitos de jogo.

Cada portador utiliza um JournalEntry nativo com flag `kaiju-vinculo.carrier`, schema 1 e permissões do Document. Compartilhar define consulta para jogadores; a edição continua restrita ao mestre. O salvamento envia somente os campos alterados. Campos modificados remotamente geram conflito; atualizações simultâneas continuam sujeitas ao comportamento normal dos Documents do Foundry.

## Prévia e desenvolvimento

O pacote de fonte da release inclui `preview/Modulo_Kaiju_Previa.html`, independente e com exemplos locais. O retrato fictício de Mika acompanha apenas a demonstração; não faz parte do pacote instalável.

Use Node.js 24 e npm:

```bash
npm ci
npm run dev
npm test
npm run package
```

`npm run package` verifica TypeScript e gera o bundle ES2022, os estilos, fontes e o ZIP instalável. O Foundry fornece Handlebars e Font Awesome em execução. Nenhum serviço externo é necessário para renderizar os símbolos ou as texturas.

A integração HoloSuite e sua correção de camada CSS foram preservadas: apenas `styles/holosuite.css` declara `layer: null` no manifesto.

Veja `VALIDACAO.md` para as verificações e `THIRD_PARTY.md` / `LICENSES` para os créditos. A execução nesta rodada foi em testes e na prévia de navegador; a confirmação no mundo real do Foundry fica a cargo da mesa.
