// Fio de luz v3 (27/09, estudo quadro a quadro do Relay da getlayers):
// não é mais uma faixa pintada pixel a pixel. São CENTENAS de filamentos de 1px, distribuídos em
// volta de um TUBO que gira sobre si mesmo, aperta num nó de luz e abre em leque. Os filamentos da
// frente (z > 0) brilham mais; a luz corre por dentro deles; uma poeira de luz (nítida e bokeh)
// flutua em volta. O brilho difuso (bloom) sai de desenhar a mesma cena em resolução baixa e
// esticar por cima (o filtro linear borra de graça), em duas escalas.
//
// O caminho do tubo é preso à PÁGINA (p = telas desde o topo): rolar é andar por ele.
// Canvas fixo e transparente atrás do conteúdo, SEM cor de fundo (regra 1 do Safari do iOS 26).
// Sem WebGL: nada acontece. "Reduzir movimento": quadro parado, redesenhado só na rolagem.

(function () {
  const semMovimento = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const celular = matchMedia("(max-width: 759px)").matches;
  const temMouse = matchMedia("(hover: hover) and (pointer: fine)").matches;

  // quantidade: o celular recebe menos filamentos, mas os mesmos 60 quadros
  const FILAMENTOS = celular ? 150 : 260;
  const SEGMENTOS = celular ? 120 : 180;
  const POEIRA = celular ? 160 : 320;
  const JANELA = 1.6;   // quantas telas de caminho a geometria cobre (a partir de 0,3 tela acima)

  // ---------- caminho do tubo (o mesmo nos dois shaders) ----------
  // cx: centro, em fração da largura. raio: em alturas de tela; pulsa pra formar nós e leques.
  // gira: torção ao longo do caminho + tempo (é isso que faz os fios se cruzarem e "fluírem").
  const CAMINHO = `
uniform float t; uniform float rola; uniform float asp; uniform vec2 m; uniform float agito;
// curva em S que varre a tela: entra no alto à direita, desce cruzando pro meio e volta
// tela estreita (celular): o caminho corre mais pra direita e curva menos, pra não passar atrás do texto
float estreito() { return 1.0 - min(1.0, asp * 1.25); }
float cx(float p) { return 0.64 + 0.36 * estreito() + 0.26 * (1.0 - 0.5 * estreito()) * sin(p * 1.8 + 2.0) + 0.04 * sin(p * 3.1 + 1.3 + t * 0.06); }
float raio(float p) {
  // aberto quase sempre; a cada ~2,2 telas aperta RÁPIDO num nó e volta a abrir em leque
  // (com o seno ao quadrado o aperto durava muito e virava um tubo de neon sólido)
  float c = fract(p * 0.45 + 0.23) - 0.5;   // o 1º nó cai em p = 0,6: no topo, ao lado do título
  float aperto = exp(-c * c * 90.0);
  float largo = 0.75 + 0.25 * sin(p * 2.3 + t * 0.07);
  return (0.03 + 0.15 * largo * (1.0 - aperto)) * min(1.0, asp * 1.25) * (1.0 + agito * 0.6);
}
float gira(float p) { return p * 2.4 + t * 0.22; }
// o mouse (ou o dedo) abre caminho: lente suave, em fração da largura
float lente(float x, float p) {
  float d = x - m.x;
  return x + 1.0 * d * exp(-d * d * 55.0) * exp(-pow((p - m.y) * 3.0, 2.0));
}
vec2 naTela(float x, float p) { return vec2(x * 2.0 - 1.0, 1.0 - 2.0 * (p - rola)); }
`;

  const VERT_FIO = `
precision highp float;
attribute float s; attribute vec4 f;   // s: 0-1 ao longo; f: ângulo, raio relativo, fase, tipo (1 = azul)
${CAMINHO}
varying float v_luz; varying float v_azul; varying float v_quente;
void main() {
  float p = rola - 0.3 + s * ${JANELA.toFixed(2)};
  float ang = f.x + gira(p);
  float ondula = 1.0 + 0.18 * sin(p * 6.0 + f.z * 6.28 + t * 0.4);
  float r = raio(p) * f.y * ondula;
  float x = cx(p) + r * cos(ang) / asp;
  float z = sin(ang);                               // -1 fundo, 1 frente
  x = lente(x, p);
  gl_Position = vec4(naTela(x, p), 0.0, 1.0);
  // a luz corre pra baixo por dentro do filamento
  float pulso = pow(0.5 + 0.5 * sin(p * 7.0 - t * 1.7 + f.z * 40.0), 12.0);
  float frente = mix(0.25, 1.0, z * 0.5 + 0.5);
  // some nas bordas de cima e de baixo da janela de geometria
  float y = p - rola;
  float borda = smoothstep(-0.3, -0.05, y) * smoothstep(1.3, 1.05, y);
  // onde o tubo aperta, cada fio brilha menos (a soma dos fios já acende o nó)
  // o NÓ: onde o tubo aperta, os fios esquentam (brilham mais e puxam pro branco), como no Relay
  float quente = 1.0 - smoothstep(0.035, 0.09, raio(p) / max(min(1.0, asp * 1.25), 0.01));
  float densidade = 1.0 + 0.9 * quente * (1.0 - 0.6 * estreito());
  // a maioria dos filamentos é fraca e poucos brilham forte (é o que dá a textura de fibra)
  float forte = 0.18 + 0.82 * pow(fract(f.z * 13.73), 3.0);
  v_luz = frente * forte * (0.6 + 1.6 * pulso) * borda * densidade;
  v_azul = f.w;
  v_quente = quente;
}`;
  const FRAG_FIO = `
precision mediump float;
uniform vec3 corFio; uniform vec3 corAzul; uniform float ganho;
varying float v_luz; varying float v_azul; varying float v_quente;
void main() {
  vec3 c = mix(mix(corFio, corAzul, v_azul), vec3(0.96, 1.0, 0.82), v_quente * 0.35);
  float a = v_luz * ganho;
  gl_FragColor = vec4(c * a, a);
}`;

  // poeira: pontos em volta do tubo, descendo com o fluxo; os grandes são bokeh (desfocados)
  const VERT_PO = `
precision highp float;
attribute vec4 q;   // posição inicial 0-1, ângulo, raio relativo, tamanho 0-1
${CAMINHO}
uniform float dpr;
varying float v_luz; varying float v_mole;
void main() {
  float vel = 0.02 + 0.03 * fract(q.x * 7.13);
  float p = rola - 0.3 + fract(q.x + t * vel) * ${JANELA.toFixed(2)};
  float ang = q.y + gira(p) * 0.6;
  float r = raio(p) * (0.4 + 1.6 * q.z) + 0.02 * q.z;
  float x = lente(cx(p) + r * cos(ang) / asp, p);
  gl_Position = vec4(naTela(x, p), 0.0, 1.0);
  float bokeh = step(0.86, q.w);
  gl_PointSize = mix(1.6, 2.6, q.w) * dpr + bokeh * (6.0 + 14.0 * q.w) * dpr;
  float y = p - rola;
  float borda = smoothstep(-0.3, -0.05, y) * smoothstep(1.3, 1.05, y);
  float pisca = 0.55 + 0.45 * sin(t * (1.0 + 3.0 * q.w) + q.x * 50.0);
  v_luz = borda * pisca * mix(0.9, 0.16, bokeh);
  v_mole = bokeh;
}`;
  const FRAG_PO = `
precision mediump float;
uniform vec3 corFio; uniform float ganho;
varying float v_luz; varying float v_mole;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float forma = mix(smoothstep(1.0, 0.2, d), smoothstep(1.0, 0.75, d) * 0.8 + 0.2 * smoothstep(1.0, 0.0, d), v_mole);
  float a = forma * v_luz * ganho;
  gl_FragColor = vec4(mix(corFio, vec3(1.0), 0.45 * (1.0 - v_mole)) * a, a);
}`;

  // tela cheia: estica a textura do brilho por cima (com um borrão de 5 amostras)
  const VERT_TELA = "attribute vec2 a; varying vec2 uv; void main(){ uv = a * 0.5 + 0.5; gl_Position = vec4(a, 0.0, 1.0); }";
  const FRAG_TELA = `
precision mediump float;
uniform sampler2D tex; uniform vec2 passo; uniform float ganho;
varying vec2 uv;
void main() {
  vec4 c = texture2D(tex, uv) * 0.4
         + texture2D(tex, uv + vec2(passo.x, 0.0)) * 0.15 + texture2D(tex, uv - vec2(passo.x, 0.0)) * 0.15
         + texture2D(tex, uv + vec2(0.0, passo.y)) * 0.15 + texture2D(tex, uv - vec2(0.0, passo.y)) * 0.15;
  gl_FragColor = c * ganho;
}`;

  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  // escuro: luz somada (aditiva) com bloom; claro: tinta verde-oliva por cima do papel, sem bloom
  const PALETA = {
    escuro: { fio: hex("#c9f23c"), azul: hex("#58b4ff"), ganhoFio: celular ? 0.26 : 0.13, ganhoPo: 0.85, bloom: celular ? [1.5, 1.2] : [1.15, 0.9], aditivo: true },
    claro: { fio: hex("#557a00"), azul: hex("#2f6fa8"), ganhoFio: celular ? 0.13 : 0.1, ganhoPo: 0.35, bloom: [0, 0], aditivo: false },
  };

  function comeca() {
    const canvas = document.createElement("canvas");
    canvas.className = "luz";
    canvas.setAttribute("aria-hidden", "true");
    const gl = canvas.getContext("webgl", { alpha: true, antialias: true, premultipliedAlpha: true, powerPreference: "high-performance" });
    if (!gl) return;

    function programa(v, f) {
      const pr = gl.createProgram();
      [[gl.VERTEX_SHADER, v], [gl.FRAGMENT_SHADER, f]].forEach(([tipo, src]) => {
        const s = gl.createShader(tipo); gl.shaderSource(s, src); gl.compileShader(s); gl.attachShader(pr, s);
      });
      gl.linkProgram(pr);
      if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { console.warn("luz.js:", gl.getProgramInfoLog(pr)); return null; }
      const u = {}, n = gl.getProgramParameter(pr, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < n; i++) { const nome = gl.getActiveUniform(pr, i).name; u[nome] = gl.getUniformLocation(pr, nome); }
      return { pr, u };
    }
    const fio = programa(VERT_FIO, FRAG_FIO);
    const po = programa(VERT_PO, FRAG_PO);
    const tela = programa(VERT_TELA, FRAG_TELA);
    if (!fio || !po || !tela) return;
    document.body.prepend(canvas);

    // ---------- geometria (feita uma vez; quem mexe é o shader) ----------
    // filamentos em pares de vértices (gl.LINES): s, ângulo, raio relativo, fase, tipo
    const dadosFio = new Float32Array(FILAMENTOS * SEGMENTOS * 2 * 5);
    let k = 0;
    for (let i = 0; i < FILAMENTOS; i++) {
      const ang = Math.random() * Math.PI * 2;
      const rr = Math.sqrt(Math.random());          // mais fios perto da borda do tubo, como uma casca
      const fase = Math.random();
      const azul = Math.random() < 0.12 ? 1 : 0;
      // cada filamento começa e termina num trecho diferente: parece que entram e saem do feixe
      const a0 = Math.random() * 0.15, a1 = 1 - Math.random() * 0.15;
      for (let j = 0; j < SEGMENTOS; j++) {
        for (const jj of [j, j + 1]) {
          dadosFio[k++] = a0 + (a1 - a0) * (jj / SEGMENTOS);
          dadosFio[k++] = ang; dadosFio[k++] = rr; dadosFio[k++] = fase; dadosFio[k++] = azul;
        }
      }
    }
    const bufFio = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufFio);
    gl.bufferData(gl.ARRAY_BUFFER, dadosFio, gl.STATIC_DRAW);
    const nFio = FILAMENTOS * SEGMENTOS * 2;

    const dadosPo = new Float32Array(POEIRA * 4);
    for (let i = 0; i < POEIRA; i++) {
      dadosPo[i * 4] = Math.random(); dadosPo[i * 4 + 1] = Math.random() * Math.PI * 2;
      dadosPo[i * 4 + 2] = Math.random(); dadosPo[i * 4 + 3] = Math.random();
    }
    const bufPo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufPo);
    gl.bufferData(gl.ARRAY_BUFFER, dadosPo, gl.STATIC_DRAW);

    const bufTela = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufTela);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    function liga(prog, buf, attrs) {
      for (let i = 0; i < 4; i++) gl.disableVertexAttribArray(i);   // o programa anterior deixa atributos ligados
      gl.useProgram(prog.pr);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      let off = 0; const total = attrs.reduce((a, [, n]) => a + n, 0) * 4;
      attrs.forEach(([nome, n]) => {
        const loc = gl.getAttribLocation(prog.pr, nome);
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, n, gl.FLOAT, false, total, off);
        off += n * 4;
      });
    }

    // ---------- alvos do brilho (1/4 e 1/10 da tela) ----------
    function alvo() {
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const fb = gl.createFramebuffer();
      return { tex, fb, w: 0, h: 0 };
    }
    const brilho1 = alvo(), brilho2 = alvo();
    function dimensiona(a, w, h) {
      a.w = w; a.h = h;
      gl.bindTexture(gl.TEXTURE_2D, a.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, a.fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, a.tex, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    const dpr = Math.min(devicePixelRatio || 1, 2);
    function tamanho() {
      const w = Math.max(1, Math.round(innerWidth * dpr));
      const h = Math.max(1, Math.round(innerHeight * dpr));
      if (canvas.width === w && canvas.height === h) return;
      canvas.width = w; canvas.height = h;
      dimensiona(brilho1, Math.max(1, Math.round(w / 4)), Math.max(1, Math.round(h / 4)));
      dimensiona(brilho2, Math.max(1, Math.round(w / 10)), Math.max(1, Math.round(h / 10)));
    }

    let pal = PALETA.escuro;
    const cores = () => { pal = PALETA[document.documentElement.dataset.tema === "claro" ? "claro" : "escuro"]; };
    addEventListener("resize", () => { tamanho(); desenha(); }, { passive: true });
    new MutationObserver(() => { cores(); desenha(); }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-tema"] });
    tamanho(); cores();

    // ---------- mouse / dedo, rolagem e agito ----------
    let mx = 2, my = 0, alvoX = 2, alvoY = 0;
    if (temMouse) {
      let cy = innerHeight / 2;
      addEventListener("pointermove", (e) => { cy = e.clientY; alvoX = e.clientX / innerWidth; alvoY = (scrollY + cy) / innerHeight; }, { passive: true });
      addEventListener("scroll", () => { alvoY = (scrollY + cy) / innerHeight; }, { passive: true });
      document.addEventListener("pointerleave", () => { alvoX = 2; });
    } else {
      let solta = 0;
      const toca = (e) => { clearTimeout(solta); alvoX = e.touches[0].clientX / innerWidth; alvoY = (scrollY + e.touches[0].clientY) / innerHeight; };
      addEventListener("touchstart", toca, { passive: true });
      addEventListener("touchmove", toca, { passive: true });
      addEventListener("touchend", () => { solta = setTimeout(() => { alvoX = 2; }, 700); }, { passive: true });
    }
    let agito = 0, yAntes = scrollY, rola = scrollY / innerHeight;

    function comuns(prog, t) {
      const u = prog.u;
      if (u.t) gl.uniform1f(u.t, t);
      if (u.rola) gl.uniform1f(u.rola, rola);
      if (u.asp) gl.uniform1f(u.asp, innerWidth / innerHeight);
      if (u.m) gl.uniform2f(u.m, mx, my);
      if (u.agito) gl.uniform1f(u.agito, semMovimento ? 0 : agito);
      if (u.corFio) gl.uniform3fv(u.corFio, pal.fio);
      if (u.corAzul) gl.uniform3fv(u.corAzul, pal.azul);
      if (u.dpr) gl.uniform1f(u.dpr, dpr);
    }
    function cena(t, fatorPonto) {
      liga(fio, bufFio, [["s", 1], ["f", 4]]);
      comuns(fio, t);
      gl.uniform1f(fio.u.ganho, pal.ganhoFio);
      gl.drawArrays(gl.LINES, 0, nFio);
      liga(po, bufPo, [["q", 4]]);
      comuns(po, t);
      gl.uniform1f(po.u.ganho, pal.ganhoPo);
      gl.uniform1f(po.u.dpr, dpr * fatorPonto);
      gl.drawArrays(gl.POINTS, 0, POEIRA);
    }
    function estica(origem, ganho) {
      liga(tela, bufTela, [["a", 2]]);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, origem.tex);
      gl.uniform1i(tela.u.tex, 0);
      gl.uniform2f(tela.u.passo, 1.5 / origem.w, 1.5 / origem.h);
      gl.uniform1f(tela.u.ganho, ganho);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    const inicio = performance.now();
    function desenha(agora = performance.now()) {
      const t = semMovimento ? 30 : 30 + (agora - inicio) / 1000;
      mx += (alvoX - mx) * 0.08; my += (alvoY - my) * 0.08;
      rola += (scrollY / innerHeight - rola) * (semMovimento ? 1 : 0.16);
      const vel = Math.min(1, Math.abs(scrollY - yAntes) / innerHeight * 12);
      yAntes = scrollY;
      agito += (vel - agito) * (vel > agito ? 0.25 : 0.04);

      gl.enable(gl.BLEND);
      if (pal.aditivo) {
        // 1) cena em 1/4 da tela -> 2) reduz pra 1/10 -> 3) tela: brilho largo + brilho + fios nítidos
        gl.blendFunc(gl.ONE, gl.ONE);
        gl.bindFramebuffer(gl.FRAMEBUFFER, brilho1.fb);
        gl.viewport(0, 0, brilho1.w, brilho1.h);
        gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
        cena(t, 0.25);
        gl.bindFramebuffer(gl.FRAMEBUFFER, brilho2.fb);
        gl.viewport(0, 0, brilho2.w, brilho2.h);
        gl.clear(gl.COLOR_BUFFER_BIT);
        estica(brilho1, 1.0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT);
        estica(brilho2, pal.bloom[1]);
        estica(brilho1, pal.bloom[0]);
        cena(t, 1);
      } else {
        // claro: tinta por cima do papel (sem somar luz, que some no branco)
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
        cena(t, 1);
      }
    }

    let rodando = false;
    function quadro(agora) {
      if (!rodando) return;
      requestAnimationFrame(quadro);
      desenha(agora);
    }
    function ligaLaco() {
      const deve = !document.hidden && !semMovimento;
      if (deve && !rodando) { rodando = true; requestAnimationFrame(quadro); }
      if (!deve) rodando = false;
    }
    document.addEventListener("visibilitychange", ligaLaco);
    if (semMovimento) addEventListener("scroll", () => requestAnimationFrame(() => desenha()), { passive: true });
    canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); rodando = false; canvas.remove(); });

    desenha();
    ligaLaco();
    requestAnimationFrame(() => canvas.classList.add("luz--pronta"));
  }

  const depois = window.requestIdleCallback || ((f) => setTimeout(f, 200));
  document.readyState === "complete" ? depois(comeca) : addEventListener("load", () => depois(comeca), { once: true });
})();
