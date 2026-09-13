# GMS // Vínculo Kaiju

Módulo para Foundry VTT v13.351 convertido a partir da macro **VÍNCULO KAIJU — Gerenciador de Vontade, Comunhão e Humanidade**.

## Instalação manual

1. Extraia a pasta `gms-kaiju-vinculo` em `FoundryVTT/Data/modules/`.
2. Reinicie o Foundry.
3. Ative **GMS // Vínculo Kaiju** em Gerenciar Módulos.
4. Em Configurações do Módulo, confirme o UUID do Diário principal.

O UUID padrão preservado da macro é:

`JournalEntry.wVaD3Qgcpv8Cbldq`

## Como abrir

- Como GM, abra o diretório de Diários e use **K-03 // Vínculo Kaiju**.
- Ou execute no console/macro:

```js
game.modules.get("gms-kaiju-vinculo").api.openManager();
```

Também existe o alias global:

```js
GMSKaijuVinculo.openManager();
```

## Compatibilidade com os registros existentes

A versão 1.0.0 preserva a lógica original da macro: os valores ainda podem ser lidos do card HTML existente e a página continua sendo atualizada com a skin completa. Isso permite instalar o módulo sem migrar previamente os Journals atuais.

## Estrutura

- `module.json` — manifesto do Foundry.
- `scripts/main.js` — inicialização, API e integração com o diretório de Journals.
- `scripts/settings.js` — configurações do mundo/cliente.
- `scripts/constants.js` — IDs e versão.
- `scripts/manager.js` — núcleo K-03 preservado da macro original.
- `styles/module.css` — estilo dos controles adicionados pelo módulo.

## Próxima refatoração recomendada

Depois de validar esta versão dentro do seu mundo, o passo seguinte é mover os dados de Vontade/Comunhão/Humanidade para `flags.gms-kaiju-vinculo` nas páginas e separar `manager.js` em serviços de dados, renderizadores, UI e telemetria. O parser de HTML pode continuar como fallback de migração.
