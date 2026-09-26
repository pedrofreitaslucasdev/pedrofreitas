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
const temMouse = matchMedia("(hover: hover) and (pointer: fine)").matches;

// ---------- WhatsApp ----------
const linkZap = "https://wa.me/" + CONFIG.numero + "?text=" + encodeURIComponent(CONFIG.mensagem);
document.querySelectorAll("[data-zap]").forEach((a) => { a.href = linkZap; });

// ---------- claro / escuro: a escolha fica guardada só no navegador da pessoa ----------
const botaoTema = document.querySelector(".tema");
function mostraTema() {
  const claro = raiz.dataset.tema !== "escuro";
  botaoTema.querySelector(".tema__texto").textContent = claro ? "Escuro" : "Claro";
  botaoTema.setAttribute("aria-pressed", String(!claro));
  document.querySelector('meta[name="theme-color"]').content = claro ? "#fbfaf6" : "#0e0e0e";
}
botaoTema.addEventListener("click", () => {
  const novo = raiz.dataset.tema === "escuro" ? "claro" : "escuro";
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

function abreMenu() {
  barra.classList.remove("barra--escondida");
  menu.hidden = false;
  menu.getBoundingClientRect();            // força o navegador a desenhar antes da transição
  menu.classList.add("aberto");
  botaoMenu.setAttribute("aria-expanded", "true");
  textoMenu.textContent = "Fechar";
  document.body.style.overflow = "hidden";
  menu.querySelector("a").focus({ preventScroll: true });
}
function fechaMenu(devolverFoco = true) {
  menu.classList.remove("aberto");
  botaoMenu.setAttribute("aria-expanded", "false");
  textoMenu.textContent = "Menu";
  document.body.style.overflow = "";
  // some de vez depois da cortina subir: menu escondido com cor não pode ficar na tela (Safari)
  const esconde = () => { if (!menu.classList.contains("aberto")) menu.hidden = true; };
  semMovimento ? esconde() : setTimeout(esconde, 750);
  if (devolverFoco) botaoMenu.focus({ preventScroll: true });
}
botaoMenu.addEventListener("click", () => (menu.classList.contains("aberto") ? fechaMenu() : abreMenu()));
menu.querySelectorAll(".menu__lista a").forEach((a) => a.addEventListener("click", () => fechaMenu(false)));
addEventListener("keydown", (e) => { if (e.key === "Escape" && menu.classList.contains("aberto")) fechaMenu(); });

// ---------- botão fixo: aparece depois do topo, some no contato ----------
const zapFixo = document.querySelector(".zap-fixo");
const vistos = { topo: true, contato: false };
const olhoZap = new IntersectionObserver((entradas) => {
  entradas.forEach((e) => { vistos[e.target.id] = e.isIntersecting; });
  zapFixo.classList.toggle("aparece", !vistos.topo && !vistos.contato);
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
  // ~70px de tela por segundo (o Pedro pediu mais devagar em 26/09)
  const duracao = Math.max(5000, (sobra / 70) * 1000);
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

  document.querySelectorAll("[data-cursor]").forEach((el) => {
    el.addEventListener("pointerenter", () => cursor.classList.add("ver"));
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
  }
}

// ---------- rolagem: GSAP + ScrollTrigger ----------
// Regra do refino (26/09): o impacto fica nos projetos. O topo quase não se mexe, e nada
// anda de lado só pra mostrar que anda.
function animaRolagem() {
  gsap.registerPlugin(ScrollTrigger);

  // títulos: cada linha sobe de trás da máscara quando o bloco entra na tela
  document.querySelectorAll(".revela").forEach((bloco) => {
    if (bloco.getBoundingClientRect().top < innerHeight) return;   // já está na tela
    gsap.from(bloco.querySelectorAll(".linha > span"), {
      yPercent: 105,
      duration: 1.1,
      ease: "power4.out",
      stagger: 0.07,
      scrollTrigger: { trigger: bloco, start: "top 88%", once: true },
    });
  });

  // textos pequenos, legendas e passos: sobem juntos, em lotes
  const abaixo = gsap.utils.toArray(".sobe").filter((el) => el.getBoundingClientRect().top > innerHeight);
  gsap.set(abaixo, { y: 22, autoAlpha: 0 });
  ScrollTrigger.batch(abaixo, {
    start: "top 92%",
    once: true,
    onEnter: (lote) => gsap.to(lote, { y: 0, autoAlpha: 1, duration: 1, ease: "power3.out", stagger: 0.06, overwrite: true }),
  });

  // projetos: a imagem entra como uma cortina subindo, e o celular chega logo depois
  document.querySelectorAll(".projeto__midia").forEach((midia) => {
    if (midia.getBoundingClientRect().top < innerHeight) return;
    const tela = midia.querySelector(".projeto__tela");
    const fone = midia.querySelector(".projeto__fone");
    const tl = gsap.timeline({ scrollTrigger: { trigger: midia, start: "top 85%", once: true } });
    tl.fromTo(tela, { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.3, ease: "power4.inOut" });
    if (fone) tl.from(fone, { yPercent: 18, autoAlpha: 0, duration: 1, ease: "power3.out" }, "-=0.45");
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

  // a virada: a primeira frase apaga enquanto a segunda chega (fim de um capítulo, começo do outro)
  gsap.to(".virada__a", { opacity: 0.22, ease: "none",
    scrollTrigger: { trigger: ".virada__b", start: "top 85%", end: "top 45%", scrub: true } });

  // CAPÍTULO 02: o bloco invertido abre por cima, das bordas pra tela toda
  gsap.fromTo(".capitulo-sistemas",
    { clipPath: "inset(0% 3% 0% 3% round 16px)" },
    { clipPath: "inset(0% 0% 0% 0% round 0px)", ease: "none",
      scrollTrigger: { trigger: ".capitulo-sistemas", start: "top bottom", end: "top 30%", scrub: true } });

  // sistemas: a tela abre da esquerda pra direita (os sites abrem de baixo pra cima: outro capítulo)
  document.querySelectorAll(".sistema__visual").forEach((visual) => {
    if (visual.getBoundingClientRect().top < innerHeight) return;
    const tela = visual.querySelector(".sistema__tela");
    const fone = visual.querySelector(".sistema__fone");
    const tl = gsap.timeline({ scrollTrigger: { trigger: visual, start: "top 85%", once: true } });
    tl.fromTo(tela, { clipPath: "inset(0% 100% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.2, ease: "power4.inOut" });
    if (fone) tl.from(fone, { yPercent: 14, autoAlpha: 0, duration: 0.9, ease: "power3.out" }, "-=0.4");
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
