"""Grava o site do Forno de Pedra rolando (a pizza assa enquanto rola) e gera os vídeos da
prévia do estilo "Animado". Um print parado não mostra o que esse estilo tem de especial.

Rodar de novo se o site da pizza mudar:
    & "$env:LOCALAPPDATA\\Programs\\Python\\Python312\\python.exe" scripts\\video_forno.py

Gera public/videos/forno-pc.mp4 e forno-cel.mp4 (H.264, sem som, em loop: vai e volta).
"""
import shutil
import subprocess
import tempfile
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

URL = "https://forno-de-pedra.vercel.app"
FIM = 1380          # a pizza fica pronta em ~1380px e ainda está parada na tela; com 1500 a página já saía dela
DESCE_MS = 6000     # tempo da descida
PARADO_MS = 800     # pausa com a pizza pronta antes de voltar
SAIDA = Path(__file__).resolve().parent.parent / "public" / "videos"
FFMPEG = shutil.which("ffmpeg") or str(Path.home() / "AppData/Local/Microsoft/WinGet/Packages/"
                                        "Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0-full_build/bin/ffmpeg.exe")

ROLA = """([y, ms]) => new Promise(ok => {
  const t0 = performance.now();
  const passo = (t) => {
    const k = Math.min(1, (t - t0) / ms);
    const e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;   // começa e termina suave
    scrollTo(0, y * e);
    k < 1 ? requestAnimationFrame(passo) : ok();
  };
  requestAnimationFrame(passo);
})"""


def grava(nome, largura, altura, escala):
    with tempfile.TemporaryDirectory() as pasta, sync_playwright() as p:
        nav = p.chromium.launch()
        ctx = nav.new_context(viewport={"width": largura, "height": altura},
                              record_video_dir=pasta, record_video_size={"width": largura, "height": altura})
        inicio = time.time()
        pg = ctx.new_page()
        pg.goto(URL, wait_until="networkidle")
        pg.wait_for_timeout(1500)
        comeca = time.time() - inicio          # tudo antes disso é a página carregando: corta
        pg.evaluate(ROLA, [FIM, DESCE_MS])
        pg.wait_for_timeout(PARADO_MS)
        duracao = time.time() - inicio - comeca
        ctx.close()
        nav.close()
        bruto = next(Path(pasta).glob("*.webm"))
        SAIDA.mkdir(parents=True, exist_ok=True)
        destino = SAIDA / f"forno-{nome}.mp4"
        # ida + volta (reverse) = loop sem emenda; H.264 yuv420p toca no iPhone; faststart = começa rápido
        filtro = (f"[0:v]trim=start={comeca:.2f}:duration={duracao:.2f},setpts=PTS-STARTPTS,fps=30,"
                  f"scale={escala}:-2:flags=lanczos,split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1:a=0[v]")
        subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-i", str(bruto), "-filter_complex", filtro,
                        "-map", "[v]", "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "27",
                        "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(destino)], check=True)
        print(f"{destino.name}: {destino.stat().st_size // 1024} KB, ~{duracao * 2:.1f}s em loop")


if __name__ == "__main__":
    grava("pc", 1280, 800, 1280)
    grava("cel", 390, 844, 390)
