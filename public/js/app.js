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

function mede(fone) {
  const img = fone.querySelector("img");
  if (!img.complete || !img.naturalWidth) return;
  const sobra = img.getBoundingClientRect().height - fone.clientHeight;
  // velocidade constante: ~110px de tela por segundo, pra print curto não passar voando
  fone.style.setProperty("--desloc", -Math.max(0, sobra) + "px");
  fone.style.setProperty("--dur", Math.max(4, sobra / 110).toFixed(1) + "s");
}

if (!semMovimento) {
  fones.forEach((f) => {
    const img = f.querySelector("img");
    img.complete ? mede(f) : img.addEventListener("load", () => mede(f), { once: true });
  });
  // a moldura muda de tamanho ao girar o celular ou redimensionar a janela
  const olhoTamanho = new ResizeObserver((entradas) => entradas.forEach((e) => mede(e.target)));
  fones.forEach((f) => olhoTamanho.observe(f));

  const olhoFone = new IntersectionObserver((entradas) => {
    entradas.forEach((e) => e.target.classList.toggle("rodando", e.isIntersecting));
  }, { threshold: 0.2 });
  fones.forEach((f) => olhoFone.observe(f));
}

// ---------- scroll: nome do topo saindo e cartas encolhendo atrás da próxima ----------
if (!semMovimento) {
  const topo = document.getElementById("topo");
  const cartas = [...document.querySelectorAll(".carta")];
  let pedido = false;

  function quadro() {
    pedido = false;
    const alturaTela = innerHeight;

    const sai = Math.min(1, Math.max(0, scrollY / alturaTela));
    topo.style.setProperty("--sai", sai.toFixed(3));

    cartas.forEach((carta, i) => {
      const proxima = cartas[i + 1];
      if (!proxima) return;
      // quanto a próxima carta já subiu por cima desta (0 = longe, 1 = cobriu)
      const topoFixo = parseFloat(getComputedStyle(carta).top);
      const falta = proxima.getBoundingClientRect().top - topoFixo;
      const p = Math.min(1, Math.max(0, 1 - falta / carta.offsetHeight));
      carta.style.setProperty("--encolhe", p.toFixed(3));
    });
  }

  const pede = () => { if (!pedido) { pedido = true; requestAnimationFrame(quadro); } };
  addEventListener("scroll", pede, { passive: true });
  addEventListener("resize", pede);
  quadro();
}
