// Pedro Freitas · portfólio
// Tudo aqui é enfeite: sem JavaScript a página continua inteira e os links funcionam.

const CONFIG = {
  numero: "5512991703098",
  mensagem: "Oi, Pedro. Vi seu site e queria um pra minha empresa.",
};

const semMovimento = matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------- WhatsApp ----------
const linkZap = "https://wa.me/" + CONFIG.numero + "?text=" + encodeURIComponent(CONFIG.mensagem);
document.querySelectorAll("[data-zap]").forEach((a) => { a.href = linkZap; });

// ---------- botão fixo: aparece depois do topo, some no fechamento ----------
const zapFixo = document.querySelector(".zap-fixo");
const vistos = { topo: true, fecho: false };
const atualizaZap = () => zapFixo.classList.toggle("aparece", !vistos.topo && !vistos.fecho);
new IntersectionObserver((entradas) => {
  entradas.forEach((e) => { vistos[e.target.id] = e.isIntersecting; });
  atualizaZap();
}, { threshold: 0.15 }).observe(document.getElementById("topo"));
new IntersectionObserver((entradas) => {
  entradas.forEach((e) => { vistos[e.target.id] = e.isIntersecting; });
  atualizaZap();
}).observe(document.getElementById("fecho"));

// ---------- surgir ao entrar na tela ----------
const olhoSurgir = new IntersectionObserver((entradas) => {
  entradas.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add("visivel"); olhoSurgir.unobserve(e.target); }
  });
}, { rootMargin: "0px 0px -12% 0px" });
document.querySelectorAll(".surgir").forEach((el) => olhoSurgir.observe(el));

// ---------- celulares: o print rola sozinho só enquanto aparece na tela ----------
const fones = [...document.querySelectorAll(".fone")].filter((f) => f.querySelector("img"));

// A animação é criada aqui, com a distância já medida em pixels.
// A altura do print sai da PROPORÇÃO do arquivo, não do getBoundingClientRect: no Safari a
// imagem mede 0 de altura logo que a página abre, a conta dava negativa e o print da pizza
// nunca descia.
const animacoes = new Map();
const naTela = new Set();

function mede(fone) {
  const img = fone.querySelector("img");
  if (!img.complete || !img.naturalWidth || !fone.clientWidth) return;
  const alturaImg = fone.clientWidth * img.naturalHeight / img.naturalWidth;
  const sobra = Math.round(alturaImg - fone.clientHeight);
  if (sobra <= 0 || animacoes.get(fone)?.sobra === sobra) return;

  animacoes.get(fone)?.anim.cancel();
  // velocidade constante: ~110px de tela por segundo, pra print curto não passar voando
  const duracao = Math.max(4000, (sobra / 110) * 1000);
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
  // a moldura muda de tamanho ao girar o celular; a imagem, quando o navegador termina de
  // desenhar. Qualquer um dos dois mudando, mede de novo.
  const olhoTamanho = new ResizeObserver((entradas) =>
    entradas.forEach((e) => mede(e.target.closest(".fone"))));
  fones.forEach((f) => { olhoTamanho.observe(f); olhoTamanho.observe(f.querySelector("img")); });

  // só roda enquanto aparece na tela, pra não gastar bateria à toa
  const olhoFone = new IntersectionObserver((entradas) => {
    entradas.forEach((e) => {
      e.isIntersecting ? naTela.add(e.target) : naTela.delete(e.target);
      const a = animacoes.get(e.target)?.anim;
      if (a) e.isIntersecting ? a.play() : a.pause();
    });
  }, { threshold: 0.2 });
  fones.forEach((f) => olhoFone.observe(f));
}

// ---------- scroll: o nome do topo sobe e apaga enquanto a pessoa desce ----------
if (!semMovimento) {
  const topo = document.getElementById("topo");
  let pedido = false;

  function quadro() {
    pedido = false;
    const sai = Math.min(1, Math.max(0, scrollY / innerHeight));
    topo.style.setProperty("--sai", sai.toFixed(3));
  }

  const pede = () => { if (!pedido) { pedido = true; requestAnimationFrame(quadro); } };
  addEventListener("scroll", pede, { passive: true });
  addEventListener("resize", pede);
  quadro();
}
