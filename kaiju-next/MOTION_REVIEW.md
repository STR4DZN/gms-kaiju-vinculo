# Kaiju // Vínculo — visualizador vivo v2

Prévia de revisão, sobre a base 0.1.2. Nenhum push, tag, upload para GitHub ou release foi feito.

## Abrir

Abra `Kaiju_Visualizador_Vivo_v2.html` no navegador. Ele incorpora código, estilos e ícones e não precisa de servidor ou internet. Usa a mesma interface do módulo, com armazenamento de demonstração separado do Foundry. Não altera dados do seu mundo.

O menu “Animações” oferece:

- **Completo:** navegação Motion e instrumentos decorativos em movimento.
- **Só navegação:** entradas, abas e respostas a ações; instrumentos decorativos ficam estáticos.
- **Desligado:** interface estática.

A preferência de movimento reduzido do sistema prevalece. Janela, perspectiva e restauração de exemplos continuam disponíveis.

## O que foi recuperado e acrescentado

A revisão anterior simplificou excessivamente a composição. Esta versão recupera os degradês multicamada, molduras, cores mais fortes e a aparência de instrumentos do K-03. O bloco de apresentação/radar que o usuário pediu para remover continua removido.

| Canal | Cores e moldura | Movimento decorativo |
|---|---|---|
| Influência Kaiju | Vermelho profundo → coral → âmbar; ícone angular | Sinal sísmico em deslocamento e dois pulsos suaves no contorno |
| Sincronia | Azul petróleo → verde água → menta; ícone circular | Ondas em fase e órbita de anéis segmentados |
| Identidade Humana | Azul escuro → azul claro → gelo; ícone em escudo | Sinal de malha e campo de contenção com expansão discreta |

- As barras voltaram a ter degradês e um brilho que percorre apenas sua região preenchida.
- Os contornos diagonais dos ícones agora usam uma moldura externa e um núcleo interno; a borda não é um retângulo cortado.
- Valores percentuais voltaram a ter caixas próprias com bordas e degradês.
- Trilhos de estágios têm bordas coloridas e destaque duplo no estágio atual.
- O estágio VI recebe um acabamento mais forte; o ícone de Influência ganha a forma especial de domínio absoluto.
- Fundo, cabeçalho, seleção de portador, abas, controles, mapa de estágios, botões, formulário e diagnóstico receberam acabamento cromático coerente.
- As transições Motion e as melhorias de navegação da primeira revisão foram mantidas.

## Cuidado com desempenho

Cada canal tem três instrumentos decorativos: sinal, contorno do ícone e brilho da barra. São no máximo nove animações contínuas quando todos os canais estão visíveis. A barra em zero não executa seu brilho.

Os efeitos animam `transform` e/ou opacidade, com ciclos entre 5,8 e 18 segundos. Os degradês, texturas, sombras e cores são estáticos. Não há blur de fundo, partículas, Canvas, renderizador 3D, animação de `box-shadow` ou laço JavaScript por frame. Não foi adicionada biblioteca de animação.

Um IntersectionObserver pausa os instrumentos quando o canal fica fora da área visível. O diálogo de criação pausa a ambientação. A mudança de visibilidade da página interrompe o movimento. Ao fechar ou reconstruir o painel, observadores e animações são limpos. A função de cada eixo continua representada por nome, valor e estágio; o movimento não muda as regras.

Essas escolhas reduzem trabalho desnecessário, mas o modo completo intencionalmente executa animações decorativas em repouso. Não se promete consumo zero, FPS específico ou desempenho equivalente em todos os dispositivos.

## Verificação

- TypeScript e build passaram.
- Os 10 testes existentes passaram.
- 47 verificações no Chromium passaram, sem exceções de página.
- Checados os fluxos existentes de edição, estágio VI, salvamento, descarte, rascunhos, seleção, criação, busca, permissões da visão de jogador, navegação por teclado e rolagem.
- Checados os modos completo/só navegação/desligado e a preferência de movimento reduzido.
- Checados orçamento de loops, trocas rápidas, pausa fora da área visível, pausa/retomada ao abrir/fechar diálogo, molduras em duas camadas e degradês nas barras.
- A lógica de página em segundo plano foi testada por simulação da propriedade `document.hidden` e do evento `visibilitychange`; não é uma medição do comportamento de todas as situações reais de minimização do Foundry.
- As larguras de viewport 360, 430, 720, 850 e 1180 px passaram na checagem de transbordamento horizontal dos contêineres principais e controles.
- As capturas ampla, compacta e de estágios foram inspecionadas. A rolagem vertical é intencional nas janelas menores.

A execução com seu mundo, outros módulos e o desempenho no seu PC ainda precisam ser conferidos dentro do Foundry v13.351. A versão e os links de instalação não foram alterados para publicar uma prévia ainda não aprovada.

## Referências de implementação

- [Motion — performance](https://motion.dev/docs/performance)
- [Motion — animate](https://motion.dev/docs/animate)
- [web.dev — animações de alto desempenho](https://web.dev/articles/animations-guide)
- [W3C — animação por interação](https://www.w3.org/TR/WCAG/#animation-from-interactions)

Próximo passo: revisar cores e movimento no visualizador. Depois da revisão, preparar a versão publicável.
