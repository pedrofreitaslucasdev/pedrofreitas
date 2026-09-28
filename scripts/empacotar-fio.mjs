// Empacota o fio de luz (src/fio.js) com SÓ o pedaço do Three.js que ele usa, minificado,
// em public/js/fio-cena.min.js. Rodar depois de mexer em src/fio.js:
//   node scripts/empacotar-fio.mjs
// O Three.js (MIT, 0.186.1) mora em src/three/ e não vai pro site inteiro.
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tres = path.join(raiz, "src/three");
const q = (p) => `"${p}"`;
execSync([
  "npx -y esbuild@0.25", q(path.join(raiz, "src/fio.js")),
  "--bundle --format=esm --minify --target=es2020 --legal-comments=eof",
  `--alias:three=${q(path.join(tres, "build/three.module.js"))}`,
  `--alias:three/addons=${q(path.join(tres, "examples/jsm"))}`,
  `--outfile=${q(path.join(raiz, "public/js/fio-cena.min.js"))}`,
].join(" "), { stdio: "inherit" });
