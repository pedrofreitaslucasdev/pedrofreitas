# Portfólio do Pedro Freitas: desenho

Data: 25/09/2026
Endereço: `pedrofreitasdev.vercel.app`

(O `pedrofreitas.vercel.app` já era de outra conta da Vercel; ficou `pedrofreitasdev`, igual ao usuário do GitHub. Plano futuro: domínio próprio `pedrofreitas.com.br`.)

## Para que serve

É o site do Pedro como quem faz sites para empresas pequenas de Lorena e região. Ele tem
dois caminhos de entrada:

1. **A assinatura no rodapé de todo site entregue** ("Site desenvolvido por Pedro Freitas").
   Quem clica chega aqui pelo celular, vindo de um site de qualquer ramo.
2. **O link que o Pedro manda quando está prospectando.**

A única métrica de sucesso é **quantos cliques no botão do WhatsApp**. Tudo na página existe
para levar a pessoa até esse botão.

## Decisões tomadas

| Assunto | Decisão |
|---|---|
| Público | Geral, qualquer empresa pequena. Sem foco em autoescola |
| Nome | Pedro Freitas, o nome pessoal e não um nome de estúdio |
| Preço | Não aparece. Tudo termina no WhatsApp |
| Foto / "sobre mim" | Não entram agora. Ele pode mudar depois, então o layout não deve impedir |
| Formato | Página única, com efeitos no scroll |
| Clima visual | Escuro e marcante: fundo quase preto, nome gigante, destaque verde-limão. Fonte dos títulos: Bricolage Grotesque (26/09; a Fraunces com serifa "parecia biografia") |
| Modelos no scroll | ~~Cartas empilhando~~ → três blocos abertos, sem grudar (26/09: o Pedro não gostou das cartas; opção recomendada pelo Astra) |
| Prévia dos sites | Print do site inteiro dentro de um celular, rolando sozinho |

## A página, de cima para baixo

### 1. Topo
- "Pedro" / "Freitas" em letra gigante com serifa, e "Freitas" em verde-limão.
- As letras aparecem uma a uma quando a página abre.
- Linha de apoio: *"Sites que fazem o cliente chamar no WhatsApp. Lorena e região."*
- Uma indicação "role ↓".

### 2. Modelos: "escolha o jeito do seu site"
Os três modelos são **opções de estilo** que o cliente escolhe. Não são trabalhos entregues.

| Ordem | Modelo | Endereço | Frase |
|---|---|---|---|
| 01 · Vídeo | Forno de Pedra | forno-de-pedra.vercel.app | a pizza gira e assa enquanto você rola |
| 02 · Estático | Fontes Odontologia | fontes-odontologia.vercel.app | rápido, limpo e passa confiança |
| 03 · Interativo | Casa Forte | deposito-casa-forte.vercel.app | o cliente monta a lista e o zap chega pronto |

Cada modelo é uma carta grande que **gruda na tela** (`position: sticky`). Ao rolar, a
próxima carta sobe e cobre a anterior, e a de trás encolhe um pouco. Cada carta tem o
celular com a prévia rolando, o nome, a frase e o botão **ver o site →**, que abre em
nova aba.

As frases acima são um rascunho e podem ser ajustadas na hora de escrever os textos.

### 3. Já entreguei: "sistemas feitos para gente de verdade"
São a **prova de trabalho**: versões de demonstração de sistemas reais, sem dado real e sem
senha.

| Sistema | Endereço | Situação |
|---|---|---|
| Salão: atendimentos e fiado | demo-salao.vercel.app | no ar, botão **testar →** |
| Encomendas de bolo | demo-bolos.vercel.app ("Doceria Modelo", cópia sem o nome da tia) | no ar, botão **testar →**. Trocou o vendas da live em 25/09 |
| Gráfica: quadro de pedidos | demo-grafica.vercel.app | **em breve**, sem link, até a demo existir |

Cada sistema tem a mesma prévia de celular rolando. Os cartões sobem de baixo, um por vez,
quando entram na tela.

### 4. Como funciona
Três passos grandes: **1** Você me chama, **2** Escolhe o modelo, **3** Seu site no ar.

### 5. Fechamento
*"Bora colocar sua empresa na internet?"* e o botão grande do WhatsApp.

### Botão fixo
Um botão de WhatsApp preso embaixo da tela, que aparece depois que a pessoa sai do topo.

## Técnica

- **HTML, CSS e JavaScript puro**, sem framework, sem biblioteca de animação e sem backend.
- **Efeitos:** as letras do topo usam CSS com atraso por letra. As cartas usam `position: sticky`
  com escala controlada no scroll. A entrada dos sistemas usa `IntersectionObserver`. A prévia
  rolando é uma animação CSS de `transform` numa imagem alta dentro da moldura do celular.
- **`prefers-reduced-motion`:** com ele ligado, nada se mexe. As letras aparecem prontas,
  as cartas viram uma lista normal e a prévia fica parada no topo do site.
- **Prints:** um script com Playwright em Python (`scripts/prints.py`) abre cada site na largura de
  celular, tira o print da página inteira e salva em WebP. O script fica no projeto para
  refazer os prints quando algum modelo mudar. As demos precisam de uma espera até os dados
  de mentira carregarem antes do print.
- **Configuração** no topo de `js/app.js`:
  ```js
  const CONFIG = {
    numero: "5512991703098",
    mensagem: "Oi, Pedro. Vi seu site e queria um pra minha empresa.",
  };
  ```
- **Celular primeiro.** Tudo é pensado para a tela de celular e depois ajustado para o computador.
  Sem rolagem para o lado e com área de toque confortável.
- **Peso:** os prints em WebP e as fontes do Google Fonts são as únicas coisas pesadas.
  A imagem só carrega quando a carta chega perto da tela (`loading="lazy"`), com exceção da primeira.
- **Compartilhamento:** título, descrição e imagem de prévia (`og:image`) para quando o link
  for mandado no WhatsApp.

## Publicação

- Pasta `C:\Users\pedro\projetos\pedrofreitas`, repo `pedrofreitas` no GitHub e projeto
  `pedrofreitas` na Vercel, **ligado ao GitHub**: todo `git push` publica sozinho.
- A pasta `.superpowers/` fica no `.gitignore`.
- Conferir o site no ar com o Playwright, nunca com curl.

## Fora deste trabalho (vem depois, cada um separado)

1. **Trocar o link da assinatura** nos modelos e sites de clientes: de WhatsApp direto para
   `pedrofreitasdev.vercel.app`. Isso só depois que o portfólio estiver no ar.
2. **Criar a demo da gráfica** (`demo-grafica`), no padrão das outras demos. Quando ela
   existir, o cartão da gráfica muda de "em breve" para "testar →".

## Como saber que ficou certo

- No celular, a pessoa rola do topo ao fim sem travar, e cada modelo ocupa a tela por um momento.
- Os 5 links (3 modelos e 2 demos) abrem os sites certos em nova aba.
- O botão do WhatsApp abre o número do Pedro com a mensagem pronta.
- Com "reduzir movimento" ligado, a página continua completa e legível.
- A página carrega rápido na rede de celular (Lighthouse mobile com Performance acima de 85).
