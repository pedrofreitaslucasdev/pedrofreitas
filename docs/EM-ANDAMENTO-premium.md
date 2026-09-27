# Cópia de trabalho "premium" — NÃO é o site oficial

Esta branch (`premium`) é uma **cópia** do portfólio onde o Pedro e o Claude estão
trabalhando desde 27/09/2026. O site oficial (pedrofreitasdev.vercel.app) sai do
`main`, que **não foi tocado** e continua igual à tag `versao-antes-da-mudanca-2026-09-27`.

**Regras enquanto a cópia estiver em andamento**
- Trabalhar só nesta branch. Nada de merge, push ou commit no `main` sem o Pedro mandar.
- Prévia: todo push aqui gera uma prévia na Vercel (protegida). Pra mandar pro Pedro, gerar
  link com `_vercel_share` (ferramenta get_access_to_vercel_url), senão ele cai no login.
- Ponto salvo desta cópia: tag `copia-premium-2026-09-27`.

**O que já tem aqui** (em relação ao oficial)
- Tema escuro por padrão (preto liso #050605), vidro estilo iPhone (liquid glass) nos cartões.
- Fio de luz em Three.js no fundo do site inteiro (`public/js/fio.js`, Three 0.186 em
  `public/vendor/three/`): é o fio do teste aprovado (teste-fio.vercel.app, "ficou perfeito"),
  igualzinho. Canvas transparente: a cena é desenhada sobre #050605 (a névoa verde depende disso)
  e a última passada desconta esse fundo. No claro a mesma forma vira tinta verde-oliva.
  O `luz.js` antigo saiu em 27/09 (está no histórico do git).
- Rolagem suave com Lenis só no computador (`public/vendor/lenis.min.js`).
- Abertura com o quadrado lima, ondas nos Sistemas (`public/js/ondas.js`), janelas nos prints.

**Onde parou (27/09, noite)**
- O Pedro quer o fio de luz tão fluido quanto o template Relay (getlayers.ai), principalmente
  no iPhone. Muitas tentativas reprovadas; o fio foi devolvido pra versão b2c732a.
- Problemas conhecidos dessa versão, a corrigir UM POR VEZ e com aprovação dele:
  nó branco no encontro dos fios (no celular cai em cima da frase), o dedo empurrando os
  fios no celular, tema claro apagado.
- Inspira UI baixada só como referência (Vue, não roda direto aqui). Candidatos que ele pode
  escolher: bg-silk, light-speed, aurora-background, liquid-background, tracing-beam, vortex.
