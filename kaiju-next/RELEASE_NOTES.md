Kaiju // Vínculo 0.1.5 — Correção do ícone no Foundry v13.

- Corrigida a prioridade do CSS do ícone: somente styles/holosuite.css passa a declarar layer: null no manifest, compatível com as folhas sem camada carregadas pelo HoloSuite Core 1.0.11.
- Reproduzido no Chromium o defeito da 0.1.4 com a importação layer(modules) do Foundry e os estilos reais do Core 1.0.11. Conferidos o novo manifest, Base/Space Police e as duas ordens de carga.
- Mantidos o SVG coral/turquesa, degradês dinâmicos, scanner e dados da versão anterior.
- Consulta de links não detecta as folhas carregadas por @import no Foundry v13; uma lista vazia nesse diagnóstico não significa ausência de CSS.
- Testes e build aprovados. Confirmação visual na mesa real permanece pendente.

Instalação/atualização: https://raw.githubusercontent.com/STR4DZN/gms-kaiju-vinculo/main/kaiju-next/module.json
