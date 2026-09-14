# GMS // Vínculo Kaiju — v2.0.1

Versão 2.0.1 com HUD de biodiagnóstico médico futurista de alta visibilidade, limpeza profunda de ruído visual, ampliação dramática de mostradores vitais e renderizador biomolecular 3D de alta precisão clínica (B-DNA Watson-Crick).

## Correções de fidelidade do DNA

- Base geométrica voltou às proporções do DNA ANALYSIS original:
  - `centerY = 52%`;
  - `R = min(94px, 25% da altura)`;
  - início da hélice em `4.5%` da largura;
  - fim em `82%` da largura;
  - fase-base total de `4π` no viewport (a dev.5 usava aproximadamente `8π` e dobrava a frequência visual);
  - projeção 3D com `scale = 1 + z*0.0008` e deriva de profundidade `z*0.035`;
  - 120 amostras dos backbones;
  - 64 pares de bases;
  - 13 subdivisões por par;
  - 140 nós no plexo molecular;
  - `angle = 0`, `laserPhase = 0` e inclinação-base `-0.05 / 0.02`, como no renderer original;
  - anéis de crista novamente em `abs(sin θ) > 0.52`, satélites em `peak > 0.82` e nós de torção em `abs(sin θ) < 0.22`;
  - cor, espessura e anéis vesiculares novamente calibrados conforme a profundidade do DNA original;
  - scanner dourado restaurado às medidas e intensidades originais.

## Progressão genética

Os valores não substituem mais a hélice-base. A evolução atua em loci localizados e usa uma curva não linear por estágio:

- I–II: assinatura quase íntegra, apenas sinais discretos;
- III: pequenas expressões localizadas;
- IV: alteração anatômica visível;
- V: mudanças estruturais fortes;
- VI: expressão extrema.

Cada eixo agora possui uma família visual própria:

- **Vontade:** hipertrofia local, ramificações e assimetria predatória;
- **Comunhão:** malhas, nós simbióticos e terceira fita progressiva;
- **Humanidade:** travas/estruturas de contenção azuis e maior coerência geométrica;
- **Perda de humanidade:** cisalhamento, pares anômalos e rupturas localizadas.

A memória genética continua deixando marcas persistentes sem congelar o estado atual.

## Outras características preservadas

- Portadores em banco próprio do módulo;
- aba de Portadores retrátil;
- editor exclusivo do GM;
- permissões por usuário;
- histórico, notas e memória genética;
- lazy rendering: só o portador aberto executa o Canvas;
- sincronização entre GM e players.


## Regra de fidelidade

Em valores até o fim do estágio III, a matemática central da dupla-hélice permanece igual à do DNA ANALYSIS. As mudanças aparecem como expressões localizadas ao redor da molécula. A partir do estágio IV as próprias coordenadas 3D começam a ser deformadas; V e VI elevam essa deformação de forma não linear. Assim, um portador em `43 / 44 / 58` mantém a silhueta-base, enquanto combinações extremas podem alterar fortemente a anatomia sem trocar o DNA por outro desenho arbitrário.
