"""Grava o site do Forno de Pedra rolando (a pizza gira e assa enquanto rola) e gera os vídeos da
prévia do estilo "Animado". Um print parado não mostra o que esse estilo tem de especial.

Rodar de novo se o site da pizza mudar:
    & "$env:LOCALAPPDATA\\Programs\\Python\\Python312\\python.exe" scripts\\video_forno.py

Gera public/videos/forno-pc.mp4 e forno-cel.mp4 (H.264, sem som, em loop: vai e volta).

QUADRO A QUADRO, de propósito: a primeira versão filmava a tela com o gravador do Playwright, que
perde quadros em página pesada. Como no site o giro da pizza é ligado direto à rolagem (rotate =
progresso * 360°), cada quadro perdido virava um salto, e a pizza "girava um pouco e parava".
Aqui cada quadro é: rola até o ponto exato, espera o site desenhar, tira a foto. A rolagem anda
em velocidade constante (sem acelerar/frear nas pontas, que também parecia parada).
"""
import shutil
import subprocess
import tempfile
from pathlib import Path

from playwright.sync_api import sync_playwright

URL = "https://forno-de-pedra.vercel.app"
FIM = 1380          # a pizza fica pronta em ~1380px e ainda está parada na tela (medido em 26/09)
SEGUNDOS = 5        # tempo da ida (a volta é a mesma coisa ao contrário)
FPS = 30
PAUSA = 12          # quadros parados em cada ponta (0,4s), pra dar tempo de ver crua e pronta
SAIDA = Path(__file__).resolve().parent.parent / "public" / "videos"
FFMPEG = shutil.which("ffmpeg") or str(Path.home() / "AppData/Local/Microsoft/WinGet/Packages/"
                                        "Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0-full_build/bin/ffmpeg.exe")

# espera dois quadros de desenho: o site recalcula no evento de scroll e o navegador pinta depois
DESENHA = "() => new Promise(ok => requestAnimationFrame(() => requestAnimationFrame(ok)))"


def grava(nome, largura, altura):
    with tempfile.TemporaryDirectory() as pasta, sync_playwright() as p:
        nav = p.chromium.launch()
        pg = nav.new_page(viewport={"width": largura, "height": altura})
        pg.goto(URL, wait_until="networkidle")
        pg.wait_for_timeout(1500)
        total = SEGUNDOS * FPS
        quadros = [0] * PAUSA + [round(FIM * i / (total - 1)) for i in range(total)] + [FIM] * PAUSA
        for k, y in enumerate(quadros):
            pg.evaluate(f"window.scrollTo(0, {y})")
            pg.evaluate(DESENHA)
            pg.screenshot(path=str(Path(pasta) / f"{k:04d}.png"))
        nav.close()

        SAIDA.mkdir(parents=True, exist_ok=True)
        destino = SAIDA / f"forno-{nome}.mp4"
        # ida + volta (reverse) = loop sem emenda; H.264 yuv420p toca no iPhone; faststart = começa rápido
        filtro = "[0:v]split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1:a=0,format=yuv420p[v]"
        subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", str(Path(pasta) / "%04d.png"),
                        "-filter_complex", filtro, "-map", "[v]", "-an", "-c:v", "libx264", "-preset", "slow",
                        "-crf", "26", "-movflags", "+faststart", str(destino)], check=True)
        print(f"{destino.name}: {destino.stat().st_size // 1024} KB, {len(quadros) * 2 / FPS:.1f}s em loop, {len(quadros)} quadros na ida")
        if nome == "pc":
            # no celular a imagem grande aparece com ~360px de largura: 1280 era desperdício de dados
            menor = SAIDA / "forno-pc-p.mp4"
            subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-i", str(destino), "-vf", "scale=640:-2:flags=lanczos",
                            "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "27", "-pix_fmt", "yuv420p",
                            "-movflags", "+faststart", str(menor)], check=True)
            print(f"{menor.name}: {menor.stat().st_size // 1024} KB (versão pro celular)")


if __name__ == "__main__":
    grava("pc", 1280, 800)
    grava("cel", 390, 844)
