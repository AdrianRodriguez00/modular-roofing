# Modular Roofing &amp; Pérgolas

Sitio web de **Modular Roofing y Pérgolas** — contratista de techos y pérgolas
en North Miami Beach, Florida.

🔗 **Producción:** https://modular-roofing.vercel.app

## Qué tiene

- **8 páginas** estáticas: inicio, techos, pérgolas, proyectos, nosotros,
  contacto, privacidad y términos.
- **Modelado 3D en tiempo real** con Three.js, generado íntegramente por código
  (sin archivos `.glb`). Incluye un configurador donde el visitante cambia tipo,
  acabado y medidas de la pérgola y el modelo se reconstruye en vivo.
- **Transiciones entre páginas** con router propio y cortina animada, sobre URLs
  reales — y con degradación completa si no hay JavaScript.
- **Bilingüe español / inglés** con detección automática y preferencia
  persistente.
- **Captación de leads por WhatsApp**: tarjeta rápida en la portada y wizard de
  cuatro pasos en contacto, sin backend.

## Stack

HTML, CSS y JavaScript sin frameworks ni bundler. Three.js se carga desde CDN
mediante `importmap`. Tipografías: Bricolage Grotesque, Sora y JetBrains Mono.

## Desarrollo

```bash
npx serve -l 3465 .
```

### Editar páginas interiores

`index.html` es la plantilla maestra: de ahí salen `<head>`, header, menú móvil,
footer y scripts. Los `<main>` de las páginas interiores viven en `_src/`.

```bash
python build.py
```

> ⚠️ Las páginas interiores (`techos.html`, `pergolas.html`, `proyectos.html`,
> `nosotros.html`, `contacto.html`, `privacidad.html`, `terminos.html`) **se
> regeneran y se sobrescriben**. Edita `_src/*.html` o `index.html`, nunca los
> archivos generados.

## Estructura

```
index.html              Portada
_src/*.html             Fragmentos <main> de las páginas interiores
build.py                Ensamblador
assets/site.css         Sistema de diseño
assets/pages.css        Secciones y componentes
assets/site.js          Router, i18n, galería, formularios
assets/three-scenes.js  Modelado 3D paramétrico
images/                 Fotografías
```

## Pendientes

Ver [`PRODUCT.md`](PRODUCT.md) para el detalle. En resumen: sustituir las fotos
de referencia por fotografías propias, confirmar la dirección del showroom,
publicar el número de licencia y pasar las páginas legales por un abogado de
Florida.
