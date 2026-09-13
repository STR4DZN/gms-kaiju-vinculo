# GMS // Vínculo Kaiju — 2.0.0-dev.1

Primeira versão da nova arquitetura independente de Journal.

## O que já existe

- Matriz K-03 própria para GM e players.
- Lista de portadores leve e retrátil.
- Carregamento visual de apenas um portador por vez.
- Pesquisa e ordenação da lista.
- Lembra por usuário o último portador aberto e o estado recolhido/expandido da aba.
- Ficha detalhada com radar, Vontade, Comunhão, Humanidade, leitura e estágios.
- Abas de Visão Geral, Estágios, Histórico e Notas.
- Editor K-03 separado e exclusivo do GM.
- Criar, editar, apagar e reordenar portadores.
- Vincular usuários do Foundry a cada portador.
- Visibilidade para todos ou somente usuários vinculados.
- Histórico automático quando os três valores são alterados.
- Banco próprio via world setting; nenhum JournalEntry é usado.
- Sincronização entre clientes pelo socket do módulo.

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
