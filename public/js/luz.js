// Fio de luz (27/09, referência: Relay da getlayers): UMA fita de fios brilhantes, com partículas
// cintilando e um fio azul, que desce o site inteiro. O caminho é desenhado em coordenadas da PÁGINA,
// então rolar é "andar" ao longo dele. Os fios se abrem em volta do mouse.
// Canvas fixo e transparente atrás do conteúdo (sem cor de fundo: regra 1 do Safari do iOS 26).
// Leveza: meia resolução, pausa com a aba escondida, ~30 quadros e menos fios no celular.
// Sem WebGL: nada acontece. "Reduzir movimento": um quadro parado, redesenhado só na rolagem.

(function () {
  const semMovimento = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const celular = matchMedia("(max-width: 759px)").matches;
  const temMouse = matchMedia("(hover: hover) and (pointer: fine)").matches;

  const VERT = "attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }";
  // p = posição na página em "telas" (0 = topo do site). X em unidades de altura da tela.
  const FRAG = `
precision highp float;
uniform vec2 r; uniform float t; uniform float rola; uniform vec2 m; uniform float n; uniform float agito;
uniform vec3 corFio; uniform vec3 corAzul; uniform float forca; uniform float brilho;

float centro(float p) { return 0.72 + 0.20 * sin(p * 1.05 + 0.35) + 0.06 * sin(p * 2.6 + 1.3); }
float fio(float p, float fi, float k) {
  // agito (0-1) = velocidade da rolagem: rolar rápido abre e acende a fita
  float largura = (0.025 + 0.045 * (0.5 + 0.5 * sin(p * 1.6 + t * 0.18))) * (1.0 + agito * 0.9);
  return centro(p) + largura * sin(p * 2.8 + fi * 0.42 + t * 0.33) * (0.35 + 0.65 * k);
}
float hash(vec2 c) { return fract(sin(dot(c, vec2(127.1, 311.7))) * 43758.5453); }

void main() {
  float asp = r.x / r.y;
  vec2 uv = gl_FragCoord.xy / r;
  float p = rola + (1.0 - uv.y);
  float X = uv.x * asp;
  vec3 cor = vec3(0.0); float alfa = 0.0;

  for (int i = 0; i < 20; i++) {
    float fi = float(i);
    if (fi >= n) break;
    float k = fract(fi * 0.618);
    float x = fio(p, fi, k);
    float x2 = fio(p + 0.01, fi, k);
    // o mouse abre caminho (lente suave, sem saltos)
    float dm = x - m.x;
    float perto = exp(-pow(abs(p - m.y) * 3.0, 2.0));
    x += 1.1 * dm * exp(-dm * dm * 60.0) * perto;
    float incl = (x2 - x) / 0.01 * asp;
    float d = abs(X - x * asp) / sqrt(1.0 + incl * incl);
    float nucleo = smoothstep(0.0022, 0.0, d) * 0.75;
    float halo = exp(-d * 90.0) * 0.07 * brilho * (1.0 + agito * 1.5);
    vec3 c = (i == 3 || i == 11) ? corAzul : corFio;
    float peso = 0.3 + 0.5 * k;
    cor += c * (nucleo + halo) * peso;
    alfa += (nucleo + halo) * peso;
  }
  // névoa de luz em volta da fita toda
  float dc = abs(X - centro(p) * asp);
  float nevoa = exp(-dc * 6.0) * 0.05 * brilho;
  cor += corFio * nevoa; alfa += nevoa;

  // partículas: pontinhos que piscam perto da fita
  vec2 g = vec2(X, p) * 42.0;
  vec2 cel = floor(g);
  float h = hash(cel);
  if (h > 0.93) {
    vec2 pos = cel + 0.5 + 0.35 * vec2(sin(h * 40.0 + t * 0.5), cos(h * 70.0 + t * 0.4));
    float dp = length(g - pos);
    float pisca = 0.5 + 0.5 * sin(t * (1.5 + h * 3.0) + h * 90.0);
    float junto = exp(-dc * 9.0);
    float ponto = smoothstep(0.22, 0.0, dp) * pisca * junto * brilho;
    cor += mix(corFio, vec3(1.0), 0.4) * ponto; alfa += ponto;
  }
  // satura suave (1 - e^-x): muitos fios juntos brilham mais, mas nunca estouram pra branco
  cor = 1.0 - exp(-cor * forca * 1.2);
  alfa = clamp(1.0 - exp(-alfa * forca * 1.2), 0.0, 0.85);
  gl_FragColor = vec4(cor, alfa);
}`;

  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  // escuro: lima que brilha (com névoa e partículas); claro: tinta verde-oliva, quase sem brilho
  const PALETA = {
    escuro: { fio: hex("#c8f53a"), azul: hex("#5ab8ff"), forca: 0.8, brilho: 1.0 },
    claro: { fio: hex("#4d6f00"), azul: hex("#2f6fa8"), forca: 0.5, brilho: 0.25 },
  };

  function comeca() {
    const canvas = document.createElement("canvas");
    canvas.className = "luz";
    canvas.setAttribute("aria-hidden", "true");
    const gl = canvas.getContext("webgl", { alpha: true, antialias: false, premultipliedAlpha: true, powerPreference: "low-power" });
    if (!gl) return;
    document.body.prepend(canvas);

    const sh = (tipo, src) => { const s = gl.createShader(tipo); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { canvas.remove(); return; }
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "a");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = {};
    ["r", "t", "rola", "m", "n", "corFio", "corAzul", "forca", "brilho", "agito"].forEach((k) => { u[k] = gl.getUniformLocation(prog, k); });
    gl.uniform1f(u.n, celular ? 11 : 18);

    const escala = Math.min(devicePixelRatio || 1, 2) * (celular ? 0.45 : 0.55);
    function tamanho() {
      const w = Math.max(1, Math.round(innerWidth * escala));
      const h = Math.max(1, Math.round(innerHeight * escala));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
      gl.uniform2f(u.r, w, h);
    }
    function cores() {
      const pal = PALETA[document.documentElement.dataset.tema === "claro" ? "claro" : "escuro"];
      gl.uniform3fv(u.corFio, pal.fio);
      gl.uniform3fv(u.corAzul, pal.azul);
      gl.uniform1f(u.forca, pal.forca);
      gl.uniform1f(u.brilho, pal.brilho);
    }
    addEventListener("resize", () => { tamanho(); desenha(); }, { passive: true });
    new MutationObserver(() => { cores(); desenha(); }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-tema"] });
    tamanho(); cores();

    // mouse em coordenadas da página (x: 0-1 da largura; y: telas desde o topo do site)
    let mx = 2, my = 0, alvoX = 2, alvoY = 0;
    if (temMouse) {
      let cy = innerHeight / 2;
      addEventListener("pointermove", (e) => { cy = e.clientY; alvoX = e.clientX / innerWidth; alvoY = (scrollY + cy) / innerHeight; }, { passive: true });
      addEventListener("scroll", () => { alvoY = (scrollY + cy) / innerHeight; }, { passive: true });
      document.addEventListener("pointerleave", () => { alvoX = 2; });
    } else {
      // celular: o dedo faz o papel do mouse; soltou, a fita volta sozinha
      let solta = 0;
      const toca = (e) => { clearTimeout(solta); alvoX = e.touches[0].clientX / innerWidth; alvoY = (scrollY + e.touches[0].clientY) / innerHeight; };
      addEventListener("touchstart", toca, { passive: true });
      addEventListener("touchmove", toca, { passive: true });
      addEventListener("touchend", () => { solta = setTimeout(() => { alvoX = 2; }, 700); }, { passive: true });
    }
    let agito = 0, yAntes = scrollY;
    let rola = scrollY / innerHeight;

    const inicio = performance.now();
    function desenha(agora = performance.now()) {
      const t = semMovimento ? 20 : 20 + (agora - inicio) / 1000;
      mx += (alvoX - mx) * 0.08; my += (alvoY - my) * 0.08;
      // a fita acompanha a rolagem com um leve atraso: parece ter peso
      const alvoRola = scrollY / innerHeight;
      rola += (alvoRola - rola) * (semMovimento ? 1 : 0.18);
      // velocidade da rolagem em telas por quadro, suavizada: sobe rápido, desce devagar
      const vel = Math.min(1, Math.abs(scrollY - yAntes) / innerHeight * 12);
      yAntes = scrollY;
      agito += (vel - agito) * (vel > agito ? 0.3 : 0.05);
      gl.uniform1f(u.agito, semMovimento ? 0 : agito);
      gl.uniform1f(u.t, t);
      gl.uniform1f(u.rola, rola);
      gl.uniform2f(u.m, mx, my);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    let rodando = false, ultimo = 0;
    function quadro(agora) {
      if (!rodando) return;
      requestAnimationFrame(quadro);
      if (celular && agora - ultimo < 32) return;
      ultimo = agora;
      desenha(agora);
    }
    function liga() {
      const deve = !document.hidden && !semMovimento;
      if (deve && !rodando) { rodando = true; requestAnimationFrame(quadro); }
      if (!deve) rodando = false;
    }
    document.addEventListener("visibilitychange", liga);
    if (semMovimento) addEventListener("scroll", () => requestAnimationFrame(() => desenha()), { passive: true });
    canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); rodando = false; canvas.remove(); });

    desenha();
    liga();
    requestAnimationFrame(() => canvas.classList.add("luz--pronta"));
  }

  const depois = window.requestIdleCallback || ((f) => setTimeout(f, 200));
  document.readyState === "complete" ? depois(comeca) : addEventListener("load", () => depois(comeca), { once: true });
})();
