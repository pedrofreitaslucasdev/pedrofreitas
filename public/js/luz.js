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
  const FILAMENTOS = celular ? 90 : 260;
  const SEGMENTOS = celular ? 96 : 180;
  const POEIRA = celular ? 70 : 320;
  const JANELA = 1.6;   // quantas telas de caminho a geometria cobre (a partir de 0,3 tela acima)

  // ---------- caminho do tubo (o mesmo nos dois shaders) ----------
  // cx: centro, em fração da largura. raio: em alturas de tela; pulsa pra formar nós e leques.
  // gira: torção ao longo do caminho + tempo (é isso que faz os fios se cruzarem e "fluírem").
  const CAMINHO = `
uniform float t; uniform float rola; uniform float asp; uniform vec4 mola; uniform float agito;
// curva em S que varre a tela: entra no alto à direita, desce cruzando pro meio e volta
// tela estreita (celular): o caminho corre mais pra direita e curva menos, pra não passar atrás do texto
float estreito() { return 1.0 - min(1.0, asp * 1.25); }
float cx(float p) {
  float pc = 0.64 + 0.26 * sin(p * 1.8 + 2.0);
  // celular: à direita enquanto o título está na tela (p 0 a 0,8) e dobra pro meio logo abaixo dele
  float cel = 0.6 + 0.32 * sin(p * 2.0 + 0.9);
  return mix(pc, cel, smoothstep(0.0, 0.2, estreito())) + 0.03 * sin(p * 3.1 + 1.3 + t * 0.06);
}
float raio(float p) {
  // aberto quase sempre; a cada ~2,2 telas aperta RÁPIDO num nó e volta a abrir em leque
  // (com o seno ao quadrado o aperto durava muito e virava um tubo de neon sólido)
  // 1º nó: no computador ao lado do título (p = 0,6); no celular logo abaixo do topo (p = 1,1), longe do texto
  float c = fract(p * 0.45 + mix(0.23, 0.005, estreito())) - 0.5;
  float aperto = exp(-c * c * 90.0);
  float largo = 0.75 + 0.25 * sin(p * 2.3 + t * 0.07);
  return (0.03 + 0.15 * largo * (1.0 - aperto)) * min(1.0, asp * 1.25);
}
float gira(float p) { return p * 2.4 + t * 0.045; }
// mouse/dedo = MOLA (27/09; a lente dobrava os fios de um jeito duro): o movimento dá um empurrão
// no feixe perto do ponto (mola.x, em fração da largura) e abre o leque (mola.y); o app solta a
// mola e o feixe ondula, passa do ponto e volta. mola.z = trecho do caminho que recebe o empurrão.
float perto(float p) { return exp(-pow((p - mola.z) * 2.2, 2.0)); }
vec2 naTela(float x, float p) { return vec2(x * 2.0 - 1.0, 1.0 - 2.0 * (p - rola)); }
`;

  const VERT_FIO = `
precision highp float;
attribute float s; attribute vec4 f;   // s: 0-1 ao longo; f: ângulo, raio relativo, fase, tipo (1 = azul)
${CAMINHO}
varying float v_luz; varying float v_azul;
void main() {
  float p = rola - 0.3 + s * ${JANELA.toFixed(2)};
  float ang = f.x + gira(p);
  float ondula = 1.0 + 0.18 * sin(p * 6.0 + f.z * 6.28 + t * 0.4);
  float w = perto(p);
  float r = raio(p) * f.y * ondula * (1.0 + mola.y * w);
  float x = cx(p) + r * cos(ang) / asp + mola.x * w;
  float z = sin(ang);                               // -1 fundo, 1 frente
  gl_Position = vec4(naTela(x, p), 0.0, 1.0);
  // a luz corre pra baixo por dentro do filamento
  // corrente: "glóbulos" de luz descendo por dentro de cada fio, a 0,35-0,8 tela por segundo,
  // cada fio no seu ritmo e com a sua fase; um segundo trem mais lento e espaçado por baixo
  float ritmo = 0.35 + 0.45 * fract(f.z * 7.31);
  // espaçados (~1,6 tela entre um e outro no mesmo fio) e curtos: poucos acesos por vez, bem visíveis
  float pulso = pow(0.5 + 0.5 * sin((p - t * ritmo) * 4.0 + f.z * 40.0), 70.0);
  float frente = mix(0.25, 1.0, z * 0.5 + 0.5);
  // some nas bordas de cima e de baixo da janela de geometria
  float y = p - rola;
  float borda = smoothstep(-0.3, -0.05, y) * (1.0 - smoothstep(1.05, 1.3, y));
  // no nó os fios se somam sozinhos; cada um brilha um pouco menos pra soma não estourar
  float densidade = mix(0.6, 1.0, smoothstep(0.03, 0.09, raio(p) / max(min(1.0, asp * 1.25), 0.01)));
  // a maioria dos filamentos é fraca e poucos brilham forte (é o que dá a textura de fibra)
  // ~75% quase apagados, ~20% médios, ~5% destaques (como no Relay)
  float forte = 0.04 + 0.96 * pow(fract(f.z * 13.73), 6.0);
  // o glóbulo acende até os fios apagados: é ele que mostra o fluxo
  v_luz = frente * (forte * 0.85 + (0.3 + forte) * 2.6 * pulso) * borda * densidade;
  v_azul = f.w;
}`;
  const FRAG_FIO = `
precision mediump float;
uniform vec3 corFio; uniform vec3 corAzul; uniform float ganho; uniform float canal;
varying float v_luz; varying float v_azul;
void main() {
  float a = v_luz * ganho;
  // canal = 1 (escuro): guarda só INTENSIDADE (vermelho = lima, verde = azul); a cor entra na
  // composição final, que limita o brilho sem deixar virar branco
  if (canal > 0.5) gl_FragColor = vec4(a * (1.0 - v_azul), a * v_azul, 0.0, a);
  else gl_FragColor = vec4(mix(corFio, corAzul, v_azul) * a, a);
}`;

  // poeira: pontos em volta do tubo, descendo com o fluxo; os grandes são bokeh (desfocados)
  const VERT_PO = `
precision highp float;
attribute vec4 q;   // posição inicial 0-1, ângulo, raio relativo, tamanho 0-1
${CAMINHO}
uniform float dpr;
varying float v_luz; varying float v_mole;
void main() {
  float vel = (0.18 + 0.32 * fract(q.x * 7.13)) / ${JANELA.toFixed(2)};   // 0,18-0,5 tela/s
  float J = ${JANELA.toFixed(2)};
  float p = rola - 0.3 + mod(q.x * J + t * vel * J - rola, J);
  float ang = q.y + gira(p) * 0.6;
  float w = perto(p);
  float r = (raio(p) * (0.4 + 1.6 * q.z) + 0.02 * q.z) * (1.0 + mola.y * w);
  float x = cx(p) + r * cos(ang) / asp + mola.x * w;
  gl_Position = vec4(naTela(x, p), 0.0, 1.0);
  float bokeh = step(0.86, q.w);
  // celular: bokeh menor (as bolas grandes pareciam falsas na tela pequena)
  gl_PointSize = mix(1.6, 2.6, q.w) * dpr + bokeh * (6.0 + 14.0 * q.w) * mix(1.0, 0.45, estreito()) * dpr;
  float y = p - rola;
  float borda = smoothstep(-0.3, -0.05, y) * (1.0 - smoothstep(1.05, 1.3, y));
  float pisca = 0.55 + 0.45 * sin(t * (1.0 + 3.0 * q.w) + q.x * 50.0);
  v_luz = borda * pisca * mix(0.9, mix(0.16, 0.08, estreito()), bokeh);
  v_mole = bokeh;
}`;
  const FRAG_PO = `
precision mediump float;
uniform vec3 corFio; uniform float ganho; uniform float canal;
varying float v_luz; varying float v_mole;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float forma = mix(1.0 - smoothstep(0.2, 1.0, d), (1.0 - smoothstep(0.75, 1.0, d)) * 0.8 + 0.2 * (1.0 - d), v_mole);
  float a = forma * v_luz * ganho;
  if (canal > 0.5) gl_FragColor = vec4(a, 0.0, 0.0, a);
  else gl_FragColor = vec4(corFio * a, a);
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

  // escuro: soma fios nítidos + dois brilhos, pinta de lima/azul e limita o brilho PRESERVANDO a cor
  // (1 - e^-x no canal mais forte): o encontro dos fios fica um lima intenso, nunca branco
  const FRAG_FINAL = `
precision mediump float;
uniform sampler2D nit; uniform sampler2D b1; uniform sampler2D b2;
uniform vec2 p1; uniform vec2 p2; uniform float g1; uniform float g2; uniform float k;
uniform vec3 corFio; uniform vec3 corAzul;
varying vec2 uv;
vec2 borra(sampler2D tx, vec2 ps) {
  return texture2D(tx, uv).rg * 0.4
       + (texture2D(tx, uv + vec2(ps.x, 0.0)).rg + texture2D(tx, uv - vec2(ps.x, 0.0)).rg
        + texture2D(tx, uv + vec2(0.0, ps.y)).rg + texture2D(tx, uv - vec2(0.0, ps.y)).rg) * 0.15;
}
void main() {
  vec2 i = texture2D(nit, uv).rg + borra(b1, p1) * g1 + borra(b2, p2) * g2;
  vec3 c = corFio * i.r + corAzul * i.g;
  float m = max(max(c.r, c.g), c.b);
  c *= (1.0 - exp(-m * k)) / max(m, 0.0001);
  gl_FragColor = vec4(c, max(max(c.r, c.g), c.b));
}`;

  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  // escuro: luz somada (aditiva) com bloom; claro: tinta verde-oliva por cima do papel, sem bloom
  const PALETA = {
    escuro: { fio: hex("#c9f23c"), azul: hex("#58b4ff"), ganhoFio: celular ? 0.45 : 0.32, ganhoPo: 0.35, bloom: celular ? [2.8, 3.2] : [2.4, 2.8], k: 2.0, aditivo: true },
    // claro: fios em tinta oliva; aura, partículas e bokeh em lima (é o que dá vida no papel)
    claro: { fio: hex("#4a6b00"), azul: hex("#2f6fa8"), aura: hex("#a8d61c"), po: hex("#7fae00"), ganhoFio: celular ? 0.42 : 0.34, ganhoPo: 1.15, bloom: [1.1, 0], aditivo: false },
  };

  function comeca() {
    const canvas = document.createElement("canvas");
    canvas.className = "luz";
    canvas.setAttribute("aria-hidden", "true");
    // WebGL2 quando existir (iPhone tem): só ele suaviza as bordas (MSAA) numa imagem intermediária.
    // Sem isso os fios de 1px saíam serrilhados, com cara de 720p (27/09).
    const opcoes = { alpha: true, antialias: true, premultipliedAlpha: true, powerPreference: "high-performance" };
    const gl = canvas.getContext("webgl2", opcoes) || canvas.getContext("webgl", opcoes);
    const gl2 = typeof WebGL2RenderingContext !== "undefined" && gl instanceof WebGL2RenderingContext;
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
    const final = programa(VERT_TELA, FRAG_FINAL);
    if (!fio || !po || !tela || !final) return;
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
    const meio = alvo(), brilho1 = alvo(), brilho2 = alvo(), nitido = alvo();
    function dimensiona(a, w, h) {
      a.w = w; a.h = h;
      gl.bindTexture(gl.TEXTURE_2D, a.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, a.fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, a.tex, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    const msaa = gl2 ? { rb: gl.createRenderbuffer(), fb: gl.createFramebuffer() } : null;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    function tamanho() {
      const w = Math.max(1, Math.round(innerWidth * dpr));
      const h = Math.max(1, Math.round(innerHeight * dpr));
      if (canvas.width === w && canvas.height === h) return;
      canvas.width = w; canvas.height = h;
      dimensiona(meio, Math.max(1, Math.round(w / 2)), Math.max(1, Math.round(h / 2)));
      dimensiona(brilho1, Math.max(1, Math.round(w / 4)), Math.max(1, Math.round(h / 4)));
      dimensiona(brilho2, Math.max(1, Math.round(w / 8)), Math.max(1, Math.round(h / 8)));
      dimensiona(nitido, w, h);
      if (gl2) {
        // fios nítidos são desenhados aqui, com 4 amostras por pixel, e copiados pro "nitido"
        gl.bindRenderbuffer(gl.RENDERBUFFER, msaa.rb);
        gl.renderbufferStorageMultisample(gl.RENDERBUFFER, Math.min(4, gl.getParameter(gl.MAX_SAMPLES)), gl.RGBA8, w, h);
        gl.bindFramebuffer(gl.FRAMEBUFFER, msaa.fb);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, msaa.rb);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      }
    }

    let pal = PALETA.escuro;
    const cores = () => { pal = PALETA[document.documentElement.dataset.tema === "claro" ? "claro" : "escuro"]; };
    addEventListener("resize", () => { tamanho(); desenha(); }, { passive: true });
    new MutationObserver(() => { cores(); desenha(); }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-tema"] });
    tamanho(); cores();

    // ---------- mouse / dedo: mola ----------
    // O movimento perto do feixe vira força: empurra (x) e abre o leque (abre). A mola puxa de
    // volta com amortecimento, então o feixe balança uma ou duas vezes e assenta, como fio de verdade.
    const mola = { x: 0, vx: 0, abre: 0, va: 0, foco: 0.5 };
    const centroJs = (p) => {
      const e = 1 - Math.min(1, innerWidth / innerHeight * 1.25);
      return 0.64 + 0.2 * e + 0.26 * (1 - 0.1 * e) * Math.sin(p * 1.8 + 2.0);
    };
    let ultX = null, ultY = null;
    function empurra(cx_, cy_) {
      if (ultX !== null) {
        const dx = (cx_ - ultX) / innerWidth, dy = (cy_ - ultY) / innerHeight;
        const p = (scrollY + cy_) / innerHeight, x = cx_ / innerWidth;
        const proximo = Math.exp(-Math.pow((x - centroJs(p)) / 0.22, 2));
        mola.foco += (p - mola.foco) * 0.35;
        mola.vx += dx * 0.12 * proximo;
        mola.va += Math.min(0.02, Math.hypot(dx, dy) * 0.4) * proximo;
      }
      ultX = cx_; ultY = cy_;
    }
    if (temMouse) {
      addEventListener("pointermove", (e) => empurra(e.clientX, e.clientY), { passive: true });
      document.addEventListener("pointerleave", () => { ultX = null; });
    }   // no toque não empurra: arrastar o dedo já rola a página, e as duas coisas juntas tremiam
    // quase criticamente amortecida (sem rebote exagerado) e medida em tempo, não em quadros
    function passoMola(dt) {
      const n = Math.min(4, Math.max(1, Math.round(dt / 16.7)));
      for (let i = 0; i < n; i++) {
        mola.vx += -mola.x * 0.02 - mola.vx * 0.24;
        mola.x = Math.max(-0.02, Math.min(0.02, mola.x + mola.vx));
        mola.va += -mola.abre * 0.02 - mola.va * 0.24;
        mola.abre = Math.max(-0.05, Math.min(0.1, mola.abre + mola.va));
      }
    }
    let antes = performance.now();
    let agito = 0, yAntes = scrollY, rola = scrollY / innerHeight;

    function comuns(prog, t) {
      const u = prog.u;
      if (u.t) gl.uniform1f(u.t, t);
      if (u.rola) gl.uniform1f(u.rola, rola);
      if (u.asp) gl.uniform1f(u.asp, innerWidth / innerHeight);
      if (u.mola) gl.uniform4f(u.mola, mola.x, mola.abre, mola.foco, 0);
      if (u.agito) gl.uniform1f(u.agito, semMovimento ? 0 : agito);
      if (u.corFio) gl.uniform3fv(u.corFio, pal.fio);
      if (u.corAzul) gl.uniform3fv(u.corAzul, pal.azul);
      if (u.dpr) gl.uniform1f(u.dpr, dpr);
    }
    let emAura = false;   // claro: a passada do brilho pinta em lima em vez de oliva
    function cena(t, fatorPonto) {
      const canal = pal.aditivo ? 1 : 0;
      liga(fio, bufFio, [["s", 1], ["f", 4]]);
      comuns(fio, t);
      if (emAura) gl.uniform3fv(fio.u.corFio, pal.aura);
      gl.uniform1f(fio.u.canal, canal);
      gl.uniform1f(fio.u.ganho, pal.ganhoFio);
      gl.drawArrays(gl.LINES, 0, nFio);
      liga(po, bufPo, [["q", 4]]);
      comuns(po, t);
      if (pal.po) gl.uniform3fv(po.u.corFio, emAura ? pal.aura : pal.po);
      gl.uniform1f(po.u.canal, canal);
      gl.uniform1f(po.u.ganho, pal.ganhoPo);
      gl.uniform1f(po.u.dpr, dpr * fatorPonto);
      gl.drawArrays(gl.POINTS, 0, POEIRA);
    }
    function estica(origem, ganho, abre = 1.5) {
      liga(tela, bufTela, [["a", 2]]);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, origem.tex);
      gl.uniform1i(tela.u.tex, 0);
      gl.uniform2f(tela.u.passo, abre / origem.w, abre / origem.h);
      gl.uniform1f(tela.u.ganho, ganho);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    const inicio = performance.now();
    function desenha(agora = performance.now()) {
      const t = semMovimento ? 30 : 30 + (agora - inicio) / 1000;
      if (!semMovimento) passoMola(agora - antes);
      antes = agora;
      rola += (scrollY / innerHeight - rola) * (semMovimento || !temMouse ? 1 : 0.16);
      const vel = Math.min(1, Math.abs(scrollY - yAntes) / innerHeight * 12);
      yAntes = scrollY;
      agito += (vel - agito) * (vel > agito ? 0.25 : 0.04);

      gl.enable(gl.BLEND);
      if (pal.aditivo) {
        // 1) fios nítidos (MSAA) -> 2) reduz em cadeia 1/2, 1/4, 1/8 -> 3) composição com tonemap
        gl.blendFunc(gl.ONE, gl.ONE);
        gl.clearColor(0, 0, 0, 0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, gl2 ? msaa.fb : nitido.fb);
        gl.viewport(0, 0, nitido.w, nitido.h);
        gl.clear(gl.COLOR_BUFFER_BIT);
        cena(t, 1);
        if (gl2) {
          gl.bindFramebuffer(gl.READ_FRAMEBUFFER, msaa.fb);
          gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, nitido.fb);
          gl.blitFramebuffer(0, 0, nitido.w, nitido.h, 0, 0, nitido.w, nitido.h, gl.COLOR_BUFFER_BIT, gl.NEAREST);
          gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
          gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
        }
        gl.disable(gl.BLEND);
        [[nitido, meio], [meio, brilho1], [brilho1, brilho2]].forEach(([de, para]) => {
          gl.bindFramebuffer(gl.FRAMEBUFFER, para.fb);
          gl.viewport(0, 0, para.w, para.h);
          estica(de, 1.0, 1.0);
        });
        // composição: sem mistura, a tela recebe o resultado pronto
        gl.disable(gl.BLEND);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvas.width, canvas.height);
        liga(final, bufTela, [["a", 2]]);
        [[nitido, "nit"], [brilho1, "b1"], [brilho2, "b2"]].forEach(([a, nome], i) => {
          gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, a.tex); gl.uniform1i(final.u[nome], i);
        });
        gl.uniform2f(final.u.p1, 1.5 / brilho1.w, 1.5 / brilho1.h);
        gl.uniform2f(final.u.p2, 1.5 / brilho2.w, 1.5 / brilho2.h);
        gl.uniform1f(final.u.g1, pal.bloom[0]);
        gl.uniform1f(final.u.g2, pal.bloom[1]);
        gl.uniform1f(final.u.k, pal.k);
        gl.uniform3fv(final.u.corFio, pal.fio);
        gl.uniform3fv(final.u.corAzul, pal.azul);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.activeTexture(gl.TEXTURE0);
      } else {
        // claro: tinta por cima do papel (somar luz some no branco). O brilho borrado vira uma
        // aura verde suave em volta do feixe, e as fibras nítidas vão por cima.
        gl.blendFunc(gl.ONE, gl.ONE);
        gl.bindFramebuffer(gl.FRAMEBUFFER, brilho1.fb);
        gl.viewport(0, 0, brilho1.w, brilho1.h);
        gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
        emAura = true; cena(t, 0.25); emAura = false;
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT);
        estica(brilho1, pal.bloom[0]);
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
