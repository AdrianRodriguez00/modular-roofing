# Modular Roofing & Pérgolas — Sitio Web

Sitio multipágina para **Modular Roofing y Pérgolas**, contratista de techos y
pérgolas en North Miami Beach, FL. Construido desde cero (no reutiliza ningún
otro proyecto del portafolio).

## Datos del negocio

| Campo | Valor |
|---|---|
| Teléfono / WhatsApp | +1 (786) 782-0216 |
| Dueña | Graciela Silvina López |
| Showroom | 19591 NE 10th Ave, Building 3 — Bay B, North Miami Beach, FL 33179 |
| Horario | Lunes a viernes, 9AM – 5PM |
| Instagram | [@modularroofing](https://www.instagram.com/modularroofing/) |
| Facebook | [Modular Roofing and Pérgolas](https://www.facebook.com/1053084341213840) |
| Zona | Miami-Dade, Broward, Palm Beach (20 ciudades listadas) |
| Diferenciadores | Financiamiento, $100 por referido, materiales anti-huracán, código Miami-Dade, apoyo con reclamos de seguro |

> **Dirección — ojo:** el negocio publica tres direcciones distintas. Instagram
> dice `19591 NE 10th Ave, Bldg 3 - bahía B`; su web anterior decía `19501 ...
> Building 3N`; Yelp dice `16801 NE 6th Ave`. Usamos la de Instagram (fuente
> propia del cliente). **Confirmar con Graciela antes de publicar** — la
> inconsistencia de NAP les está costando SEO local.

## Concepto de diseño

**"Estudio de estructura"** — el producto del negocio *es* estructura (vigas,
lamas, capas de techo), así que el sitio adopta el lenguaje del plano técnico
en vez del look genérico de contratista.

- **Paleta:** grafito `#0D1116` / `#07090B` + cobre-teja `#C9682F` + azul de
  plano `#4F94C4`. Nada de navy+dorado.
- **Tipografía:** Bricolage Grotesque (display) · Sora (texto) · JetBrains Mono
  (cotas, etiquetas técnicas, botones).
- **Texturas:** retícula de plano fija en el fondo + grano SVG al 3.5%.
- **Detalles:** marcas de esquina tipo plano en las tarjetas, numerales de
  índice (`01`, `02`…), acotaciones en cobre alrededor de los modelos 3D.

## Arquitectura

```
index.html          Portada (héroe 3D, servicios, capas de techo, proceso,
                    proyectos, cifras, dueña, zona, FAQ, tarjeta de estimado)
techos.html         4 sistemas de techo, señales de alerta, inspección/seguro,
                    comparador antes-después
pergolas.html       CONFIGURADOR 3D interactivo, 4 familias, especificaciones
proyectos.html      Galería filtrable + lightbox + comparador
nosotros.html       Graciela, 4 principios, showroom, cifras, referidos
contacto.html       Wizard de 4 pasos + ficha de contacto + redes
privacidad.html     Política de Privacidad (11 secciones)
terminos.html       Términos de Uso (12 secciones, incl. accesibilidad)

assets/site.css     Sistema de diseño: tokens, header, menú, cortina de
                    transición, reveals, acordeón, footer, dock móvil
assets/pages.css    Secciones y componentes de página
assets/site.js      Router, i18n, reveals, galería, wizard, formularios
assets/three-scenes.js  Modelado 3D paramétrico (Three.js vía CDN)

_src/*.html         Fragmentos <main> de las páginas interiores
build.py            Ensambla _src/ + header/footer de index.html
images/             Fotos (ver "Pendientes")
```

### Sin build obligatorio
El sitio es HTML/CSS/JS estático. `build.py` sólo existe para no repetir el
header/footer a mano: edita `_src/*.html` o `index.html` y corre `python build.py`.
**No edites `techos/pergolas/proyectos/nosotros/contacto.html` directamente** —
se sobrescriben.

## Funcionalidades

### Modelado 3D en tiempo real (Three.js)
Todo se genera por código, sin archivos `.glb`:

- **Héroe** (`index.html`): **render de patio completo al atardecer** — la
  pérgola instalada sobre un deck de losas, con piscina (agua animada por
  cáusticas), casa al fondo con puerta corrediza iluminada, palmeras,
  jardineras, sofás y tumbonas. Cielo de degradado cálido, sol bajo desde la
  izquierda y luz LED bajo la pérgola. Las lamas se abren en onda recorriendo
  el techo. Todas las texturas (losas, estuco, agua, cielo) se dibujan en
  `<canvas>` por código — cero imágenes.
- **Configurador** (`pergolas.html`): el usuario cambia **tipo** (lamas /
  panel insulado / decorativa), **acabado** (blanco / negro / bronce / madera),
  **ancho** (10–28 ft), **profundidad** (8–24 ft) y **apertura de lamas**. El
  modelo se reconstruye en vivo y la cámara se reencuadra sola según el tamaño.
- Acotaciones en cobre alrededor del modelo, **solo en el configurador**: ahí el
  objetivo es evaluar el producto, así que va sobre fondo de estudio neutro. El
  héroe vende el resultado, el configurador vende la decisión.
- Dos entornos en `createScene`: `env: "patio"` (cielo, sol de atardecer,
  exposición 0.82) y estudio neutro por defecto.
- Pausa el render cuando el lienzo no está a la vista; libera el contexto WebGL
  al navegar; cae a una foto si no hay WebGL.

### Transiciones entre páginas
Router "soft": intercepta enlaces internos, precarga el HTML al pasar el cursor,
anima una **cortina de 5 paneles** y hace swap de `<main>`. URLs reales, botón
atrás funcional, y **funciona sin JS** (navegación normal). Además declara
`@view-transition` para el soporte nativo de Chrome.

### Bilingüe ES/EN
El HTML se escribe en español; el inglés vive en atributos `data-en` /
`data-en-placeholder` / `data-en-aria-label`. Auto-detecta por
`navigator.language`, se puede forzar con el toggle y persiste en
`localStorage`. Sobrevive a las navegaciones del router.

### Captación de leads
Dos rutas, ambas sin backend — arman un mensaje formateado y abren WhatsApp:
1. **Tarjeta de estimado** al final de la portada (5 campos).
2. **Wizard de 4 pasos** en contacto (servicio → ubicación → urgencia → datos),
   con validación por paso y avance automático al elegir una tarjeta.

### Legal
Dos páginas (`privacidad.html`, `terminos.html`) con índice lateral pegajoso,
enlazadas desde el footer de las 8 páginas. Escritas para este negocio en
concreto, no plantilla genérica — cubren los riesgos reales de un contratista:

- **Privacidad:** qué se recoge (solo lo que el usuario escribe), consentimiento
  de WhatsApp/SMS, los tres terceros que realmente carga el sitio (Google Fonts,
  unpkg, Meta), almacenamiento local, conservación y derechos.
- **Términos:** el sitio no es cotización vinculante · los **modelos 3D son
  ilustrativos** (medidas aproximadas, color de pantalla ≠ powder-coat, la
  estructura final depende del sitio y del código) · **las fotos actuales son de
  referencia y los nombres de ciudad no afirman autoría** · no somos public
  adjusters · condiciones del bono de $100 · el financiamiento es de terceros ·
  garantías, ley de Florida y foro en Miami-Dade.

También: **banner de aviso de privacidad** (informativo, se muestra una vez y se
recuerda en `localStorage`) y **aviso de consentimiento** bajo los dos
formularios, con lenguaje de contacto por teléfono/SMS/WhatsApp y opt-out.

> **Necesita revisión de un abogado de Florida antes de publicar.** Son textos
> redactados con criterio, no asesoría legal. Puntos concretos a cerrar:
> el **nombre de la entidad legal** (no encontré ninguna registrada en Sunbiz
> como "Modular Roofing" — usan otra razón social o un fictitious name) y el
> **número de licencia**, que la sección 5 de Términos promete entregar.

### Accesibilidad y rendimiento
Skip link, `aria-current`, `aria-pressed`, `aria-expanded`, focus visible,
navegación por teclado en el lightbox, `prefers-reduced-motion` respetado
(desactiva cortina, reveals, giro 3D y marquesina), estilos de impresión.

## Pendientes

1. **Fotos reales.** Las 14 imágenes en `images/` son **genéricas/de referencia**
   tomadas de otros proyectos del portafolio, puestas a pedido del usuario
   mientras el cliente entrega las suyas. Cada sección con fotos lleva una nota
   visible que lo aclara. Al reemplazarlas: mismos nombres de archivo y todo
   sigue funcionando; luego borrar los `<p class="note">`.
2. **Confirmar la dirección del showroom** (ver arriba).
3. **Número de licencia.** El sitio dice "Licensed & Insured" pero no publica
   número — igual que su web actual. Pedirlo a Graciela y ponerlo en el footer:
   es un factor de confianza fuerte y verificable.
4. **Testimonios.** La sección de reseñas no existe todavía porque no hay
   ninguna reseña pública (Yelp sin reclamar, sin perfil de Google con reseñas).
   Recomendación aparte: reclamar Yelp y abrir Google Business Profile.
5. **Formulario con backend.** Hoy todo va por WhatsApp. Si quieren también
   email, cablear Formspree o similar en `initForms()` de `site.js`.
6. **Revisión legal.** Las dos páginas legales necesitan visto bueno de un
   abogado de Florida, más el nombre de la entidad legal y el número de
   licencia. Ver la sección "Legal" arriba.

## Preview

```bash
npx serve -l 3465 "C:\Users\a2adr\OneDrive\Desktop\Portafiolio\ModularRoofing"
```

Entrada `modular-roofing` en `.claude/launch.json`, puerto **3465**.

## Deploy

Desplegado el 2026-07-27 con aprobación explícita del usuario en chat.

- **Repo:** https://github.com/AdrianRodriguez00/modular-roofing (público, rama `main`)
- **Producción:** https://modular-roofing.vercel.app
- **Proyecto Vercel:** `arodrod00s-projects/modular-roofing`
- **Headers:** `vercel.json` aplica `X-Content-Type-Options`, `Referrer-Policy`,
  `X-Frame-Options`, `Permissions-Policy`, y caché de 7 días para `/images/`.

**Auto-deploy activo.** El repo está conectado al proyecto de Vercel
(`AdrianRodriguez00/modular-roofing` → `modular-roofing`, rama de producción
`main`). Cada push a `main` despliega solo:

```bash
python build.py && git add -A && git commit -m "..." && git push
```

Si alguna vez se desconecta, se vuelve a enlazar con `vercel git connect --yes`
desde la carpeta del proyecto. Requiere que la cuenta de GitHub esté vinculada
en vercel.com → Settings → Git y que la app de Vercel tenga acceso al repo.
