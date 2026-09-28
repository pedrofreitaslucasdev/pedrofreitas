// Fio de luz do site inteiro, em Three.js (27/09/2026). É o mesmo fio do teste aprovado pelo Pedro
// ("ficou perfeito": teste-fio.vercel.app, repo teste-fio): NÃO mexer no desenho sem ele pedir.
// Centenas de fibras de 1px enroladas num tubo 3D que torce, aperta num nó e abre em leque;
// poeira de luz em volta; UnrealBloom em buffer de meia-precisão e tone mapping neutro.
// A forma desliza pra baixo devagar sozinha e desce junto quando a página rola.
//
// O que muda em relação ao teste, só pra caber no site:
// - canvas TRANSPARENTE, fixo, atrás do conteúdo (fundo colorido em elemento fixo pinta as barras do Safari do iOS 26);
//   a última passada desconta o fundo e devolve só a luz, que soma por cima do preto da página;
// - tema claro: a mesma forma vira tinta verde-oliva (luz somada some no branco);
// - este arquivo é a FONTE: o site recebe public/js/fio-cena.min.js, empacotado só com o pedaço do Three.js
//   que o fio usa (scripts/empacotar-fio.mjs), e public/js/fio.js só o chama depois que a página carregou;
// - aba escondida para o laço; sem WebGL, nada acontece.

import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

const semMovimento = matchMedia("(prefers-reduced-motion: reduce)").matches;
const celular = matchMedia("(max-width: 759px)").matches;
const FIOS = celular ? 260 : 520;
const SEG = celular ? 170 : 260;
const POEIRA = celular ? 500 : 1400;

function comeca() {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, premultipliedAlpha: true, powerPreference: "high-performance" });
  } catch (e) { return; }   // sem WebGL
  const canvas = renderer.domElement;
  canvas.className = "luz";
  canvas.setAttribute("aria-hidden", "true");
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  // a cena é desenhada sobre o mesmo #050605 do teste: a névoa verde do bloom depende dele
  // (com fundo preto ela some; testado). No fim esse fundo é descontado e o canvas sai transparente.
  renderer.setClearColor(0x050605, 1);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  document.body.prepend(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 10);

  // ---------- o caminho (igual nos dois shaders) ----------
  // u: 0 no alto, 1 embaixo (passa um pouco das bordas). f: fase do fluxo (tempo + rolagem).
  // Curva em S: entra pela direita, dobra pra esquerda perto do meio e sai pela direita embaixo.
  const CAMINHO = /* glsl */ `
uniform float t; uniform float f; uniform float halfW; uniform float halfH; uniform float R0;
vec3 centro(float u) {
  float w = u - f;
  float x = halfW * (0.35 + 0.5 * sin(w * 5.2 + 1.1)) + halfW * 0.04 * sin(u * 7.0 + t * 0.35);
  float y = mix(halfH * 1.35, -halfH * 1.35, u);
  float z = 1.1 * sin(w * 3.5 + 0.5) - 0.3;
  return vec3(x, y, z);
}
// raio do tubo: aberto quase sempre, aperta num nó (que viaja junto com a forma)
float raio(float u) {
  float c = fract((u - f) * 1.05 + 0.32) - 0.5;
  float aperto = exp(-c * c * 70.0);
  return R0 * (0.06 + 0.94 * (1.0 - aperto)) * (0.85 + 0.15 * sin((u - f) * 9.0 + t * 0.2));
}
void quadro(float u, out vec3 C, out vec3 N, out vec3 B) {
  C = centro(u);
  vec3 T = normalize(centro(u + 0.002) - C);
  N = normalize(cross(T, vec3(0.0, 0.0, 1.0)));
  B = cross(T, N);
}
`;

  // ---------- fibras ----------
  const nVert = FIOS * (SEG + 1);
  const aS = new Float32Array(nVert);
  const aFibra = new Float32Array(nVert * 4);   // ângulo, raio relativo, fase, azul
  const aForte = new Float32Array(nVert);
  const indices = new Uint32Array(FIOS * SEG * 2);
  let v = 0, k = 0;
  for (let i = 0; i < FIOS; i++) {
    const ang = Math.random() * Math.PI * 2;
    const rr = Math.sqrt(Math.random());
    const fase = Math.random();
    const azul = Math.random() < 0.12 ? 1 : 0;
    const forte = 0.05 + 0.95 * Math.pow(Math.random(), 5);   // maioria fraca, poucos destaques
    const base = v;
    for (let j = 0; j <= SEG; j++, v++) {
      aS[v] = j / SEG;
      aFibra.set([ang, rr, fase, azul], v * 4);
      aForte[v] = forte;
      if (j < SEG) { indices[k++] = base + j; indices[k++] = base + j + 1; }
    }
  }
  const geoFio = new THREE.BufferGeometry();
  geoFio.setAttribute("position", new THREE.BufferAttribute(new Float32Array(nVert * 3), 3));   // não usado (o shader calcula)
  geoFio.setAttribute("aS", new THREE.BufferAttribute(aS, 1));
  geoFio.setAttribute("aFibra", new THREE.BufferAttribute(aFibra, 4));
  geoFio.setAttribute("aForte", new THREE.BufferAttribute(aForte, 1));
  geoFio.setIndex(new THREE.BufferAttribute(indices, 1));

  const comuns = {
    t: { value: 0 }, f: { value: 0 }, halfW: { value: 5 }, halfH: { value: 3 }, R0: { value: 0.4 },
    lima: { value: new THREE.Color("#c6f03a") }, azul: { value: new THREE.Color("#4fb0ff") },
    dpr: { value: renderer.getPixelRatio() },
  };
  const matFio = new THREE.ShaderMaterial({
    uniforms: comuns,
    vertexShader: /* glsl */ `
      attribute float aS; attribute vec4 aFibra; attribute float aForte;
      ${CAMINHO}
      varying float vLuz; varying float vAzul;
      void main() {
        float u = -0.02 + aS * 1.04;
        vec3 C, N, B; quadro(u, C, N, B);
        float a = aFibra.x + (u - f) * 16.0 + t * 0.12;             // torção que anda com o fluxo
        float r = raio(u) * aFibra.y * (1.0 + 0.12 * sin(u * 23.0 + aFibra.z * 40.0 + t * 0.6));
        vec3 dir = N * cos(a) + B * sin(a);
        vec3 p = C + dir * r;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        float frente = 0.35 + 0.65 * (dir.z * 0.5 + 0.5);            // o lado de cá do tubo brilha mais
        float pulso = pow(0.5 + 0.5 * sin((u - f) * 26.0 + aFibra.z * 40.0), 10.0);
        vLuz = aForte * frente * (1.0 + 0.6 * pulso);
        vAzul = aFibra.w;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 lima; uniform vec3 azul;
      varying float vLuz; varying float vAzul;
      void main() { gl_FragColor = vec4(mix(lima, azul, vAzul) * vLuz * 0.17, 1.0); }`,
    blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, depthTest: false,
  });
  const fibras = new THREE.LineSegments(geoFio, matFio);
  fibras.frustumCulled = false;
  scene.add(fibras);

  // ---------- poeira de luz ----------
  const aPo = new Float32Array(POEIRA * 4);   // posição no caminho, ângulo, raio, tamanho
  for (let i = 0; i < POEIRA; i++) aPo.set([Math.random(), Math.random() * 6.283, Math.random(), Math.random()], i * 4);
  const geoPo = new THREE.BufferGeometry();
  geoPo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(POEIRA * 3), 3));
  geoPo.setAttribute("aPo", new THREE.BufferAttribute(aPo, 4));
  const matPo = new THREE.ShaderMaterial({
    uniforms: comuns,
    vertexShader: /* glsl */ `
      attribute vec4 aPo;
      uniform float dpr;
      ${CAMINHO}
      varying float vLuz; varying float vMole;
      void main() {
        float u = -0.05 + fract(aPo.x + f + t * 0.006) * 1.1;          // anda junto com a forma
        vec3 C, N, B; quadro(u, C, N, B);
        float a = aPo.y + (u - f) * 10.0 + t * 0.1;
        float r = raio(u) * (0.3 + 1.9 * aPo.z) + 0.05 * aPo.z;
        vec3 p = C + (N * cos(a) + B * sin(a)) * r;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float bokeh = step(0.9, aPo.w);
        gl_PointSize = (mix(1.2, 2.2, aPo.w) + bokeh * (5.0 + 14.0 * aPo.w)) * dpr * (10.0 / -mv.z);
        float pisca = 0.5 + 0.5 * sin(t * (0.8 + 2.5 * aPo.w) + aPo.x * 60.0);
        vLuz = pisca * mix(0.55, 0.06, bokeh);
        vMole = bokeh;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 lima;
      varying float vLuz; varying float vMole;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float forma = mix(1.0 - smoothstep(0.1, 1.0, d), (1.0 - smoothstep(0.7, 1.0, d)) * 0.7 + 0.3 * (1.0 - d), vMole);
        gl_FragColor = vec4(mix(lima, vec3(1.0), 0.35 * (1.0 - vMole)) * forma * vLuz, 1.0);
      }`,
    blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, depthTest: false,
  });
  const poeira = new THREE.Points(geoPo, matPo);
  poeira.frustumCulled = false;
  scene.add(poeira);

  // ---------- brilho ----------
  const composer = new EffectComposer(renderer);   // buffers em meia-precisão: a soma dos fios não estoura
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.6, 0.22, 0.06);
  composer.addPass(bloom);
  // última passada = a do teste (tone mapping + sRGB) e, no fim, desconta o fundo e vira cor pré-multiplicada:
  // escuro: sobra só a luz, com alfa = o canal mais forte; por cima do #050605 da página dá o mesmo pixel do teste;
  // claro: a mesma luz vira tinta (cor fixa, opacidade = quanto de luz tinha ali).
  const saida = new OutputPass();
  saida.uniforms.claro = { value: 0 };
  saida.uniforms.tinta = { value: new THREE.Color("#4d6e00") };
  saida.uniforms.fundo = { value: new THREE.Vector3(5 / 255, 6 / 255, 5 / 255) };   // #050605 já em sRGB, como sai da passada
  saida.material.uniforms = saida.uniforms;
  saida.material.fragmentShader = saida.material.fragmentShader
    .replace("varying vec2 vUv;", "varying vec2 vUv;\n\t\tuniform float claro; uniform vec3 tinta; uniform vec3 fundo;")
    .replace(/\}\s*$/, `
      vec3 so = max(clamp(gl_FragColor.rgb, 0.0, 1.0) - fundo, 0.0);
      float luz = max(so.r, max(so.g, so.b));
      gl_FragColor = claro > 0.5 ? vec4(tinta * min(1.0, luz * 1.1), min(1.0, luz * 1.1)) : vec4(so, luz);
    }`);
  composer.addPass(saida);

  const tema = () => {
    const claro = document.documentElement.dataset.tema === "claro";
    saida.uniforms.claro.value = claro ? 1 : 0;
    bloom.strength = claro ? 0.35 : 0.6;   // no claro o brilho vira mancha; mais contido
  };
  new MutationObserver(tema).observe(document.documentElement, { attributes: true, attributeFilter: ["data-tema"] });
  tema();

  // ---------- tamanho (altura estável: a barra do Safari não muda o desenho) ----------
  let larguraAntes = 0;
  function tamanho() {
    const w = innerWidth, h = canvas.clientHeight || innerHeight;
    if (w === larguraAntes && canvas.height > 0) return;
    larguraAntes = w;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    bloom.resolution.set(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    comuns.halfH.value = halfH;
    comuns.halfW.value = halfH * camera.aspect;
    comuns.R0.value = halfH * (celular ? 0.1 : 0.13);
  }
  addEventListener("resize", tamanho, { passive: true });
  tamanho();

  // ---------- tempo + rolagem = um fluxo só ----------
  // Parado: a forma desce ~0,03 tela/s. Rolando: desce junto (~0,25 tela por tela rolada),
  // com um atraso curto (0,25 s) pra deslizar em vez de pular.
  const U_POR_TELA = 1 / 2.7;   // u vai de +1,35 a -1,35 meia-alturas = 1,35 telas
  let rolaSuave = scrollY / innerHeight, deriva = 0, tempo = 0, antes = performance.now();
  function desenha(agora = performance.now()) {
    const dt = Math.min(0.1, (agora - antes) / 1000); antes = agora;
    if (!semMovimento) { tempo += dt; deriva += dt * 0.03; }
    const alvo = scrollY / innerHeight;
    rolaSuave += (alvo - rolaSuave) * (semMovimento ? 1 : 1 - Math.exp(-dt / 0.25));
    comuns.t.value = tempo;
    comuns.f.value = (deriva + rolaSuave * 0.25) * U_POR_TELA * 2;
    composer.render();
  }
  const liga = () => {
    antes = performance.now();
    renderer.setAnimationLoop(document.hidden ? null : desenha);
  };
  document.addEventListener("visibilitychange", liga);
  canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); renderer.setAnimationLoop(null); canvas.remove(); });

  desenha();
  liga();
  requestAnimationFrame(() => canvas.classList.add("luz--pronta"));
}

comeca();
