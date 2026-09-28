// Fio de luz: só o carregador. O fio de verdade é src/fio.js, empacotado em fio-cena.min.js
// (scripts/empacotar-fio.mjs) com o pedaço do Three.js que ele usa. Baixa só depois que a página carregou.
const depois = window.requestIdleCallback || ((fn) => setTimeout(fn, 200));
const vai = () => depois(() => import("./fio-cena.min.js").catch(() => {}));
document.readyState === "complete" ? vai() : addEventListener("load", vai, { once: true });
