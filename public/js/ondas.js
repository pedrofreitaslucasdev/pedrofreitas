// Ondas de luz (27/09): fios que fluem devagar no fundo do topo e dos Sistemas, desviam do mouse
// e mudam com a rolagem. Um shader só (WebGL 1), sem biblioteca.
// Leveza: resolução reduzida, pausa fora da tela e com a aba escondida, menos fios no celular.
// Sem WebGL ou com "reduzir movimento": desenha um quadro parado (ou nada) e o site segue igual.

(function () {
  const semMovimento = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const celular = matchMedia("(max-width: 759px)").matches;
  const temMouse = matchMedia("(hover: hover) and (pointer: fine)").matches;

  const VERT = "attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }";
  // n fios formando uma fita que atravessa a tela na diagonal; cada fio tem um núcleo fino e um halo.
  // m = mouse (0-1), s = rolagem (0-1), q = quanto o fundo "respira" (topo mais, sistemas menos)
  const FRAG = `
precision mediump float;
uniform vec2 r; uniform float t; uniform vec2 m; uniform float s; uniform float n;
uniform vec3 nucleo; uniform vec3 halo; uniform float forca; uniform float q; uniform float incl; uniform float alto;
void main() {
  vec2 uv = gl_FragCoord.xy / r;
  float asp = r.x / r.y;
  float x = uv.x * asp;
  float corpo = 0.0, luz = 0.0;
  for (int i = 0; i < 26; i++) {
    float fi = float(i);
    if (fi >= n) break;
    float k = fi / max(n - 1.0, 1.0);
    float base = alto + incl * uv.x + (k - 0.5) * (0.20 + 0.18 * sin(t * 0.13 + x * 0.9));
    float y = base
      + q * 0.10 * sin(x * 1.25 + t * 0.21 + fi * 0.16)
      + q * 0.045 * sin(x * 2.9 - t * 0.33 + fi * 0.31)
      + 0.08 * s * sin(x * 2.2 + fi * 0.12 + t * 0.1);
    // o mouse abre um caminho: os fios perto dele se afastam pra cima ou pra baixo
    // x*x e não pow(): pow() com base negativa é indefinido no GLSL e apagava blocos de fios
    float dx = (uv.x - m.x) * asp * 3.2;
    float perto = exp(-dx * dx);
    // afastamento suave (tipo lente): sem sign(), que fazia o fio saltar e deixava buracos em degrau
    float dy = y - m.y;
    y += 1.2 * dy * exp(-dy * dy * 40.0) * perto;
    float d = abs(uv.y - y);
    float peso = 0.35 + 0.65 * sin(k * 3.14159);
    corpo += smoothstep(0.0022, 0.0, d) * peso;
    luz += exp(-d * 55.0) * 0.10 * peso;
  }
  // some nas bordas de cima e de baixo e fica mais fraco à esquerda, onde mora o título
  float borda = smoothstep(0.0, 0.25, uv.y) * smoothstep(1.0, 0.7, uv.y);
  float lado = mix(0.45, 1.0, smoothstep(0.0, 0.75, uv.x));
  float a1 = clamp(corpo, 0.0, 1.0) * borda * lado * forca;
  float a2 = clamp(luz, 0.0, 1.0) * borda * lado * forca;
  vec3 cor = nucleo * a1 + halo * a2 * (1.0 - a1);
  gl_FragColor = vec4(cor, clamp(a1 + a2 * (1.0 - a1), 0.0, 1.0));
}`;

  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  // cores por fundo: claro = tinta verde-oliva com halo lima (o marca-texto do título); escuro = lima brilhando
  const PALETA = {
    claro: { nucleo: hex("#4d6f00"), halo: hex("#b8e62a"), forca: 0.55 },
    escuro: { nucleo: hex("#d4ff3a"), halo: hex("#b7e02a"), forca: 0.85 },
  };

  function cria(host, opcoes) {
    const canvas = document.createElement("canvas");
    canvas.className = "ondas";
    canvas.setAttribute("aria-hidden", "true");
    const gl = canvas.getContext("webgl", { alpha: true, antialias: false, premultipliedAlpha: true, powerPreference: "low-power" });
    if (!gl) return;
    host.prepend(canvas);

    const sh = (tipo, src) => { const s = gl.createShader(tipo); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { canvas.remove(); return; }
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = {};
    ["r", "t", "m", "s", "n", "nucleo", "halo", "forca", "q", "incl", "alto"].forEach((k) => { u[k] = gl.getUniformLocation(prog, k); });

    gl.uniform1f(u.n, celular ? 14 : 24);
    gl.uniform1f(u.q, opcoes.q);
    gl.uniform1f(u.incl, opcoes.incl);
    gl.uniform1f(u.alto, opcoes.alto);

    // resolução menor que a tela: o fio tem halo, então não perde nitidez que se note
    const escala = Math.min(devicePixelRatio || 1, 2) * (celular ? 0.5 : 0.65);
    function tamanho() {
      const w = Math.max(1, Math.round(canvas.clientWidth * escala));
      const h = Math.max(1, Math.round(canvas.clientHeight * escala));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
      gl.uniform2f(u.r, w, h);
    }
    function cores() {
      const p = PALETA[opcoes.fundo()];
      gl.uniform3fv(u.nucleo, p.nucleo);
      gl.uniform3fv(u.halo, p.halo);
      gl.uniform1f(u.forca, p.forca * opcoes.forca);
    }
    new ResizeObserver(() => { tamanho(); if (!rodando) desenha(); }).observe(canvas);
    new MutationObserver(() => { cores(); if (!rodando) desenha(); }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-tema"] });
    tamanho(); cores();

    // mouse suavizado; sem mouse, um ponto que passeia devagar pra os fios continuarem desviando
    let mx = 0.7, my = 0.5, alvoX = 0.7, alvoY = 0.5, rolagem = 0;
    if (temMouse) {
      host.addEventListener("pointermove", (e) => {
        const b = canvas.getBoundingClientRect();
        alvoX = (e.clientX - b.left) / b.width;
        alvoY = 1 - (e.clientY - b.top) / b.height;
      }, { passive: true });
      host.addEventListener("pointerleave", () => { alvoX = 0.7; alvoY = 0.5; });
    }

    const inicio = performance.now() - 20000 * Math.random();
    let rodando = false, visivel = false, ultimo = 0;
    function desenha(agora = performance.now()) {
      const t = (agora - inicio) / 1000;
      if (!temMouse) { alvoX = 0.6 + 0.25 * Math.sin(t * 0.21); alvoY = 0.5 + 0.18 * Math.cos(t * 0.17); }
      mx += (alvoX - mx) * 0.06; my += (alvoY - my) * 0.06;
      const b = host.getBoundingClientRect();
      rolagem += (Math.min(1, Math.max(0, -b.top / Math.max(1, b.height))) - rolagem) * 0.1;
      gl.uniform1f(u.t, semMovimento ? 12 : t);
      gl.uniform2f(u.m, mx, my);
      gl.uniform1f(u.s, rolagem);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    function quadro(agora) {
      if (!rodando) return;
      requestAnimationFrame(quadro);
      if (celular && agora - ultimo < 32) return;   // celular: ~30 quadros por segundo bastam
      ultimo = agora;
      desenha(agora);
    }
    function liga() {
      const deve = visivel && !document.hidden && !semMovimento;
      if (deve && !rodando) { rodando = true; requestAnimationFrame(quadro); }
      if (!deve) rodando = false;
    }
    new IntersectionObserver(([e]) => { visivel = e.isIntersecting; liga(); }).observe(canvas);
    document.addEventListener("visibilitychange", liga);
    canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); rodando = false; canvas.remove(); });

    desenha();
    requestAnimationFrame(() => canvas.classList.add("ondas--pronta"));
  }

  const temaDe = () => document.documentElement.dataset.tema === "escuro" ? "escuro" : "claro";
  const oposto = () => (temaDe() === "claro" ? "escuro" : "claro");   // Sistemas tem a cor invertida
  function comeca() {
    const topo = document.getElementById("topo");
    const sistemas = document.getElementById("sistemas");
    if (topo) cria(topo, { fundo: temaDe, forca: celular ? 1.35 : 1, q: 1, incl: 0.28, alto: 0.30 });
    if (sistemas) cria(sistemas, { fundo: oposto, forca: celular ? 0.5 : 0.95, q: 0.7, incl: -0.14, alto: 0.62 });
  }
  // depois da primeira pintura: o efeito chega com um fade e não atrasa o título
  const depois = window.requestIdleCallback || ((f) => setTimeout(f, 200));
  document.readyState === "complete" ? depois(comeca) : addEventListener("load", () => depois(comeca), { once: true });
})();
