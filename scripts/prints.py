"""Tira o print de cada site do portfólio, em tamanho de celular, e salva em WebP.

Rodar de novo sempre que um modelo ou demo mudar:
    & "$env:LOCALAPPDATA\\Programs\\Python\\Python312\\python.exe" scripts\\prints.py
"""
from io import BytesIO
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright

# nome -> (endereço, altura máxima do print final em px, já na largura de 540)
SITES = {
    "forno-de-pedra": ("https://forno-de-pedra.vercel.app", 3600),
    # as avaliações do Fontes carregam depois e saem como esqueleto cinza: cortar antes delas
    "fontes-odontologia": ("https://fontes-odontologia.vercel.app", 3600),
    "casa-forte": ("https://deposito-casa-forte.vercel.app", 3600),
    "demo-salao": ("https://demo-salao.vercel.app", 4700),
    "bolos": ("https://demo-bolos.vercel.app", 4700),
    # sites reais ("Sites que já criei")
    "toyskids": ("https://pedrofreitaslucasdev.github.io/sitemamae/", 3600),
    "fiorella": ("https://fiorella-promos.vercel.app", 3600),
    # o Banquinhos ainda está em andamento: a tarja de pendência não entra no print
    "banquinhos": ("https://banquinhos.vercel.app", 3600),
}
# elementos escondidos antes do print (só o que é aviso de obra, nunca conteúdo)
ESCONDER = {"banquinhos": ["#pendencias"]}

# rodar só alguns: python scripts/prints.py toyskids fiorella
import sys
if len(sys.argv) > 1:
    SITES = {k: v for k, v in SITES.items() if k in sys.argv[1:]}

LARGURA = 390          # celular comum, em pixel de CSS
SAIDA = Path(__file__).resolve().parent.parent / "public" / "prints"


def encolher_vazios(img, minimo=300, sobra=60):
    """Faixas de uma cor só (ex.: o trecho da pizza girando, que no print fica vazio)
    viram uma faixa curta, pra prévia não passar segundos mostrando nada."""
    cinza = img.convert("L").resize((60, img.height))
    px = cinza.load()
    vazia = [max(px[x, y] for x in range(60)) - min(px[x, y] for x in range(60)) < 6
             for y in range(img.height)]
    manter, y = [], 0
    while y < img.height:
        fim = y
        while fim < img.height and vazia[fim] == vazia[y]:
            fim += 1
        if vazia[y] and fim - y > minimo:
            manter.append((y, y + sobra))
        else:
            manter.append((y, fim))
        y = fim
    nova = Image.new("RGB", (img.width, sum(b - a for a, b in manter)))
    topo = 0
    for a, b in manter:
        nova.paste(img.crop((0, a, img.width, b)), (0, topo))
        topo += b - a
    return nova


def rolar_ate_o_fim(pg):
    """Desce a página aos poucos pra disparar as animações de 'aparecer ao rolar'."""
    altura = pg.evaluate("document.documentElement.scrollHeight")
    y = 0
    while y < altura:
        pg.mouse.wheel(0, 500)
        pg.wait_for_timeout(120)
        y += 500
        altura = pg.evaluate("document.documentElement.scrollHeight")
    pg.evaluate("window.scrollTo(0, 0)")
    pg.wait_for_timeout(600)


def main():
    SAIDA.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        nav = p.chromium.launch()
        for nome, (url, altura_max) in SITES.items():
            pg = nav.new_page(viewport={"width": LARGURA, "height": 844},
                              device_scale_factor=2, is_mobile=True, has_touch=True)
            pg.goto(url, wait_until="networkidle")
            pg.wait_for_timeout(1500)  # as demos carregam os dados de mentira depois
            for sel in ESCONDER.get(nome, []):
                pg.evaluate(f"document.querySelectorAll('{sel}').forEach(e => e.remove())")
            rolar_ate_o_fim(pg)
            png = pg.screenshot(full_page=True)
            img = Image.open(BytesIO(png)).convert("RGB")
            # a moldura do celular mostra o print com ~270px de largura; 540 cobre tela 2x
            img = img.resize((540, round(img.height * 540 / img.width)), Image.LANCZOS)
            img = encolher_vazios(img)
            img = img.crop((0, 0, img.width, min(img.height, altura_max)))
            destino = SAIDA / f"{nome}.webp"
            img.save(destino, "WEBP", quality=62, method=6)
            print(f"{nome}: {img.width}x{img.height} -> {destino.stat().st_size // 1024} KB")
            # versão pequena pros celulares: lá a moldura tem ~100px, e decodificar 540x3600
            # travava o processador (~0,9s no celular simulado do Lighthouse)
            menor = img.resize((300, round(img.height * 300 / img.width)), Image.LANCZOS)
            destino = SAIDA / f"{nome}-p.webp"
            menor.save(destino, "WEBP", quality=62, method=6)
            print(f"{nome}-p: {menor.width}x{menor.height} -> {destino.stat().st_size // 1024} KB")
            pg.close()

            # print de computador: a primeira tela do site, pra imagem grande dos trabalhos
            pg = nav.new_page(viewport={"width": 1440, "height": 900}, device_scale_factor=1)
            pg.goto(url, wait_until="networkidle")
            pg.wait_for_timeout(2000)
            for sel in ESCONDER.get(nome, []):
                pg.evaluate(f"document.querySelectorAll('{sel}').forEach(e => e.remove())")
            pg.wait_for_timeout(300)
            img = Image.open(BytesIO(pg.screenshot())).convert("RGB")
            img = img.resize((1280, 800), Image.LANCZOS)
            destino = SAIDA / f"{nome}-pc.webp"
            img.save(destino, "WEBP", quality=74, method=6)
            print(f"{nome}-pc: {img.width}x{img.height} -> {destino.stat().st_size // 1024} KB")
            pg.close()
        nav.close()


if __name__ == "__main__":
    main()
