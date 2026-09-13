# GMS // Vínculo Kaiju — 2.0.0-dev.2

Nova arquitetura independente de Journal, agora com o primeiro núcleo do **Genoma Procedural K-03**.

## O que já existe

- Matriz K-03 própria para GM e players.
- Lista de portadores leve e retrátil.
- Carregamento visual de apenas um portador por vez.
- Pesquisa e ordenação da lista.
- Lembra por usuário o último portador aberto e o estado recolhido/expandido da aba.
- Ficha detalhada com radar, Vontade, Comunhão, Humanidade, leitura e estágios.
- Editor K-03 separado e exclusivo do GM.
- Criar, editar, apagar e reordenar portadores.
- Vincular usuários do Foundry a cada portador.
- Visibilidade para todos ou somente usuários vinculados.
- Histórico automático quando os três valores são alterados.
- Banco próprio via world setting; nenhum JournalEntry é usado.
- Sincronização entre clientes pelo socket do módulo.

## Genoma Procedural K-03

- Cada portador recebe uma **seed genética determinística própria**.
- O DNA é SVG procedural: não usa PNG nem imagem externa.
- Vontade, Comunhão e Humanidade alteram a própria morfologia da hélice.
- A seed muda fase, frequência, amplitude, microcurvas, distribuição de bases, loci, partículas, pontos de mutação e posições de estruturas derivadas.
- Vontade pode criar ramificações, nós e assimetria predatória.
- Comunhão pode criar malhas, pontes ressonantes e filamentos paralelos.
- Perda de Humanidade pode gerar desvios, pares anômalos, rupturas e perda de simetria.
- Combinações altas podem gerar uma fita adicional parcial; ela aparece de forma gradual, não como troca binária.
- Existe uma **memória genética permanente** separada do estado atual:
  - maior Vontade já atingida;
  - maior Comunhão já atingida;
  - menor Humanidade já atingida.
- Cruzamentos de limiar posteriores à linha de base geram registros permanentes de mutação.
- Aba `Genoma` mostra análise ampliada, loci, estruturas derivadas e registro dos marcos genéticos.
- `Visão geral` já usa o DNA como elemento visual central, deixando radar e métricas como telemetria secundária.

### Regra importante

Um registro criado em `0 / 0 / 0` é considerado **não ativado**. A primeira leitura diferente de zero estabelece a linha de base genética. Isso evita que um portador recém-criado seja tratado como tendo perdido toda a Humanidade antes mesmo de ser configurado.

## Acesso

O módulo adiciona o botão `K-03 // Vínculo Kaiju` ao diretório de Atores para todos os usuários.

Também pode ser aberto via console/API:

```js
game.modules.get("gms-kaiju-vinculo").api.open();
```

Somente o GM pode abrir:

```js
game.modules.get("gms-kaiju-vinculo").api.openEditor();
```

## 2.0.0-dev.3 — DNA Live Array

- O painel genético foi reconstruído para aproximar a composição da referência: DNA central dominante, malha analítica, partículas, leituras compactas e loci inferiores.
- A hélice agora ocupa a maior parte do painel e muda estruturalmente conforme Vontade, Comunhão, Humanidade e memória genética.
- Foram adicionados hotspots determinísticos por portador, assimetria local, deformação harmônica, pares anômalos, rupturas, nós, ramificações orgânicas, malhas simbióticas e terceira fita.
- Animação multicamada: respiração do conjunto, pulsação das fitas, traços de energia, varredura, partículas em deriva, pulsos de nós, malhas, rede molecular e tracers que percorrem as fitas.
- A coluna lateral foi reduzida para devolver área visual ao DNA; os indicadores secundários agora ficam numa faixa compacta acima da análise.
- O DNA continua sendo renderizado apenas para o portador aberto.
