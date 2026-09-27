// Pedro Freitas · portfólio
// Sem JavaScript a página continua inteira e os links funcionam: tudo aqui é por cima.
// As animações de rolagem usam GSAP + ScrollTrigger (em /vendor, sem CDN), buscados só
// no primeiro sinal de uso (ou 3,5s depois de carregar): no celular eles ocupavam ~1,6s de
// processador bem na hora da primeira pintura. O topo não depende deles (entrada em CSS, resto aqui). Se não carregarem,
// nada fica escondido: os estados iniciais só são aplicados pelo próprio GSAP.

const CONFIG = {
  numero: "5512991703098",
  mensagem: "Oi, Pedro. Vi seu site e queria um pra minha empresa.",
};

const raiz = document.documentElement;
const semMovimento = matchMedia("(prefers-reduced-motion: reduce)").matches;
// se a pessoa ligar ou desligar "reduzir movimento" com a página aberta, recarrega pra valer em tudo
const preferenciaMovimento = matchMedia("(prefers-reduced-motion: reduce)");
if (preferenciaMovimento.addEventListener) preferenciaMovimento.addEventListener("change", () => location.reload());
else if (preferenciaMovimento.addListener) preferenciaMovimento.addListener(() => location.reload());   // iOS antigo
const temMouse = matchMedia("(hover: hover) and (pointer: fine)").matches;

// ---------- abertura: o quadrado lima conta até 100 e recolhe até o "PF" da barra ----------
// Só existe com html.abrindo (primeira visita da sessão, posto pelo script do <head>).
if (raiz.classList.contains("abrindo")) {
  const abertura = document.querySelector(".abertura");
  const bloco = abertura.querySelector(".abertura__bloco");
  const conta = abertura.querySelector(".abertura__conta");
  const inicio = performance.now();
  const DURA = 1100;
  const fontes = document.fonts ? document.fonts.ready : Promise.resolve();
  let fontesProntas = false;
  fontes.then(() => { fontesProntas = true; });
  (function conta100(agora) {
    const k = Math.min(1, (agora - inicio) / DURA);
    const v = Math.round(100 * (1 - Math.pow(1 - k, 3)));
    conta.textContent = String(v).padStart(3, "0");
    // não passa de 99 enquanto as fontes não chegaram (no máximo 2,5s)
    if (k < 1 || (!fontesProntas && agora - inicio < 2500)) { if (k >= 1) conta.textContent = "099"; requestAnimationFrame(conta100); return; }
    conta.textContent = "100";
    recolhe();
  })(inicio);

  function recolhe() {
    const alvo = document.querySelector(".barra__marca").getBoundingClientRect();
    const de = bloco.getBoundingClientRect();
    const dx = alvo.left + alvo.width / 2 - (de.left + de.width / 2);
    const dy = alvo.top + alvo.height / 2 - (de.top + de.height / 2);
    const escala = Math.max(alvo.height, 28) / de.height;
    conta.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, fill: "forwards" });
    bloco.animate([{ transform: "none" }, { transform: `translate(${dx}px, ${dy}px) scale(${escala})`, opacity: 0.0 }],
      { duration: 850, easing: "cubic-bezier(.7, 0, .2, 1)", fill: "forwards" });
    const fundo = abertura.animate([{ backgroundColor: getComputedStyle(abertura).backgroundColor }, { backgroundColor: "transparent" }],
      { duration: 700, delay: 350, easing: "ease", fill: "forwards" });
    setTimeout(() => raiz.classList.remove("abrindo"), 450);   // o título começa a subir enquanto o bloco voa
    fundo.finished.then(() => abertura.remove());
  }
}

// ---------- rolagem suave (Lenis, 27/09) ----------
// A roda do mouse e o trackpad deslizam com inércia em vez de pular de degrau em degrau; o fio de
// luz (luz.js lê scrollY a cada quadro) acompanha esse deslizar e fica fluido junto. Só com MOUSE:
// no toque o Lenis não suaviza nada (a rolagem nativa do celular já tem inércia), e a trava do menu
// no iPhone (body fixo) confundia ele. Sem "reduzir movimento". Âncoras (#trabalhos etc.) deslizam.
const lenis = !semMovimento && temMouse && window.Lenis
  ? new Lenis({ lerp: 0.09, wheelMultiplier: 0.9, anchors: { offset: 0 }, autoRaf: true })
  : null;

// ---------- WhatsApp ----------
const linkZap = "https://wa.me/" + CONFIG.numero + "?text=" + encodeURIComponent(CONFIG.mensagem);
document.querySelectorAll("[data-zap]").forEach((a) => { a.href = linkZap; });

// ---------- claro / escuro: a escolha fica guardada só no navegador da pessoa ----------
const botaoTema = document.querySelector(".tema");
function mostraTema() {
  const claro = raiz.dataset.tema === "claro";
  botaoTema.querySelector(".tema__texto").textContent = claro ? "Escuro" : "Claro";
  botaoTema.setAttribute("aria-pressed", String(!claro));
  document.querySelector('meta[name="theme-color"]').content = claro ? "#fbfaf6" : "#050605";
}
botaoTema.addEventListener("click", () => {
  const novo = raiz.dataset.tema === "claro" ? "escuro" : "claro";
  raiz.dataset.tema = novo;
  try { localStorage.setItem("tema", novo); } catch (e) { /* aba anônima: só não lembra */ }
  mostraTema();
});
mostraTema();

// ---------- topo: título sobe devagar na rolagem e acompanha o mouse por poucos pixels ----------
// Só variáveis de CSS no .topo (--p, --mx, --my); o CSS decide quanto cada peça anda.
const topo = document.getElementById("topo");
if (!semMovimento) {
  let pedidoTopo = false;
  const rola = () => {
    pedidoTopo = false;
    topo.style.setProperty("--p", Math.min(1, Math.max(0, scrollY / topo.offsetHeight)).toFixed(3));
  };
  addEventListener("scroll", () => { if (!pedidoTopo) { pedidoTopo = true; requestAnimationFrame(rola); } }, { passive: true });
  rola();

  if (temMouse) {
    let alvoX = 0, alvoY = 0, x = 0, y = 0, rodando = false;
    const anda = () => {
      x += (alvoX - x) * 0.07; y += (alvoY - y) * 0.07;
      topo.style.setProperty("--mx", x.toFixed(4));
      topo.style.setProperty("--my", y.toFixed(4));
      rodando = Math.abs(alvoX - x) > 0.001 || Math.abs(alvoY - y) > 0.001;
      if (rodando) requestAnimationFrame(anda);
    };
    topo.addEventListener("pointermove", (e) => {
      const r = topo.getBoundingClientRect();
      alvoX = (e.clientX - r.left) / r.width - 0.5;
      alvoY = (e.clientY - r.top) / r.height - 0.5;
      if (!rodando) { rodando = true; requestAnimationFrame(anda); }
    });
    topo.addEventListener("pointerleave", () => { alvoX = 0; alvoY = 0; if (!rodando) { rodando = true; requestAnimationFrame(anda); } });
  }
}

// ---------- barra: some quando a pessoa desce, volta quando sobe ----------
const barra = document.querySelector(".barra");
let ultimoY = scrollY, pedidoBarra = false;
addEventListener("scroll", () => {
  if (pedidoBarra) return;
  pedidoBarra = true;
  requestAnimationFrame(() => {
    pedidoBarra = false;
    const y = scrollY, delta = y - ultimoY;
    if (Math.abs(delta) < 6) return;              // tremidinha do dedo não conta
    const menuAberto = document.getElementById("menu").classList.contains("aberto");
    barra.classList.toggle("barra--escondida", delta > 0 && y > 120 && !menuAberto);
    ultimoY = y;
  });
}, { passive: true });

// ---------- menu em tela cheia ----------
const menu = document.getElementById("menu");
const botaoMenu = document.querySelector(".barra__menu");
const textoMenu = botaoMenu.querySelector(".barra__menu-texto");

// com o menu aberto, o que está atrás fica inerte (Tab e leitor de tela não escapam pra lá)
const fundoDoMenu = () => document.querySelectorAll("main, .pular, .barra__marca, .tema, .zap-fixo");
let yMenu = 0;
function abreMenu() {
  barra.classList.remove("barra--escondida");
  fundoDoMenu().forEach((el) => { el.inert = true; });
  // computador com Lenis: a trava é a dele; sem Lenis (celular): body fixo, que é o que trava no iPhone
  if (lenis) lenis.stop();
  else {
    yMenu = scrollY;
    document.body.style.top = `-${yMenu}px`;
    document.body.classList.add("travado");
  }
  menu.hidden = false;
  menu.getBoundingClientRect();            // força o navegador a desenhar antes da transição
  menu.classList.add("aberto");
  botaoMenu.setAttribute("aria-expanded", "true");
  textoMenu.textContent = "Fechar";
  menu.querySelector("a").focus({ preventScroll: true });
}
function fechaMenu(devolverFoco = true) {
  menu.classList.remove("aberto");
  botaoMenu.setAttribute("aria-expanded", "false");
  textoMenu.textContent = "Menu";
  fundoDoMenu().forEach((el) => { el.inert = false; });
  // o botão fixo volta a obedecer à regra dele (inerte enquanto está fora da tela)
  zapFixo.inert = !zapFixo.classList.contains("aparece");
  if (lenis) lenis.start();
  else {
    document.body.classList.remove("travado");
    document.body.style.top = "";
    scrollTo(0, yMenu);                  // antes da âncora: o link do menu navega depois disso
  }
  // some de vez depois da cortina subir: menu escondido com cor não pode ficar na tela (Safari)
  const esconde = () => { if (!menu.classList.contains("aberto")) menu.hidden = true; };
  semMovimento ? esconde() : setTimeout(esconde, 750);
  if (devolverFoco) botaoMenu.focus({ preventScroll: true });
}
botaoMenu.addEventListener("click", () => (menu.classList.contains("aberto") ? fechaMenu() : abreMenu()));
menu.querySelectorAll(".menu__lista a").forEach((a) => a.addEventListener("click", (e) => {
  fechaMenu(false);
  // com Lenis, o próprio Lenis desliza até a seção (o salto nativo da âncora deixava ele travado)
  const alvo = lenis && document.querySelector(a.hash);
  if (!alvo) return;
  e.preventDefault(); e.stopPropagation();
  history.replaceState(null, "", a.hash);
  requestAnimationFrame(() => lenis.scrollTo(alvo, {
    onComplete: () => { alvo.setAttribute("tabindex", "-1"); alvo.focus({ preventScroll: true }); },   // teclado continua dali
  }));
}));
addEventListener("keydown", (e) => { if (e.key === "Escape" && menu.classList.contains("aberto")) fechaMenu(); });

// ---------- botão fixo: aparece depois do topo, some no contato ----------
const zapFixo = document.querySelector(".zap-fixo");
const vistos = { topo: true, contato: false };
const olhoZap = new IntersectionObserver((entradas) => {
  entradas.forEach((e) => { vistos[e.target.id] = e.isIntersecting; });
  const mostra = !vistos.topo && !vistos.contato;
  zapFixo.classList.toggle("aparece", mostra);
  // escondido embaixo da tela, ou com o menu aberto por cima: fora do Tab e do leitor de tela
  zapFixo.inert = !mostra || menu.classList.contains("aberto");
}, { threshold: 0.1 });
olhoZap.observe(document.getElementById("topo"));
olhoZap.observe(document.getElementById("contato"));

// ---------- celulares: o print rola sozinho só enquanto aparece na tela ----------
// A altura do print sai da PROPORÇÃO do arquivo, não do getBoundingClientRect: no Safari a
// imagem mede 0 de altura logo que a página abre, a conta dava negativa e o print não descia.
const fones = [...document.querySelectorAll(".fone")].filter((f) => f.querySelector("img"));
const animacoes = new Map();
const naTela = new Set();

function mede(fone) {
  const img = fone.querySelector("img");
  if (!img.complete || !img.naturalWidth || !fone.clientWidth) return;
  const alturaImg = fone.clientWidth * img.naturalHeight / img.naturalWidth;
  const sobra = Math.round(alturaImg - fone.clientHeight);
  if (sobra <= 0 || animacoes.get(fone)?.sobra === sobra) return;

  animacoes.get(fone)?.anim.cancel();
  // Velocidade relativa ao TAMANHO da moldura, não em px fixos: com 70px/s, no celular (moldura de
  // 73px) o site inteiro passava em 5 segundos. Em 1/5 da moldura por segundo (~22s) ficou lento e
  // "travado"; o Pedro pediu um pouco mais rápido: 0,3 da largura por segundo, ~15s por site
  // comprido, em qualquer tela. Mínimo 6s, máximo 30s.
  const duracao = Math.min(30000, Math.max(6000, (sobra / (fone.clientWidth * 0.3)) * 1000));
  // pausa curta e FIXA nas pontas: pausa longa faz a pessoa achar que o print travou
  const pausa = 600 / duracao;
  const anim = img.animate([
    { transform: "translateY(0)", offset: 0 },
    { transform: "translateY(0)", offset: pausa, easing: "ease-in-out" },
    { transform: `translateY(${-sobra}px)`, offset: 1 - pausa },
    { transform: `translateY(${-sobra}px)`, offset: 1 },
  ], { duration: duracao, iterations: Infinity, direction: "alternate" });
  naTela.has(fone) ? anim.play() : anim.pause();
  animacoes.set(fone, { anim, sobra });
}

if (!semMovimento) {
  fones.forEach((f) => {
    const img = f.querySelector("img");
    img.complete ? mede(f) : img.addEventListener("load", () => mede(f), { once: true });
  });
  const olhoTamanho = new ResizeObserver((entradas) =>
    entradas.forEach((e) => mede(e.target.closest(".fone"))));
  fones.forEach((f) => { olhoTamanho.observe(f); olhoTamanho.observe(f.querySelector("img")); });

  const olhoFone = new IntersectionObserver((entradas) => {
    entradas.forEach((e) => {
      e.isIntersecting ? naTela.add(e.target) : naTela.delete(e.target);
      const a = animacoes.get(e.target)?.anim;
      if (a) e.isIntersecting ? a.play() : a.pause();
    });
  }, { threshold: 0.2 });
  fones.forEach((f) => olhoFone.observe(f));
}

// ---------- vídeos de prévia (estilo Animado): tocam só enquanto aparecem na tela ----------
// Sem movimento pedido, ficam parados no poster (o print). O vídeo só é baixado quando aparece.
if (!semMovimento) {
  const olhoVideo = new IntersectionObserver((entradas) => {
    entradas.forEach((e) => {
      if (e.isIntersecting) {
        const fonte = e.target.querySelector("source[data-src]");
        if (fonte) {
          // tela pequena recebe a versão de 640px do vídeo grande, quando existe
          const celular = fonte.dataset.srcCelular && innerWidth < 760;
          fonte.src = celular ? fonte.dataset.srcCelular : fonte.dataset.src;
          fonte.removeAttribute("data-src");
          e.target.load();
        }
        e.target.play().catch(() => { /* navegador recusou autoplay: fica o poster */ });
      }
      else e.target.pause();
    });
  }, { threshold: 0.25 });
  document.querySelectorAll(".video-previa").forEach((v) => olhoVideo.observe(v));
}

// ---------- só no computador: cursor próprio, ímã nos botões e imagem que segue o mouse ----------
if (temMouse) {
  const cursor = document.createElement("div");
  cursor.className = "cursor";
  cursor.setAttribute("aria-hidden", "true");
  cursor.innerHTML = "<span>Ver ↗</span>";
  document.body.append(cursor);
  raiz.classList.add("cursor-proprio");

  let alvoX = innerWidth / 2, alvoY = innerHeight / 2, x = alvoX, y = alvoY;
  addEventListener("pointermove", (e) => { alvoX = e.clientX; alvoY = e.clientY; }, { passive: true });
  (function segue() {
    // atraso leve: o círculo "persegue" o mouse; sem movimento reduzido ele gruda direto
    const k = semMovimento ? 1 : 0.2;
    x += (alvoX - x) * k; y += (alvoY - y) * k;
    cursor.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    requestAnimationFrame(segue);
  })();

  const textoCursor = cursor.querySelector("span");
  document.querySelectorAll("[data-cursor]").forEach((el) => {
    // data-cursor="Testar ↗" nos sistemas; sem valor, "Ver ↗"
    el.addEventListener("pointerenter", () => { textoCursor.textContent = el.dataset.cursor || "Ver ↗"; cursor.classList.add("ver"); });
    el.addEventListener("pointerleave", () => cursor.classList.remove("ver"));
  });
  document.querySelectorAll("a:not([data-cursor]), button").forEach((el) => {
    el.addEventListener("pointerenter", () => cursor.classList.add("botao"));
    el.addEventListener("pointerleave", () => cursor.classList.remove("botao"));
  });
  document.addEventListener("pointerleave", () => { cursor.style.opacity = "0"; });
  document.addEventListener("pointerenter", () => { cursor.style.opacity = "1"; });

  if (!semMovimento) {
    // ímã leve: o botão anda um pouco na direção do mouse (o zoom da imagem e o celular
    // subindo no hover dos projetos são só CSS)
    document.querySelectorAll(".magnetico, .barra__menu, .tema").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${dx * 0.12}px, ${dy * 0.18}px)`;
      });
      el.addEventListener("pointerleave", () => { el.style.transform = ""; });
    });

    // liquid glass: o brilho de dentro do vidro segue o mouse (como a luz no vidro do iPhone)
    document.querySelectorAll(".estilo__exemplo, .real__rodape, .capitulo__nota, .sistema__ficha, .passo, .contato__grade, .dado__textos, .pontos, .dado__destaque, .barra__menu, .tema, .rotulo").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--lx", ((e.clientX - r.left) / r.width * 100).toFixed(1) + "%");
        el.style.setProperty("--ly", ((e.clientY - r.top) / r.height * 100).toFixed(1) + "%");
      });
      el.addEventListener("pointerleave", () => { el.style.removeProperty("--lx"); el.style.removeProperty("--ly"); });
    });

    // janelas de vidro inclinam de leve na direção do mouse (a "janela que inclina" do Relay)
    document.querySelectorAll(".projeto__midia, .sistema__visual").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `perspective(1400px) rotateX(${(-y * 5).toFixed(2)}deg) rotateY(${(x * 6).toFixed(2)}deg)`;
      });
      el.addEventListener("pointerleave", () => { el.style.transform = ""; });
    });
  }
}

// ---------- celular: interação pelo dedo e pela rolagem (no computador isso é o mouse) ----------
// O reflexo do vidro desliza conforme o cartão atravessa a tela (como inclinar o iPhone), as
// janelas inclinam em 3D com a rolagem, e um toque leva a luz até o dedo.
if (!temMouse && !semMovimento) {
  const vidros = [...document.querySelectorAll(".estilo__exemplo, .real__rodape, .capitulo__nota, .sistema__ficha, .passo, .contato__grade, .dado__textos, .pontos, .dado__destaque, .rotulo")];
  const janelas = [...document.querySelectorAll(".projeto__midia, .sistema__visual")];
  const visiveis = new Set();
  const olho = new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? visiveis.add(e.target) : visiveis.delete(e.target))), { rootMargin: "10% 0px" });
  [...vidros, ...janelas].forEach((el) => olho.observe(el));
  const tocados = new WeakMap();

  let pedido = false;
  function atualiza() {
    pedido = false;
    const h = innerHeight;
    visiveis.forEach((el) => {
      const r = el.getBoundingClientRect();
      const k = Math.min(1, Math.max(0, (h - r.top) / (h + r.height)));   // 0 entrando embaixo, 1 saindo em cima
      if (janelas.includes(el)) {
        el.style.transform = `perspective(1200px) rotateX(${((0.5 - k) * 10).toFixed(2)}deg) rotateY(${((k - 0.5) * -4).toFixed(2)}deg)`;
      } else if (!tocados.get(el)) {
        el.style.setProperty("--lx", (15 + k * 70).toFixed(1) + "%");
        el.style.setProperty("--ly", (k * 100).toFixed(1) + "%");
      }
    });
  }
  addEventListener("scroll", () => { if (!pedido) { pedido = true; requestAnimationFrame(atualiza); } }, { passive: true });
  addEventListener("resize", atualiza, { passive: true });
  atualiza();

  // toque: a luz vai até o dedo e fica lá um instante
  vidros.forEach((el) => {
    el.addEventListener("touchstart", (e) => {
      const r = el.getBoundingClientRect(), t = e.touches[0];
      el.style.setProperty("--lx", ((t.clientX - r.left) / r.width * 100).toFixed(1) + "%");
      el.style.setProperty("--ly", ((t.clientY - r.top) / r.height * 100).toFixed(1) + "%");
      clearTimeout(tocados.get(el));
      tocados.set(el, setTimeout(() => { tocados.delete(el); atualiza(); }, 1200));
    }, { passive: true });
  });
}

// ---------- rolagem: GSAP + ScrollTrigger ----------
// Regra do refino (26/09): o impacto fica nos projetos. O topo quase não se mexe, e nada
// anda de lado só pra mostrar que anda.
function animaRolagem() {
  gsap.registerPlugin(ScrollTrigger);
  lenis?.on("scroll", ScrollTrigger.update);   // as animações de rolagem seguem o deslizar do Lenis

  // títulos: cada linha sobe de trás da máscara quando o bloco entra na tela
  document.querySelectorAll(".revela").forEach((bloco) => {
    if (bloco.getBoundingClientRect().top < innerHeight) return;   // já está na tela
    gsap.from(bloco.querySelectorAll(".linha > span"), {
      yPercent: 105,
      ...(innerWidth >= 760 ? { filter: "blur(10px)", clearProps: "filter" } : {}),
      duration: 1.1,
      ease: "power4.out",
      stagger: 0.07,
      scrollTrigger: { trigger: bloco, start: "top 88%", once: true },
    });
  });

  // textos pequenos, legendas e passos: sobem juntos, em lotes
  const abaixo = gsap.utils.toArray(".sobe").filter((el) => el.getBoundingClientRect().top > innerHeight);
  // opacity e não autoAlpha: visibility:hidden tirava o texto e os links do leitor de tela
  const foco = innerWidth >= 760;
  gsap.set(abaixo, foco ? { y: 22, opacity: 0, filter: "blur(8px)" } : { y: 22, opacity: 0 });
  ScrollTrigger.batch(abaixo, {
    start: "top 92%",
    once: true,
    onEnter: (lote) => gsap.to(lote, { y: 0, opacity: 1, ...(foco ? { filter: "blur(0px)" } : {}), duration: 1.1, ease: "power3.out", stagger: 0.07, overwrite: "auto", clearProps: foco ? "filter" : "" }),
  });
  // quem chega pelo teclado ou leitor de tela antes da animação vê o bloco na hora
  document.addEventListener("focusin", ({ target }) => {
    const bloco = target.closest && target.closest(".sobe");
    if (bloco) gsap.set(bloco, { y: 0, opacity: 1, filter: "none" });
  });

  // linhas finas (rótulos, legendas, listas) se desenham da esquerda pra direita ao entrar
  gsap.utils.toArray(".rotulo, .risca").forEach((el) => {
    if (el.getBoundingClientRect().top < innerHeight) return;
    gsap.fromTo(el, { "--risca": 0 }, { "--risca": 1, duration: 1.4, ease: "power3.inOut",
      scrollTrigger: { trigger: el, start: "top 92%", once: true } });
  });

  // projetos: a janela abre como uma cortina subindo, o site dentro assenta de um zoom leve,
  // e o celular chega por último. Três tempos, sempre na mesma ordem.
  document.querySelectorAll(".projeto__midia").forEach((midia) => {
    if (midia.getBoundingClientRect().top < innerHeight) return;
    const tela = midia.querySelector(".projeto__tela");
    const dentro = tela.querySelector(".projeto__vista > *");
    const fone = midia.querySelector(".projeto__fone");
    const tl = gsap.timeline({ scrollTrigger: { trigger: midia, start: "top 85%", once: true } });
    tl.fromTo(tela, { clipPath: "inset(100% 0% 0% 0% round 6px)" }, { clipPath: "inset(0% 0% 0% 0% round 6px)", duration: 1.4, ease: "power4.inOut" });
    if (dentro) tl.fromTo(dentro, { scale: 1.16 }, { scale: 1, duration: 1.8, ease: "power3.out" }, 0.15);
    if (fone) tl.from(fone, { yPercent: 18, autoAlpha: 0, duration: 1.1, ease: "power3.out" }, "-=1.1");
  });

  const mm = gsap.matchMedia();
  mm.add({ grande: "(min-width: 760px)", pequeno: "(max-width: 759px)" }, (ctx) => {
    const forca = ctx.conditions.grande ? 1 : 0.5;

    // projetos: dentro da moldura a imagem desliza devagar; o celular vai um pouco mais rápido
    document.querySelectorAll(".projeto__midia").forEach((midia) => {
      const passagem = { trigger: midia, start: "top bottom", end: "bottom top", scrub: true };
      const img = midia.querySelector(".projeto__tela img");
      if (img) gsap.fromTo(img, { yPercent: -12 }, { yPercent: 0, ease: "none", scrollTrigger: passagem });
      const fone = midia.querySelector(".projeto__fone");
      if (fone) gsap.fromTo(fone, { y: 36 * forca }, { y: -36 * forca, ease: "none", scrollTrigger: passagem });
    });
  });

  // o dado: a barra de 80% enche quando aparece
  const barraDado = document.querySelector(".dado__barra > span");
  if (barraDado) gsap.fromTo(barraDado, { scaleX: 0 }, { scaleX: 1, duration: 1.8, ease: "power3.inOut",
    scrollTrigger: { trigger: barraDado, start: "top 90%", once: true } });

  // a virada: a primeira frase apaga enquanto a segunda chega (fim de um capítulo, começo do outro)
  gsap.to(".virada__a", { opacity: 0.6, ease: "none",   // 0.22 derrubava o contraste pra 1,6:1
    scrollTrigger: { trigger: ".virada__b", start: "top 85%", end: "top 45%", scrub: true } });

  // CAPÍTULO 02: o bloco invertido abre por cima, das bordas pra tela toda
  gsap.fromTo(".capitulo-sistemas",
    { clipPath: "inset(0% 3% 0% 3% round 16px)" },
    { clipPath: "inset(0% 0% 0% 0% round 0px)", ease: "none",
      scrollTrigger: { trigger: ".capitulo-sistemas", start: "top bottom", end: "top 30%", scrub: true } });

  // sistemas: a tela abre da esquerda pra direita (os sites abrem de baixo pra cima: outro capítulo),
  // com uma linha verde de leitura na borda da cortina; depois os módulos acendem um a um
  document.querySelectorAll(".sistema").forEach((sistema) => {
    const visual = sistema.querySelector(".sistema__visual");
    if (visual.getBoundingClientRect().top < innerHeight) return;
    const tela = visual.querySelector(".sistema__tela");
    const scan = visual.querySelector(".sistema__scan");
    const fone = visual.querySelector(".sistema__fone");
    const modulos = sistema.querySelectorAll(".sistema__dados .etiquetas li");
    const tl = gsap.timeline({ scrollTrigger: { trigger: visual, start: "top 85%", once: true } });
    tl.fromTo(tela, { clipPath: "inset(0% 100% 0% 0% round 10px)" }, { clipPath: "inset(0% 0% 0% 0% round 10px)", duration: 1.3, ease: "power4.inOut" });
    if (scan) {
      tl.fromTo(scan, { x: 0, opacity: 1 }, { x: () => tela.offsetWidth, duration: 1.3, ease: "power4.inOut" }, 0)
        .to(scan, { opacity: 0, duration: 0.3 }, ">-0.1");
    }
    if (fone) tl.from(fone, { yPercent: 14, autoAlpha: 0, duration: 1, ease: "power3.out" }, "-=0.5");
    if (modulos.length) tl.from(modulos, { opacity: 0, y: 8, duration: 0.6, ease: "power2.out", stagger: 0.08 }, "-=0.8");
  });

  // números do "como funciona" entram um pouco depois do texto
  gsap.utils.toArray(".passo__n").forEach((n) => {
    if (n.getBoundingClientRect().top < innerHeight) return;
    gsap.from(n, { yPercent: 40, autoAlpha: 0, duration: 1.1, ease: "power3.out", scrollTrigger: { trigger: n, start: "top 90%", once: true } });
  });

  // as imagens lazy mudam a altura da página quando chegam: recalcula as posições
  document.querySelectorAll("img[loading=lazy]").forEach((img) => {
    if (!img.complete) img.addEventListener("load", () => ScrollTrigger.refresh(), { once: true });
  });
}

function carrega(src) {
  return new Promise((ok, erro) => {
    const s = document.createElement("script");
    s.src = src; s.onload = ok; s.onerror = erro;
    document.head.append(s);
  });
}

// Começa na primeira rolagem, toque ou tecla, ou depois de 3,5s parado. Quem ainda está
// olhando o topo não precisa das animações lá de baixo, e o processador fica livre.
if (!semMovimento) {
  let comecou = false;
  const sinais = ["scroll", "wheel", "touchstart", "pointerdown", "keydown"];
  const comeca = () => {
    if (comecou) return;
    comecou = true;
    sinais.forEach((s) => removeEventListener(s, comeca));
    carrega("vendor/gsap.min.js")
      .then(() => carrega("vendor/ScrollTrigger.min.js"))
      .then(animaRolagem)
      .catch(() => { /* sem GSAP a página só fica sem as animações de rolagem */ });
  };
  sinais.forEach((s) => addEventListener(s, comeca, { passive: true, once: true }));
  const espera = () => setTimeout(comeca, 3500);
  document.readyState === "complete" ? espera() : addEventListener("load", espera, { once: true });
}
