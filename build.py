#!/usr/bin/env python3
"""
Ensamblador del sitio Modular Roofing & Pérgolas.

index.html es la plantilla maestra: de ahí se extraen <head>, header, menú
móvil, footer y scripts. Los <main> de cada página interior viven en _src/.

    python build.py

Edita _src/*.html o index.html y vuelve a correrlo. No toques las páginas
interiores generadas a mano — se sobrescriben.
"""
import re
from pathlib import Path

ROOT = Path(__file__).parent
SRC = ROOT / "_src"

# --------------------------------------------------------------------------
# Metadatos por página: slug -> (título, descripción, clave de nav activa)
# --------------------------------------------------------------------------
PAGES = {
    "techos": (
        "Techos en Miami | Reemplazo, Inspección y Reparación | Modular Roofing",
        "Reemplazo de techos shingle, teja, metal y flat en Miami-Dade, Broward y Palm Beach. "
        "Inspección gratis con reporte fotográfico y apoyo para reclamos de seguro.",
    ),
    "pergolas": (
        "Pérgolas a Medida en Miami | Configurador 3D | Modular Roofing",
        "Diseña tu pérgola en 3D en tiempo real: bioclimática de lamas, panel insulado o "
        "decorativa. Aluminio estructural para el clima del sur de la Florida.",
    ),
    "proyectos": (
        "Proyectos | Techos y Pérgolas en South Florida | Modular Roofing",
        "Galería de techos, pérgolas y espacios exteriores en Miami-Dade, Broward y Palm Beach.",
    ),
    "nosotros": (
        "Nosotros | Modular Roofing y Pérgolas | North Miami Beach",
        "Graciela Silvina López supervisa personalmente cada proyecto. Showroom en North Miami "
        "Beach, licenciados y asegurados, cumplimiento de código Miami-Dade.",
    ),
    "contacto": (
        "Contacto | Estimado Gratis | Modular Roofing y Pérgolas",
        "Solicita tu estimado gratis en cuatro pasos. WhatsApp (786) 782-0216. "
        "Showroom en North Miami Beach, lunes a viernes de 9AM a 5PM.",
    ),
    "privacidad": (
        "Política de Privacidad | Modular Roofing y Pérgolas",
        "Qué información recogemos, cómo la usamos y tus derechos. Sin analítica, "
        "sin píxeles publicitarios y sin venta de datos.",
    ),
    "terminos": (
        "Términos de Uso | Modular Roofing y Pérgolas",
        "Términos de uso del sitio: alcance de los estimados y modelos 3D, licencia, "
        "reclamos de seguro, bono de referidos, financiamiento y accesibilidad.",
    ),
}


def cut(text, start, end, label):
    """Devuelve el fragmento entre dos marcadores, ambos incluidos."""
    i = text.find(start)
    j = text.find(end, i)
    if i == -1 or j == -1:
        raise SystemExit(f"No pude localizar el bloque '{label}' en index.html")
    return text[i:j + len(end)]


def main():
    tpl = (ROOT / "index.html").read_text(encoding="utf-8")

    head_open = cut(tpl, "<!DOCTYPE html>", "</head>", "head")
    body_top = cut(tpl, '<a class="skip"', "</div>\n\n<main", "header+sheet")
    body_top = body_top[: body_top.rfind("<main")]
    body_end = tpl[tpl.find("<!-- ============================ FOOTER"):]

    for slug, (title, desc) in PAGES.items():
        frag = SRC / f"{slug}.html"
        if not frag.exists():
            print(f"  --  salto {slug}: falta _src/{slug}.html")
            continue

        head = head_open
        # título y descripción propios
        head = re.sub(r"<title>.*?</title>", f"<title>{title}</title>", head, flags=re.S)
        head = re.sub(
            r'(<meta name="description" content=")[^"]*(">)',
            lambda m: m.group(1) + desc + m.group(2), head, count=1,
        )
        head = re.sub(
            r'(<meta property="og:title" content=")[^"]*(">)',
            lambda m: m.group(1) + title + m.group(2), head, count=1,
        )
        head = re.sub(
            r'(<meta property="og:description" content=")[^"]*(">)',
            lambda m: m.group(1) + desc + m.group(2), head, count=1,
        )
        head = re.sub(
            r'(<link rel="canonical" href="https://modular-roofing\.com/)[^"]*(">)',
            lambda m: m.group(1) + slug + ".html" + m.group(2), head, count=1,
        )
        # el JSON-LD de negocio local sólo tiene sentido en la portada
        head = re.sub(
            r'<script type="application/ld\+json">.*?</script>\n', "", head, flags=re.S, count=1
        )

        top = body_top
        # marcar el enlace de nav activo en esta página
        top = top.replace(' aria-current="page"', "")
        top = top.replace(f'class="nav__a" href="{slug}.html"',
                          f'class="nav__a" href="{slug}.html" aria-current="page"')
        top = top.replace(f'class="sheet__a" href="{slug}.html"',
                          f'class="sheet__a" href="{slug}.html" aria-current="page"')

        page = "\n".join([
            head,
            "<body>",
            "",
            top.rstrip(),
            "",
            '<main id="main">',
            "",
            frag.read_text(encoding="utf-8").rstrip(),
            "",
            "</main>",
            "",
            body_end.rstrip(),
        ])
        (ROOT / f"{slug}.html").write_text(page, encoding="utf-8")
        print(f"  OK  {slug}.html")


if __name__ == "__main__":
    print("Ensamblando paginas desde index.html + _src/ ...")
    main()
    print("Listo.")
