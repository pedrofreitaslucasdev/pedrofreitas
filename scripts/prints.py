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
    "forno-de-pedra": ("https://forno-de-pedra.vercel.app", 4700),
    # as avaliações do Fontes carregam depois e saem como esqueleto cinza: cortar antes delas
    "fontes-odontologia": ("https://fontes-odontologia.vercel.app", 4000),
    "casa-forte": ("https://deposito-casa-forte.vercel.app", 4700),
    "demo-salao": ("https://demo-salao.vercel.app", 4700),
    "bolos": ("https://demo-bolos.vercel.app", 4700),
}

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
            rolar_ate_o_fim(pg)
            png = pg.screenshot(full_page=True)
            img = Image.open(BytesIO(png)).convert("RGB")
            # a moldura do celular mostra o print com ~270px de largura; 540 cobre tela 2x
            img = img.resize((540, round(img.height * 540 / img.width)), Image.LANCZOS)
            img = encolher_vazios(img)
            img = img.crop((0, 0, img.width, min(img.height, altura_max)))
            destino = SAIDA / f"{nome}.webp"
            img.save(destino, "WEBP", quality=72, method=6)
            print(f"{nome}: {img.width}x{img.height} -> {destino.stat().st_size // 1024} KB")
            pg.close()
        nav.close()


if __name__ == "__main__":
    main()
